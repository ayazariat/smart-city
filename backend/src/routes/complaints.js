const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const complaintController = require("../controllers/complaintController");

// Public routes
// None for now

// Protected routes - all require authentication
router.use(authenticate);

// Citizen routes - create and manage their own complaints
router.post("/", complaintController.create);

// My complaints routes - must come BEFORE /:id to avoid matching issues
router.get("/my-complaints", complaintController.getMyComplaints);
router.get("/my-complaints/:id", complaintController.getComplaintById);

// Admin/Agent routes - manage all complaints
router.get("/", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.getAllComplaints);
router.get("/stats", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.getStats);
router.get("/technicians", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.getTechnicians);
router.patch("/:id/status", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.updateStatus);
router.patch("/:id/assign", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.assignComplaint);
router.patch("/:id/department", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.assignDepartment);
router.patch("/:id/priority", authorize("ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"), complaintController.updatePriority);

// Common routes - both citizens and admin can access
router.get("/:id", complaintController.getComplaintById);
router.post("/:id/comments", complaintController.addComment);

module.exports = router;
