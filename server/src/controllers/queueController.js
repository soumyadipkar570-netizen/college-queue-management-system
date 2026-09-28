const pool = require('../config/db');

const getLiveQueueStatus = async (req, res, next) => {
  try {
    const [departments] = await pool.query(`SELECT * FROM departments WHERE status = 'ACTIVE' ORDER BY id ASC`);

    const result = await Promise.all(
      departments.map(async (dept) => {
        // Open counters
        const [counters] = await pool.query(
          `SELECT id, counter_name, status FROM counters WHERE department_id = ?`,
          [dept.id]
        );

        // Currently serving token
        const [serving] = await pool.query(
          `SELECT t.token_number, t.called_at, c.counter_name, s.name AS service_name
           FROM tokens t
           JOIN services s ON t.service_id = s.id
           LEFT JOIN counters c ON t.counter_id = c.id
           WHERE t.department_id = ? AND t.status IN ('CALLED', 'SERVING')
           ORDER BY t.called_at DESC
           LIMIT 1`,
          [dept.id]
        );

        // Waiting count
        const [waiting] = await pool.query(
          `SELECT COUNT(id) AS count FROM tokens WHERE department_id = ? AND status = 'WAITING'`,
          [dept.id]
        );

        // Completed today
        const [completed] = await pool.query(
          `SELECT COUNT(id) AS count FROM tokens WHERE department_id = ? AND status = 'COMPLETED' AND DATE(created_at) = CURDATE()`,
          [dept.id]
        );

        // Services overview
        const [services] = await pool.query(
          `SELECT s.id, s.name, s.token_prefix, s.avg_service_minutes,
                  COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) AS waiting_count
           FROM services s
           LEFT JOIN tokens t ON s.id = t.service_id AND t.status = 'WAITING'
           WHERE s.department_id = ? AND s.status = 'ACTIVE'
           GROUP BY s.id`,
          [dept.id]
        );

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          departmentCode: dept.code,
          description: dept.description,
          counters,
          activeCountersCount: counters.filter((c) => c.status === 'OPEN').length,
          currentServing: serving[0] || null,
          waitingCount: waiting[0]?.count || 0,
          completedToday: completed[0]?.count || 0,
          services
        };
      })
    );

    res.json({
      success: true,
      queues: result
    });
  } catch (error) {
    next(error);
  }
};

const getServiceQueueStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [services] = await pool.query(
      `SELECT s.*, d.name AS department_name, d.code AS department_code
       FROM services s
       JOIN departments d ON s.department_id = d.id
       WHERE s.id = ?`,
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    const service = services[0];

    const [waitingRows] = await pool.query(
      `SELECT COUNT(id) AS waiting_count FROM tokens WHERE service_id = ? AND status = 'WAITING'`,
      [id]
    );
    const waitingCount = waitingRows[0]?.waiting_count || 0;

    const [openCountersRows] = await pool.query(
      `SELECT COUNT(id) AS active_count FROM counters WHERE department_id = ? AND status = 'OPEN'`,
      [service.department_id]
    );
    const activeCounters = openCountersRows[0]?.active_count || 1;

    const estimatedWait = Math.ceil((waitingCount * service.avg_service_minutes) / Math.max(activeCounters, 1));

    res.json({
      success: true,
      serviceId: service.id,
      serviceName: service.name,
      departmentCode: service.department_code,
      waitingCount,
      estimatedWaitMinutes: waitingCount > 0 ? Math.max(estimatedWait, 1) : 0,
      activeCounters
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiveQueueStatus,
  getServiceQueueStatus
};
