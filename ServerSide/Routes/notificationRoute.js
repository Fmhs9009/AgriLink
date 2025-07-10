const express = require('express');
const { 
    getNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
} = require('../Controller/notificationController');
const { verifyToken } = require('../Middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all notifications for the logged-in user
router.route('/notifications').get(getNotifications);

// Mark all notifications as read
router.route('/notifications/mark-all-read').put(markAllAsRead);

// Mark notification as read and delete notification
router.route('/notifications/:id')
    .put(markAsRead)
    .delete(deleteNotification);

module.exports = router; 