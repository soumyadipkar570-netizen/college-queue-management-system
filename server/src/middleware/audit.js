const pool = require('../config/db');

const logAudit = async (actorUserId, action, entityType, entityId = null, metadata = null, req = null) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [actorUserId || null, action, entityType, entityId, metaStr, ip]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error.message);
  }
};

module.exports = { logAudit };
