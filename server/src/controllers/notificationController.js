const {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const list = await getUserNotifications(req.user.id);
    const unreadCount = list.filter((n) => !n.is_read).length;

    res.json({
      success: true,
      unreadCount,
      notifications: list
    });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await markNotificationRead(parseInt(id, 10), req.user.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead
};
