/**
 * Notification Service
 * Centralized service for creating and managing notifications.
 * Uses the new Notification schema with userId, type, message, complaintId, metadata, read.
 */

const User = require('../models/User');

/**
 * Normalize user ID to string
 */
const normalizeUserId = (userId) => {
  if (!userId) return null;
  if (typeof userId === 'string') return userId;
  if (typeof userId === 'object') {
    if (userId._id) return userId._id.toString();
    if (userId.id) return userId.id.toString();
  }
  return null;
};

/**
 * Create a notification in the database
 * This is the primary method for creating notifications - use this everywhere
 */
const createNotification = async (data) => {
  const {
    userId,
    type,
    message,
    title = 'Notification',
    complaintId,
    relatedId,
    metadata = {},
    read = false,
  } = data;

  if (!userId || !type || !message) {
    throw new Error('userId, type, and message are required');
  }

  const Notification = require('../models/Notification');
  const mongoose = require('mongoose');

  try {
    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(normalizeUserId(userId)),
      type,
      message,
      title,
      complaintId: complaintId ? new mongoose.Types.ObjectId(complaintId) : undefined,
      relatedId: relatedId ? new mongoose.Types.ObjectId(relatedId) : undefined,
      metadata,
      read,
    });

    return notification;
  } catch (err) {
    console.error('[NotificationService.create] Error:', err.message);
    throw err;
  }
};

/**
 * Send real-time notification via Socket.IO and persist to database
 */
const sendNotification = async (io, recipientId, data) => {
  const { type, title, message, complaintId, relatedId, metadata = {} } = data;

  const Notification = require('../models/Notification');
  const mongoose = require('mongoose');

  try {
    const normalizedUserId = normalizeUserId(recipientId);
    if (!normalizedUserId) throw new Error('Invalid recipient id');

    const safeTitle = title || 'Notification';
    const safeMessage = message || safeTitle;
    const targetComplaintId = complaintId || relatedId;

    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      type,
      title: safeTitle,
      message: safeMessage,
      complaintId: targetComplaintId ? new mongoose.Types.ObjectId(targetComplaintId) : undefined,
      relatedId: targetComplaintId ? new mongoose.Types.ObjectId(targetComplaintId) : undefined,
      metadata,
      read: false,
    });

    // Emit real-time notification via Socket.IO
    if (io) {
      const realtimePayload = {
        _id: notification._id,
        userId: normalizedUserId,
        type,
        title: safeTitle,
        message: safeMessage,
        complaintId: targetComplaintId,
        relatedId: targetComplaintId,
        isRead: false,
        read: false,
        createdAt: notification.createdAt,
        metadata,
      };

      io.to(`user:${normalizedUserId}`).emit('notification:new', realtimePayload);
      io.to(`user:${normalizedUserId}`).emit('notification', realtimePayload);
    }

    // Send personalized notification email (non-blocking)
    Promise.resolve()
      .then(async () => {
        const user = await User.findById(normalizedUserId)
          .populate('municipality', 'name')
          .populate('department', 'name')
          .select('email fullName firstName lastName role municipality department')
          .lean();

        if (!user?.email) return;

        let complaintTitle = 'Complaint';
        if (targetComplaintId) {
          const Complaint = require('../models/Complaint');
          const complaint = await Complaint.findById(targetComplaintId).select('title').lean();
          if (complaint?.title) complaintTitle = complaint.title;
        }

        await require('../utils/mailer').sendNotificationEmail(
          type.toLowerCase(),
          user,
          { title: complaintTitle, _id: targetComplaintId },
          metadata
        );
      })
      .catch((emailErr) => {
        console.error('[NotificationService] Email failed:', emailErr.message);
      });

    return notification;
  } catch (err) {
    console.error('[NotificationService.send] Error:', err.message);
    throw err;
  }
};

/**
 * Send notification to multiple users
 */
const sendNotificationToMultiple = async (io, recipientIds, data) => {
  const notifications = [];
  for (const recipientId of recipientIds) {
    try {
      const notif = await sendNotification(io, recipientId, data);
      notifications.push(notif);
    } catch (err) {
      console.error(`[NotificationService] Failed to send to ${recipientId}:`, err.message);
    }
  }
  return notifications;
};

/**
 * Notify users by role
 */
const notifyUsersByRole = async (io, role, data) => {
  const users = await User.find({ role }).select('_id').lean();
  const userIds = users.map(u => u._id.toString());
  return sendNotificationToMultiple(io, userIds, data);
};

/**
 * Notify users in a specific municipality
 */
const notifyUsersByMunicipality = async (io, municipalityId, data) => {
  const users = await User.find({ municipality: municipalityId }).select('_id').lean();
  const userIds = users.map(u => u._id.toString());
  return sendNotificationToMultiple(io, userIds, data);
};

/**
 * Notify department managers
 */
const notifyManagersByDepartment = async (io, departmentId, data) => {
  const Department = require('../models/Department');
  let deptId = departmentId;

  // Normalize: handle embedded subdocument or plain ObjectId/string
  if (deptId && typeof deptId === 'object' && !(deptId instanceof require('mongoose').Types.ObjectId)) {
    deptId = deptId.id || deptId._id || deptId;
  }

  if (!deptId) return [];

  // Get department to verify and get name
  const department = await Department.findById(deptId).lean();
  if (!department) return [];

  // Update metadata with department name if not provided
  if (!data.metadata?.departmentName) {
    data.metadata = { ...data.metadata, departmentName: department.name };
  }

  const users = await User.find({
    department: deptId,
    role: 'DEPARTMENT_MANAGER'
  }).select('_id').lean();

  const userIds = users.map(u => u._id.toString());
  return sendNotificationToMultiple(io, userIds, data);
};

/**
 * Notify technicians assigned to a complaint
 */
const notifyTechnicians = async (io, complaintId, data) => {
  const Complaint = require('../models/Complaint');
  const complaint = await Complaint.findById(complaintId).select('assignedTo assignedTeam').lean();

  const userIds = [];

  if (complaint?.assignedTo) {
    userIds.push(complaint.assignedTo.toString());
  }

  if (complaint?.assignedTeam?.members) {
    const teamMemberIds = complaint.assignedTeam.members
      .map(m => m.toString())
      .filter(Boolean);
    userIds.push(...teamMemberIds);
  }

  if (userIds.length === 0) return null;

  return sendNotificationToMultiple(io, [...new Set(userIds)], data);
};

/**
 * Notify citizen about complaint status change
 */
const notifyCitizenStatusChange = async (io, citizenId, complaintId, status, extras = {}) => {
  let complaintTitle = 'your complaint';
  try {
    const Complaint = require('../models/Complaint');
    const complaint = await Complaint.findById(complaintId).select('title').lean();
    if (complaint?.title) complaintTitle = complaint.title;
  } catch (e) { /* non-blocking */ }

  const deptName = extras.departmentName || 'a department';
  const reason = extras.reason ? ` Reason: ${extras.reason}.` : '';

  const titleMap = {
    'VALIDATED': 'Complaint Validated',
    'REJECTED': 'Complaint Rejected',
    'ASSIGNED': 'Complaint Assigned',
    'IN_PROGRESS': 'Work Started',
    'RESOLVED': 'Complaint Resolved',
    'CLOSED': 'Complaint Closed',
  };

  const messageMap = {
    'VALIDATED': `Your complaint '${complaintTitle}' has been validated and is now visible publicly.`,
    'REJECTED': `Your complaint '${complaintTitle}' was rejected.${reason}`,
    'ASSIGNED': `Your complaint '${complaintTitle}' has been assigned to ${deptName}.`,
    'IN_PROGRESS': `Work has started on your complaint '${complaintTitle}'.`,
    'RESOLVED': `Your complaint '${complaintTitle}' has been resolved! Please confirm if the issue is fixed.`,
    'CLOSED': `Your complaint '${complaintTitle}' has been officially closed.`,
  };

  const type = status.toLowerCase();
  const title = titleMap[status] || `Status: ${status}`;
  const message = messageMap[status] || `Your complaint '${complaintTitle}' status has been updated to ${status}.`;

  return sendNotification(io, citizenId, {
    type,
    title,
    message,
    complaintId,
    metadata: { status, ...extras },
  });
};

/**
 * Notify about resolution submission (citizen gets notified that technician marked it resolved)
 */
const notifyResolutionSubmitted = async (io, complaintId, resolutionNotes) => {
  const Complaint = require('../models/Complaint');
  const complaint = await Complaint.findById(complaintId)
    .populate('createdBy', '_id')
    .populate('assignedTo', '_id')
    .lean();

  if (!complaint?.createdBy) return null;

  const message = resolutionNotes
    ? `Technician has marked your complaint as resolved: "${resolutionNotes.slice(0, 100)}${resolutionNotes.length > 100 ? '...' : ''}"`
    : 'Technician has marked your complaint as resolved.';

  return sendNotification(io, complaint.createdBy._id.toString(), {
    type: 'report_submitted',
    title: 'Resolution Reported',
    message,
    complaintId,
    metadata: { resolutionNotes },
  });
};

/**
 * Notify about upvote on complaint (if citizen upvotes)
 */
const notifyUpvote = async (io, complaintId, upvoterId) => {
  const Complaint = require('../models/Complaint');
  const User = require('../models/User');

  const complaint = await Complaint.findById(complaintId)
    .populate('createdBy', '_id fullName')
    .lean();

  const upvoter = await User.findById(upvoterId).select('fullName').lean();

  if (!complaint?.createdBy || complaint.createdBy._id.toString() === upvoterId) {
    return null; // Don't notify self
  }

  const message = upvoter?.fullName
    ? `${upvoter.fullName} upvoted your complaint: "${complaint.title?.slice(0, 50) || ''}"`
    : 'Someone upvoted your complaint.';

  return sendNotification(io, complaint.createdBy._id.toString(), {
    type: 'upvoted',
    title: 'Your complaint got an upvote!',
    message,
    complaintId,
    metadata: { upvoterId, upvoterName: upvoter?.fullName },
  });
};

/**
 * Notify about duplicate detection
 */
const notifyDuplicateDetected = async (io, complaintId, duplicateOf) => {
  const Complaint = require('../models/Complaint');
  let complaintTitle = 'your complaint';
  let duplicateTitle = 'an existing complaint';

  try {
    const complaint = await Complaint.findById(complaintId).select('title').lean();
    if (complaint?.title) complaintTitle = complaint.title;
  } catch (e) {}

  try {
    const dup = await Complaint.findById(duplicateOf).select('title').lean();
    if (dup?.title) duplicateTitle = dup.title;
  } catch (e) {}

  return sendNotification(io, complaintId, {
    type: 'duplicate_detected',
    title: 'Possible Duplicate Detected',
    message: `Your complaint "${complaintTitle}" may be a duplicate of "${duplicateTitle}". We'll review it.`,
    complaintId,
    metadata: { duplicateOf, duplicateTitle },
  });
};

/**
 * Send system notification to a user
 */
const notifyUser = async (io, userId, title, message, metadata = {}) => {
  return sendNotification(io, userId, {
    type: 'system',
    title,
    message,
    metadata,
  });
};

/**
 * Get notifications count for a user (helper for non-service usage)
 */
const getNotificationCount = async (userId) => {
  const Notification = require('../models/Notification');
  return await Notification.countDocuments({
    userId: new require('mongoose').Types.ObjectId(userId),
    read: false,
  });
};

module.exports = {
  createNotification,
  sendNotification,
  sendNotificationToMultiple,
  notifyUsersByRole,
  notifyUsersByMunicipality,
  notifyManagersByDepartment,
  notifyTechnicians,
  notifyCitizenStatusChange,
  notifyResolutionSubmitted,
  notifyUpvote,
  notifyDuplicateDetected,
  notifyUser,
  getNotificationCount,
};
