const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cqms_super_secret_jwt_key_2026_secure!');

    // Fetch user with fresh student/staff profile info
    const [rows] = await pool.query(
      `SELECT u.id, u.college_id, u.name, u.email, u.role, u.status,
              s.id AS student_id, s.course, s.semester, s.year,
              st.id AS staff_id, st.employee_id, st.department_id,
              d.code AS department_code, d.name AS department_name
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN staff st ON u.id = st.user_id
       LEFT JOIN departments d ON st.department_id = d.id
       WHERE u.id = ? AND u.status = 'ACTIVE'`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied for role '${req.user?.role || 'ANONYMOUS'}'. Required: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
};

module.exports = {
  verifyJWT,
  authorizeRoles
};
