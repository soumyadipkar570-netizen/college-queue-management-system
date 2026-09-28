const pool = require('../config/db');

const getDepartments = async (req, res, next) => {
  try {
    const [departments] = await pool.query(
      `SELECT d.*,
              COUNT(DISTINCT s.id) AS services_count,
              COUNT(DISTINCT CASE WHEN c.status = 'OPEN' THEN c.id END) AS open_counters_count,
              COUNT(DISTINCT c.id) AS total_counters_count
       FROM departments d
       LEFT JOIN services s ON d.id = s.department_id AND s.status = 'ACTIVE'
       LEFT JOIN counters c ON d.id = c.department_id
       WHERE d.status = 'ACTIVE'
       GROUP BY d.id
       ORDER BY d.id ASC`
    );

    // Also get active queue count per department
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const [tokenRows] = await pool.query(
          `SELECT COUNT(id) AS waiting_count
           FROM tokens
           WHERE department_id = ? AND status = 'WAITING'`,
          [dept.id]
        );
        return {
          ...dept,
          waitingCount: tokenRows[0]?.waiting_count || 0
        };
      })
    );

    res.json({
      success: true,
      departments: enriched
    });
  } catch (error) {
    next(error);
  }
};

const getDepartmentServices = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deptRows] = await pool.query(
      `SELECT * FROM departments WHERE id = ? OR code = ?`,
      [id, id]
    );

    if (deptRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    const dept = deptRows[0];

    const [services] = await pool.query(
      `SELECT s.*,
              COUNT(DISTINCT CASE WHEN t.status = 'WAITING' THEN t.id END) AS waiting_tokens_count
       FROM services s
       LEFT JOIN tokens t ON s.id = t.service_id AND t.status = 'WAITING'
       WHERE s.department_id = ? AND s.status = 'ACTIVE'
       GROUP BY s.id
       ORDER BY s.id ASC`,
      [dept.id]
    );

    // Calculate approximate wait time for each service
    const servicesWithWait = await Promise.all(
      services.map(async (svc) => {
        const [openCounters] = await pool.query(
          `SELECT COUNT(id) as count FROM counters WHERE department_id = ? AND status = 'OPEN'`,
          [dept.id]
        );
        const activeCount = openCounters[0]?.count || 1;
        const estimatedWait = Math.ceil((svc.waiting_tokens_count * svc.avg_service_minutes) / Math.max(activeCount, 1));

        return {
          ...svc,
          estimatedWaitMinutes: svc.waiting_tokens_count > 0 ? Math.max(estimatedWait, 1) : 0,
          activeCountersCount: activeCount
        };
      })
    );

    res.json({
      success: true,
      department: dept,
      services: servicesWithWait
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentServices
};
