const express = require("express");
const { authenticate } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

// Register new user
router.post("/register", authController.register);

// Verify registration code
router.post("/verify-code", authController.verifyCode);

// Verify magic link (email verification)
router.get("/verify-magic-link", authController.verifyMagicLink);

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

// Request email verification (resend)
router.post("/request-verification", authController.requestVerification);

// Reset password
router.post("/reset-password", authController.resetPassword);

// Set password (for admin-created users)
router.post("/set-password", authController.setPassword);

// Get current user
router.get("/me", authenticate, authController.getCurrentUser);
router.get("/profile", authenticate, authController.getCurrentUser);

// Update profile
router.put("/profile", authenticate, authController.updateProfile);

// Change password
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
