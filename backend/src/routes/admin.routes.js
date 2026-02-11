const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

// All admin routes require authentication and ADMIN role

router.get("/users", authenticate, authorize("ADMIN"), async (req, res) => {
  const User = require("../models/User");
  const users = await User.find().select("-password");
  res.json({
    message: "Admin users list access granted",
    users,
  });
});

router.put("/users/:id/role", authenticate, authorize("ADMIN"), async (req, res) => {
  const User = require("../models/User");
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select("-password");
  res.json({
    message: "User role updated by admin",
    user,
  });
});

router.put("/users/:id/active", authenticate, authorize("ADMIN"), async (req, res) => {
  const User = require("../models/User");
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  ).select("-password");
  res.json({
    message: "User active status updated by admin",
    user,
  });
});

router.delete("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  const User = require("../models/User");
  await User.findByIdAndDelete(req.params.id);
  res.json({
    message: "User deleted by admin",
    userId: req.params.id,
  });
});

module.exports = router;
