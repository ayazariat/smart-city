const bcrypt = require("bcryptjs");
const crypto = require("crypto");
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

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { fullName, email, password, phone, captchaToken, governorate, municipality, latitude, longitude } = req.body;

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Check for pending registration
      const existingPending = await PendingUser.findOne({ email: normalizedEmail });
      if (existingPending) {
        return res.status(400).json({ message: "A pending registration already exists for this email" });
      }

      // Validate required fields
      if (!fullName || !normalizedEmail || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate fullName minimum 3 characters
      if (fullName.length < 3) {
        return res.status(400).json({ message: "Full name must be at least 3 characters" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Verify reCAPTCHA
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      if (recaptchaSecret) {
        if (!captchaToken) {
          return res.status(400).json({ message: "Captcha verification is required." });
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

      // Validate phone number
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

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate magic token
      const magicToken = crypto.randomBytes(32).toString('hex');
      const magicTokenExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Extract governorate and municipality from coordinates if provided
      let finalGovernorate = governorate || "";
      let finalMunicipality = municipality || "";

      // If latitude/longitude provided but no location, we would need a geocoding service
      // For now, use manual input or empty values

      // Create pending user
      await PendingUser.create({
        fullName,
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? "+216" + phone.replace(/\D/g, "").slice(-8) : null,
        governorate: finalGovernorate,
        municipality: finalMunicipality,
        latitude: latitude || null,
        longitude: longitude || null,
        verificationToken: magicToken,
        verificationExpires: magicTokenExpires,
        verificationMethod: "email",
      });

      // Send magic link email
      try {
        await sendMagicLinkEmail(normalizedEmail, normalizedEmail, magicToken, fullName);
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
  }

  // Verify user registration
  async verifyCode(req, res) {
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

      // Create verified user
      await User.create({
        fullName: user.fullName,
        email: user.email,
        password: user.password,
        phone: user.phone,
        governorate: user.governorate || "",
        municipality: user.municipality || "",
        isVerified: true,
      });

      // Delete pending user
      await PendingUser.deleteOne({ email: normalizedEmail });

      res.json({ message: "Account verified successfully! You can now log in." });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Server error during verification" });
    }
  }

  // Delete pending registration
  async deletePendingRegistration(req, res) {
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
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const normalizedEmail = email.toLowerCase().trim();

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

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Save refresh token
      user.refreshToken = refreshToken;
      await user.save();

      // Log successful login
      await AuditLog.create({
        userId: user._id,
        action: "AUTH_LOGIN_SUCCESS",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          phone: user.phone,
          governorate: user.governorate,
          municipality: user.municipality,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // Rotate refresh token
      user.refreshToken = newRefreshToken;
      await user.save();

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(401).json({ message: "Invalid or expired refresh token" });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      // Clear refresh token from database
      if (req.user) {
        const user = await User.findById(req.user.userId);
        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Server error during logout" });
    }
  }

  // Request password reset
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });

      // Don't reveal if user exists
      if (!user) {
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

      user.resetToken = resetToken;
      user.resetTokenExpires = resetTokenExpires;
      await user.save();

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, user.fullName, resetToken);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        return res.status(500).json({ message: "Failed to send password reset email" });
      }

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.resetToken = null;
      user.resetTokenExpires = null;
      user.passwordLastChanged = new Date();
      user.refreshToken = null; // Invalidate all sessions

      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.userId).select("-password -refreshToken");
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        governorate: user.governorate,
        municipality: user.municipality,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const { fullName, phone, governorate, municipality } = req.body;
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (fullName) user.fullName = fullName;
      if (phone !== undefined) user.phone = phone;
      if (governorate !== undefined) user.governorate = governorate;
      if (municipality !== undefined) user.municipality = municipality;

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          governorate: user.governorate,
          municipality: user.municipality,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.passwordLastChanged = new Date();
      user.refreshToken = null; // Invalidate all sessions

      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = new AuthController();
