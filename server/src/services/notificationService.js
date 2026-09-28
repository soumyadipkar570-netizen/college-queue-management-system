const pool = require('../config/db');

const createNotification = async (userId, tokenId, type, title, message) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, token_id, type, title, message, is_read)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [userId, tokenId || null, type, title, message]
    );

    return {
      id: result.insertId,
      userId,
      tokenId,
      type,
      title,
      message,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

const getUserNotifications = async (userId) => {
  const [rows] = await pool.query(
    `SELECT n.*, t.token_number
     FROM notifications n
     LEFT JOIN tokens t ON n.token_id = t.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 30`,
    [userId]
  );
  return rows;
};

const markNotificationRead = async (notificationId, userId) => {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
};

const markAllNotificationsRead = async (userId) => {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = ? AND is_read = FALSE`,
    [userId]
  );
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
