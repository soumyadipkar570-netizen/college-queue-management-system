const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');

const login = async (req, res, next) => {
  try {
    const { identifier, email, college_id, password } = req.body;
    const loginId = identifier || email || college_id;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both college ID / email and password.'
      });
    }

    // Query user by email OR college_id
    const [users] = await pool.query(
      `SELECT u.id, u.college_id, u.name, u.email, u.password_hash, u.role, u.status,
              s.id AS student_id, s.course, s.semester, s.year,
              st.id AS staff_id, st.employee_id, st.department_id,
              d.code AS department_code, d.name AS department_name
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN staff st ON u.id = st.user_id
       LEFT JOIN departments d ON st.department_id = d.id
       WHERE (u.email = ? OR u.college_id = ?) AND u.status = 'ACTIVE'`,
      [loginId.trim().toLowerCase(), loginId.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your College ID/Email and password.'
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your College ID/Email and password.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        college_id: user.college_id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET || 'cqms_super_secret_jwt_key_2026_secure!',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // If staff, also retrieve their current assigned counter
    let assignedCounter = null;
    if (user.role === 'LIBRARY_STAFF' || user.role === 'FEES_STAFF') {
      const [counterRows] = await pool.query(
        `SELECT c.id, c.counter_name, c.status, c.department_id
         FROM staff_counters sc
         JOIN counters c ON sc.counter_id = c.id
         WHERE sc.staff_id = ? AND sc.is_current = TRUE
         LIMIT 1`,
        [user.staff_id]
      );
      if (counterRows.length > 0) {
        assignedCounter = counterRows[0];
      }
    }

    // Audit login
    await logAudit(user.id, 'USER_LOGIN', 'USER', user.id, { role: user.role }, req);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        collegeId: user.college_id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        course: user.course,
        semester: user.semester,
        year: user.year,
        staffId: user.staff_id,
        employeeId: user.employee_id,
        departmentId: user.department_id,
        departmentCode: user.department_code,
        departmentName: user.department_name,
        assignedCounter
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let assignedCounter = null;

    if (user.role === 'LIBRARY_STAFF' || user.role === 'FEES_STAFF') {
      const [counterRows] = await pool.query(
        `SELECT c.id, c.counter_name, c.status, c.department_id
         FROM staff_counters sc
         JOIN counters c ON sc.counter_id = c.id
         WHERE sc.staff_id = ? AND sc.is_current = TRUE
         LIMIT 1`,
        [user.staff_id]
      );
      if (counterRows.length > 0) {
        assignedCounter = counterRows[0];
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        collegeId: user.college_id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        course: user.course,
        semester: user.semester,
        year: user.year,
        staffId: user.staff_id,
        employeeId: user.employee_id,
        departmentId: user.department_id,
        departmentCode: user.department_code,
        departmentName: user.department_name,
        assignedCounter
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe
};
