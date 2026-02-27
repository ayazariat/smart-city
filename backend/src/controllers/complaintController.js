const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Department = require("../models/Department");

class ComplaintController {
  // Create new complaint (citizen)
  async create(req, res) {
    try {
      const { title, description, category, governorate, municipality, latitude, longitude, images } = req.body;
      const userId = req.user.userId;

      // Validate required fields
      if (!title || !description || !category) {
        return res.status(400).json({ success: false, message: "Title, description, and category are required" });
      }

      // Validate category
      const validCategories = [
        "ROAD",
        "LIGHTING",
        "WASTE",
        "WATER",
        "GREEN_SPACE",
        "BUILDING",
        "NOISE",
        "OTHER"
      ];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, message: "Invalid category" });
      }

      // Create complaint
      const complaint = new Complaint({
        title,
        description,
        category,
        governorate: governorate || "",
        municipality: municipality || "",
        latitude: latitude || null,
        longitude: longitude || null,
        images: images || [],
        status: "PENDING",
        createdBy: userId,
      });

      await complaint.save();

      // Create notification for admin
      try {
        await Notification.create({
          user: null, // Admin notification
          title: "New Complaint",
          message: `New complaint submitted: ${title}`,
          type: "COMPLAINT",
          relatedId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      res.status(201).json({
        success: true,
        message: "Complaint submitted successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(500).json({ success: false, message: "Failed to create complaint" });
    }
  }

  // Get citizen's complaints
  async getMyComplaints(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const category = req.query.category;

      const query = { createdBy: userId };
      
      if (status) {
        query.status = status;
      }
      if (category) {
        query.category = category;
      }

      const skip = (page - 1) * limit;

      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Complaint.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          complaints,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ success: false, message: "Failed to fetch complaints" });
    }
  }

  // Get single complaint by ID (detail view for BL-16)
  async getComplaintById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const complaint = await Complaint.findById(id)
        .populate("createdBy", "fullName email phone")
        .populate("assignedTeam", "fullName email")
        .populate("assignedDepartment", "name")
        .lean();

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Check if user is owner - also check direct comparison
      const citizenId = complaint.createdBy?._id?.toString() || complaint.createdBy?.toString();
      const currentUserId = req.user.userId?.toString();
      const isOwner = citizenId === currentUserId;
      const isAdminOrAgent = ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(userRole);
      const isTechnician = userRole === "TECHNICIAN" && complaint.assignedTo?.toString() === currentUserId;

      // For CITIZEN role - can only see their own complaints
      if (userRole === "CITIZEN" && !isOwner) {
        return res.status(403).json({ success: false, message: "Access denied - You can only view your own complaints" });
      }

      // For MUNICIPAL_AGENT - check municipality access
      if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality')
          .lean();
        
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        
        // Check if user has municipality assigned
        if (userMunicipalityId && complaintMunicipalityId) {
          if (userMunicipalityId !== complaintMunicipalityId) {
            return res.status(403).json({ success: false, message: "Access denied - This complaint is not in your municipality" });
          }
        } else if (userMunicipalityId && !complaintMunicipalityId) {
          // User has municipality but complaint doesn't - check municipalityName for backward compatibility
          const complaintMunicipalityName = complaint.municipalityName || complaint.location?.municipality;
          const userMunicipality = user.municipality;
          if (userMunicipality.name !== complaintMunicipalityName) {
            return res.status(403).json({ success: false, message: "Access denied - This complaint is not in your municipality" });
          }
        }
      }

      // For DEPARTMENT_MANAGER - check department access
      if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ 
          responsable: userId 
        }).select('_id').lean();
        
        if (myDepartment) {
          const complaintDepartment = complaint.assignedDepartment?._id?.toString();
          if (complaintDepartment !== myDepartment._id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied - This complaint is not in your department" });
          }
        } else {
          return res.status(403).json({ success: false, message: "No department assigned" });
        }
      }

      // For non-admin/agent/technician roles - check ownership
      if (!isOwner && !isAdminOrAgent && !isTechnician) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      // Format citizen info - hide email/phone if anonymous
      let citizenInfo = null;
      if (!complaint.isAnonymous && complaint.createdBy) {
        const citizen = complaint.createdBy;
        // Include contact info for: agents/managers/admin, OR the owner viewing their own complaint
        const showContactInfo = isAdminOrAgent || isOwner;
        citizenInfo = {
          _id: citizen._id,
          fullName: citizen.fullName,
          ...(showContactInfo && { email: citizen.email, phone: citizen.phone })
        };
      }

      // Format response for BL-16 complaint detail view
      const response = {
        _id: complaint._id,
        title: complaint.title,
        category: complaint.category,
        description: complaint.description,
        location: complaint.location,
        media: complaint.media || [],
        urgency: complaint.urgency || 3,
        priorityScore: complaint.priorityScore || 0,
        status: complaint.status,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
        isAnonymous: complaint.isAnonymous,
        citizen: citizenInfo,
        department: complaint.assignedDepartment,
        assignedTo: complaint.assignedTo,
        comments: complaint.comments,
        rejectionReason: complaint.rejectionReason,
        resolvedAt: complaint.resolvedAt,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Error fetching complaint:", error);
      // Provide more specific error messages
      if (error.name === "CastError") {
        return res.status(400).json({ success: false, message: "Invalid complaint ID" });
      }
      res.status(500).json({ success: false, message: "Error loading complaint" });
    }
  }

  // Get all complaints (admin/agent)
  async getAllComplaints(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;
      const category = req.query.category;
      const governorate = req.query.governorate;
      const municipality = req.query.municipality;
      const search = req.query.search;

      const query = {};

      // Role-based filtering
      if (req.user.role === "DEPARTMENT_MANAGER") {
        // Find the department this manager is responsible for
        const myDepartment = await Department.findOne({ 
          responsable: req.user.userId 
        }).select('_id').lean();
        
        if (myDepartment) {
          // Filter by assigned department AND only validated complaints
          query.assignedDepartment = myDepartment._id;
          query.status = { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] };
        } else {
          // Manager has no department assigned - return empty
          query._id = null;
        }
      } else if (req.user.role === "MUNICIPAL_AGENT") {
        // Municipal agents see all complaints in their municipality
        const user = await User.findById(req.user.userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        
        if (user?.municipality?._id) {
          query.municipality = user.municipality._id;
        } else if (user?.governorate) {
          query.governorate = user.governorate;
        }
      } else if (req.user.role === "TECHNICIAN") {
        // Technicians see only complaints assigned to them
        query.assignedTo = req.user.userId;
      }

      if (status) query.status = status;
      if (category) query.category = category;
      if (governorate && req.user.role === "ADMIN") query.governorate = governorate; // Admin can filter by governorate
      if (municipality && req.user.role === "ADMIN") query.municipality = municipality; // Admin can filter by municipality
      
      if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [
          { title: { $regex: safe, $options: "i" } },
          { description: { $regex: safe, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate("createdBy", "fullName email phone governorate municipality")
          .populate("assignedTo", "fullName email")
          .populate("assignedTeam", "fullName email")
          .populate("municipality", "name governorate")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Complaint.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          complaints,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ success: false, message: "Failed to fetch complaints" });
    }
  }

  // Update complaint status (with role-based permissions - BL-21)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason, notes } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Validate status using the new lifecycle
      const validStatuses = ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // authorization: only ADMIN or scoped MUNICIPAL_AGENT/DEPARTMENT_MANAGER
      if (userRole === "ADMIN") {
        // allowed
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId) {
          if (complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
          }
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
        if (!myDepartment || complaint.assignedDepartment?.toString() !== myDepartment._id.toString()) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Update status
      complaint.status = status;
      
      if (status === "REJECTED" && rejectionReason) {
        complaint.rejectionReason = rejectionReason;
      }

      if (status === "RESOLVED") {
        complaint.resolvedAt = new Date();
      }

      await complaint.save();

      // Notify citizen
      try {
        await Notification.create({
          user: complaint.createdBy,
          title: "Complaint Status Updated",
          message: `Your complaint "${complaint.title}" has been ${status.toLowerCase()}`,
          type: "COMPLAINT",
          relatedId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      res.json({
        success: true,
        message: "Complaint status updated",
        data: complaint,
      });
    } catch (error) {
      console.error("Error updating complaint status:", error);
      res.status(500).json({ success: false, message: "Failed to update complaint status" });
    }
  }

  // Assign complaint to technician (admin/agent)
  async assignComplaint(req, res) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;
      const userRole = req.user.role;
      const userId = req.user.userId;

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // authorization same as updateStatus
      if (userRole === "ADMIN") {
        // ok
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId && complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
        if (!myDepartment || complaint.assignedDepartment?.toString() !== myDepartment._id.toString()) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Verify technician exists
      const technician = await User.findById(assignedToId);
      if (!technician || technician.role !== "TECHNICIAN") {
        return res.status(400).json({ success: false, message: "Invalid technician" });
      }

      complaint.assignedTo = assignedToId;
      if (complaint.status !== "RESOLVED") {
        complaint.status = "IN_PROGRESS";
      }
      await complaint.save();

      // Notify technician
      try {
        await Notification.create({
          user: assignedToId,
          title: "New Assignment",
          message: `You have been assigned to complaint: ${complaint.title}`,
          type: "ASSIGNMENT",
          relatedId: complaint._id,
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      res.json({
        success: true,
        message: "Complaint assigned successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error assigning complaint:", error);
      res.status(500).json({ success: false, message: "Failed to assign complaint" });
    }
  }

  // Assign complaint to department
  async assignDepartment(req, res) {
    try {
      const { id } = req.params;
      const { departmentId } = req.body;
      const userRole = req.user.role;
      const userId = req.user.userId;

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Authorization same as updateStatus
      if (userRole === "ADMIN") {
        // ok
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId && complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
        if (!myDepartment || departmentId !== myDepartment._id.toString()) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Verify department exists
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({ success: false, message: "Invalid department" });
      }

      complaint.assignedDepartment = departmentId;
      // Auto-validate if not already validated
      if (complaint.status === "SUBMITTED") {
        complaint.status = "VALIDATED";
      }
      await complaint.save();

      res.json({
        success: true,
        message: "Department assigned successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error assigning department:", error);
      res.status(500).json({ success: false, message: "Failed to assign department" });
    }
  }

  // Update complaint priority/urgency
  async updatePriority(req, res) {
    try {
      const { id } = req.params;
      const { urgency, priorityScore } = req.body;
      const userRole = req.user.role;
      const userId = req.user.userId;

      // Validate urgency
      const validUrgencies = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      if (urgency && !validUrgencies.includes(urgency)) {
        return res.status(400).json({ success: false, message: "Invalid urgency level" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Authorization same as updateStatus
      if (userRole === "ADMIN") {
        // ok
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId && complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
        if (!myDepartment || complaint.assignedDepartment?.toString() !== myDepartment._id.toString()) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      if (urgency) {
        complaint.urgency = urgency;
      }
      if (priorityScore !== undefined) {
        complaint.priorityScore = priorityScore;
      } else if (urgency) {
        // Calculate priority score based on urgency
        const priorityMap = { LOW: 1, MEDIUM: 5, HIGH: 8, URGENT: 10 };
        complaint.priorityScore = priorityMap[urgency] || 5;
      }
      await complaint.save();

      res.json({
        success: true,
        message: "Priority updated successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error updating priority:", error);
      res.status(500).json({ success: false, message: "Failed to update priority" });
    }
  }

  // Add comment to complaint
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Comment text is required" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // authorization: only owner or admin/agents or assigned technician
      const isOwner = complaint.createdBy?.toString() === userId;
      const isAdminOrAgent = ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(userRole);
      const isTechnician = userRole === "TECHNICIAN" && complaint.assignedTo?.toString() === userId;
      if (!isOwner && !isAdminOrAgent && !isTechnician) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      complaint.comments.push({
        text: text.trim(),
        author: userId,
        createdAt: new Date(),
      });

      await complaint.save();

      // Populate the new comment
      const updatedComplaint = await Complaint.findById(id)
        .populate("comments.author", "fullName");

      const newComment = updatedComplaint.comments[updatedComplaint.comments.length - 1];

      res.json({
        success: true,
        message: "Comment added",
        data: newComment,
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ success: false, message: "Failed to add comment" });
    }
  }

  // Get complaint statistics
  async getStats(req, res) {
    try {
      const query = {};

      // Role-based filtering
      if (req.user.role === "DEPARTMENT_MANAGER") {
        // Find the department this manager is responsible for
        const myDepartment = await Department.findOne({ 
          responsable: req.user.userId 
        }).select('_id').lean();
        
        if (myDepartment) {
          query.assignedDepartment = myDepartment._id;
        } else {
          query._id = null;
        }
      } else if (req.user.role === "MUNICIPAL_AGENT") {
        const user = await User.findById(req.user.userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        if (user?.municipality?._id) {
          query.municipality = user.municipality._id;
        } else if (user?.governorate) {
          query.governorate = user.governorate;
        }
      }

      const [total, pending, inProgress, resolved, rejected, byCategory, byGovernorate] = await Promise.all([
        Complaint.countDocuments(query),
        Complaint.countDocuments({ ...query, status: "PENDING" }),
        Complaint.countDocuments({ ...query, status: "IN_PROGRESS" }),
        Complaint.countDocuments({ ...query, status: "RESOLVED" }),
        Complaint.countDocuments({ ...query, status: "REJECTED" }),
        Complaint.aggregate([
          { $match: query },
          { $group: { _id: "$category", count: { $sum: 1 } } }
        ]),
        Complaint.aggregate([
          { $match: { ...query, governorate: { $ne: "" } } },
          { $group: { _id: "$governorate", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
      ]);

      res.json({
        success: true,
        data: {
          total,
          pending,
          inProgress,
          resolved,
          rejected,
          byCategory: byCategory.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byGovernorate: byGovernorate.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch statistics" });
    }
  }

  // Get available technicians (for assignment)
  async getTechnicians(req, res) {
    try {
      const { governorate, department } = req.query;

      const query = { role: "TECHNICIAN", isActive: true };
      
      // Filter by department if provided (without using inheritance)
      if (department) {
        query.department = department;
      }
      
      // Role-based filtering
      if (req.user.role === "DEPARTMENT_MANAGER") {
        // Get technicians in the manager's department
        const myDepartment = await Department.findOne({ 
          responsable: req.user.userId 
        }).select('_id').lean();
        
        if (myDepartment) {
          // Managers can only see technicians in their department
          query.department = myDepartment._id;
        }
      } else if (req.user.role === "MUNICIPAL_AGENT") {
        const user = await User.findById(req.user.userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        if (user?.municipality?._id) {
          query.municipality = user.municipality._id;
        } else if (user?.governorate) {
          query.governorate = user.governorate;
        }
      } else if (governorate) {
        query.governorate = governorate;
      }

      const technicians = await User.find(query)
        .populate('department', 'name')
        .populate('municipality', 'name governorate')
        .select("fullName email governorate municipality department");

      res.json({
        success: true,
        data: technicians,
      });
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ success: false, message: "Failed to fetch technicians" });
    }
  }
}

module.exports = new ComplaintController();
