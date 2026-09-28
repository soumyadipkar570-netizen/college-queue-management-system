const queueService = require('../services/queueService');
const pool = require('../config/db');

const createToken = async (req, res, next) => {
  try {
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid serviceId to generate a token.'
      });
    }

    const token = await queueService.generateToken(req.user.id, parseInt(serviceId, 10));

    res.status(201).json({
      success: true,
      message: `Token ${token.tokenNumber} generated successfully.`,
      token
    });
  } catch (error) {
    next(error);
  }
};

const getActiveTokens = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'No student profile linked to this account.'
      });
    }

    const activeTokens = await queueService.getStudentActiveTokens(studentId);

    res.json({
      success: true,
      activeTokens
    });
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'No student profile linked to this account.'
      });
    }

    const limit = parseInt(req.query.limit || '20', 10);
    const history = await queueService.getStudentHistory(studentId, limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    next(error);
  }
};

const getTokenById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT t.*, s.name AS service_name, s.token_prefix, s.avg_service_minutes,
              d.name AS department_name, d.code AS department_code,
              c.counter_name, u.name AS student_name, u.college_id, st.user_id AS student_user_id
       FROM tokens t
       JOIN services s ON t.service_id = s.id
       JOIN departments d ON t.department_id = d.id
       LEFT JOIN counters c ON t.counter_id = c.id
       JOIN students st ON t.student_id = st.id
       JOIN users u ON st.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.'
      });
    }

    const token = rows[0];

    // Ownership check for students
    if (req.user.role === 'STUDENT' && token.student_user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view tokens issued to other students.'
      });
    }

    // Calculate people ahead if still WAITING
    let peopleAhead = 0;
    if (token.status === 'WAITING') {
      const [aheadRows] = await pool.query(
        `SELECT COUNT(id) AS ahead_count
         FROM tokens
         WHERE service_id = ? AND status = 'WAITING' AND sequence_number < ?`,
        [token.service_id, token.sequence_number]
      );
      peopleAhead = aheadRows[0]?.ahead_count || 0;
    }

    res.json({
      success: true,
      token: {
        ...token,
        peopleAhead
      }
    });
  } catch (error) {
    next(error);
  }
};

const cancelToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await queueService.cancelToken(parseInt(id, 10), req.user.id, req.user.role);

    res.json({
      success: true,
      message: `Token ${result.tokenNumber} has been successfully cancelled.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createToken,
  getActiveTokens,
  getHistory,
  getTokenById,
  cancelToken
};
