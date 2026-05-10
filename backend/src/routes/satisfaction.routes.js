const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const satisfactionController = require("../controllers/satisfactionController");

// Create survey (citizen only)
router.post("/", authenticate, authorize("CITIZEN"), (req, res) => satisfactionController.createSurvey(req, res));

// Dismiss survey (citizen only)
router.post("/dismiss", authenticate, authorize("CITIZEN"), (req, res) => satisfactionController.dismissSurvey(req, res));

// Get pending survey for citizen
router.get("/pending", authenticate, authorize("CITIZEN"), (req, res) => satisfactionController.getPendingSurvey(req, res));

// Trigger survey for a complaint (internal/system use)
router.post("/trigger/:complaintId", authenticate, (req, res) => satisfactionController.triggerSurveyForComplaint(req, res));

// Get survey statistics (admin/manager)
router.get("/stats", authenticate, authorize("ADMIN", "DEPARTMENT_MANAGER"), (req, res) => satisfactionController.getSurveyStats(req, res));

module.exports = router;
