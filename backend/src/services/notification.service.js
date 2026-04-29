/**
 * Notification Service
 * Handles sending notifications to users via Socket.IO and in-app store
 */

const { sendComplaintStatusEmail } = require('../utils/mailer');
const User = require('../models/User');

const normalizeRecipientId = (recipientId) => {
  if (!recipientId) return null;
  if (typeof recipientId === 'string') return recipientId;
  if (typeof recipientId === 'object') {
    if (recipientId._id) return recipientId._id.toString();
    if (recipientId.id) return recipientId.id.toString();
  }
  return null;
};

const sendNotification = async (io, recipientId, data) => {
  const { type, title, message, complaintId, relatedId } = data;
  
  const Notification = require('../models/Notification');
  const mongoose = require('mongoose');
  
  // Store notification in database
  try {
    const normalizedRecipientId = normalizeRecipientId(recipientId);
    if (!normalizedRecipientId) throw new Error('Invalid recipient id');
    const safeTitle = title || 'Notification';
    const safeMessage = message || safeTitle;
    const targetComplaintId = complaintId || relatedId;

    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(normalizedRecipientId),
      type,
      title: safeTitle,
      message: safeMessage,
      complaint: targetComplaintId,
      relatedId: targetComplaintId,
    });
    
    // Emit real-time notification via Socket.IO
    if (io) {
      const realtimePayload = {
        _id: notification._id,
        type,
        title: safeTitle,
        message: safeMessage,
        relatedId: targetComplaintId,
        complaint: targetComplaintId,
        isRead: false,
        createdAt: notification.createdAt
      };

      io.to(`user:${normalizedRecipientId}`).emit('notification:new', realtimePayload);
      io.to(`user:${normalizedRecipientId}`).emit('notification', realtimePayload);
    }

    const statusMap = {
      validated: 'VALIDATED',
      rejected: 'REJECTED',
      assigned: 'ASSIGNED',
      in_progress: 'IN_PROGRESS',
      resolved: 'RESOLVED',
      closed: 'CLOSED',
      resolution_approved: 'CLOSED',
      resolution_rejected: 'IN_PROGRESS',
    };
    const normalizedStatus = statusMap[(type || '').toLowerCase()];
    if (normalizedStatus) {
      Promise.resolve()
        .then(async () => {
          const user = await User.findById(normalizedRecipientId).select('email fullName').lean();
          if (!user?.email) return;
          let complaintTitle = 'Your complaint';
          if (targetComplaintId) {
            const Complaint = require('../models/Complaint');
            const complaint = await Complaint.findById(targetComplaintId).select('title').lean();
            if (complaint?.title) complaintTitle = complaint.title;
          }
          await sendComplaintStatusEmail(
            user.email,
            user.fullName,
            complaintTitle,
            normalizedStatus,
            targetComplaintId
          );
        })
        .catch((emailErr) => {
          // Email send failure should not block notification
        });
    }
    
    return notification;
  } catch (err) {
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
      // Individual notification failure should not block others
    }
  }
  return notifications;
};

/**
 * Notify users by role
 * Useful for broadcasting system announcements
 */
const notifyUsersByRole = async (io, role, data) => {
  const User = require('../models/User');
  const users = await User.find({ role }).select('_id').lean();
  const userIds = users.map(u => u._id.toString());
  return sendNotificationToMultiple(io, userIds, data);
};

/**
 * Notify users in a specific municipality
 */
const notifyUsersByMunicipality = async (io, municipalityId, data) => {
  const User = require('../models/User');
  const users = await User.find({ municipality: municipalityId }).select('_id').lean();
  const userIds = users.map(u => u._id.toString());
  return sendNotificationToMultiple(io, userIds, data);
};

/**
 * Notify managers of a specific department
 */
const notifyManagersByDepartment = async (io, departmentId, data) => {
  const User = require('../models/User');
  const users = await User.find({ 
    department: departmentId,
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
  const complaint = await Complaint.findById(complaintId).select('assignedTo').lean();
  if (complaint?.assignedTo) {
    return sendNotification(io, complaint.assignedTo.toString(), data);
  }
  return null;
};

/**
 * Notify citizen about complaint status change
 * Uses status keys for i18n translation on frontend
 */
const notifyCitizenStatusChange = async (io, citizenId, complaintId, status) => {
  // Use status keys for i18n translation on frontend
  const statusKeys = {
    'VALIDATED': 'notification.status.validated',
    'REJECTED': 'notification.status.rejected',
    'ASSIGNED': 'notification.status.assigned',
    'IN_PROGRESS': 'notification.status.inProgress',
    'RESOLVED': 'notification.status.resolved',
    'CLOSED': 'notification.status.closed'
  };
  
  const statusMessages = {
    'VALIDATED': 'notification.status.validated.desc',
    'REJECTED': 'notification.status.rejected.desc',
    'ASSIGNED': 'notification.status.assigned.desc',
    'IN_PROGRESS': 'notification.status.inProgress.desc',
    'RESOLVED': 'notification.status.resolved.desc',
    'CLOSED': 'notification.status.closed.desc'
  };

  const titleKey = statusKeys[status] || `notification.status.${status}`;
  const messageKey = statusMessages[status] || `notification.status.${status}.desc`;

  // Send real-time notification
  const notif = await sendNotification(io, citizenId, {
    type: status.toLowerCase(),
    title: titleKey, // Use key like 'notification.status.validated'
    message: messageKey, // Use key like 'notification.status.validated.desc'
    complaintId
  });

  return notif;
  
};

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
  notifyUsersByRole,
  notifyUsersByMunicipality,
  notifyManagersByDepartment,
  notifyTechnicians,
  notifyCitizenStatusChange
};
