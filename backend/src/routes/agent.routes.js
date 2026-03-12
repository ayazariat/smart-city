const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");

// All agent routes require authentication and MUNICIPAL_AGENT role

// Get agent's municipality from user profile
async function getAgentMunicipality(userId) {
  const user = await User.findById(userId).select("municipality municipalityName governorate");
  return user;
}

// GET /api/agent/complaints - Get complaints for agent's municipality
router.get("/complaints", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const user = await getAgentMunicipality(req.user.userId);
    const municipalityId = user?.municipality;
    const municipalityName = user?.municipalityName;
    
    const { status, category, page = 1, limit = 50 } = req.query;
    
    // Build query - filter by agent's municipality
    const query = {};
    
    // If user has municipality ID, use it
    if (municipalityId) {
      // Use $in to match both ObjectId and string municipality
      query.$or = [
        { municipality: municipalityId },
        { municipality: municipalityId.toString() }
      ];
    } else if (municipalityName) {
      // Fallback to municipality name
      query.municipalityName = municipalityName;
    } else if (user?.governorate) {
      // If no municipality, check by governorate
      query.governorate = user.governorate;
    }
    // If no municipality or governorate is set, show no complaints (or all - depending on requirement)
    
    // Filter by status if provided
    if (status) {
      if (status === "ALL") {
        // Show all statuses
      } else if (status === "SUBMITTED,VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED") {
        // Show all relevant statuses for agent
        query.status = { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] };
      } else {
        query.status = status;
      }
    }
    // Default: show all statuses - no filter by default
    
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("createdBy", "fullName email phone")
        .populate("assignedDepartment", "name")
        .populate("assignedTo", "fullName")
        .populate("municipality", "name governorate")
        .sort({ createdAt: -1 })
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
    console.error("Agent get complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve complaints" });
  }
});

// PUT /api/agent/complaints/:id/validate - Validate a submitted complaint
router.put("/complaints/:id/validate", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Only SUBMITTED complaints can be validated
    if (complaint.status !== "SUBMITTED") {
      return res.status(400).json({ 
        success: false, 
        message: "Only submitted complaints can be validated" 
      });
    }

    // Check if complaint belongs to agent's municipality
    const user = await getAgentMunicipality(req.user.userId);
    const municipalityId = user?.municipality;
    const municipalityName = user?.municipalityName;
    
    if (municipalityId && complaint.municipality?.toString() !== municipalityId.toString()) {
      return res.status(403).json({ success: false, message: "Complaint not in your municipality" });
    }
    if (municipalityName && complaint.municipalityName !== municipalityName) {
      return res.status(403).json({ success: false, message: "Complaint not in your municipality" });
    }

    complaint.status = "VALIDATED";
    await complaint.save();

    res.json({
      success: true,
      message: "Complaint validated successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Agent validate complaint error:", error);
    res.status(500).json({ success: false, message: "Failed to validate complaint" });
  }
});

// PUT /api/agent/complaints/:id/reject - Reject a submitted complaint with justification
router.put("/complaints/:id/reject", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Only SUBMITTED complaints can be rejected
    if (complaint.status !== "SUBMITTED") {
      return res.status(400).json({ 
        success: false, 
        message: "Only submitted complaints can be rejected" 
      });
    }

    // Check if complaint belongs to agent's municipality
    const user = await getAgentMunicipality(req.user.userId);
    const municipalityId = user?.municipality;
    const municipalityName = user?.municipalityName;
    
    if (municipalityId && complaint.municipality?.toString() !== municipalityId.toString()) {
      return res.status(403).json({ success: false, message: "Complaint not in your municipality" });
    }
    if (municipalityName && complaint.municipalityName !== municipalityName) {
      return res.status(403).json({ success: false, message: "Complaint not in your municipality" });
    }

    complaint.status = "REJECTED";
    complaint.rejectionReason = reason;
    await complaint.save();

    res.json({
      success: true,
      message: "Complaint rejected successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Agent reject complaint error:", error);
    res.status(500).json({ success: false, message: "Failed to reject complaint" });
  }
});

// PUT /api/agent/complaints/:id/assign - Assign complaint to a department
router.put("/complaints/:id/assign", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const { departmentId } = req.body;
    
    if (!departmentId) {
      return res.status(400).json({ success: false, message: "Department ID is required" });
    }

    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Only VALIDATED complaints can be assigned to department
    if (complaint.status !== "VALIDATED") {
      return res.status(400).json({ 
        success: false, 
        message: "Only validated complaints can be assigned to a department" 
      });
    }

    // Check if complaint belongs to agent's municipality
    const user = await getAgentMunicipality(req.user.userId);
    const municipalityId = user?.municipality;
    const municipalityName = user?.municipalityName;
    
    if (municipalityId && complaint.municipality?.toString() !== municipalityId.toString()) {
      return res.status(403).json({ success: false, message: "Complaint not in your municipality" });
    }
    if (municipalityName && complaint.municipalityName !== municipalityName) {
      return res.status(403).json({ success: false, message: "Complaint not in your municipality" });
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    complaint.assignedDepartment = departmentId;
    complaint.status = "ASSIGNED";
    await complaint.save();

    res.json({
      success: true,
      message: "Complaint assigned to department successfully",
      data: complaint
    });
  } catch (error) {
    console.error("Agent assign complaint error:", error);
    res.status(500).json({ success: false, message: "Failed to assign complaint" });
  }
});

// GET /api/agent/departments - Get available departments
router.get("/departments", authenticate, authorize("MUNICIPAL_AGENT"), async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).select("name email phone");
    
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error("Agent get departments error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve departments" });
  }
});

module.exports = router;
