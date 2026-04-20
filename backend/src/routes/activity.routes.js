const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

/**
 * GET /api/activity/recent?limit=5
 * Returns last N actions from complaint statusHistory
 * scoped to the current user's role.
 */
router.get("/recent", authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const { userId, role, municipality, department } = req.user;

    // Build query based on role scope
    const query = {};
    switch (role) {
      case "CITIZEN":
        query.createdBy = userId;
        break;
      case "MUNICIPAL_AGENT":
        if (municipality) {
          query.$or = [
            { municipality: municipality },
            { municipalityName: municipality },
            { "location.municipality": municipality },
          ];
        }
        break;
      case "DEPARTMENT_MANAGER":
        if (department) {
          query.assignedDepartment = department;
        }
        break;
      case "TECHNICIAN":
        query.assignedTo = userId;
        break;
      case "ADMIN":
        // No filter — see everything
        break;
      default:
        break;
    }

    // Fetch complaints with statusHistory, sorted by latest update
    const complaints = await Complaint.find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .select("referenceId title municipality status statusHistory assignedTo assignedDepartment")
      .lean();

    // Flatten all statusHistory entries and sort by date desc
    const activities = [];
    for (const complaint of complaints) {
      const history = complaint.statusHistory || [];
      for (const entry of history) {
        activities.push({
          action: entry.status,
          notes: entry.notes || "",
          complaintId: complaint._id,
          referenceId: complaint.referenceId || "",
          title: complaint.title || "",
          municipality: complaint.municipality || "",
          department: complaint.assignedDepartment || "",
          actorId: entry.updatedBy || null,
          timestamp: entry.updatedAt || entry.date || complaint.updatedAt,
        });
      }
    }

    // Sort by timestamp desc, take the top N
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recent = activities.slice(0, limit);

    // Resolve actor names
    const actorIds = [...new Set(recent.filter((a) => a.actorId).map((a) => String(a.actorId)))];
    const actors = actorIds.length > 0
      ? await User.find({ _id: { $in: actorIds } }).select("fullName role").lean()
      : [];
    const actorMap = {};
    for (const actor of actors) {
      actorMap[String(actor._id)] = { name: actor.fullName, role: actor.role };
    }

    // Format activities
    const formatted = recent.map((a) => {
      const actor = a.actorId ? actorMap[String(a.actorId)] : null;
      return {
        action: a.action,
        complaintId: a.complaintId,
        referenceId: a.referenceId,
        title: a.title,
        municipality: a.municipality,
        department: a.department,
        actorName: actor ? actor.name : "",
        actorRole: actor ? actor.role : "",
        notes: a.notes,
        timestamp: a.timestamp,
        description: _formatDescription(a.action, a.referenceId, a.title, a.municipality, actor),
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("[Activity] Error fetching recent activity:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch recent activity" });
  }
});

/**
 * Format a human-readable description for each activity type.
 */
function _formatDescription(action, refId, title, municipality, actor) {
  const ref = refId || "complaint";
  const actorLabel = actor ? actor.name : "Someone";

  switch (action) {
    case "SUBMITTED":
      return `New complaint: ${title || ref}${municipality ? " in " + municipality : ""}`;
    case "VALIDATED":
      return `${ref} validated by ${actorLabel}`;
    case "REJECTED":
      return `${ref} rejected`;
    case "ASSIGNED":
      return `${ref} assigned to department`;
    case "IN_PROGRESS":
      return `Work started on ${ref}`;
    case "RESOLVED":
      return `${ref} resolved`;
    case "CLOSED":
      return `${ref} officially closed`;
    case "RESOLUTION_REJECTED":
      return `Resolution rejected for ${ref}`;
    case "ARCHIVED":
      return `${ref} archived`;
    default:
      return `${ref} updated to ${action}`;
  }
}

module.exports = router;
