const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
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
const { normalizeMunicipality } = require("../utils/normalize");

// Simple reusable validators
const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
function validatePasswordStrength(pwd) {
  if (!pwd || typeof pwd !== "string") {
    return "Password must be a string";
  }
  if (!passwordPolicyRegex.test(pwd)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, number and special character";
  }
  return null;
}

function validateFullName(name) {
  if (!name || typeof name !== "string" || name.trim().length < 3) {
    return "Full name must be at least 3 characters";
  }
  return null;
}

function validatePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // Strip country code if present
  const localNumber = digits.startsWith("216") ? digits.substring(3) : digits;
  if (!/^[2-9][0-9]{7}$/.test(localNumber)) {
    return "Phone must be 8 digits starting with 2-9 (e.g., 25448885).";
  }
  return null;
}

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { fullName, email, password, phone, captchaToken, governorate, municipality, latitude, longitude } = req.body;

      // Basic presence/type validation before touching database
      if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ message: "Full name is required" });
      }
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ message: "Password is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Check for pending registration - DELETE if exists (to allow fresh registration)
      const existingPending = await PendingUser.findOne({ email: normalizedEmail });
      if (existingPending) {
        // Delete the old pending registration to allow fresh registration
        await PendingUser.deleteOne({ email: normalizedEmail });
      }

      // Validate fullName minimum 3 characters
      const fullNameError = validateFullName(fullName);
      if (fullNameError) {
        return res.status(400).json({ message: fullNameError });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate phone number
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return res.status(400).json({ message: phoneError });
      }

      // Optional: verify governorate/municipality pair if both provided (with normalized comparison)
      if (municipality && governorate) {
        const geo = require("./userController").TUNISIA_GEOGRAPHY;
        const govList = geo[governorate] || [];
        const normalizedInput = normalizeMunicipality(municipality);
        const isValid = govList.some(m => normalizeMunicipality(m) === normalizedInput);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid municipality for selected governorate" });
        }
      }

      // Verify reCAPTCHA
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      // Only enforce reCAPTCHA if properly configured (secret key exists and is valid)
      if (recaptchaSecret && recaptchaSecret.length > 10) {
        if (!captchaToken) {
          // Skip captcha requirement if not properly configured
          console.warn("Captcha token missing but continuing since reCAPTCHA may not be fully configured");
        } else {
          try {
            const data = await verifyRecaptcha(recaptchaSecret, captchaToken);
            if (!data.success || data.score < 0.5) {
              console.error("reCAPTCHA verification failed:", data);
              // Allow login if reCAPTCHA fails but log it - for testing purposes
              // return res.status(400).json({ message: "Captcha verification failed" });
            }
          } catch (err) {
            console.error("reCAPTCHA verification error:", err.message);
            // Allow login if reCAPTCHA verification fails due to network/error
            // return res.status(400).json({ message: "Captcha verification error" });
          }
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
      const pendingUser = await PendingUser.create({
        fullName,
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? phone.replace(/\D/g, "").slice(-8) : null, // Store as 8 digits without +216
        governorate: finalGovernorate,
        municipality: finalMunicipality,
        municipalityName: finalMunicipality,
        latitude: latitude || null,
        longitude: longitude || null,
        verificationToken: magicToken,
        verificationExpires: magicTokenExpires,
        verificationMethod: "email",
        role: "CITIZEN", // Default role for public registration
      });

      // Send magic link email with the pending user's _id
      try {
        await sendMagicLinkEmail(normalizedEmail, pendingUser._id.toString(), magicToken, fullName);
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

      // constant-time comparison
      const tokenBuf = Buffer.from(user.verificationToken || '', 'utf8');
      const codeBuf = Buffer.from(code || '', 'utf8');
      if (tokenBuf.length !== codeBuf.length) {
        crypto.timingSafeEqual(tokenBuf, crypto.randomBytes(tokenBuf.length));
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }
      if (!crypto.timingSafeEqual(tokenBuf, codeBuf) || Date.now() > user.verificationExpires) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Create verified user - for citizens, activate immediately; for admins, require activation
      const isAdminRole = user.role && user.role !== 'CITIZEN';
      
      await User.create({
        fullName: user.fullName,
        email: user.email,
        password: user.password,
        phone: user.phone,
        governorate: user.governorate || "",
        municipality: user.municipality || "",
        municipalityName: user.municipality || "",
        role: user.role || 'CITIZEN',
        isVerified: true,
        isActive: isAdminRole ? false : true, // Citizens active immediately
      });

      // Delete pending user
      await PendingUser.deleteOne({ email: normalizedEmail });

      res.json({ message: "Account verified successfully! You can now log in." });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Server error during verification" });
    }
  }

  // Verify user via magic link
  async verifyMagicLink(req, res) {
    try {
      const { token, userId } = req.query;

      if (!token || !userId) {
        return res.status(400).json({ message: "Token and user ID are required" });
      }

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid verification link format. Please check your email for the correct verification link." });
      }

      // First check if it's a PendingUser
      const pendingUser = await PendingUser.findOne({
        _id: new mongoose.Types.ObjectId(userId),
        verificationToken: token,
      });

      if (pendingUser) {
        // Check if token is expired
        if (Date.now() > pendingUser.verificationExpires) {
          return res.status(400).json({ message: "Verification link has expired. Please register again to get a new link." });
        }

        // Create verified user - for citizens, activate immediately; for admins, require activation
        const isAdminRole = pendingUser.role && pendingUser.role !== 'CITIZEN';
        
        const newUser = await User.create({
          fullName: pendingUser.fullName,
          email: pendingUser.email,
          password: pendingUser.password,
          phone: pendingUser.phone,
          governorate: pendingUser.governorate || "",
          municipality: null,
          municipalityName: pendingUser.municipalityName || pendingUser.municipality || "",
          role: pendingUser.role || 'CITIZEN',
          isVerified: true,
          isActive: isAdminRole ? false : true, // Citizens active immediately, admins need activation
        });

        // Delete pending user
        await PendingUser.deleteOne({ _id: userId });

        // Citizens can login immediately - give them tokens
        // Admins need to set password first (if not already set)
        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        return res.json({
          message: "Email verified successfully! You can now login.",
          token: accessToken,
          refreshToken: refreshToken,
          user: {
            id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
          },
        });
      }

      // Check if it's an existing user verifying their email (admin-created user)
      const user = await User.findOne({
        _id: new mongoose.Types.ObjectId(userId),
        verificationToken: token,
      });

      if (user) {
        // Check if token is expired
        if (Date.now() > user.verificationExpires) {
          return res.status(400).json({ message: "Verification link has expired. Please request a new verification email." });
        }

        // Update user to verified
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationExpires = undefined;
        // If user was created by admin but not active, keep isActive false
        await user.save();

        // If user is now verified but still needs password or activation
        if (!user.isActive) {
          return res.json({
            message: "Email verified successfully! Please set your password.",
            needsPasswordSetup: true,
            redirectUrl: `/set-password?email=${encodeURIComponent(user.email)}&token=${user.magicToken}`,
            user: {
              id: user._id,
              fullName: user.fullName,
              email: user.email,
              role: user.role,
            },
          });
        }

        // User is already active - give them tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        return res.json({
          message: "Email verified successfully!",
          token: accessToken,
          refreshToken: refreshToken,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          },
        });
      }

      // Provide more helpful error message
      return res.status(400).json({ 
        message: "This verification link is invalid or has already been used. Please register again to get a new verification link." 
      });
    } catch (error) {
      console.error("Magic link verification error:", error);
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
      
      // Find and delete any pending registration for this email
      const result = await PendingUser.deleteOne({ email: normalizedEmail });

      if (!result.deletedCount) {
        return res.status(404).json({ message: "No pending registration found for this email" });
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

      if (!user.isActive || user.status === "PENDING_VERIFICATION") {
        // Check if user is verified but not yet activated
        if (!user.isVerified) {
          return res.status(403).json({ message: "Please verify your email first. Check your inbox for the verification link." });
        }
        return res.status(403).json({ message: "Your account is pending activation. Please wait for an administrator to activate your account." });
      }

      const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;
      if (!isMatch) {
        await AuditLog.create({
          userId: user._id,
          action: "AUTH_LOGIN_FAILED",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Generate tokens with explicit municipality + department payload (debug)
      const tokenUser = {
        _id: user._id,
        email: user.email,
        role: user.role,
        municipality: user.municipality || user.municipalityName || null,
        municipalityName: user.municipalityName || "",
        governorate: user.governorate || "",
        department: user.department || user.departmentId || null,
      };

      const accessToken = generateAccessToken(tokenUser);
      const refreshToken = generateRefreshToken(tokenUser);

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

      // Set cookies for tokens
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
          municipalityName: user.municipalityName,
          department: user.department,
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
      // Accept refresh token from body or cookie
      let { refreshToken } = req.body;
      if (!refreshToken && req.cookies && req.cookies.refreshToken) {
        refreshToken = req.cookies.refreshToken;
      }

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      // constant-time comparison to mitigate timing attacks
      const stored = Buffer.from(user.refreshToken || '', 'utf8');
      const incoming = Buffer.from(refreshToken || '', 'utf8');
      if (stored.length !== incoming.length) {
        // compare with dummy buffer to equalize timing
        crypto.timingSafeEqual(stored, Buffer.alloc(stored.length));
        return res.status(401).json({ message: "Invalid refresh token" });
      }
      if (!crypto.timingSafeEqual(stored, incoming)) {
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

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

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
        // log but do not expose to client
        console.error("Failed to send password reset email for", user.email, "token", resetToken, emailError);
      }

      // always report success
      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Request email verification (resend verification email)
  async requestVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists and is not verified
      const user = await User.findOne({ email: normalizedEmail });
      
      if (user && !user.isVerified) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        user.verificationToken = verificationToken;
        user.verificationExpires = verificationExpires;
        await user.save();

        // Send verification email
        try {
          await sendMagicLinkEmail(user.email, user._id.toString(), verificationToken, user.fullName);
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
        }
      }

      // Always report success to not reveal user status
      res.json({ message: "If the email is not verified, a verification link has been sent" });
    } catch (error) {
      console.error("Request verification error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, password, newPassword } = req.body;
      const pwd = password || newPassword;

      if (!token || !pwd) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // validate password strength
      const pwdError = validatePasswordStrength(pwd);
      if (pwdError) {
        return res.status(400).json({ message: pwdError });
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
      user.password = await bcrypt.hash(pwd, salt);
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

  // Set password (for admin-created users)
  async setPassword(req, res) {
    try {
      const { token, email, password } = req.body;

      if (!token || !email || !password) {
        return res.status(400).json({ message: "Token, email, and password are required" });
      }

      // Validate password strength
      const pwdError = validatePasswordStrength(password);
      if (pwdError) {
        return res.status(400).json({ message: pwdError });
      }

      const user = await User.findOne({
        email: email.toLowerCase(),
        magicToken: token,
        magicTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(password, salt);
      user.isActive = true;
      user.isVerified = true;
      user.status = "ACTIVE";
      user.magicToken = undefined;
      user.magicTokenExpires = undefined;
      user.passwordLastChanged = new Date();

      await user.save();

      res.json({ message: "Password set successfully. You can now login." });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .select("-password -refreshToken")
        .populate("municipality", "name")
        .populate("department", "name");
      
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
        municipalityName: user.municipalityName,
        department: user.department,
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

      if (fullName) {
        const err = validateFullName(fullName);
        if (err) return res.status(400).json({ message: err });
        user.fullName = fullName;
      }
      if (phone !== undefined) {
        const err = validatePhone(phone);
        if (err) return res.status(400).json({ message: err });
        user.phone = phone;
      }
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
      const isMatch = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Validate new password strength
      const pwdError = validatePasswordStrength(newPassword);
      if (pwdError) {
        return res.status(400).json({ message: pwdError });
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
