const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const AuditLog = require("../models/AuditLog");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const { sendMagicLinkEmail, sendPasswordResetEmail } = require("../utils/mailer");
const { verifyRecaptcha } = require("../utils/recaptcha");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phone, captchaToken } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const existingPending = await PendingUser.findOne({ email: normalizedEmail });
    if (existingPending) {
      return res.status(400).json({ message: "A pending registration already exists for this email" });
    }

    if (!fullName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Optional reCAPTCHA v3 server-side verification
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (!captchaToken) {
        return res
          .status(400)
          .json({ message: "Captcha verification is required." });
      }

      try {
        const data = await verifyRecaptcha(recaptchaSecret, captchaToken);

        if (!data.success || (typeof data.score === "number" && data.score < 0.5)) {
          return res.status(400).json({
            message: "Suspicious activity detected (captcha failed).",
          });
        }
      } catch (err) {
        console.error("reCAPTCHA verification error:", err);
        return res.status(400).json({
          message: "Captcha verification failed.",
        });
      }
    }

    const passwordMinLength = 12;
    const passwordPolicyRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

    if (password.length < passwordMinLength || !passwordPolicyRegex.test(password)) {
      return res.status(400).json({
        message: "Password too weak. It must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    if (phone) {
      const e164PhoneRegex = /^\+[1-9]\d{7,14}$/;
      if (!e164PhoneRegex.test(phone)) {
        return res.status(400).json({
          message: "Invalid phone number format. Please use international format (e.g. +216XXXXXXXX).",
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const crypto = require('crypto');
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpires = Date.now() + 15 * 60 * 1000;

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: "CITIZEN",
      isVerified: false,
      magicToken,
      magicTokenExpires,
    });

    try {
      await sendMagicLinkEmail(normalizedEmail, user._id.toString(), magicToken, fullName);
    } catch (emailError) {
      console.error('Failed to send magic link email:', emailError);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log(`[DEV] Magic link: ${frontendUrl}/verify-account?token=${magicToken}&userId=${user._id}`);
    }

    res.status(201).json({
      message: "Inscription réussie ! Vérifiez votre email pour activer votre compte.",
      needsVerification: true,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete pending registration (for development/testing)
router.delete("/pending-registration", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const deleted = await PendingUser.deleteOne({ email: normalizedEmail });

    if (deleted.deletedCount === 0) {
      return res.status(404).json({ message: "No pending registration found for this email" });
    }

    res.json({ message: "Pending registration deleted successfully. You can now register again." });
  } catch (error) {
    console.error("Delete pending error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // Normalize email to lowercase for consistent matching
    const normalizedEmail = email.toLowerCase().trim();

    // Optional reCAPTCHA v3 verification (same as register)
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (!captchaToken) {
        return res
          .status(400)
          .json({ message: "Captcha verification is required." });
      }

      try {
        const data = await verifyRecaptcha(recaptchaSecret, captchaToken);

        if (!data.success || (typeof data.score === "number" && data.score < 0.5)) {
          return res.status(400).json({
            message: "Suspicious activity detected (captcha failed).",
          });
        }
      } catch (err) {
        console.error("reCAPTCHA verification error:", err);
        return res.status(400).json({
          message: "Captcha verification failed.",
        });
      }
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    // OPTIONAL: block login if account not verified yet
    // if (!user.isVerified) {
    //   return res.status(403).json({ message: "Please verify your account first." });
    // }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Audit failed login
      await AuditLog.create({
        userId: user._id,
        action: "AUTH_LOGIN_FAILED",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT tokens (short-lived access + long-lived refresh)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Persist refresh token for rotation / blacklist
    user.refreshToken = refreshToken;
    await user.save();

    // Audit successful login
    await AuditLog.create({
      userId: user._id,
      action: "AUTH_LOGIN_SUCCESS",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify token (for frontend to check if logged in)
router.get("/verify", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided", isAuthenticated: false });
  }

  const token = authHeader.substring(7);
  const { verifyAccessToken } = require("../utils/jwt");
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid token", isAuthenticated: false });
  }

  // Get fresh user data
  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    return res.status(401).json({ message: "User not found", isAuthenticated: false });
  }

  res.json({
    isAuthenticated: true,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
});

// Logout (client-side will remove token)
router.post("/logout", (req, res) => {
  // Note: front-end removes tokens; optional: invalidate refreshToken here if we had user context
  res.json({ message: "Logged out successfully" });
});

// Refresh access token using a valid refresh token (JWT rotation)
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Verify signature & expiry
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Load user and check that the provided refresh token matches the latest stored one
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token is no longer valid" });
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "AUTH_REFRESH_TOKEN_ROTATED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: "Token refreshed successfully",
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Request account verification (magic link)
router.post("/request-verification", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Normalize email to lowercase for consistent matching
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email. Please register first.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified." });
    }

    // Generate magic link token
    const crypto = require('crypto');
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.magicToken = magicToken;
    user.magicTokenExpires = magicTokenExpires;
    await user.save();

    // Send magic link email
    try {
      await sendMagicLinkEmail(normalizedEmail, user._id.toString(), magicToken, user.fullName);
    } catch (emailError) {
      console.error('Failed to send magic link email:', emailError);
      // In dev mode, log the magic link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log(`[DEV] Magic link: ${frontendUrl}/verify?token=${magicToken}&userId=${user._id}`);
    }

    await AuditLog.create({
      userId: user._id,
      action: "AUTH_MAGIC_LINK_SENT",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Magic link sent to your email." });
  } catch (error) {
    console.error("Request verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Verify account with magic link
router.get("/verify-magic-link", async (req, res) => {
  try {
    const { token, userId } = req.query;

    if (!token || !userId) {
      return res.status(400).json({ message: "Token and user ID are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified." });
    }

    if (user.magicToken !== token) {
      return res.status(400).json({ message: "Invalid magic link." });
    }

    if (user.magicTokenExpires < Date.now()) {
      return res.status(400).json({ message: "Magic link has expired. Please request a new one." });
    }

    // Verify the user
    user.isVerified = true;
    user.magicToken = null;
    user.magicTokenExpires = null;
    await user.save();

    // Generate JWT tokens for auto-login
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "AUTH_MAGIC_LINK_VERIFIED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: "Account verified successfully!",
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify magic link error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Legacy verify-code route (kept for backwards compatibility)
router.post("/verify-code", async (req, res) => {
  res.status(410).json({ 
    message: "This verification method is deprecated. Please use the magic link sent to your email." 
  });
});

// Get user profile
router.get("/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.substring(7);
  const { verifyAccessToken } = require("../utils/jwt");
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid token" });
  }

  // Get fresh user data
  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    passwordLastChanged: user.passwordLastChanged,
  });
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const { verifyAccessToken } = require("../utils/jwt");
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { fullName, phone } = req.body;

    // Validate fullName
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || fullName.length < 2 || fullName.length > 100) {
        return res.status(400).json({ message: "Full name must be between 2 and 100 characters" });
      }
      user.fullName = fullName;
    }

    // Validate phone (E.164 format)
    if (phone !== undefined) {
      if (phone === "") {
        // Allow clearing phone by setting empty string
        user.phone = null;
      } else {
        const e164PhoneRegex = /^\+[1-9]\d{7,14}$/;
        if (!e164PhoneRegex.test(phone)) {
          return res.status(400).json({ message: "Invalid phone number format. Use E.164 format (e.g. +216XXXXXXXX)" });
        }
        user.phone = phone;
      }
    }

    await user.save();

    // Audit log for profile update
    await AuditLog.create({
      userId: user._id,
      action: "profile_updated",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Change password
router.put("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const { verifyAccessToken } = require("../utils/jwt");
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get user with password
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate new password
    const passwordMinLength = 12;
    const passwordPolicyRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

    if (newPassword.length < passwordMinLength || !passwordPolicyRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password too weak. It must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordLastChanged = new Date();
    await user.save();

    // Audit log for password change
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_CHANGED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Forgot Password - Send reset link to email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Even if user not found, don't reveal it for security
    // Just return success to prevent email enumeration
    if (!user) {
      // Log the attempt for monitoring
      console.log(`[Password Reset] No user found for email: ${normalizedEmail}`);
      return res.json({ 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store reset token in user document
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(
      normalizedEmail,
      user._id.toString(),
      resetToken,
      user.fullName
    );

    // Audit log
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET_REQUESTED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ 
      message: "If an account exists with this email, a password reset link has been sent." 
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Reset Password - Validate token and set new password
router.post("/reset-password", async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword) {
      return res.status(400).json({ message: "User ID, token, and new password are required" });
    }

    // Find user with valid reset token
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "Invalid reset link" });
    }

    // Check if reset token matches and hasn't expired
    if (user.resetToken !== token) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    if (user.resetTokenExpires < Date.now()) {
      return res.status(400).json({ message: "Reset token has expired. Please request a new password reset." });
    }

    // Validate new password
    const passwordMinLength = 12;
    const passwordPolicyRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

    if (newPassword.length < passwordMinLength || !passwordPolicyRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password too weak. It must be at least 12 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordLastChanged = new Date();
    
    // Clear reset token
    user.resetToken = null;
    user.resetTokenExpires = null;
    
    // Invalidate all refresh tokens
    user.refreshToken = null;
    
    await user.save();

    // Audit log
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET_COMPLETED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
