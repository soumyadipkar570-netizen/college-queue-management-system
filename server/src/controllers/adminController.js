const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');
const bcrypt = require('bcryptjs');

/**
 * System-wide and Department-wise Analytics with flexible date filtering
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { range = 'today', startDate, endDate, departmentId } = req.query;

    let dateCondition = `DATE(t.created_at) = CURDATE()`;
    if (range === 'week') {
      dateCondition = `t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    } else if (range === 'month') {
      dateCondition = `t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    } else if (range === 'custom' && startDate && endDate) {
      dateCondition = `DATE(t.created_at) BETWEEN ${pool.escape(startDate)} AND ${pool.escape(endDate)}`;
    }

    let deptCondition = '';
    if (departmentId && departmentId !== 'ALL') {
      deptCondition = `AND t.department_id = ${pool.escape(departmentId)}`;
    }

    // 1. KPI Aggregates
    const [kpiRows] = await pool.query(
      `SELECT
         COUNT(t.id) AS total_tokens,
         COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) AS waiting_now,
         COUNT(CASE WHEN t.status = 'SERVING' THEN 1 END) AS serving_now,
         COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_today,
         COUNT(CASE WHEN t.status = 'SKIPPED' THEN 1 END) AS skipped_today,
         COUNT(CASE WHEN t.status = 'CANCELLED' THEN 1 END) AS cancelled_today,
         AVG(CASE WHEN t.called_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.called_at) END) AS avg_wait_minutes,
         AVG(CASE WHEN t.status = 'COMPLETED' AND t.serving_at IS NOT NULL AND t.completed_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, t.serving_at, t.completed_at) END) AS avg_service_minutes
       FROM tokens t
       WHERE ${dateCondition} ${deptCondition}`
    );

    const kpi = kpiRows[0];
    const totalIssued = kpi.total_tokens || 0;
    const completed = kpi.completed_today || 0;
    const completionRate = totalIssued > 0 ? Math.round((completed / totalIssued) * 100) : 0;

    // 2. Department Breakdown (Library vs Fees)
    const [deptBreakdown] = await pool.query(
      `SELECT
         d.id, d.name, d.code,
         COUNT(t.id) AS total_tokens,
         COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) AS waiting_count,
         COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_count,
         COUNT(CASE WHEN t.status = 'SKIPPED' THEN 1 END) AS skipped_count,
         COUNT(CASE WHEN t.status = 'CANCELLED' THEN 1 END) AS cancelled_count,
         AVG(CASE WHEN t.called_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.called_at) END) AS avg_wait_minutes,
         AVG(CASE WHEN t.status = 'COMPLETED' AND t.serving_at IS NOT NULL AND t.completed_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, t.serving_at, t.completed_at) END) AS avg_service_minutes
       FROM departments d
       LEFT JOIN tokens t ON d.id = t.department_id AND (${dateCondition})
       GROUP BY d.id
       ORDER BY d.id ASC`
    );

    // 3. Hourly Traffic (Peak Queue Period)
    const [hourlyRows] = await pool.query(
      `SELECT
         HOUR(t.created_at) AS hour_of_day,
         COUNT(t.id) AS tokens_count,
         COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_count
       FROM tokens t
       WHERE ${dateCondition} ${deptCondition}
       GROUP BY HOUR(t.created_at)
       ORDER BY hour_of_day ASC`
    );

    // Format all 24 hours (or 8 AM to 6 PM)
    const hourlyDistribution = [];
    for (let h = 8; h <= 18; h++) {
      const match = hourlyRows.find((r) => r.hour_of_day === h);
      const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
      hourlyDistribution.push({
        hour: hourLabel,
        tokens: match?.tokens_count || 0,
        completed: match?.completed_count || 0
      });
    }

    // 4. Daily Volume Trends (Past 7 Days)
    const [dailyRows] = await pool.query(
      `SELECT
         DATE_FORMAT(t.created_at, '%Y-%m-%d') AS date_label,
         COUNT(t.id) AS total,
         COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed,
         COUNT(CASE WHEN t.status = 'SKIPPED' THEN 1 END) AS skipped,
         COUNT(CASE WHEN t.status = 'CANCELLED' THEN 1 END) AS cancelled
       FROM tokens t
       WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${deptCondition}
       GROUP BY DATE_FORMAT(t.created_at, '%Y-%m-%d')
       ORDER BY date_label ASC`
    );

    // 5. Counter Performance
    const [counterPerformance] = await pool.query(
      `SELECT
         c.id, c.counter_name, c.status, d.code AS dept_code,
         COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS served_count,
         COUNT(CASE WHEN t.status = 'SKIPPED' THEN 1 END) AS skipped_count,
         AVG(CASE WHEN t.status = 'COMPLETED' AND t.serving_at IS NOT NULL AND t.completed_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, t.serving_at, t.completed_at) END) AS avg_duration_minutes
       FROM counters c
       JOIN departments d ON c.department_id = d.id
       LEFT JOIN tokens t ON c.id = t.counter_id AND (${dateCondition})
       GROUP BY c.id
       ORDER BY c.department_id ASC, c.id ASC`
    );

    // 6. Service Volume Breakdown
    const [serviceStats] = await pool.query(
      `SELECT
         s.id, s.name, s.token_prefix, d.code AS dept_code,
         COUNT(t.id) AS total_requests,
         COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_count
       FROM services s
       JOIN departments d ON s.department_id = d.id
       LEFT JOIN tokens t ON s.id = t.service_id AND (${dateCondition})
       GROUP BY s.id
       ORDER BY total_requests DESC`
    );

    res.json({
      success: true,
      filter: { range, startDate, endDate, departmentId },
      kpis: {
        totalTokens: kpi.total_tokens || 0,
        waitingNow: kpi.waiting_now || 0,
        servingNow: kpi.serving_now || 0,
        completedToday: kpi.completed_today || 0,
        skippedToday: kpi.skipped_today || 0,
        cancelledToday: kpi.cancelled_today || 0,
        avgWaitMinutes: kpi.avg_wait_minutes ? Math.round(kpi.avg_wait_minutes * 10) / 10 : 0,
        avgServiceMinutes: kpi.avg_service_minutes ? Math.round(kpi.avg_service_minutes * 10) / 10 : 0,
        completionRate
      },
      departmentBreakdown: deptBreakdown.map((d) => ({
        ...d,
        avg_wait_minutes: d.avg_wait_minutes ? Math.round(d.avg_wait_minutes * 10) / 10 : 0,
        avg_service_minutes: d.avg_service_minutes ? Math.round(d.avg_service_minutes * 10) / 10 : 0
      })),
      hourlyDistribution,
      dailyTrends: dailyRows,
      counterPerformance: counterPerformance.map((c) => ({
        ...c,
        avg_duration_minutes: c.avg_duration_minutes ? Math.round(c.avg_duration_minutes * 10) / 10 : 0
      })),
      serviceStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report generation & CSV Export API
 */
const getReports = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      departmentId,
      serviceId,
      status,
      format = 'json',
      limit = 100,
      offset = 0
    } = req.query;

    let conditions = ['1=1'];
    const params = [];

    if (startDate) {
      conditions.push('DATE(t.created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(t.created_at) <= ?');
      params.push(endDate);
    }
    if (departmentId && departmentId !== 'ALL') {
      conditions.push('t.department_id = ?');
      params.push(departmentId);
    }
    if (serviceId && serviceId !== 'ALL') {
      conditions.push('t.service_id = ?');
      params.push(serviceId);
    }
    if (status && status !== 'ALL') {
      conditions.push('t.status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Count total records
    const [countRows] = await pool.query(
      `SELECT COUNT(t.id) as total FROM tokens t WHERE ${whereClause}`,
      params
    );
    const totalRecords = countRows[0].total;

    // Fetch matching token records
    const queryParams = [...params];
    let limitClause = '';
    if (format !== 'csv') {
      limitClause = `LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(limit, 10), parseInt(offset, 10));
    }

    const [rows] = await pool.query(
      `SELECT t.id, t.token_number, t.status, t.skip_reason,
              t.created_at, t.called_at, t.serving_at, t.completed_at, t.cancelled_at, t.skipped_at,
              TIMESTAMPDIFF(MINUTE, t.created_at, t.called_at) AS wait_duration_minutes,
              TIMESTAMPDIFF(MINUTE, t.serving_at, t.completed_at) AS service_duration_minutes,
              s.name AS service_name,
              d.name AS department_name, d.code AS department_code,
              c.counter_name,
              u.name AS student_name, u.college_id AS student_college_id,
              staff_u.name AS staff_name
       FROM tokens t
       JOIN services s ON t.service_id = s.id
       JOIN departments d ON t.department_id = d.id
       LEFT JOIN counters c ON t.counter_id = c.id
       JOIN students st ON t.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN staff stf ON t.staff_id = stf.id
       LEFT JOIN users staff_u ON stf.user_id = staff_u.id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC
       ${limitClause}`,
      queryParams
    );

    if (format === 'csv') {
      // Build CSV String
      const headers = [
        'Token Number',
        'Department',
        'Service',
        'Student Name',
        'College ID',
        'Counter',
        'Staff',
        'Status',
        'Wait Time (Min)',
        'Service Time (Min)',
        'Skip Reason',
        'Created At',
        'Completed At'
      ];

      const csvRows = [headers.join(',')];
      for (const r of rows) {
        csvRows.push([
          `"${r.token_number || ''}"`,
          `"${r.department_name || ''}"`,
          `"${r.service_name || ''}"`,
          `"${r.student_name || ''}"`,
          `"${r.student_college_id || ''}"`,
          `"${r.counter_name || 'N/A'}"`,
          `"${r.staff_name || 'N/A'}"`,
          `"${r.status || ''}"`,
          r.wait_duration_minutes !== null ? r.wait_duration_minutes : '',
          r.service_duration_minutes !== null ? r.service_duration_minutes : '',
          `"${r.skip_reason || ''}"`,
          `"${r.created_at ? new Date(r.created_at).toISOString() : ''}"`,
          `"${r.completed_at ? new Date(r.completed_at).toISOString() : ''}"`
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=cqms-report-${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csvRows.join('\r\n'));
    }

    res.json({
      success: true,
      totalRecords,
      records: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Service Management
 */
const getServices = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, d.name AS department_name, d.code AS department_code
       FROM services s
       JOIN departments d ON s.department_id = d.id
       ORDER BY s.department_id ASC, s.id ASC`
    );
    res.json({ success: true, services: rows });
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { departmentId, name, tokenPrefix, avgServiceMinutes } = req.body;
    if (!departmentId || !name || !tokenPrefix) {
      return res.status(400).json({ success: false, message: 'Department, name, and token prefix are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO services (department_id, name, token_prefix, avg_service_minutes, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [departmentId, name, tokenPrefix.toUpperCase(), avgServiceMinutes || 5]
    );

    await logAudit(req.user.id, 'CREATE_SERVICE', 'SERVICE', result.insertId, { name, tokenPrefix }, req);

    res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      serviceId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, tokenPrefix, avgServiceMinutes, status } = req.body;

    await pool.query(
      `UPDATE services
       SET name = COALESCE(?, name),
           token_prefix = COALESCE(?, token_prefix),
           avg_service_minutes = COALESCE(?, avg_service_minutes),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name, tokenPrefix, avgServiceMinutes, status, id]
    );

    await logAudit(req.user.id, 'UPDATE_SERVICE', 'SERVICE', id, req.body, req);

    res.json({ success: true, message: 'Service updated successfully.' });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE services SET status = 'INACTIVE' WHERE id = ?`, [id]);
    await logAudit(req.user.id, 'DEACTIVATE_SERVICE', 'SERVICE', id, null, req);
    res.json({ success: true, message: 'Service deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Counter Management
 */
const getCounters = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, d.name AS department_name, d.code AS department_code,
              u.name AS current_staff_name, st.employee_id
       FROM counters c
       JOIN departments d ON c.department_id = d.id
       LEFT JOIN staff_counters sc ON c.id = sc.counter_id AND sc.is_current = TRUE
       LEFT JOIN staff st ON sc.staff_id = st.id
       LEFT JOIN users u ON st.user_id = u.id
       ORDER BY c.department_id ASC, c.id ASC`
    );
    res.json({ success: true, counters: rows });
  } catch (error) {
    next(error);
  }
};

const createCounter = async (req, res, next) => {
  try {
    const { departmentId, counterName } = req.body;
    if (!departmentId || !counterName) {
      return res.status(400).json({ success: false, message: 'Department and counter name are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO counters (department_id, counter_name, status) VALUES (?, ?, 'CLOSED')`,
      [departmentId, counterName]
    );

    // Auto-map all existing services of this department to this counter
    const [services] = await pool.query(`SELECT id FROM services WHERE department_id = ?`, [departmentId]);
    for (const s of services) {
      await pool.query(`INSERT IGNORE INTO counter_services (counter_id, service_id) VALUES (?, ?)`, [result.insertId, s.id]);
    }

    await logAudit(req.user.id, 'CREATE_COUNTER', 'COUNTER', result.insertId, { counterName }, req);

    res.status(201).json({
      success: true,
      message: 'Counter created successfully.',
      counterId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

const updateCounter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { counterName, status } = req.body;

    await pool.query(
      `UPDATE counters
       SET counter_name = COALESCE(?, counter_name),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [counterName, status, id]
    );

    await logAudit(req.user.id, 'UPDATE_COUNTER', 'COUNTER', id, req.body, req);

    res.json({ success: true, message: 'Counter updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign Staff to Counter
 */
const assignStaffCounter = async (req, res, next) => {
  try {
    const { staffId, counterId } = req.body;
    if (!staffId || !counterId) {
      return res.status(400).json({ success: false, message: 'Both staffId and counterId are required.' });
    }

    // Set previous assignments for this staff to not current
    await pool.query(`UPDATE staff_counters SET is_current = FALSE, active_to = NOW() WHERE staff_id = ?`, [staffId]);

    // Create new assignment
    await pool.query(
      `INSERT INTO staff_counters (staff_id, counter_id, is_current, active_from)
       VALUES (?, ?, TRUE, NOW())`,
      [staffId, counterId]
    );

    await logAudit(req.user.id, 'ASSIGN_STAFF_COUNTER', 'STAFF_COUNTER', counterId, { staffId, counterId }, req);

    res.json({ success: true, message: 'Staff assigned to counter successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Staff & Student User Lists
 */
const getStaffList = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT st.id AS staff_id, st.employee_id, st.department_id,
              u.id AS user_id, u.name, u.email, u.college_id, u.role, u.status,
              d.name AS department_name, d.code AS department_code,
              c.id AS assigned_counter_id, c.counter_name AS assigned_counter_name
       FROM staff st
       JOIN users u ON st.user_id = u.id
       JOIN departments d ON st.department_id = d.id
       LEFT JOIN staff_counters sc ON st.id = sc.staff_id AND sc.is_current = TRUE
       LEFT JOIN counters c ON sc.counter_id = c.id
       ORDER BY d.id ASC, u.name ASC`
    );
    res.json({ success: true, staff: rows });
  } catch (error) {
    next(error);
  }
};

const getStudentList = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.course, s.semester, s.year,
              u.id AS user_id, u.name, u.email, u.college_id, u.status, u.created_at,
              COUNT(t.id) AS total_tokens_issued
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN tokens t ON s.id = t.student_id
       GROUP BY s.id
       ORDER BY u.name ASC`
    );
    res.json({ success: true, students: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * System Settings
 */
const getSettings = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM system_settings ORDER BY id ASC`);
    res.json({ success: true, settings: rows });
  } catch (error) {
    next(error);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    await pool.query(
      `UPDATE system_settings SET setting_value = ? WHERE setting_key = ?`,
      [value, key]
    );
    await logAudit(req.user.id, 'UPDATE_SETTING', 'SYSTEM_SETTINGS', null, { key, value }, req);
    res.json({ success: true, message: `Setting '${key}' updated.` });
  } catch (error) {
    next(error);
  }
};

/**
 * Audit Logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS actor_name, u.email AS actor_email, u.role AS actor_role
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ success: true, logs: rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getReports,
  getServices,
  createService,
  updateService,
  deleteService,
  getCounters,
  createCounter,
  updateCounter,
  assignStaffCounter,
  getStaffList,
  getStudentList,
  getSettings,
  updateSetting,
  getAuditLogs
};
