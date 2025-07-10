const Notification = require('../Model/Notification');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../Middleware/catchAsyncErrors');

// Get all notifications for the logged-in user
exports.getNotifications = catchAsyncErrors(async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Mark notification as read
exports.markAsRead = catchAsyncErrors(async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return next(new ErrorHandler('Notification not found', 404));
        }
        
        // Check if user is authorized to update this notification
        if (notification.recipient.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to update this notification', 403));
        }
        
        notification.read = true;
        await notification.save();
        
        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            notification
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Mark all notifications as read
exports.markAllAsRead = catchAsyncErrors(async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { read: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Delete notification
exports.deleteNotification = catchAsyncErrors(async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return next(new ErrorHandler('Notification not found', 404));
        }
        
        // Check if user is authorized to delete this notification
        if (notification.recipient.toString() !== req.user.id) {
            return next(new ErrorHandler('You are not authorized to delete this notification', 403));
        }
        
        await notification.deleteOne();
        
        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}); 