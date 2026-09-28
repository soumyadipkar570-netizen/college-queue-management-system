const pool = require('../config/db');

/**
 * Calculates estimated wait time based on the PRD formula:
 * Estimated Wait = (People Ahead * Average Service Time) / Active Counters
 *
 * @param {number} serviceId - The ID of the service
 * @param {number} peopleAhead - Number of waiting tokens ahead
 * @returns {Promise<{ estimatedMinutes: number, avgServiceMinutes: number, activeCounters: number }>}
 */
const calculateWaitTime = async (serviceId, peopleAhead = 0) => {
  try {
    // 1. Fetch configured average service time and department ID
    const [serviceRows] = await pool.query(
      `SELECT id, department_id, avg_service_minutes FROM services WHERE id = ?`,
      [serviceId]
    );

    if (serviceRows.length === 0) {
      return { estimatedMinutes: 0, avgServiceMinutes: 5, activeCounters: 1 };
    }

    const service = serviceRows[0];
    let avgServiceTime = service.avg_service_minutes || 5;

    // 2. Check if recent completed tokens have reliable actual duration data
    const [recentCompleted] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, serving_at, completed_at)) as actual_avg,
              COUNT(id) as sample_count
       FROM tokens
       WHERE service_id = ?
         AND status = 'COMPLETED'
         AND serving_at IS NOT NULL
         AND completed_at IS NOT NULL
         AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)`,
      [serviceId]
    );

    if (recentCompleted.length > 0 && recentCompleted[0].sample_count >= 3 && recentCompleted[0].actual_avg > 0) {
      avgServiceTime = Math.round(recentCompleted[0].actual_avg);
    }

    // 3. Count active (OPEN) counters assigned to this service
    const [counterRows] = await pool.query(
      `SELECT COUNT(DISTINCT c.id) as active_count
       FROM counters c
       INNER JOIN counter_services cs ON c.id = cs.counter_id
       WHERE cs.service_id = ? AND c.status = 'OPEN'`,
      [serviceId]
    );

    let activeCounters = counterRows[0]?.active_count || 0;

    // If no counter specifically mapped or none open, check department open counters
    if (activeCounters === 0) {
      const [deptCounterRows] = await pool.query(
        `SELECT COUNT(id) as active_dept_counters
         FROM counters
         WHERE department_id = ? AND status = 'OPEN'`,
        [service.department_id]
      );
      activeCounters = deptCounterRows[0]?.active_dept_counters || 0;
    }

    // Divisor must be at least 1 to avoid division by zero
    const divisor = Math.max(activeCounters, 1);

    if (peopleAhead <= 0) {
      return {
        estimatedMinutes: 0,
        avgServiceMinutes: avgServiceTime,
        activeCounters
      };
    }

    const calculatedWait = Math.ceil((peopleAhead * avgServiceTime) / divisor);

    return {
      estimatedMinutes: Math.max(calculatedWait, 1),
      avgServiceMinutes: avgServiceTime,
      activeCounters
    };
  } catch (error) {
    console.error('Wait time calculation error:', error);
    return {
      estimatedMinutes: peopleAhead * 5,
      avgServiceMinutes: 5,
      activeCounters: 1
    };
  }
};

module.exports = {
  calculateWaitTime
};
