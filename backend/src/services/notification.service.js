/**
 * Notification Service
 * Handles sending notifications to users via Socket.IO and in-app store
 */

// No import needed - dynamic require in function
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

    // Send personalized notification email using new centralized function
    Promise.resolve()
      .then(async () => {
        const user = await User.findById(normalizedRecipientId)
          .populate('municipality', 'name')
          .populate('department', 'name')
          .select('email fullName firstName role municipality department')
          .lean();
        if (!user?.email) return;
        
        let complaintTitle = 'Complaint';
        let complaint = null;
        if (targetComplaintId) {
          const Complaint = require('../models/Complaint');
          complaint = await Complaint.findById(targetComplaintId).select('title').lean();
          if (complaint?.title) complaintTitle = complaint.title;
        }
        await require('../utils/mailer').sendNotificationEmail(
          type.toLowerCase(),
          user,
          { title: complaintTitle, _id: targetComplaintId },
          {}
        );
      })
      .catch((emailErr) => {
        // Email failure non-blocking
        console.error('[notification] Email failed:', emailErr.message);
      });
    
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
  // Normalize: handle embedded subdocument {id, name} or plain ObjectId/string
  let deptId = departmentId;
  if (deptId && typeof deptId === 'object' && !(deptId instanceof require('mongoose').Types.ObjectId)) {
    deptId = deptId.id || deptId._id || deptId;
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
  const complaint = await Complaint.findById(complaintId).select('assignedTo').lean();
  if (complaint?.assignedTo) {
    return sendNotification(io, complaint.assignedTo.toString(), data);
  }
  return null;
};

/**
 * Notify citizen about complaint status change
 * @param {*} io - Socket.IO instance
 * @param {string} citizenId - Citizen user ID
 * @param {string} complaintId - Complaint ID
 * @param {string} status - New status (VALIDATED, REJECTED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED)
 * @param {Object} extras - Optional extras: { reason, departmentName }
 */
const notifyCitizenStatusChange = async (io, citizenId, complaintId, status, extras = {}) => {
  // Fetch complaint title for personalized message
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

  const title = titleMap[status] || `Status: ${status}`;
  const message = messageMap[status] || `Your complaint '${complaintTitle}' status has been updated to ${status}.`;

  return sendNotification(io, citizenId, {
    type: status.toLowerCase(),
    title,
    message,
    complaintId,
  });
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
