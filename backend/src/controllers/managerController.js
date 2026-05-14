const Complaint = require("../models/Complaint");
const User = require("../models/User");
const RepairTeam = require("../models/RepairTeam");
const Department = require("../models/Department");
const notificationService = require("../services/notification.service");
const { sendAssignmentEmails } = require("../utils/mailer");

const MANAGER_ACTIVE_STATUSES = [
  "VALIDATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];

async function getManagerDepartment(userId) {
  const user = await User.findById(userId)
    .select("department role")
    .populate("department", "name");
  
  if (user?.department) {
    // Ensure department's responsable points to this user without unnecessary writes
    await Department.updateOne(
      { _id: user.department._id, $or: [{ responsable: { $exists: false } }, { responsable: { $ne: userId } }] },
      { $set: { responsable: userId } }
    ).catch(() => {});
    return user.department;
  }
  
  // Try to find department where this user is responsable
  const dept = await Department.findOne({ responsable: userId }).populate("name");
  if (dept) {
    return dept;
  }
  
  // Auto-fix: If user is DEPARTMENT_MANAGER with no department, assign first available department
  if (user?.role === "DEPARTMENT_MANAGER") {
    const availableDept = await Department.findOne({ responsable: { $exists: false } }).limit(1);
    if (availableDept) {
      // Link both sides
      await Department.findByIdAndUpdate(availableDept._id, { responsable: userId });
      await User.findByIdAndUpdate(userId, { department: availableDept._id });
      return availableDept;
    }
  }
  
  throw new Error("NO_DEPARTMENT_ASSIGNED");
}

class ManagerController {
  async getComplaints(req, res) {
    try {
      let department;
      let departmentId;
      try {
        department = await getManagerDepartment(req.user.userId);
        departmentId = department?._id;
      } catch (err) {
        // If no department assigned, we'll fall back to municipality filtering
        if (err.message !== "NO_DEPARTMENT_ASSIGNED") {
          throw err;
        }
      }

      const { status, category, page = 1, limit = 50 } = req.query;
      
      const query = {};
      
      if (departmentId) {
        query["assignedDepartment.id"] = departmentId;
      } else {
        const user = await User.findById(req.user.userId).select('municipality municipalityName').lean();
        if (user?.municipality) {
          query.municipality = user.municipality;
        } else if (user?.municipalityName) {
          query.municipalityName = user.municipalityName;
        }
      }
      
      if (status && status !== "ALL") {
        query.status = status;
      } else {
        query.status = { $in: MANAGER_ACTIVE_STATUSES };
      }
      
      if (category) {
        query.category = category;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate("createdBy", "fullName email phone")
          .populate("assignedTo", "fullName")
          .populate("assignedTeam", "name members")
          .populate("assignedDepartment", "name")
          .sort({ priorityScore: -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Complaint.countDocuments(query)
      ]);

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
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         // For getComplaints, fall back to municipality; but if that also fails?
         // Actually we already attempted to get department earlier and caught; this catch shouldn't occur.
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: "Failed to retrieve complaints" });
     }
  }

  async getComplaintsGeo(req, res) {
    try {
      let department;
      let departmentId;
      try {
        department = await getManagerDepartment(req.user.userId);
        departmentId = department?._id;
      } catch (err) {
        if (err.message !== "NO_DEPARTMENT_ASSIGNED") {
          throw err;
        }
      }

      const query = {};
      
      if (departmentId) {
        query["assignedDepartment.id"] = departmentId;
      } else {
        const user = await User.findById(req.user.userId).select('municipality municipalityName').lean();
        if (user?.municipality) {
          query.municipality = user.municipality;
        } else if (user?.municipalityName) {
          query.municipalityName = user.municipalityName;
        }
      }
      
      query.status = { $in: MANAGER_ACTIVE_STATUSES };
      query["location.coordinates"] = { $exists: true, $ne: null };

      const complaints = await Complaint.find(query)
        .select("_id title description category status priorityScore urgency createdAt location referenceId municipalityName")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      const geoData = complaints
        .filter(c => c.location && c.location.coordinates && c.location.coordinates.length === 2)
        .map(c => ({
          _id: c._id,
          title: c.title,
          description: c.description,
          category: c.category,
          status: c.status,
          priorityScore: c.priorityScore,
          urgency: c.urgency,
          referenceId: c.referenceId,
          createdAt: c.createdAt,
          location: {
            lat: c.location.coordinates[1],
            lng: c.location.coordinates[0],
            address: c.location.address
          },
          municipalityName: c.municipalityName
        }));

      res.json({
        success: true,
        data: geoData,
        count: geoData.length
      });
    } catch (error) {
      console.error("Manager get complaints geo error:", error);
      if (error.message === "NO_DEPARTMENT_ASSIGNED") {
        return res.status(400).json({ success: false, message: "No department assigned to this manager" });
      }
      res.status(500).json({ success: false, message: "Failed to retrieve complaint locations" });
    }
  }

async assignTechnician(req, res) {
    try {
      const { technicianId } = req.body;
      
      if (!technicianId) {
        return res.status(400).json({ success: false, message: "Technician ID is required" });
      }

      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const technician = await User.findOne({ _id: technicianId, role: "TECHNICIAN" });
      
      if (!technician) {
        return res.status(404).json({ success: false, message: "Technician not found" });
      }

      const department = await getManagerDepartment(req.user.userId);
      
      // Set assignedDepartment {id, name}
      if (department) {
        complaint.assignedDepartment = {
          id: department._id,
          name: department.name
        };
      }

      complaint.assignedTo = technicianId;
      complaint.status = "ASSIGNED";
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "ASSIGNED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: `Assigned to technician ${technician.fullName}`
      });
      
      await complaint.save();

      const io = req.app?.get?.('io');
      
      // Personalized notification to technician
      await notificationService.sendNotification(io, technicianId, {
        type: "assigned",
        title: "New Complaint Assigned",
        message: `A new complaint "${complaint.title}" has been assigned to your department (${department?.name}). Please review it.`,
        complaintId: complaint._id.toString(),
        metadata: { assignedBy: req.user.userId, departmentId: department?._id?.toString() },
      });

      // Notification to citizen
      if (complaint.createdBy) {
        await notificationService.sendNotification(io, complaint.createdBy.toString(), {
          type: "assigned",
          title: "Your complaint has been assigned",
          message: `Your complaint "${complaint.title}" has been assigned to the ${department?.name} team. We are on it!`,
          complaintId: complaint._id.toString(),
          metadata: { departmentId: department?._id?.toString(), departmentName: department?.name },
        });
      }

      // Get technician email
      const technicianUser = await User.findById(technicianId).select('email').lean();

      const technicianEmails = technicianUser?.email ? [technicianUser.email] : [];
      const managerUser = { email: req.user.email, fullName: req.user.fullName };

      // Trigger emails (non-blocking)
      sendAssignmentEmails(complaint, department?.name || 'Department', technicianEmails, managerUser)
        .catch(err => console.error('Assignment emails failed:', err));

      res.json({
        success: true,
        message: "Complaint assigned to technician successfully",
        data: complaint
      });
     } catch (error) {
       console.error("Manager assign technician error:", error);
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: "Failed to assign technician" });
     }
  }

  async reassignTechnician(req, res) {
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
      
      if (oldTechnicianId) {
        try {
          await notificationService.sendNotification(io, oldTechnicianId.toString(), {
            type: "unassigned",
            title: "Task Unassigned",
            message: `You have been unassigned from "${complaint.title || 'a complaint'}".`,
            complaintId: complaint._id.toString(),
            metadata: { newTechnicianId: technicianId, reassignedBy: req.user.userId },
          });
        } catch (notifError) {
          console.error("Failed to notify old technician:", notifError);
        }
      }

      try {
        await notificationService.sendNotification(io, technicianId, {
          type: "assigned",
          title: "New Complaint Assigned",
          message: `Complaint '${complaint.title}' has been assigned to your team.`,
          complaintId: complaint._id.toString(),
          metadata: { assignedBy: req.user.userId, reassignment: true },
        });
      } catch (notifError) {
        console.error("Failed to notify new technician:", notifError);
      }

      if (complaint.createdBy) {
        try {
          const dept = await getManagerDepartment(req.user.userId);
          const deptName = dept?.name || 'a department';
          await notificationService.sendNotification(io, complaint.createdBy.toString(), {
            type: "assigned",
            title: "Complaint Reassigned",
            message: `Your complaint '${complaint.title}' has been assigned to ${deptName}.`,
            complaintId: complaint._id.toString(),
            metadata: { departmentName: deptName, assignedBy: req.user.userId },
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
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: "Failed to reassign technician" });
     }
  }

  async assignTeam(req, res) {
    try {
      const { technicianIds } = req.body;
      
      if (!technicianIds || !Array.isArray(technicianIds) || technicianIds.length === 0) {
        return res.status(400).json({ success: false, message: "At least one technician ID is required" });
      }

      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      let departmentId = null;
      if (req.user.role === "DEPARTMENT_MANAGER") {
        const department = await getManagerDepartment(req.user.userId);
        departmentId = department?._id;
        
        if (departmentId && complaint.assignedDepartment?.toString() !== departmentId.toString()) {
          return res.status(403).json({ success: false, message: "Complaint not in your department" });
        }
      }

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

      // Fetch department for email notifications
      const department = departmentId ? await Department.findById(departmentId) : null;

      const teamName = `RC-${complaint._id.toString().slice(-6)} ${complaint.category || 'Maintenance'} - Equipe`;
      const repairTeam = new RepairTeam({
        name: teamName,
        members: technicianIds,
        department: departmentId,
        isAvailable: true
      });
      await repairTeam.save();

        complaint.assignedTeam = repairTeam._id;
        complaint.assignedTo = technicianIds[0];
        complaint.status = "ASSIGNED";
        
        // Set assignedDepartment if department is known
        if (departmentId) {
          complaint.assignedDepartment = {
            id: department._id,
            name: department.name
          };
        }
        
        await complaint.save();
        
       const populatedTeam = await RepairTeam.findById(repairTeam._id)
         .populate("members", "fullName email");

      const io = req.app?.get?.('io');
      // Notify technicians
      for (const tech of technicians) {
        try {
          await notificationService.sendNotification(io, tech._id.toString(), {
            type: "assigned",
            title: "New Complaint Assigned",
            message: `Complaint '${complaint.title}' has been assigned to your team (${department?.name}).`,
            complaintId: complaint._id.toString(),
            metadata: { teamId: repairTeam._id.toString(), departmentId: department?._id?.toString(), assignedBy: req.user.userId },
          });
        } catch (notifError) {
          console.error("Failed to notify team member:", notifError);
        }
      }

      // Notify citizen
      if (complaint.createdBy) {
        try {
          const dept = await getManagerDepartment(req.user.userId);
          const deptName = dept?.name || 'a department';
          await notificationService.sendNotification(io, complaint.createdBy.toString(), {
            type: "assigned",
            title: "Complaint Assigned",
            message: `Your complaint '${complaint.title}' has been assigned to ${deptName}.`,
            complaintId: complaint._id.toString(),
            metadata: { departmentName: deptName, departmentId: department?._id?.toString() },
          });
        } catch (notifError) {
          console.error("Failed to notify citizen:", notifError);
        }
      }

      // Send confirmation email to manager
      const technicianEmails = technicians.map(t => t.email).filter(Boolean);
      const managerUser = { email: req.user.email, fullName: req.user.fullName };
      sendAssignmentEmails(complaint, department?.name || 'Department', technicianEmails, managerUser)
        .catch(err => console.error('Assignment emails failed:', err));

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
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: "Failed to assign team" });
     }
  }

  async updatePriority(req, res) {
    try {
      const { urgency, priorityScore } = req.body;
      
      if (!urgency && priorityScore === undefined) {
        return res.status(400).json({ success: false, message: "Urgency or priority score is required" });
      }

      const complaint = await Complaint.findById(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const allowedStatuses = ["VALIDATED", "ASSIGNED"];
      if (!allowedStatuses.includes(complaint.status)) {
        return res.status(400).json({ 
          success: false, 
          message: `Priority can only be changed when complaint is ${allowedStatuses.join(" or ")}. Current status: ${complaint.status}` 
        });
      }

      // Allow managers to change priority if complaint is in their municipality
      const user = await User.findById(req.user.userId).select('municipality municipalityName governorate').lean();
      const managerMunicipality = user?.municipality || user?.municipalityName;
      const complaintMunicipality = complaint.municipalityName || complaint.municipality;
      const isAdmin = req.user.role === "ADMIN";
      
      let canAccess = isAdmin;
      
      // Check municipality match using normalized comparison
      if (!canAccess && managerMunicipality && complaintMunicipality) {
        const { normalizeMunicipality } = require("../utils/normalize");
        canAccess = normalizeMunicipality(managerMunicipality) === normalizeMunicipality(complaintMunicipality);
      }
      
      if (!canAccess) {
        return res.status(403).json({ success: false, message: "Complaint not in your department or jurisdiction" });
      }

      if (urgency) {
        complaint.urgency = urgency;
      }
      if (priorityScore !== undefined) {
        complaint.priorityScore = priorityScore;
      }
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: complaint.status,
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: `Priority changed to ${urgency || `score ${priorityScore}`}`
      });
      
      await complaint.save();

      // Notify municipal agents about the priority change
      const io = req.app?.get?.('io');
      if (io && complaint.municipalityName) {
        try {
          const managerUser = await User.findById(req.user.userId).select('fullName').lean();
          const managerName = managerUser?.fullName || 'Manager';
          const newPriority = urgency || complaint.urgency;
          const agents = await User.find({
            role: 'MUNICIPAL_AGENT',
            municipalityName: { $regex: new RegExp(`^${complaint.municipalityName}$`, 'i') }
          }).select('_id').lean();
          if (agents.length > 0) {
            await notificationService.sendNotificationToMultiple(io, agents.map(a => a._id.toString()), {
              type: 'priority_changed',
              title: 'Priority Updated',
              message: `Priority for complaint '${complaint.title}' was updated to ${newPriority} by ${managerName}.`,
              complaintId: complaint._id.toString(),
              metadata: { newPriority, oldPriority: complaint.urgency, updatedBy: req.user.userId },
            });
          }
        } catch (notifErr) {
          console.error('Priority change notification failed:', notifErr.message);
        }
      }

      res.json({
        success: true,
        message: "Complaint priority updated successfully",
        data: complaint
      });
     } catch (error) {
       console.error("Manager update priority error:", error);
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: `Failed to update priority: ${error.message}` });
     }
  }

  async getTechnicians(req, res) {
    try {
      const { search } = req.query;
      
      // Remove isActive filter since it defaults to false and would exclude all technicians
      let query = { role: "TECHNICIAN" };
      
      if (search) {
        query.fullName = { $regex: search, $options: "i" };
      }
      
      let technicians;
      
      if (req.user.role === "ADMIN") {
        technicians = await User.find(query)
          .select("fullName email phone department")
          .sort({ fullName: 1 });
       } else {
         const department = await getManagerDepartment(req.user.userId);
         const departmentId = department?._id;
         
         // If no department assigned, show all technicians as fallback
         if (!departmentId) {
           console.warn(`Manager has no department assigned, showing all technicians`);
           technicians = await User.find(query)
             .select("fullName email phone")
             .sort({ fullName: 1 });
         } else {
           // First try to get technicians in the manager's department
           query.department = departmentId;
           technicians = await User.find(query)
             .select("fullName email phone")
             .sort({ fullName: 1 });
         
           // If no technicians found in department, show all technicians as fallback
           if (!technicians || technicians.length === 0) {
             console.warn(`No technicians found in department ${departmentId}, showing all technicians`);
             delete query.department;
             technicians = await User.find(query)
               .select("fullName email phone")
               .sort({ fullName: 1 });
           }
         }
       }

      if (!technicians || technicians.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: "No technicians available. Please add technicians in the admin panel."
        });
      }

      res.json({
        success: true,
        data: technicians
      });
     } catch (error) {
       console.error("Manager get technicians error:", error);
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: "Failed to retrieve technicians" });
     }
  }

  async getStats(req, res) {
    try {
      let department;
      let departmentId;
      try {
        department = await getManagerDepartment(req.user.userId);
        departmentId = department?._id;
      } catch (err) {
        if (err.message !== "NO_DEPARTMENT_ASSIGNED") {
          throw err;
        }
      }

      if (!departmentId) {
        return res.json({
          success: true,
          data: {
            total: 0,
            historicalTotal: 0,
            submitted: 0,
            pending: 0,
            validated: 0,
            assigned: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
            rejected: 0,
            totalOverdue: 0,
            totalAtRisk: 0,
            resolutionRate: 0,
            averageResolutionTime: 0,
            slaComplianceRate: 0,
            csat: 0,
            totalRatings: 0,
            byCategory: {}
          }
        });
      }

      const historicalBaseQuery = { "assignedDepartment.id": departmentId };
      const activeBaseQuery = {
        ...historicalBaseQuery,
        isArchived: false,
        status: { $in: MANAGER_ACTIVE_STATUSES },
      };

       const [historicalTotal, total, submitted, validated, assigned, inProgress, resolved, closed, rejected, overdue, atRisk, byCategory, resolvedWithRatingCount, csatCount] = await Promise.all([
         Complaint.countDocuments(historicalBaseQuery),
         Complaint.countDocuments(activeBaseQuery),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "SUBMITTED", isArchived: false }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "VALIDATED" }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "ASSIGNED" }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "IN_PROGRESS" }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "RESOLVED" }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "CLOSED" }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: "REJECTED" }),
         Complaint.countDocuments({ ...historicalBaseQuery, slaStatus: "OVERDUE", status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS"] } }),
         Complaint.countDocuments({ ...historicalBaseQuery, slaStatus: "AT_RISK", status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS"] } }),
         Complaint.aggregate([
           { $match: historicalBaseQuery },
           { $group: { _id: "$category", count: { $sum: 1 } } }
         ]),
         Complaint.countDocuments({ ...historicalBaseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, "rating.score": { $exists: true, $ne: null } }),
         Complaint.countDocuments({ ...historicalBaseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, "rating.score": { $gte: 4 } }),
        ]);

        const resolutionRate = historicalTotal > 0 ? Math.round((resolved + closed) / historicalTotal * 100) : 0;

        const avgTimeResult = await Complaint.aggregate([
          { $match: { ...historicalBaseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
          { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
        ]);
        const averageResolutionTime = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;

        const resolvedCount = resolved + closed;
        const onTimeCountResult = await Complaint.countDocuments({ ...historicalBaseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, slaStatus: "COMPLETED" });
        const slaComplianceRate = resolvedCount > 0 ? Math.round((onTimeCountResult / resolvedCount) * 100) : 0;

       const totalRatings = resolvedWithRatingCount;
       const csat = totalRatings > 0 ? Math.round((csatCount / totalRatings) * 100) : 0;

       res.json({
         success: true,
         data: {
           total,
           historicalTotal,
           submitted,
           pending: submitted,
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
           slaComplianceRate,
           csat,
           totalRatings,
           byCategory: byCategory.reduce((acc, item) => {
             acc[item._id] = item.count;
             return acc;
           }, {})
         }
       });
     } catch (error) {
       console.error("Manager get stats error:", error);
       res.json({
         success: true,
         data: {
           total: 0,
           historicalTotal: 0,
           submitted: 0,
           pending: 0,
           validated: 0,
           assigned: 0,
           inProgress: 0,
           resolved: 0,
           closed: 0,
           rejected: 0,
           totalOverdue: 0,
           totalAtRisk: 0,
           resolutionRate: 0,
           averageResolutionTime: 0,
           slaComplianceRate: 0,
           csat: 0,
           totalRatings: 0,
           byCategory: {}
         }
       });
     }
  }

  async getTechnicianPerformance(req, res) {
    try {
      const { search } = req.query;
      
      let query = { role: "TECHNICIAN", isActive: true };
      
      if (search) {
        query.fullName = { $regex: search, $options: "i" };
      }

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
        
        const avgTimeResult = await Complaint.aggregate([
          { $match: { assignedTo: techId, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
          { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
        ]);
        const avgResolutionHours = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;
        
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
       if (error.message === "NO_DEPARTMENT_ASSIGNED") {
         return res.status(400).json({ success: false, message: "No department assigned to this manager" });
       }
       res.status(500).json({ success: false, message: "Failed to retrieve technician performance" });
     }
  }

  async sendMessage(req, res) {
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

      const io = req.app?.get?.('io');
      await notificationService.sendNotification(io, technician._id.toString(), {
        type: "technician_message",
        title: "Message from Manager",
        message: `Message from ${manager?.fullName || "Manager"}: ${message.trim().slice(0, 100)}`,
        metadata: { fromManagerId: req.user.userId, managerName: manager?.fullName },
      });

      res.json({
        success: true,
        message: "Message sent successfully"
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ success: false, message: "Failed to send message" });
    }
  }

  async sendWarning(req, res) {
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

      const io = req.app?.get?.('io');
      await notificationService.sendNotification(io, technician._id.toString(), {
        type: "manager_warning",
        title: "Warning from Manager",
        message: `Warning from ${manager?.fullName || "Manager"}: ${warning.trim()}`,
        metadata: { fromManagerId: req.user.userId, managerName: manager?.fullName },
      });

      res.json({
        success: true,
        message: "Warning sent successfully"
      });
    } catch (error) {
      console.error("Send warning error:", error);
      res.status(500).json({ success: false, message: "Failed to send warning" });
    }
  }

  async reassign(req, res) {
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
        return res.status(400).json({ 
          success: false, 
          message: "Can only reassign when complaint status is ASSIGNED" 
        });
      }

      const newTechnician = await User.findOne({ _id: technicianId, role: "TECHNICIAN" });
      if (!newTechnician) {
        return res.status(404).json({ success: false, message: "Technician not found" });
      }

      const oldTechnicianId = complaint.assignedTo;
      const oldTechnician = oldTechnicianId ? await User.findById(oldTechnicianId).select("fullName") : null;

      complaint.assignedTo = technicianId;
      
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: complaint.status,
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: `Technician changed from ${oldTechnician?.fullName || "None"} to ${newTechnician.fullName}`
      });
      
      await complaint.save();

      const io = req.app?.get?.('io');

      if (oldTechnicianId) {
        await notificationService.sendNotification(io, oldTechnicianId.toString(), {
          type: "info",
          title: "Task Unassigned",
          message: `You have been unassigned from complaint "${complaint.title || complaint.referenceId}"`,
          complaintId: complaint._id.toString(),
          metadata: { newTechnicianId: technicianId, reassignedBy: req.user.userId },
        });
      }

      await notificationService.sendNotification(io, technicianId.toString(), {
        type: "assigned",
        title: "New Complaint Assigned",
        message: `Complaint '${complaint.title}' has been assigned to your team.`,
        complaintId: complaint._id.toString(),
        metadata: { assignedBy: req.user.userId, reassignment: true },
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
  }

  async validate(req, res) {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      if (complaint.status !== "SUBMITTED") {
        return res.status(400).json({ success: false, message: "Only SUBMITTED complaints can be validated" });
      }

      let departmentId;
      try {
        const department = await getManagerDepartment(req.user.userId);
        departmentId = department?._id;
      } catch (err) {
        if (err.message !== "NO_DEPARTMENT_ASSIGNED") {
          throw err;
        }
        // else continue without department assignment
      }

      if (departmentId) {
        complaint.assignedDepartment = departmentId;
      }

      complaint.status = "ASSIGNED";
      complaint.validatedBy = req.user.userId;
      complaint.validatedAt = new Date();
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "ASSIGNED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: "Validated by Manager"
      });

      await complaint.save();

      if (complaint.createdBy) {
        await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy.toString(), {
          type: "validated",
          title: "Complaint Validated",
          message: `Your complaint '${complaint.title}' has been validated and is now visible publicly.`,
          complaintId: complaint._id.toString(),
          metadata: { validatedBy: req.user.userId },
        });
      }

      res.json({ success: true, message: "Complaint validated successfully", data: complaint });
    } catch (error) {
      console.error("Manager validate error:", error);
      res.status(500).json({ success: false, message: "Failed to validate complaint" });
    }
  }

  async reject(req, res) {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ success: false, message: "Rejection reason is required" });
      }

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      if (complaint.status !== "SUBMITTED") {
        return res.status(400).json({ success: false, message: "Only SUBMITTED complaints can be rejected" });
      }

      complaint.status = "REJECTED";
      complaint.rejectionReason = reason;
      complaint.rejectedBy = req.user.userId;
      complaint.rejectedAt = new Date();
      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({
        status: "REJECTED",
        updatedBy: req.user.userId,
        updatedAt: new Date(),
        notes: `Rejected by Manager: ${reason}`
      });

      await complaint.save();

      if (complaint.createdBy) {
        await notificationService.sendNotification(req.app?.get?.('io'), complaint.createdBy.toString(), {
          type: "rejected",
          title: "Complaint Rejected",
          message: `Your complaint '${complaint.title}' was rejected. Reason: ${reason}.`,
          complaintId: complaint._id.toString(),
          metadata: { rejectionReason: reason, rejectedBy: req.user.userId },
        });
      }

      res.json({ success: true, message: "Complaint rejected", data: complaint });
    } catch (error) {
      console.error("Manager reject error:", error);
      res.status(500).json({ success: false, message: "Failed to reject complaint" });
    }
  }
}

module.exports = new ManagerController();
