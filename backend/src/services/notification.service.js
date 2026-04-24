/**
 * Notification Service
 * Handles sending notifications to users via Socket.IO and in-app store
 */

const sendNotification = async (io, recipientId, data) => {
  const { type, title, message, complaintId, priority = 'normal', relatedId } = data;
  
  const Notification = require('../models/Notification');
  const mongoose = require('mongoose');
  
  // Store notification in database
  try {
    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      type,
      title, // This should be a status key like 'notification.validated'
      message,
      relatedId: complaintId || relatedId,
      priority,
      status: 'UNREAD'
    });
    
    // Emit real-time notification via Socket.IO
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', {
        _id: notification._id,
        type,
        title, // Pass the key for i18n translation
        message,
        relatedId: complaintId || relatedId,
        isRead: false,
        createdAt: notification.createdAt
      });
    }
    
    return notification;
  } catch (err) {
    console.error('[notification] Save error:', err.message);
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
      console.error(`[notification] Failed for ${recipientId}:`, err.message);
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
 * Send email notification
 */
const sendComplaintStatusEmail = async (email, fullName, complaintTitle, status) => {
  // Placeholder for email service integration
  console.log(`[email] Would send to ${email}: Complaint "${complaintTitle}" status: ${status}`);
  return Promise.resolve();
};

/**
 * Notify citizen about complaint status change
 * Uses status keys for i18n translation on frontend
 */
const notifyCitizenStatusChange = async (io, citizenId, complaintId, status, statusLabel) => {
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

  // Send email notification (non-blocking)
  try {
    const citizen = await User.findById(citizenId).select('email fullName').lean();
    if (citizen?.email) {
      const Complaint = require('../models/Complaint');
      const complaint = await Complaint.findById(complaintId).select('title').lean();
      const complaintTitle = complaint?.title || 'Your complaint';
      sendComplaintStatusEmail(citizen.email, citizen.fullName, complaintTitle, status)
        .catch(err => console.error('[notification] Email send error:', err.message));
    }
  } catch (emailErr) {
    console.error('[notification] Email lookup error:', emailErr.message);
  }

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