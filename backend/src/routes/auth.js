const express = require("express");
const { authenticate } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

// Register new user
router.post("/register", authController.register);

// Verify registration code
router.post("/verify-code", authController.verifyCode);

// Delete pending registration
router.delete("/pending-registration", authController.deletePendingRegistration);

// Login
router.post("/login", authController.login);

// Refresh token
router.post("/refresh-token", authController.refreshToken);

// Logout
router.post("/logout", authenticate, authController.logout);

// Forgot password
router.post("/forgot-password", authController.forgotPassword);

// Reset password
router.post("/reset-password", authController.resetPassword);

// Get current user
router.get("/me", authenticate, authController.getCurrentUser);

// Update profile
router.put("/profile", authenticate, authController.updateProfile);

// Change password
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
