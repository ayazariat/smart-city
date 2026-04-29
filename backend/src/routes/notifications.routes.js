const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authenticate } = require("../middleware/auth");

const buildNotificationQuery = (req) => {
  const query = { recipient: req.user.userId };

  if (req.query.unread === "true") {
    query.isRead = false;
  }

  return query;
};

const markNotificationAsReadHandler = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

const markAllNotificationsAsReadHandler = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

// GET /notifications - Get all notifications for current user
router.get("/", authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
    const query = buildNotificationQuery(req);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
      .populate({
        path: "complaint",
        select: "title _id"
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
      Notification.countDocuments(query),
    ]);

    // Transform notifications to include relatedId from complaint
    const transformedNotifications = notifications.map(n => ({
      _id: n._id,
      recipient: n.recipient,
      type: n.type,
      title: n.title,
      message: n.message,
      complaint: n.complaint,
      relatedId: n.complaint?._id || n.relatedId,
      isRead: n.isRead,
      createdAt: n.createdAt
    }));

    res.json({
      success: true,
      notifications: transformedNotifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// GET /notifications/count - Get unread notification count
router.get("/count", authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.userId,
      isRead: false,
    });

    res.json({
      success: true,
      unread: count,
    });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification count",
    });
  }
});

// PUT/PATCH /notifications/:id/read - Mark a notification as read
router.put("/:id/read", authenticate, markNotificationAsReadHandler);
router.patch("/:id/read", authenticate, markNotificationAsReadHandler);

// PUT/PATCH /notifications/read-all - Mark all notifications as read
router.put("/read-all", authenticate, markAllNotificationsAsReadHandler);
router.patch("/read-all", authenticate, markAllNotificationsAsReadHandler);

// DELETE /notifications/:id - Delete a notification
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
});

// Utility function to create notifications (to be called from other services)
const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

module.exports = {
  router,
  createNotification,
};
