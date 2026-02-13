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
const { sendMagicLinkEmail, sendPasswordResetEmail, sendLoginEmailReminder } = require("../utils/mailer");
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

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (!captchaToken) {
        return res
          .status(400)
          .json({ message: "Captcha verification is required." });
      }

      try {
        const data = await verifyRecaptcha(recaptchaSecret, captchaToken);
        if (!data.success || data.score < 0.5) {
          return res.status(400).json({ message: "Captcha verification failed" });
        }
      } catch {
        return res.status(400).json({ message: "Captcha verification error" });
      }
    }

    if (phone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.startsWith("216")) {
        const localNumber = digits.substring(3);
        if (localNumber.length !== 8) {
          return res.status(400).json({
            message: "Phone must be 8 digits after country code (e.g., +21625448885).",
          });
        }
      } else if (digits.length !== 8) {
        return res.status(400).json({
          message: "Invalid phone number. Use 8 digits (e.g., 25448885).",
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const crypto = require('crypto');
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpires = Date.now() + 15 * 60 * 1000;

    await PendingUser.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? "+216" + phone.replace(/\D/g, "").slice(-8) : null,
      verificationToken: magicToken,
      verificationExpires: magicTokenExpires,
      verificationMethod: "email",
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/verify-account?token=${magicToken}&userId=${normalizedEmail}`;

    try {
      await sendMagicLinkEmail(normalizedEmail, magicLink, fullName);
    } catch (emailError) {
      console.error("Failed to send magic link email:", emailError);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

router.post("/verify-code", async (req, res) => {
  try {
    const { email, code, method } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await PendingUser.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    if (user.verificationMethod !== method) {
      return res.status(400).json({ message: "Verification method mismatch" });
    }

    if (user.verificationToken !== code || Date.now() > user.verificationExpires) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);

    await User.create({
      fullName: user.fullName,
      email: user.email,
      password: hashedPassword,
      phone: user.phone,
      isVerified: true,
    });

    await PendingUser.deleteOne({ email: normalizedEmail });

    res.json({ message: "Account verified successfully! You can now log in." });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
});

router.delete("/pending-registration", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await PendingUser.deleteOne({ email: normalizedEmail });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No pending registration found" });
    }

    res.json({ message: "Pending registration deleted successfully" });
  } catch (error) {
    console.error("Delete pending error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      const { "g-recaptcha-response": recaptchaResponse } = req.body;
      if (!recaptchaResponse) {
        return res.status(400).json({
          message: "Password too weak. It must be at least 12 characters and include uppercase, lowercase, number, and special character.",
        });
      }
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been deactivated. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await AuditLog.create({
        userId: user._id,
        action: "AUTH_LOGIN_FAILED",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

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
        phone: user.phone,
        role: user.role,
        passwordLastChanged: user.passwordLastChanged,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ isAuthenticated: false });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require("../utils/jwt");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ isAuthenticated: false });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({ isAuthenticated: false });
    }

    res.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        passwordLastChanged: user.passwordLastChanged,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ isAuthenticated: false });
  }
});

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token is no longer valid" });
    }

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
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Token refresh failed" });
  }
});

router.post("/request-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const crypto = require('crypto');
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpires = Date.now() + 15 * 60 * 1000;

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.magicToken = magicToken;
      user.magicTokenExpires = magicTokenExpires;
      await user.save();
    } else {
      const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
      if (pendingUser) {
        pendingUser.verificationToken = magicToken;
        pendingUser.verificationExpires = magicTokenExpires;
        await pendingUser.save();
        user = pendingUser;
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/verify-account?token=${magicToken}&userId=${normalizedEmail}`;

    try {
      await sendMagicLinkEmail(normalizedEmail, magicLink, user.fullName);
    } catch (emailError) {
      console.error("Failed to send magic link email:", emailError);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    console.error("Request verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/verify-magic-link", async (req, res) => {
  try {
    const { token, userId } = req.query;

    if (!token || !userId) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    const normalizedEmail = userId.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
      if (!pendingUser) {
        return res.status(400).json({ message: "User not found" });
      }

      if (pendingUser.verificationToken !== token || Date.now() > pendingUser.verificationExpires) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(pendingUser.password, salt);

      user = await User.create({
        fullName: pendingUser.fullName,
        email: pendingUser.email,
        password: hashedPassword,
        phone: pendingUser.phone,
        isVerified: true,
      });

      await PendingUser.deleteOne({ email: normalizedEmail });
    } else {
      if (user.magicToken !== token || Date.now() > user.magicTokenExpires) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }

      user.isVerified = true;
      user.magicToken = null;
      user.magicTokenExpires = null;
      await user.save();
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "AUTH_VERIFIED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?verified=true&token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("Verify magic link error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
});

router.post("/verify-code", async (req, res) => {
  try {
    const { email, code, method } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await PendingUser.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    if (user.verificationMethod !== method) {
      return res.status(400).json({ message: "Verification method mismatch" });
    }

    if (user.verificationToken !== code || Date.now() > user.verificationExpires) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);

    await User.create({
      fullName: user.fullName,
      email: user.email,
      password: hashedPassword,
      phone: user.phone,
      isVerified: true,
    });

    await PendingUser.deleteOne({ email: normalizedEmail });

    res.json({ message: "Account verified successfully! You can now log in." });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require("../utils/jwt");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      passwordLastChanged: user.passwordLastChanged,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require("../utils/jwt");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const { fullName, phone } = req.body;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || fullName.length < 2 || fullName.length > 100) {
        return res.status(400).json({ message: "Full name must be between 2 and 100 characters" });
      }
      user.fullName = fullName;
    }

    if (phone !== undefined) {
      if (phone === "") {
        user.phone = null;
      } else {
        const digits = phone.replace(/\D/g, "");
        let phoneValue;
        if (digits.startsWith("216")) {
          const localNumber = digits.substring(3);
          if (localNumber.length !== 8) {
            return res.status(400).json({ message: "Phone must be 8 digits after country code (e.g., +21625448885)" });
          }
          phoneValue = "+" + digits;
        } else if (digits.length === 8) {
          phoneValue = "+216" + digits;
        } else {
          return res.status(400).json({ message: "Invalid phone number. Use 8 digits (e.g., 25448885)" });
        }
        user.phone = phoneValue;
      }
    }

    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "profile_updated",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      passwordLastChanged: user.passwordLastChanged,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.put("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require("../utils/jwt");
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const passwordMinLength = 12;
    if (newPassword.length < passwordMinLength) {
      return res.status(400).json({ message: `Password must be at least ${passwordMinLength} characters` });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password must include uppercase, lowercase, number, and special character" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordLastChanged = new Date();
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_CHANGED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.log(`[Password Reset] No user found for email: ${normalizedEmail}`);
      return res.json({ message: "If an account exists, a password reset link has been sent." });
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 60 * 60 * 1000;

    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&id=${user._id}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink, user.fullName);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({ message: "Failed to send password reset email" });
    }

    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET_REQUESTED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "If an account exists, a password reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/send-login-email", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const normalizedPhone = phone.replace(/\D/g, "");

    const user = await User.findOne({
      $or: [
        { phone: `+${normalizedPhone}` },
        { phone: normalizedPhone },
      ],
    });

    if (!user) {
      return res.json({ message: "If an account exists, login instructions have been sent." });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      await sendLoginEmailReminder(user.email, user.fullName, frontendUrl);
    } catch (emailError) {
      console.error("Failed to send login email reminder:", emailError);
      return res.status(500).json({ message: "Failed to send login instructions" });
    }

    await AuditLog.create({
      userId: user._id,
      action: "LOGIN_EMAIL_REQUESTED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "If an account exists, login instructions have been sent." });
  } catch (error) {
    console.error("Send login email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (user.resetToken !== token) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (Date.now() > user.resetTokenExpires) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    const passwordMinLength = 12;
    if (newPassword.length < passwordMinLength) {
      return res.status(400).json({ message: `Password must be at least ${passwordMinLength} characters` });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpires = null;
    user.refreshToken = null;
    user.passwordLastChanged = new Date();
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET_COMPLETED",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Password has been reset successfully. Please log in with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
