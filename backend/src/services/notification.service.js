/**
 * Notification Service
 * Handles creating and sending notifications to users
 */

const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Send a notification to a user
 * @param {string} userId - Recipient user ID
 * @param {Object} notification - Notification data
 * @param {string} notification.type - Notification type
 * @param {string} notification.message - Notification message
 * @param {string} [notification.complaintId] - Related complaint ID
 * @param {Object} io - Socket.io instance for real-time notifications
 */
const sendNotification = async (io, userId, notification) => {
  try {
    const notif = await Notification.create({
      recipient: userId,
      type: notification.type,
      title: notification.title || 'Notification',
      message: notification.message,
      complaint: notification.complaintId,
      relatedId: notification.complaintId,
      isRead: false
    });

    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        _id: notif._id.toString(),
        type: notification.type,
        title: notification.title || 'Notification',
        message: notification.message,
        complaintId: notification.complaintId,
        isRead: false,
        createdAt: notif.createdAt
      });
    }

    return notif;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Notify multiple users at once
 * @param {string[]} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 * @param {Object} io - Socket.io instance
 */
const sendNotificationToMultiple = async (io, userIds, notification) => {
  const promises = userIds.map(userId => sendNotification(io, userId, notification));
  return Promise.all(promises);
};

/**
 * Notify all users in a specific role
 * @param {string} role - User role
 * @param {Object} notification - Notification data
 * @param {Object} io - Socket.io instance
 */
const notifyUsersByRole = async (io, role, notification) => {
  try {
    const users = await User.find({ role }).select('_id');
    const userIds = users.map(u => u._id.toString());
    return sendNotificationToMultiple(io, userIds, notification);
  } catch (error) {
    console.error('Error notifying users by role:', error);
    throw error;
  }
};

/**
 * Notify all users in a municipality
 * @param {string} municipalityName - Municipality name
 * @param {Object} notification - Notification data
 * @param {Object} io - Socket.io instance
 */
const notifyUsersByMunicipality = async (io, municipalityName, notification) => {
  try {
    const users = await User.find({ 
      municipalityName: { $regex: new RegExp(`^${municipalityName}$`, 'i') } 
    }).select('_id');
    const userIds = users.map(u => u._id.toString());
    return sendNotificationToMultiple(io, userIds, notification);
  } catch (error) {
    console.error('Error notifying users by municipality:', error);
    throw error;
  }
};

/**
 * Notify managers in a department
 * @param {string} departmentId - Department ID
 * @param {Object} notification - Notification data
 * @param {Object} io - Socket.io instance
 */
const notifyManagersByDepartment = async (io, departmentId, notification) => {
  try {
    const users = await User.find({ department: departmentId, role: 'DEPARTMENT_MANAGER' }).select('_id');
    const userIds = users.map(u => u._id.toString());
    return sendNotificationToMultiple(io, userIds, notification);
  } catch (error) {
    console.error('Error notifying managers by department:', error);
    throw error;
  }
};

/**
 * Notify technicians assigned to a complaint
 * @param {string[]} technicianIds - Array of technician IDs
 * @param {Object} notification - Notification data
 * @param {Object} io - Socket.io instance
 */
const notifyTechnicians = async (io, technicianIds, notification) => {
  return sendNotificationToMultiple(io, technicianIds, notification);
};

/**
 * Notify citizen about complaint status change
 * @param {string} citizenId - Citizen user ID
 * @param {string} complaintId - Complaint ID
 * @param {string} status - New status
 * @param {string} statusLabel - Human-readable status label
 * @param {Object} io - Socket.io instance
 */
const notifyCitizenStatusChange = async (io, citizenId, complaintId, status, statusLabel) => {
  const statusMessages = {
    'VALIDATED': `Votre réclamation a été validée et sera traitée.`,
    'REJECTED': `Votre réclamation a été rejetée.`,
    'ASSIGNED': `Votre réclamation a été assignée à une équipe.`,
    'IN_PROGRESS': 'Votre reclamation est en cours de traitement.',
    'RESOLVED': `Votre réclamation a été résolue.`,
    'CLOSED': `Votre réclamation a été fermée.`
  };

  const message = statusMessages[status] || `Statut de votre réclamation: ${statusLabel}`;

  return sendNotification(io, citizenId, {
    type: status.toLowerCase(),
    message,
    complaintId
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
