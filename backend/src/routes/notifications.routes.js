const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Get paginated notifications for the authenticated user
 * Query params: ?page=1&limit=20&unreadOnly=false
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const unreadOnly = req.query.unreadOnly === 'true';

    const Notification = require('../models/Notification');
    const query = { userId: req.user.userId };

    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate({
          path: 'complaintId',
          select: 'title _id',
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    // Transform to match frontend Notification type
    const transformed = notifications.map((n) => ({
      _id: n._id.toString(),
      userId: n.userId.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      complaint: n.complaintId ? { _id: n.complaintId._id.toString(), title: n.complaintId.title } : undefined,
      relatedId: n.relatedId?.toString(),
      isRead: n.read, // Alias for frontend compatibility
      read: n.read,
      createdAt: n.createdAt,
      metadata: n.metadata || {},
    }));

    res.json({
      success: true,
      notifications: transformed,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
});

/**
 * GET /api/notifications/count
 * Get unread notification count for the authenticated user
 */
router.get('/count', authenticate, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const count = await Notification.countDocuments({
      userId: req.user.userId,
      read: false,
    });

    res.json({
      success: true,
      unread: count,
    });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification count',
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Alternate endpoint for marking as read
 */
router.put('/:id/read', authenticate, async (req) => {
  return req.patch('/' + req.params.id + '/read'); // delegate to PATCH handler
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    await Notification.updateMany(
      { userId: req.user.userId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
    });
  }
});

/**
 * PUT /api/notifications/read-all
 * Alternate endpoint for marking all as read
 */
router.put('/read-all', authenticate, async (req) => {
  return req.patch('/read-all'); // delegate to PATCH handler
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
});

module.exports = {
  router,
  // Also export the service for use in other modules (backward compatibility)
  createNotification: require('../services/notification.service').createNotification,
};
