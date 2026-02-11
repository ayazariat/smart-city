const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

// All agent routes require authentication and MUNICIPAL_AGENT role

router.get("/tickets", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => {
  res.json({
    message: "Agent tickets access granted",
    tickets: [],
  });
});

router.put("/tickets/:id", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => {
  res.json({
    message: "Ticket updated by agent",
    ticketId: req.params.id,
    update: req.body,
  });
});

router.get("/complaints/pending", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => {
  res.json({
    message: "Pending complaints retrieved",
    complaints: [],
  });
});

module.exports = router;
