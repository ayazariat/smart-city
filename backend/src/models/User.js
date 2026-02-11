const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "ADMIN"],
      default: "CITIZEN",
    },
    phone: String,
    isActive: { type: Boolean, default: true },
    // Security-related fields
    refreshToken: { type: String }, // current valid refresh token (rotation)
    // MFA skeleton fields (to be used for agents/managers/admin)
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String }, // base32 secret for TOTP apps (Google Authenticator, etc.)
    // Account verification (magic link)
    isVerified: { type: Boolean, default: false },
    magicToken: { type: String }, // Magic link token
    magicTokenExpires: { type: Date }, // Magic link expiration
  },
  { timestamps: true }
);

// Create case-insensitive unique index for email (if not using unique: true)
// userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Compare password method
userSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
