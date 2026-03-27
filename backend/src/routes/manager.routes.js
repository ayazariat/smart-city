const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const RepairTeam = require("../models/RepairTeam");
const Department = require("../models/Department");
const notificationService = require("../services/notification.service");

// All manager routes require authentication and DEPARTMENT_MANAGER role

// Get manager's department from user profile
async function getManagerDepartment(userId) {
  // First check if user has department assigned in their profile
  const user = await User.findById(userId)
    .select("department")
    .populate("department", "name");
  
  if (user?.department) {
    return user.department;
  }
  
  // Fallback: check if user is responsable of a department
  const Department = require("../models/Department");
  const dept = await Department.findOne({ responsable: userId }).populate("name");
  return dept;
}

// GET /api/manager/complaints - Get complaints for manager's department
router.get("/complaints", authenticate, authorize("DEPARTMENT_MANAGER"), async (req, res) => {
  try {
    const department = await getManagerDepartment(req.user.userId);
    const departmentId = department?._id;
    
    const { status, category, page = 1, limit = 50 } = req.query;
    
    // Build query - filter by manager's department
    const query = {};
    
    if (departmentId) {
      query.assignedDepartment = departmentId;
    }
    
    // Filter by status if provided
    if (status) {
      if (status === "ALL") {
        // Show all statuses for the department
        delete query.status;
      } else {
        query.status = status;
      }
    } else {
      // Default: show ASSIGNED, IN_PROGRESS complaints
      query.status = { $in: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"] };
    }
    
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("createdBy", "fullName email phone")
        .populate("assignedTo", "fullName")
        .populate("assignedDepartment", "name")
        .sort({ priorityScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Complaint.countDocuments(query)
    ]);

    res.json({
      success: true,
      message: "Complaints retrieved successfully",
      data: {
        complaints,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Manager get complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve complaints" });
  }
});

// PUT /api/manager/complaints/:id/assign-technician - Assign complaint to a technician
router.put("/complaints/:id/assign-technician", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { technicianId } = req.body;
    
    if (!technicianId) {
      return res.status(400).json({ success: false, message: "Technician ID is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Verify technician exists
    const technician = await User.findOne({ _id: technicianId, role: "TECHNICIAN" });
    
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    complaint.assignedTo = technicianId;
    complaint.status = "ASSIGNED";
    await complaint.save();

    // Notify the technician about the new task
    await notificationService.sendNotification(null, technicianId, {
      type: "assigned",
      title: "New Task Assigned",
      message: `A new task "${complaint.title || 'Unknown'}" has been assigned to you.`,
      complaintId: complaint._id,
    });

    // Also notify the citizen
    if (complaint.createdBy) {
      await notificationService.sendNotification(null, complaint.createdBy, {
        type: "assigned",
        title: "Complaint Assigned",
        message: `Your complaint "${complaint.title || 'Unknown'}" has been assigned to a technician.`,
        complaintId: complaint._id,
      });
    }

    res.json({
      success: true,
      message: "Complaint assigned to technician successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Manager assign technician error:", error);
    res.status(500).json({ success: false, message: "Failed to assign technician" });
  }
});

// PUT /api/manager/complaints/:id/assign-team - Assign multiple technicians and create a repair team
router.put("/complaints/:id/assign-team", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { technicianIds } = req.body;
    
    if (!technicianIds || !Array.isArray(technicianIds) || technicianIds.length === 0) {
      return res.status(400).json({ success: false, message: "At least one technician ID is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Admin can assign without department check, manager must check department
    let departmentId = null;
    if (req.user.role === "DEPARTMENT_MANAGER") {
      const department = await getManagerDepartment(req.user.userId);
      departmentId = department?._id;
      
      if (departmentId && complaint.assignedDepartment?.toString() !== departmentId.toString()) {
        return res.status(403).json({ success: false, message: "Complaint not in your department" });
      }
    }

    // Verify all technicians exist
    let technicians;
    if (departmentId) {
      technicians = await User.find({ 
        _id: { $in: technicianIds }, 
        department: departmentId, 
        role: "TECHNICIAN",
        isActive: true 
      });
    } else {
      technicians = await User.find({ 
        _id: { $in: technicianIds }, 
        role: "TECHNICIAN",
        isActive: true 
      });
    }
    
    if (technicians.length !== technicianIds.length) {
      return res.status(404).json({ success: false, message: "Some technicians not found or not available" });
    }

    // Create repair team
    const teamName = `RC-${complaint._id.toString().slice(-6)} ${complaint.category || 'Maintenance'} - Equipe`;
    const repairTeam = new RepairTeam({
      name: teamName,
      members: technicianIds,
      department: departmentId,
      isAvailable: true
    });
    await repairTeam.save();

    // Update complaint with team
    complaint.assignedTeam = repairTeam._id;
    complaint.assignedTo = technicianIds[0]; // Primary technician
    complaint.status = "ASSIGNED";
    await complaint.save();

    // Populate team members for response
    const populatedTeam = await RepairTeam.findById(repairTeam._id)
      .populate("members", "fullName email");

    // Notify all team members
    for (const tech of technicians) {
      await notificationService.sendNotification(null, tech._id, {
        type: "assigned",
        title: "New Task Assigned",
        message: `A new task "${complaint.title || 'Unknown'}" has been assigned to your team.`,
        complaintId: complaint._id,
      });
    }

    // Also notify the citizen
    if (complaint.createdBy) {
      await notificationService.sendNotification(null, complaint.createdBy, {
        type: "assigned",
        title: "Complaint Assigned",
        message: `Your complaint "${complaint.title || 'Unknown'}" has been assigned to a repair team.`,
        complaintId: complaint._id,
      });
    }

    res.json({
      success: true,
      message: `Equipe creee avec ${technicianIds.length} techniciens`,
      data: {
        complaint,
        team: populatedTeam
      }
    });
  } catch (error) {
    console.error("Manager assign team error:", error);
    res.status(500).json({ success: false, message: "Failed to assign team" });
  }
});

// PUT /api/manager/complaints/:id/priority - Update complaint priority
router.put("/complaints/:id/priority", authenticate, authorize("DEPARTMENT_MANAGER"), async (req, res) => {
  try {
    const { urgency, priorityScore } = req.body;
    
    if (!urgency && priorityScore === undefined) {
      return res.status(400).json({ success: false, message: "Urgency or priority score is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Check if complaint is assigned to manager's department
    const department = await getManagerDepartment(req.user.userId);
    const departmentId = department?._id;
    
    if (departmentId && complaint.assignedDepartment?.toString() !== departmentId.toString()) {
      return res.status(403).json({ success: false, message: "Complaint not in your department" });
    }

    if (urgency) {
      complaint.urgency = urgency;
    }
    if (priorityScore !== undefined) {
      complaint.priorityScore = priorityScore;
    }
    
    await complaint.save();

    res.json({
      success: true,
      message: "Complaint priority updated successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Manager update priority error:", error);
    res.status(500).json({ success: false, message: "Failed to update priority" });
  }
});

// GET /api/manager/technicians - Get technicians in manager's department
router.get("/technicians", authenticate, authorize("DEPARTMENT_MANAGER"), async (req, res) => {
  try {
    const department = await getManagerDepartment(req.user.userId);
    const departmentId = department?._id;
    
    if (!departmentId) {
      return res.status(400).json({ success: false, message: "No department assigned to this manager" });
    }

    const technicians = await User.find({ 
      department: departmentId, 
      role: "TECHNICIAN",
      isActive: true 
    }).select("fullName email phone");

    res.json({
      success: true,
      data: technicians
    });
  } catch (error) {
    console.error("Manager get technicians error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve technicians" });
  }
});

// GET /api/manager/stats - Get department statistics
router.get("/stats", authenticate, authorize("DEPARTMENT_MANAGER"), async (req, res) => {
  try {
    const department = await getManagerDepartment(req.user.userId);
    const departmentId = department?._id;
    
    if (!departmentId) {
      return res.status(400).json({ success: false, message: "No department assigned to this manager" });
    }

    const baseQuery = { assignedDepartment: departmentId, isArchived: false };
    
    const [total, submitted, validated, assigned, inProgress, resolved, closed, rejected, overdue, atRisk, byCategory] = await Promise.all([
      Complaint.countDocuments(baseQuery),
      Complaint.countDocuments({ ...baseQuery, status: "SUBMITTED" }),
      Complaint.countDocuments({ ...baseQuery, status: "VALIDATED" }),
      Complaint.countDocuments({ ...baseQuery, status: "ASSIGNED" }),
      Complaint.countDocuments({ ...baseQuery, status: "IN_PROGRESS" }),
      Complaint.countDocuments({ ...baseQuery, status: "RESOLVED" }),
      Complaint.countDocuments({ ...baseQuery, status: "CLOSED" }),
      Complaint.countDocuments({ ...baseQuery, status: "REJECTED" }),
      Complaint.countDocuments({ ...baseQuery, slaStatus: "OVERDUE" }),
      Complaint.countDocuments({ ...baseQuery, slaStatus: "AT_RISK" }),
      Complaint.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ])
    ]);

    const resolvedCount = resolved + closed;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    const avgTimeResult = await Complaint.aggregate([
      { $match: { ...baseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
    ]);
    const averageResolutionTime = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;

    res.json({
      success: true,
      data: {
        total,
        submitted,
        validated,
        assigned,
        inProgress,
        resolved,
        closed,
        rejected,
        totalOverdue: overdue,
        totalAtRisk: atRisk,
        resolutionRate,
        averageResolutionTime,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error("Manager get stats error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve statistics" });
  }
});

module.exports = router;
