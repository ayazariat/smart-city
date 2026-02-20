const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Notification = require("../models/Notification");

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
        citizen: userId,
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

      const query = { citizen: userId };
      
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

  // Get single complaint by ID
  async getComplaintById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const complaint = await Complaint.findById(id)
        .populate("citizen", "fullName email phone")
        .populate("assignedTo", "fullName email")
        .populate("comments.author", "fullName");

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Check access - only owner or admin/agent can view
      const isOwner = complaint.citizen._id.toString() === userId;
      const isAdminOrAgent = ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(userRole);

      if (!isOwner && !isAdminOrAgent) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      res.json({
        success: true,
        data: complaint,
      });
    } catch (error) {
      console.error("Error fetching complaint:", error);
      res.status(500).json({ success: false, message: "Failed to fetch complaint" });
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

      if (status) query.status = status;
      if (category) query.category = category;
      if (governorate) query.governorate = governorate;
      if (municipality) query.municipality = municipality;
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate("citizen", "fullName email phone governorate municipality")
          .populate("assignedTo", "fullName email")
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

  // Update complaint status (admin/agent)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      // Validate status
      const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
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
          user: complaint.citizen,
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

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Verify technician exists
      const technician = await User.findById(assignedToId);
      if (!technician || technician.role !== "TECHNICIAN") {
        return res.status(400).json({ success: false, message: "Invalid technician" });
      }

      complaint.assignedTo = assignedToId;
      complaint.status = "IN_PROGRESS";
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

  // Add comment to complaint
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const userId = req.user.userId;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Comment text is required" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
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

      // Agents/managers only see their governorate's complaints
      if (req.user.role === "MUNICIPAL_AGENT" || req.user.role === "DEPARTMENT_MANAGER") {
        const user = await User.findById(req.user.userId);
        if (user.governorate) {
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
          { $match: { governorate: { $ne: "" } } },
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
      const { governorate } = req.query;

      const query = { role: "TECHNICIAN", isActive: true };
      if (governorate) {
        query.governorate = governorate;
      }

      const technicians = await User.find(query)
        .select("fullName email governorate municipality");

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
