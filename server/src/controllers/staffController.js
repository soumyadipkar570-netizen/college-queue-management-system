const queueService = require('../services/queueService');
const pool = require('../config/db');
const { emitCounterStatus } = require('../sockets/socketManager');
const { logAudit } = require('../middleware/audit');

const getAssignedCounter = async (req, res, next) => {
  try {
    const staffId = req.user.staff_id;
    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'No staff record found for this user.'
      });
    }

    const [rows] = await pool.query(
      `SELECT c.*, d.code AS department_code, d.name AS department_name,
              sc.id AS assignment_id
       FROM staff_counters sc
       JOIN counters c ON sc.counter_id = c.id
       JOIN departments d ON c.department_id = d.id
       WHERE sc.staff_id = ? AND sc.is_current = TRUE
       LIMIT 1`,
      [staffId]
    );

    if (rows.length === 0) {
      // Find any counter in their department to assign or prompt
      const [deptCounters] = await pool.query(
        `SELECT c.*, d.code AS department_code, d.name AS department_name
         FROM counters c
         JOIN departments d ON c.department_id = d.id
         WHERE c.department_id = ?
         LIMIT 1`,
        [req.user.department_id]
      );

      if (deptCounters.length > 0) {
        const counter = deptCounters[0];
        // Auto-assign as fallback
        await pool.query(
          `INSERT INTO staff_counters (staff_id, counter_id, is_current) VALUES (?, ?, TRUE)`,
          [staffId, counter.id]
        );
        const queueData = await queueService.getCounterQueue(counter.id);
        return res.json({
          success: true,
          counter,
          ...queueData
        });
      }

      return res.status(404).json({
        success: false,
        message: 'No counter assigned to this staff member. Please contact administrator.'
      });
    }

    const counter = rows[0];
    const queueData = await queueService.getCounterQueue(counter.id);

    res.json({
      success: true,
      counter,
      ...queueData
    });
  } catch (error) {
    next(error);
  }
};

const toggleCounterStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'OPEN' or 'CLOSED'

    if (!['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'OPEN' or 'CLOSED'."
      });
    }

    const [counterRows] = await pool.query(
      `SELECT c.*, d.code AS department_code, d.name AS department_name
       FROM counters c
       JOIN departments d ON c.department_id = d.id
       WHERE c.id = ?`,
      [id]
    );

    if (counterRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Counter not found.'
      });
    }
    const counter = counterRows[0];

    // Department match check
    if (counter.department_id !== req.user.department_id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot toggle counters in another department.'
      });
    }

    await pool.query(`UPDATE counters SET status = ? WHERE id = ?`, [status, id]);

    emitCounterStatus(counter.id, {
      counterId: counter.id,
      counterName: counter.counter_name,
      departmentId: counter.department_id,
      departmentCode: counter.department_code,
      status
    });

    await logAudit(req.user.id, `COUNTER_${status}`, 'COUNTER', counter.id, { status }, req);

    res.json({
      success: true,
      message: `Counter ${counter.counter_name} is now ${status}.`,
      status
    });
  } catch (error) {
    next(error);
  }
};

const getCounterQueue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await queueService.getCounterQueue(parseInt(id, 10));
    res.json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
};

const callNext = async (req, res, next) => {
  try {
    const { id } = req.params; // counterId
    const result = await queueService.callNextToken(parseInt(id, 10), req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const recall = async (req, res, next) => {
  try {
    const { id } = req.params; // tokenId
    const result = await queueService.recallToken(parseInt(id, 10), req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const startServing = async (req, res, next) => {
  try {
    const { id } = req.params; // tokenId
    const result = await queueService.startServingToken(parseInt(id, 10), req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const complete = async (req, res, next) => {
  try {
    const { id } = req.params; // tokenId
    const result = await queueService.completeToken(parseInt(id, 10), req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const skip = async (req, res, next) => {
  try {
    const { id } = req.params; // tokenId
    const { reason } = req.body;
    const result = await queueService.skipToken(parseInt(id, 10), req.user.id, reason || 'Student did not appear');
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getCounterStats = async (req, res, next) => {
  try {
    const { id } = req.params; // counterId
    const today = new Date().toISOString().slice(0, 10);

    const [statsRows] = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_today,
         COUNT(CASE WHEN status = 'SKIPPED' THEN 1 END) AS skipped_today,
         COUNT(CASE WHEN status = 'SERVING' THEN 1 END) AS serving_now,
         AVG(CASE WHEN status = 'COMPLETED' AND serving_at IS NOT NULL AND completed_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, serving_at, completed_at) END) AS avg_service_time_minutes
       FROM tokens
       WHERE counter_id = ? AND DATE(created_at) = ?`,
      [id, today]
    );

    const stats = statsRows[0];

    res.json({
      success: true,
      stats: {
        completedToday: stats.completed_today || 0,
        skippedToday: stats.skipped_today || 0,
        servingNow: stats.serving_now || 0,
        avgServiceMinutes: stats.avg_service_time_minutes ? Math.round(stats.avg_service_time_minutes * 10) / 10 : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedCounter,
  toggleCounterStatus,
  getCounterQueue,
  callNext,
  recall,
  startServing,
  complete,
  skip,
  getCounterStats
};
