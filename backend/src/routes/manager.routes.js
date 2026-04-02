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
    
    // Build query - filter by manager's department or municipality
    const query = {};
    
    if (departmentId) {
      query.assignedDepartment = departmentId;
    } else {
      // If no department, filter by user's municipality as fallback
      const user = await User.findById(req.user.userId).select('municipality municipalityName').lean();
      if (user?.municipality) {
        query.municipality = user.municipality;
      } else if (user?.municipalityName) {
        query.municipalityName = user.municipalityName;
      }
    }
    
    // Filter by status if provided
    if (status) {
      if (status === "ALL") {
        // Show all statuses
        delete query.status;
      } else {
        query.status = status;
      }
    } else {
      // Default: show ASSIGNED, IN_PROGRESS, RESOLVED complaints
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

    // Calculate SLA status for each complaint on the fly
    const complaintsResponse = complaints.map(c => {
      const complaint = c.toObject();
      if (complaint.slaDeadline && !['RESOLVED', 'CLOSED'].includes(complaint.status)) {
        const now = new Date();
        const deadline = new Date(complaint.slaDeadline);
        const created = new Date(complaint.createdAt);
        const totalMs = deadline - created;
        const elapsedMs = now - created;
        
        if (totalMs > 0) {
          const progress = (elapsedMs / totalMs) * 100;
          if (progress >= 100) complaint.slaStatus = 'OVERDUE';
          else if (progress >= 80) complaint.slaStatus = 'AT_RISK';
          else complaint.slaStatus = 'ON_TRACK';
        } else {
          complaint.slaStatus = 'OVERDUE';
        }
      }
      return complaint;
    });

    res.json({
      success: true,
      message: "Complaints retrieved successfully",
      data: {
        complaints: complaintsResponse,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        },
        departmentName: department?.name || ""
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
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: "ASSIGNED",
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: `Assigned to technician`
    });
    
    await complaint.save();

    // Notify the technician about the new task (don't fail if notification fails)
    const io = req.app?.get?.('io');
    try {
      await notificationService.sendNotification(io, technicianId, {
        type: "assigned",
        title: "New Task Assigned",
        message: `A new task "${complaint.title || 'Unknown'}" has been assigned to you.`,
        complaintId: complaint._id,
      });
    } catch (notifError) {
      console.error("Failed to notify technician:", notifError);
    }

    // Also notify the citizen (don't fail if notification fails)
    if (complaint.createdBy) {
      try {
        await notificationService.sendNotification(io, complaint.createdBy, {
          type: "assigned",
          title: "Complaint Assigned",
          message: `Your complaint "${complaint.title || 'Unknown'}" has been assigned to a technician.`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify citizen:", notifError);
      }
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

// PUT /api/manager/complaints/:id/reassign-technician - Change assigned technician (only when ASSIGNED)
router.put("/complaints/:id/reassign-technician", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { technicianId } = req.body;
    
    if (!technicianId) {
      return res.status(400).json({ success: false, message: "Technician ID is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (complaint.status !== "ASSIGNED") {
      return res.status(400).json({ success: false, message: "Technician can only be changed when status is ASSIGNED" });
    }

    const oldTechnicianId = complaint.assignedTo;
    const newTechnician = await User.findOne({ _id: technicianId, role: "TECHNICIAN" });
    
    if (!newTechnician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    complaint.assignedTo = technicianId;
    
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: "ASSIGNED",
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: `Technician reassigned to ${newTechnician.fullName}`
    });
    
    await complaint.save();

    const io = req.app?.get?.('io');
    
    // Notify old technician
    if (oldTechnicianId) {
      try {
        await notificationService.sendNotification(io, oldTechnicianId, {
          type: "unassigned",
          title: "Task Unassigned",
          message: `You have been unassigned from "${complaint.title || 'a complaint'}".`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify old technician:", notifError);
      }
    }

    // Notify new technician
    try {
      await notificationService.sendNotification(io, technicianId, {
        type: "assigned",
        title: "New Task Assigned",
        message: `A new task "${complaint.title || 'Unknown'}" has been assigned to you.`,
        complaintId: complaint._id,
      });
    } catch (notifError) {
      console.error("Failed to notify new technician:", notifError);
    }

    // Notify citizen that their complaint has a new technician
    if (complaint.createdBy) {
      try {
        await notificationService.sendNotification(io, complaint.createdBy, {
          type: "technician_reassigned",
          title: "Technician Reassigned",
          message: `A new technician has been assigned to your complaint "${complaint.title || 'Unknown'}".`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify citizen:", notifError);
      }
    }

    res.json({
      success: true,
      message: "Technician reassigned successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Manager reassign technician error:", error);
    res.status(500).json({ success: false, message: "Failed to reassign technician" });
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

    // Notify all team members (don't fail if notification fails)
    const io = req.app?.get?.('io');
    for (const tech of technicians) {
      try {
        await notificationService.sendNotification(io, tech._id, {
          type: "assigned",
          title: "New Task Assigned",
          message: `A new task "${complaint.title || 'Unknown'}" has been assigned to your team.`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify team member:", notifError);
      }
    }

    // Also notify the citizen (don't fail if notification fails)
    if (complaint.createdBy) {
      try {
        await notificationService.sendNotification(io, complaint.createdBy, {
          type: "assigned",
          title: "Complaint Assigned",
          message: `Your complaint "${complaint.title || 'Unknown'}" has been assigned to a repair team.`,
          complaintId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to notify citizen:", notifError);
      }
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
router.put("/complaints/:id/priority", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { urgency, priorityScore } = req.body;
    
    if (!urgency && priorityScore === undefined) {
      return res.status(400).json({ success: false, message: "Urgency or priority score is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Priority can only be changed when status is VALIDATED or ASSIGNED
    const allowedStatuses = ["VALIDATED", "ASSIGNED"];
    if (!allowedStatuses.includes(complaint.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Priority can only be changed when complaint is ${allowedStatuses.join(" or ")}. Current status: ${complaint.status}` 
      });
    }

    // Check if complaint is assigned to manager's department
    const department = await getManagerDepartment(req.user.userId);
    const departmentId = department?._id;
    const isAdmin = req.user.role === "ADMIN";
    
    // Admin can update any, manager can only update if complaint has their department or no department
    const assignedDeptId = complaint.assignedDepartment?._id?.toString() || complaint.assignedDepartment?.toString();
    const canAccess = isAdmin || !assignedDeptId || assignedDeptId === departmentId?.toString();
    
    if (!canAccess) {
      return res.status(403).json({ success: false, message: "Complaint not in your department" });
    }

    if (urgency) {
      complaint.urgency = urgency;
    }
    if (priorityScore !== undefined) {
      complaint.priorityScore = priorityScore;
    }
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: complaint.status, // Status doesn't change, just priority
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: `Priority changed to ${urgency || `score ${priorityScore}`}`
    });
    
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

// GET /api/manager/technicians - Get technicians in manager's department (with optional search)
router.get("/technicians", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { search } = req.query;
    
    // Build base query
    let query = { role: "TECHNICIAN", isActive: true };
    
    // Add search filter if provided
    if (search) {
      query.fullName = { $regex: search, $options: "i" };
    }
    
    // Admin can see all technicians, manager only sees their department's technicians
    let technicians;
    
    if (req.user.role === "ADMIN") {
      technicians = await User.find(query)
        .select("fullName email phone department")
        .sort({ fullName: 1 });
    } else {
      const department = await getManagerDepartment(req.user.userId);
      const departmentId = department?._id;
      
      if (!departmentId) {
        return res.status(400).json({ success: false, message: "No department assigned to this manager" });
      }

      query.department = departmentId;
      technicians = await User.find(query)
        .select("fullName email phone")
        .sort({ fullName: 1 });
    }

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

// GET /api/manager/technicians/performance - Get technician performance with availability
router.get("/technicians/performance", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { search } = req.query;
    
    // Build base query
    let query = { role: "TECHNICIAN", isActive: true };
    
    if (search) {
      query.fullName = { $regex: search, $options: "i" };
    }
    
    let technicians;
    let departmentId = null;
    
    if (req.user.role === "ADMIN") {
      technicians = await User.find(query)
        .select("fullName email phone department")
        .sort({ fullName: 1 });
    } else {
      const department = await getManagerDepartment(req.user.userId);
      departmentId = department?._id;
      
      if (!departmentId) {
        return res.status(400).json({ success: false, message: "No department assigned to this manager" });
      }

      query.department = departmentId;
      technicians = await User.find(query)
        .select("fullName email phone")
        .sort({ fullName: 1 });
    }

    // Get performance stats for each technician
    const performanceData = await Promise.all(technicians.map(async (tech) => {
      const techId = tech._id;
      
      const [assigned, inProgress, resolved, totalResolved] = await Promise.all([
        Complaint.countDocuments({ assignedTo: techId, status: "ASSIGNED" }),
        Complaint.countDocuments({ assignedTo: techId, status: "IN_PROGRESS" }),
        Complaint.countDocuments({ assignedTo: techId, status: "RESOLVED" }),
        Complaint.countDocuments({ assignedTo: techId, status: { $in: ["RESOLVED", "CLOSED"] } })
      ]);
      
      const activeAssignments = assigned + inProgress;
      const isBusy = activeAssignments >= 3;
      const availability = isBusy ? "BUSY" : "AVAILABLE";
      
      // Calculate average resolution time
      const avgTimeResult = await Complaint.aggregate([
        { $match: { assignedTo: techId, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
      ]);
      const avgResolutionHours = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;
      
      // Get recent assigned complaints
      const recentComplaints = await Complaint.find({ 
        assignedTo: techId, 
        status: { $in: ["ASSIGNED", "IN_PROGRESS"] } 
      })
        .select("title status priorityScore slaDeadline referenceId")
        .sort({ priorityScore: -1 })
        .limit(5)
        .lean();

      return {
        _id: tech._id,
        fullName: tech.fullName,
        email: tech.email,
        phone: tech.phone,
        availability,
        activeAssignments,
        assigned,
        inProgress,
        resolved,
        totalResolved,
        avgResolutionHours,
        recentComplaints
      };
    }));

    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    console.error("Manager technician performance error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve technician performance" });
  }
});

// POST /api/manager/technicians/:id/message - Send message to technician
router.post("/technicians/:id/message", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const technician = await User.findOne({ _id: req.params.id, role: "TECHNICIAN" });
    
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    const manager = await User.findById(req.user.userId).select("fullName");

    // Send notification to technician
    const io = req.app?.get?.('io');
    await notificationService.sendNotification(io, technician._id, {
      type: "technician_message",
      title: "Message from Manager",
      message: `Message from ${manager?.fullName || "Manager"}: ${message.trim().slice(0, 100)}`,
    });

    res.json({
      success: true,
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

// POST /api/manager/technicians/:id/warning - Send warning to technician
router.post("/technicians/:id/warning", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { warning } = req.body;
    
    if (!warning || warning.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Warning text is required" });
    }

    const technician = await User.findOne({ _id: req.params.id, role: "TECHNICIAN" });
    
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    const manager = await User.findById(req.user.userId).select("fullName");

    // Send warning notification to technician
    const io = req.app?.get?.('io');
    await notificationService.sendNotification(io, technician._id, {
      type: "manager_warning",
      title: "Warning from Manager",
      message: `Warning from ${manager?.fullName || "Manager"}: ${warning.trim()}`,
    });

    res.json({
      success: true,
      message: "Warning sent successfully"
    });
  } catch (error) {
    console.error("Send warning error:", error);
    res.status(500).json({ success: false, message: "Failed to send warning" });
  }
});

// PUT /api/manager/complaints/:id/reassign - Change assigned technician
router.put("/complaints/:id/reassign", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), async (req, res) => {
  try {
    const { technicianId } = req.body;
    
    if (!technicianId) {
      return res.status(400).json({ success: false, message: "Technician ID is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Can only reassign when status is ASSIGNED (not IN_PROGRESS or later)
    if (complaint.status !== "ASSIGNED") {
      return res.status(400).json({ 
        success: false, 
        message: "Can only reassign when complaint status is ASSIGNED" 
      });
    }

    // Verify new technician exists
    const newTechnician = await User.findOne({ _id: technicianId, role: "TECHNICIAN" });
    if (!newTechnician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    const oldTechnicianId = complaint.assignedTo;
    const oldTechnician = oldTechnicianId ? await User.findById(oldTechnicianId).select("fullName") : null;

    complaint.assignedTo = technicianId;
    
    // Add to status history
    if (!complaint.statusHistory) complaint.statusHistory = [];
    complaint.statusHistory.push({
      status: complaint.status,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      notes: `Technician changed from ${oldTechnician?.fullName || "None"} to ${newTechnician.fullName}`
    });
    
    await complaint.save();

    const io = req.app?.get?.('io');

    // Notify old technician if exists
    if (oldTechnicianId) {
      await notificationService.sendNotification(io, oldTechnicianId, {
        type: "info",
        title: "Task Unassigned",
        message: `You have been unassigned from complaint "${complaint.title || complaint.referenceId}"`,
        complaintId: complaint._id,
      });
    }

    // Notify new technician
    await notificationService.sendNotification(io, technicianId, {
      type: "assigned",
      title: "Task Assigned",
      message: `A new task "${complaint.title || complaint.referenceId}" has been assigned to you.`,
      complaintId: complaint._id,
    });

    res.json({
      success: true,
      message: "Technician reassigned successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Reassign technician error:", error);
    res.status(500).json({ success: false, message: "Failed to reassign technician" });
  }
});

module.exports = router;
