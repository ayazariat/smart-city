const AuditLog = require("../models/AuditLog");

async function logAction(req, actionType, entityType, entityId, oldValues, newValues) {
  try {
    await AuditLog.create({
      userId: req?.user?.userId || null,
      userRole: req?.user?.role || null,
      action: actionType,
      entityType: entityType || null,
      entityId: entityId || null,
      ip: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.headers?.["user-agent"] || null,
      oldValues: oldValues || null,
      newValues: newValues || null,
    });
  } catch {
    // Never throw — silent fail on audit errors
  }
}

module.exports = { logAction };
