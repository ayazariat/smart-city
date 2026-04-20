
const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const citizenController = require("../controllers/citizenController");

// All citizen routes require authentication and CITIZEN role

router.get("/profile", authenticate, authorize("CITIZEN"), (req, res) => citizenController.getProfile(req, res));
router.post("/complaints", authenticate, authorize("CITIZEN", "ADMIN"), (req, res) => citizenController.createComplaint(req, res));
router.get("/complaints", authenticate, authorize("CITIZEN"), (req, res) => citizenController.getComplaints(req, res));
router.get("/complaints/:id", authenticate, authorize("CITIZEN"), (req, res) => citizenController.getComplaintById(req, res));
router.put("/complaints/:id", authenticate, authorize("CITIZEN"), (req, res) => citizenController.updateComplaint(req, res));
router.delete("/complaints/:id", authenticate, authorize("CITIZEN"), (req, res) => citizenController.deleteComplaint(req, res));
router.get("/stats", authenticate, authorize("CITIZEN"), (req, res) => citizenController.getStats(req, res));

module.exports = router;
