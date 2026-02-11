const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

// All citizen routes require authentication and CITIZEN role

router.get("/profile", authenticate, authorize("CITIZEN"), (req, res) => {
  res.json({
    message: "Citizen profile access granted",
    user: req.user,
  });
});

router.post("/complaints", authenticate, authorize("CITIZEN"), async (req, res) => {
  // Complaint creation logic here
  res.status(201).json({
    message: "Citizen complaint submitted successfully",
    complaint: req.body,
  });
});

router.get("/complaints", authenticate, authorize("CITIZEN"), async (req, res) => {
  // Get citizen's complaints
  res.json({
    message: "Citizen complaints retrieved",
    complaints: [],
  });
});

module.exports = router;
