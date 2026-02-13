const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { authenticate, authorize } = require("../middleware/auth");
const User = require("../models/User");

// Valid roles for assignment
const VALID_ROLES = ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN", "ADMIN"];

/**
 * Helper function to format user response (excludes sensitive data)
 */
const formatUserResponse = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isActive: user.isActive,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Helper function to send error response
 */
const sendError = (res, status, message) => {
  return res.status(status).json({ success: false, message });
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (paginated)
 * @access  Admin only
 */
router.get("/users", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(searchQuery),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(formatUserResponse),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    sendError(res, 500, "Failed to fetch users");
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user by ID
 * @access  Admin only
 */
router.get("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    sendError(res, 500, "Failed to fetch user");
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Admin only
 */
router.post("/users", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { fullName, email, password, role, phone } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return sendError(res, 400, "Full name, email, and password are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 400, "Invalid email format");
    }

    // Validate password strength
    if (password.length < 8) {
      return sendError(res, 400, "Password must be at least 8 characters");
    }

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      return sendError(res, 400, `Invalid role. Valid roles: ${VALID_ROLES.join(", ")}`);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 409, "User with this email already exists");
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "CITIZEN",
      phone: phone || undefined,
      isVerified: true, // Admin-created users are auto-verified
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.name === "ValidationError") {
      return sendError(res, 400, error.message);
    }
    sendError(res, 500, "Failed to create user");
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Admin only
 */
router.put("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { fullName, phone, isActive } = req.body;
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (req.user.id === userId && isActive === false) {
      return sendError(res, 400, "Cannot deactivate your own account");
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    sendError(res, 500, "Failed to update user");
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put("/users/:id/role", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Validate role
    if (!role) {
      return sendError(res, 400, "Role is required");
    }

    if (!VALID_ROLES.includes(role)) {
      return sendError(res, 400, `Invalid role. Valid roles: ${VALID_ROLES.join(", ")}`);
    }

    // Prevent admin from demoting themselves
    if (req.user.id === userId && role !== "ADMIN") {
      return sendError(res, 400, "Cannot change your own admin role");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    sendError(res, 500, "Failed to update user role");
  }
});

/**
 * @route   PUT /api/admin/users/:id/active
 * @desc    Toggle user active status
 * @access  Admin only
 */
router.put("/users/:id/active", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.params.id;

    if (typeof isActive !== "boolean") {
      return sendError(res, 400, "isActive must be a boolean value");
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === userId && !isActive) {
      return sendError(res, 400, "Cannot deactivate your own account");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    res.json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error updating user active status:", error);
    sendError(res, 500, "Failed to update user active status");
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user permanently
 * @access  Admin only
 */
router.delete("/users/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return sendError(res, 400, "Cannot delete your own account");
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      data: { id: userId },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    sendError(res, 500, "Failed to delete user");
  }
});

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get("/users/stats", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
        },
      },
    ]);

    const total = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        total,
        active: activeUsers,
        inactive: total - activeUsers,
        byRole: stats,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    sendError(res, 500, "Failed to fetch user statistics");
  }
});

module.exports = router;
