/**
 * Notification Service
 * Centralized service for creating and managing notifications.
 * Uses the new Notification schema with userId, type, message, complaintId, metadata, read.
 */

const User = require('../models/User');
const { t } = require('../utils/i18n');

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
  } catch {
    /* non-blocking */
  }

  // Get user language preference
  let locale = 'en';
  try {
    const user = await User.findById(citizenId).select('language').lean();
    if (user?.language) locale = user.language;
  } catch {
    /* fallback to en */
  }

  const deptName = extras.departmentName || t('notifications.complaintAssigned.department', locale) || 'a department';
  const reason = extras.reason ? ` ${t('notifications.complaintRejected.reason', locale) || 'Reason:'} ${extras.reason}.` : '';

  const titleKey = `notifications.${status.toLowerCase()}Complaint.title`;
  const messageKey = `notifications.${status.toLowerCase()}Complaint.message`;

  const title = t(titleKey, locale) || `Status: ${status}`;
  const message = t(messageKey, locale, { complaintTitle, department: deptName, reason }) || `Your complaint '${complaintTitle}' status has been updated to ${status}.`;

  return sendNotification(io, citizenId, {
    type: status.toLowerCase(),
    title,
    message,
    complaintId,
    metadata: { status, complaintTitle, departmentName: extras.departmentName, reason: extras.reason, ...extras },
  });
};

/**
 * Notify about resolution submission (department manager gets notified for review)
 */
const notifyResolutionSubmitted = async (io, complaintId, resolutionNotes) => {
  const Complaint = require('../models/Complaint');
  const User = require('../models/User');

  const complaint = await Complaint.findById(complaintId)
    .populate('assignedDepartment', 'id name responsable')
    .lean();

  if (!complaint?.assignedDepartment) return null;

  // Find department manager
  const departmentManager = await User.findById(complaint.assignedDepartment.responsable).select('_id language').lean();
  
  if (!departmentManager) return null;

  // Get user language preference
  const locale = departmentManager.language || 'en';

  const message = resolutionNotes
    ? t('notifications.resolutionSubmitted.message', locale, { notes: `${resolutionNotes.slice(0, 100)}${resolutionNotes.length > 100 ? '...' : ''}` })
    : t('notifications.resolutionSubmittedNoNotes.message', locale);

  const title = t('notifications.resolutionSubmitted.title', locale);

  return sendNotification(io, departmentManager._id.toString(), {
    type: 'report_submitted',
    title,
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
    .populate('createdBy', '_id fullName language')
    .lean();

  const upvoter = await User.findById(upvoterId).select('fullName').lean();

  if (!complaint?.createdBy || complaint.createdBy._id.toString() === upvoterId) {
    return null; // Don't notify self
  }

  // Get user language preference
  const locale = complaint.createdBy.language || 'en';
  const complaintTitle = complaint.title?.slice(0, 50) || '';

  const message = upvoter?.fullName
    ? t('notifications.upvoteReceived.message', locale, { upvoterName: upvoter.fullName, complaintTitle })
    : t('notifications.upvoteReceivedAnonymous.message', locale);

  const title = t('notifications.upvoteReceived.title', locale);

  return sendNotification(io, complaint.createdBy._id.toString(), {
    type: 'upvoted',
    title,
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
  let locale = 'en';

  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('createdBy', '_id language')
      .select('title')
      .lean();
    if (complaint?.title) complaintTitle = complaint.title;
    if (complaint?.createdBy?.language) locale = complaint.createdBy.language;
  } catch {
    // Silently ignore errors
  }

  try {
    const dup = await Complaint.findById(duplicateOf).select('title').lean();
    if (dup?.title) duplicateTitle = dup.title;
  } catch {
    // Silently ignore errors
  }

  const title = t('notifications.duplicateDetected.title', locale);
  const message = t('notifications.duplicateDetected.message', locale, { complaintTitle, duplicateTitle });

  return sendNotification(io, complaintId, {
    type: 'duplicate_detected',
    title,
    message,
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
