const pool = require('../config/db');
const { calculateWaitTime } = require('./waitTimeService');
const { createNotification } = require('./notificationService');
const {
  emitQueueUpdate,
  emitTokenCalled,
  emitTokenServing,
  emitTokenCompleted,
  emitTokenSkipped
} = require('../sockets/socketManager');

/**
 * Generate a new digital token for an authenticated student
 */
const generateToken = async (userId, serviceId) => {
  const connection = await pool.getConnection();
  try {
    // 1. Fetch student record
    const [students] = await connection.query(
      `SELECT s.id, s.user_id, u.name, u.college_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    if (students.length === 0) {
      const err = new Error('Student profile record not found.');
      err.statusCode = 404;
      throw err;
    }
    const student = students[0];

    // 2. Fetch service & department details
    const [services] = await connection.query(
      `SELECT s.id, s.name, s.token_prefix, s.avg_service_minutes, s.status AS service_status,
              d.id AS department_id, d.name AS department_name, d.code AS department_code, d.status AS dept_status
       FROM services s
       JOIN departments d ON s.department_id = d.id
       WHERE s.id = ?`,
      [serviceId]
    );

    if (services.length === 0) {
      const err = new Error('Selected service does not exist.');
      err.statusCode = 404;
      throw err;
    }

    const service = services[0];

    if (service.dept_status !== 'ACTIVE') {
      const err = new Error(`${service.department_name} is currently inactive.`);
      err.statusCode = 400;
      throw err;
    }

    if (service.service_status !== 'ACTIVE') {
      const err = new Error(`The service '${service.name}' is currently unavailable.`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Duplicate active token policy:
    // Check if student already has a WAITING, CALLED, or SERVING token in this department
    const [activeTokens] = await connection.query(
      `SELECT id, token_number, status
       FROM tokens
       WHERE student_id = ?
         AND department_id = ?
         AND status IN ('WAITING', 'CALLED', 'SERVING')
       LIMIT 1`,
      [student.id, service.department_id]
    );

    if (activeTokens.length > 0) {
      const existing = activeTokens[0];
      const err = new Error(
        `Active token limit reached: You already have an active token [${existing.token_number}] (${existing.status}) in ${service.department_name}. Please complete or cancel it first.`
      );
      err.statusCode = 409;
      throw err;
    }

    await connection.beginTransaction();

    const today = new Date().toISOString().slice(0, 10);

    // 4. Ensure queue record exists for today and lock it
    await connection.query(
      `INSERT INTO queues (department_id, service_id, queue_date, status)
       VALUES (?, ?, ?, 'OPEN')
       ON DUPLICATE KEY UPDATE status='OPEN'`,
      [service.department_id, service.id, today]
    );

    const [queueRows] = await connection.query(
      `SELECT id FROM queues WHERE service_id = ? AND queue_date = ? FOR UPDATE`,
      [service.id, today]
    );
    const queueId = queueRows[0].id;

    // 5. Calculate next sequence number for this queue today
    const [maxSeqRows] = await connection.query(
      `SELECT COALESCE(MAX(sequence_number), 0) AS max_seq
       FROM tokens
       WHERE queue_id = ?`,
      [queueId]
    );
    const nextSeq = maxSeqRows[0].max_seq + 1;
    const tokenNumber = `${service.token_prefix}-${String(nextSeq).padStart(3, '0')}`;

    // 6. Insert new token
    const [tokenResult] = await connection.query(
      `INSERT INTO tokens (
        queue_id, token_number, sequence_number, student_id,
        service_id, department_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'WAITING')`,
      [queueId, tokenNumber, nextSeq, student.id, service.id, service.department_id]
    );
    const tokenId = tokenResult.insertId;

    // 7. Insert Token Event
    await connection.query(
      `INSERT INTO token_events (token_id, event_type, actor_user_id, metadata)
       VALUES (?, 'CREATED', ?, ?)`,
      [tokenId, userId, JSON.stringify({ tokenNumber, serviceName: service.name })]
    );

    await connection.commit();

    // 8. Calculate people ahead in this service queue
    const [aheadRows] = await pool.query(
      `SELECT COUNT(id) AS ahead_count
       FROM tokens
       WHERE queue_id = ?
         AND status = 'WAITING'
         AND sequence_number < ?`,
      [queueId, nextSeq]
    );
    const peopleAhead = aheadRows[0]?.ahead_count || 0;

    // 9. Calculate approximate wait time
    const waitInfo = await calculateWaitTime(service.id, peopleAhead);

    // 10. Fetch current serving token for this service/department
    const [servingRows] = await pool.query(
      `SELECT token_number FROM tokens
       WHERE department_id = ? AND status IN ('CALLED', 'SERVING')
       ORDER BY called_at DESC LIMIT 1`,
      [service.department_id]
    );
    const currentServingToken = servingRows[0]?.token_number || 'None';

    const tokenData = {
      id: tokenId,
      tokenNumber,
      sequenceNumber: nextSeq,
      serviceId: service.id,
      serviceName: service.name,
      departmentId: service.department_id,
      departmentName: service.department_name,
      departmentCode: service.department_code,
      status: 'WAITING',
      peopleAhead,
      estimatedWaitMinutes: waitInfo.estimatedMinutes,
      currentServingToken,
      createdAt: new Date()
    };

    // 11. Emit Socket.IO queue update
    emitQueueUpdate({
      departmentId: service.department_id,
      departmentCode: service.department_code,
      serviceId: service.id,
      tokenNumber,
      action: 'GENERATED'
    });

    return tokenData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Cancel an active token
 */
const cancelToken = async (tokenId, userId, role) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT t.*, s.user_id AS student_user_id, d.code AS department_code, d.name AS department_name
       FROM tokens t
       JOIN students s ON t.student_id = s.id
       JOIN departments d ON t.department_id = d.id
       WHERE t.id = ?`,
      [tokenId]
    );

    if (rows.length === 0) {
      const err = new Error('Token not found.');
      err.statusCode = 404;
      throw err;
    }

    const token = rows[0];

    // If role is student, ensure they own the token
    if (role === 'STUDENT' && token.student_user_id !== userId) {
      const err = new Error('Forbidden: You can only cancel your own tokens.');
      err.statusCode = 403;
      throw err;
    }

    if (token.status !== 'WAITING') {
      const err = new Error(`Cannot cancel token with status '${token.status}'. Only WAITING tokens can be cancelled.`);
      err.statusCode = 400;
      throw err;
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE tokens
       SET status = 'CANCELLED', cancelled_at = NOW()
       WHERE id = ?`,
      [tokenId]
    );

    await connection.query(
      `INSERT INTO token_events (token_id, event_type, actor_user_id, metadata)
       VALUES (?, 'CANCELLED', ?, ?)`,
      [tokenId, userId, JSON.stringify({ reason: 'Cancelled by user/staff' })]
    );

    await connection.commit();

    emitQueueUpdate({
      departmentId: token.department_id,
      departmentCode: token.department_code,
      serviceId: token.service_id,
      tokenId: token.id,
      tokenNumber: token.token_number,
      action: 'CANCELLED'
    });

    return {
      id: token.id,
      tokenNumber: token.token_number,
      status: 'CANCELLED'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Staff calls the next waiting token for their assigned counter
 */
const callNextToken = async (counterId, staffUserId) => {
  const connection = await pool.getConnection();
  try {
    // 1. Verify staff and counter assignment
    const [staffRows] = await connection.query(
      `SELECT st.id AS staff_id, st.department_id, u.name AS staff_name
       FROM staff st
       JOIN users u ON st.user_id = u.id
       WHERE st.user_id = ?`,
      [staffUserId]
    );

    if (staffRows.length === 0) {
      const err = new Error('Staff member profile not found.');
      err.statusCode = 404;
      throw err;
    }
    const staff = staffRows[0];

    const [counterRows] = await connection.query(
      `SELECT c.*, d.code AS department_code, d.name AS department_name
       FROM counters c
       JOIN departments d ON c.department_id = d.id
       WHERE c.id = ?`,
      [counterId]
    );

    if (counterRows.length === 0) {
      const err = new Error('Counter not found.');
      err.statusCode = 404;
      throw err;
    }
    const counter = counterRows[0];

    if (counter.department_id !== staff.department_id) {
      const err = new Error('Forbidden: You are not authorized to operate counters outside your department.');
      err.statusCode = 403;
      throw err;
    }

    if (counter.status !== 'OPEN') {
      const err = new Error('This counter is currently CLOSED. Please open the counter before calling tokens.');
      err.statusCode = 400;
      throw err;
    }

    await connection.beginTransaction();

    // 2. Check if counter already has an active serving token
    const [activeCounterTokens] = await connection.query(
      `SELECT id, token_number, status
       FROM tokens
       WHERE counter_id = ? AND status IN ('CALLED', 'SERVING')
       LIMIT 1`,
      [counterId]
    );

    if (activeCounterTokens.length > 0) {
      const currentToken = activeCounterTokens[0];
      const err = new Error(
        `Counter is currently occupied with Token [${currentToken.token_number}] (${currentToken.status}). Complete or skip it before calling the next token.`
      );
      err.statusCode = 400;
      throw err;
    }

    // 3. Find next oldest WAITING token for services this counter handles
    const [waitingTokens] = await connection.query(
      `SELECT t.*, s.name AS service_name,
              u.name AS student_name, u.id AS student_user_id,
              st.id AS student_record_id, st.course, st.semester
       FROM tokens t
       JOIN services s ON t.service_id = s.id
       JOIN students st ON t.student_id = st.id
       JOIN users u ON st.user_id = u.id
       WHERE t.department_id = ?
         AND t.status = 'WAITING'
         AND (
           t.service_id IN (SELECT service_id FROM counter_services WHERE counter_id = ?)
           OR NOT EXISTS (SELECT 1 FROM counter_services WHERE counter_id = ?)
         )
       ORDER BY t.created_at ASC, t.sequence_number ASC
       LIMIT 1
       FOR UPDATE`,
      [counter.department_id, counterId, counterId]
    );

    if (waitingTokens.length === 0) {
      await connection.rollback();
      return {
        success: true,
        message: 'No waiting tokens in queue at this time.',
        token: null
      };
    }

    const nextToken = waitingTokens[0];

    // 4. Update token status to CALLED
    await connection.query(
      `UPDATE tokens
       SET status = 'CALLED',
           called_at = NOW(),
           counter_id = ?,
           staff_id = ?
       WHERE id = ?`,
      [counterId, staff.staff_id, nextToken.id]
    );

    // 5. Insert token event
    await connection.query(
      `INSERT INTO token_events (token_id, event_type, actor_user_id, counter_id, metadata)
       VALUES (?, 'CALLED', ?, ?, ?)`,
      [
        nextToken.id,
        staffUserId,
        counterId,
        JSON.stringify({ counterName: counter.counter_name, staffName: staff.staff_name })
      ]
    );

    await connection.commit();

    // 6. Create in-app notification for the student
    await createNotification(
      nextToken.student_user_id,
      nextToken.id,
      'TOKEN_CALLED',
      '🔔 YOUR TURN!',
      `Token ${nextToken.token_number}: Please proceed to ${counter.counter_name} for ${nextToken.service_name}.`
    );

    const callPayload = {
      tokenId: nextToken.id,
      tokenNumber: nextToken.token_number,
      serviceName: nextToken.service_name,
      counterId: counter.id,
      counterName: counter.counter_name,
      departmentId: counter.department_id,
      departmentCode: counter.department_code,
      studentId: nextToken.student_record_id,
      studentName: nextToken.student_name,
      calledAt: new Date().toISOString()
    };

    // 7. Emit real-time events
    emitTokenCalled(nextToken.student_record_id, callPayload);
    emitQueueUpdate({
      departmentId: counter.department_id,
      departmentCode: counter.department_code,
      serviceId: nextToken.service_id,
      action: 'CALLED',
      currentServingToken: nextToken.token_number
    });

    return {
      success: true,
      message: `Token ${nextToken.token_number} called to ${counter.counter_name}.`,
      token: {
        ...callPayload,
        course: nextToken.course,
        semester: nextToken.semester,
        status: 'CALLED'
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Recall an already CALLED token (if student didn't arrive immediately)
 */
const recallToken = async (tokenId, staffUserId) => {
  const [tokens] = await pool.query(
    `SELECT t.*, s.name AS service_name, c.counter_name,
            u.id AS student_user_id, st.id AS student_record_id,
            d.code AS department_code, st_u.department_id AS staff_dept_id
     FROM tokens t
     JOIN services s ON t.service_id = s.id
     JOIN counters c ON t.counter_id = c.id
     JOIN departments d ON t.department_id = d.id
     JOIN students st ON t.student_id = st.id
     JOIN users u ON st.user_id = u.id
     JOIN staff st_u ON st_u.user_id = ?
     WHERE t.id = ?`,
    [staffUserId, tokenId]
  );

  if (tokens.length === 0) {
    const err = new Error('Token not found.');
    err.statusCode = 404;
    throw err;
  }

  const token = tokens[0];

  if (token.department_id !== token.staff_dept_id) {
    const err = new Error('Forbidden: You can only recall tokens in your assigned department.');
    err.statusCode = 403;
    throw err;
  }

  if (token.status !== 'CALLED' && token.status !== 'SKIPPED') {
    const err = new Error(`Cannot recall token with status '${token.status}'. Must be CALLED or SKIPPED.`);
    err.statusCode = 400;
    throw err;
  }

  // If was skipped, revert back to CALLED
  if (token.status === 'SKIPPED') {
    await pool.query(`UPDATE tokens SET status = 'CALLED', called_at = NOW() WHERE id = ?`, [tokenId]);
  }

  await pool.query(
    `INSERT INTO token_events (token_id, event_type, actor_user_id, counter_id, metadata)
     VALUES (?, 'RECALLED', ?, ?, ?)`,
    [tokenId, staffUserId, token.counter_id, JSON.stringify({ counterName: token.counter_name })]
  );

  await createNotification(
    token.student_user_id,
    token.id,
    'TOKEN_CALLED',
    '⚠️ RECALL NOTICE: Your Turn',
    `Attention: Token ${token.token_number} is being RE-CALLED at ${token.counter_name}. Please proceed immediately!`
  );

  const payload = {
    tokenId: token.id,
    tokenNumber: token.token_number,
    serviceName: token.service_name,
    counterId: token.counter_id,
    counterName: token.counter_name,
    departmentCode: token.department_code,
    studentId: token.student_record_id,
    recalled: true
  };

  emitTokenCalled(token.student_record_id, payload);

  return {
    success: true,
    message: `Token ${token.token_number} re-called successfully.`,
    token: { ...payload, status: 'CALLED' }
  };
};

/**
 * Start serving a CALLED token
 */
const startServingToken = async (tokenId, staffUserId) => {
  const [tokens] = await pool.query(
    `SELECT t.*, c.counter_name, u.id AS student_user_id, st.id AS student_record_id,
            d.code AS department_code, st_u.department_id AS staff_dept_id
     FROM tokens t
     JOIN counters c ON t.counter_id = c.id
     JOIN departments d ON t.department_id = d.id
     JOIN students st ON t.student_id = st.id
     JOIN users u ON st.user_id = u.id
     JOIN staff st_u ON st_u.user_id = ?
     WHERE t.id = ?`,
    [staffUserId, tokenId]
  );

  if (tokens.length === 0) {
    const err = new Error('Token not found.');
    err.statusCode = 404;
    throw err;
  }

  const token = tokens[0];

  if (token.department_id !== token.staff_dept_id) {
    const err = new Error('Forbidden: You can only serve tokens in your assigned department.');
    err.statusCode = 403;
    throw err;
  }

  if (token.status !== 'CALLED') {
    const err = new Error(`Cannot start serving token with status '${token.status}'. Must be in CALLED state.`);
    err.statusCode = 400;
    throw err;
  }

  await pool.query(
    `UPDATE tokens
     SET status = 'SERVING', serving_at = NOW()
     WHERE id = ?`,
    [tokenId]
  );

  await pool.query(
    `INSERT INTO token_events (token_id, event_type, actor_user_id, counter_id, metadata)
     VALUES (?, 'SERVING', ?, ?, ?)`,
    [tokenId, staffUserId, token.counter_id, JSON.stringify({ counterName: token.counter_name })]
  );

  await createNotification(
    token.student_user_id,
    token.id,
    'TOKEN_SERVING',
    'Service In Progress',
    `You are now being served at ${token.counter_name} for Token ${token.token_number}.`
  );

  const payload = {
    tokenId: token.id,
    tokenNumber: token.token_number,
    counterId: token.counter_id,
    counterName: token.counter_name,
    departmentCode: token.department_code,
    studentId: token.student_record_id,
    status: 'SERVING'
  };

  emitTokenServing(token.student_record_id, payload);
  emitQueueUpdate({
    departmentId: token.department_id,
    departmentCode: token.department_code,
    serviceId: token.service_id,
    action: 'SERVING'
  });

  return {
    success: true,
    message: `Started serving token ${token.token_number}.`,
    token: payload
  };
};

/**
 * Complete a token's service
 */
const completeToken = async (tokenId, staffUserId) => {
  const [tokens] = await pool.query(
    `SELECT t.*, c.counter_name, u.id AS student_user_id, st.id AS student_record_id,
            d.code AS department_code, st_u.department_id AS staff_dept_id
     FROM tokens t
     JOIN counters c ON t.counter_id = c.id
     JOIN departments d ON t.department_id = d.id
     JOIN students st ON t.student_id = st.id
     JOIN users u ON st.user_id = u.id
     JOIN staff st_u ON st_u.user_id = ?
     WHERE t.id = ?`,
    [staffUserId, tokenId]
  );

  if (tokens.length === 0) {
    const err = new Error('Token not found.');
    err.statusCode = 404;
    throw err;
  }

  const token = tokens[0];

  if (token.department_id !== token.staff_dept_id) {
    const err = new Error('Forbidden: You can only complete tokens in your assigned department.');
    err.statusCode = 403;
    throw err;
  }

  if (token.status !== 'SERVING' && token.status !== 'CALLED') {
    const err = new Error(`Cannot complete token with status '${token.status}'. Must be SERVING or CALLED.`);
    err.statusCode = 400;
    throw err;
  }

  await pool.query(
    `UPDATE tokens
     SET status = 'COMPLETED', completed_at = NOW()
     WHERE id = ?`,
    [tokenId]
  );

  await pool.query(
    `INSERT INTO token_events (token_id, event_type, actor_user_id, counter_id, metadata)
     VALUES (?, 'COMPLETED', ?, ?, ?)`,
    [tokenId, staffUserId, token.counter_id, JSON.stringify({ counterName: token.counter_name })]
  );

  await createNotification(
    token.student_user_id,
    token.id,
    'TOKEN_COMPLETED',
    'Service Completed',
    `Your token ${token.token_number} has been completed at ${token.counter_name}. Thank you!`
  );

  const payload = {
    tokenId: token.id,
    tokenNumber: token.token_number,
    counterId: token.counter_id,
    counterName: token.counter_name,
    departmentCode: token.department_code,
    studentId: token.student_record_id,
    status: 'COMPLETED'
  };

  emitTokenCompleted(token.student_record_id, payload);
  emitQueueUpdate({
    departmentId: token.department_id,
    departmentCode: token.department_code,
    serviceId: token.service_id,
    action: 'COMPLETED'
  });

  return {
    success: true,
    message: `Token ${token.token_number} successfully completed.`,
    token: payload
  };
};

/**
 * Skip a token with recorded reason
 */
const skipToken = async (tokenId, staffUserId, reason = 'No show') => {
  const [tokens] = await pool.query(
    `SELECT t.*, c.counter_name, u.id AS student_user_id, st.id AS student_record_id,
            d.code AS department_code, st_u.department_id AS staff_dept_id
     FROM tokens t
     JOIN counters c ON t.counter_id = c.id
     JOIN departments d ON t.department_id = d.id
     JOIN students st ON t.student_id = st.id
     JOIN users u ON st.user_id = u.id
     JOIN staff st_u ON st_u.user_id = ?
     WHERE t.id = ?`,
    [staffUserId, tokenId]
  );

  if (tokens.length === 0) {
    const err = new Error('Token not found.');
    err.statusCode = 404;
    throw err;
  }

  const token = tokens[0];

  if (token.department_id !== token.staff_dept_id) {
    const err = new Error('Forbidden: You can only skip tokens in your assigned department.');
    err.statusCode = 403;
    throw err;
  }

  if (token.status !== 'CALLED' && token.status !== 'SERVING') {
    const err = new Error(`Cannot skip token with status '${token.status}'. Must be CALLED or SERVING.`);
    err.statusCode = 400;
    throw err;
  }

  await pool.query(
    `UPDATE tokens
     SET status = 'SKIPPED', skipped_at = NOW(), skip_reason = ?
     WHERE id = ?`,
    [reason, tokenId]
  );

  await pool.query(
    `INSERT INTO token_events (token_id, event_type, actor_user_id, counter_id, metadata)
     VALUES (?, 'SKIPPED', ?, ?, ?)`,
    [tokenId, staffUserId, token.counter_id, JSON.stringify({ reason, counterName: token.counter_name })]
  );

  await createNotification(
    token.student_user_id,
    token.id,
    'TOKEN_SKIPPED',
    'Token Skipped',
    `Your token ${token.token_number} was marked as skipped at ${token.counter_name}. Reason: ${reason}`
  );

  const payload = {
    tokenId: token.id,
    tokenNumber: token.token_number,
    counterId: token.counter_id,
    counterName: token.counter_name,
    departmentCode: token.department_code,
    studentId: token.student_record_id,
    reason,
    status: 'SKIPPED'
  };

  emitTokenSkipped(token.student_record_id, payload);
  emitQueueUpdate({
    departmentId: token.department_id,
    departmentCode: token.department_code,
    serviceId: token.service_id,
    action: 'SKIPPED'
  });

  return {
    success: true,
    message: `Token ${token.token_number} marked as skipped. Reason: ${reason}`,
    token: payload
  };
};

/**
 * Get active tokens for a student
 */
const getStudentActiveTokens = async (studentId) => {
  const [tokens] = await pool.query(
    `SELECT t.id, t.token_number, t.sequence_number, t.status, t.created_at, t.called_at, t.serving_at,
            s.id AS service_id, s.name AS service_name, s.token_prefix, s.avg_service_minutes,
            d.id AS department_id, d.name AS department_name, d.code AS department_code,
            c.id AS counter_id, c.counter_name
     FROM tokens t
     JOIN services s ON t.service_id = s.id
     JOIN departments d ON t.department_id = d.id
     LEFT JOIN counters c ON t.counter_id = c.id
     WHERE t.student_id = ?
       AND t.status IN ('WAITING', 'CALLED', 'SERVING')
     ORDER BY t.created_at DESC`,
    [studentId]
  );

  // Compute live queue position & wait time for each active token
  const enrichedTokens = await Promise.all(
    tokens.map(async (tok) => {
      let peopleAhead = 0;
      let estimatedWaitMinutes = 0;
      let currentServingToken = 'None';

      if (tok.status === 'WAITING') {
        const [aheadRows] = await pool.query(
          `SELECT COUNT(id) AS ahead_count
           FROM tokens
           WHERE service_id = ?
             AND status = 'WAITING'
             AND sequence_number < ?`,
          [tok.service_id, tok.sequence_number]
        );
        peopleAhead = aheadRows[0]?.ahead_count || 0;

        const waitInfo = await calculateWaitTime(tok.service_id, peopleAhead);
        estimatedWaitMinutes = waitInfo.estimatedMinutes;
      }

      const [servingRows] = await pool.query(
        `SELECT token_number FROM tokens
         WHERE department_id = ? AND status IN ('CALLED', 'SERVING')
         ORDER BY called_at DESC LIMIT 1`,
        [tok.department_id]
      );
      if (servingRows.length > 0) {
        currentServingToken = servingRows[0].token_number;
      }

      return {
        ...tok,
        peopleAhead,
        estimatedWaitMinutes,
        currentServingToken
      };
    })
  );

  return enrichedTokens;
};

/**
 * Get student's historical completed/cancelled/skipped tokens
 */
const getStudentHistory = async (studentId, limit = 25) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.token_number, t.status, t.skip_reason,
            t.created_at, t.called_at, t.serving_at, t.completed_at, t.cancelled_at, t.skipped_at,
            s.name AS service_name, d.name AS department_name, d.code AS department_code,
            c.counter_name
     FROM tokens t
     JOIN services s ON t.service_id = s.id
     JOIN departments d ON t.department_id = d.id
     LEFT JOIN counters c ON t.counter_id = c.id
     WHERE t.student_id = ?
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [studentId, parseInt(limit, 10)]
  );
  return rows;
};

/**
 * Get waiting queue and currently active token for a specific staff counter
 */
const getCounterQueue = async (counterId) => {
  const [counterRows] = await pool.query(
    `SELECT c.*, d.code AS department_code, d.name AS department_name
     FROM counters c
     JOIN departments d ON c.department_id = d.id
     WHERE c.id = ?`,
    [counterId]
  );

  if (counterRows.length === 0) {
    const err = new Error('Counter not found.');
    err.statusCode = 404;
    throw err;
  }
  const counter = counterRows[0];

  // Currently serving or called token on this counter
  const [currentTokens] = await pool.query(
    `SELECT t.*, s.name AS service_name,
            u.name AS student_name, u.college_id AS student_college_id,
            st.course, st.semester
     FROM tokens t
     JOIN services s ON t.service_id = s.id
     JOIN students st ON t.student_id = st.id
     JOIN users u ON st.user_id = u.id
     WHERE t.counter_id = ?
       AND t.status IN ('CALLED', 'SERVING')
     ORDER BY t.called_at DESC
     LIMIT 1`,
    [counterId]
  );

  // Eligible waiting tokens for this counter (filtered by mapped services or department services)
  const [waitingTokens] = await pool.query(
    `SELECT t.id, t.token_number, t.sequence_number, t.created_at, t.status,
            s.id AS service_id, s.name AS service_name, s.avg_service_minutes,
            u.name AS student_name, u.college_id AS student_college_id,
            st.course, st.semester
     FROM tokens t
     JOIN services s ON t.service_id = s.id
     JOIN students st ON t.student_id = st.id
     JOIN users u ON st.user_id = u.id
     WHERE t.department_id = ?
       AND t.status = 'WAITING'
       AND (
         t.service_id IN (SELECT service_id FROM counter_services WHERE counter_id = ?)
         OR NOT EXISTS (SELECT 1 FROM counter_services WHERE counter_id = ?)
       )
     ORDER BY t.created_at ASC, t.sequence_number ASC`,
    [counter.department_id, counterId, counterId]
  );

  return {
    counter,
    currentToken: currentTokens[0] || null,
    waitingQueue: waitingTokens,
    waitingCount: waitingTokens.length
  };
};

module.exports = {
  generateToken,
  cancelToken,
  callNextToken,
  recallToken,
  startServingToken,
  completeToken,
  skipToken,
  getStudentActiveTokens,
  getStudentHistory,
  getCounterQueue
};
