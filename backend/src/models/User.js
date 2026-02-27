const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Tunisia Governorates and Municipalities
const TUNISIA_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Le Kef",
  "Mahdia",
  "Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: false }, // Optional - set via magic link for admin-created users
    role: {
      type: String,
      enum: ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN", "ADMIN"],
      default: "CITIZEN",
    },
    phone: String,
    isActive: { type: Boolean, default: true },
    // Department assignment for technicians and managers
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    // Geographical assignment for agents, technicians, and managers
    governorate: {
      type: String,
      enum: ["", ...TUNISIA_GOVERNORATES],
      default: "",
    },
    municipality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Municipality',
      default: null,
      set: function(v) {
        // Handle empty string or invalid values by setting to null
        if (v === '' || v === undefined || v === null) {
          return null;
        }
        return v;
      }
    },
    // Legacy string field for backward compatibility
    municipalityName: {
      type: String,
      default: "",
    },
    // Security-related fields
    refreshToken: { type: String }, // current valid refresh token (rotation)
    // MFA skeleton fields (to be used for agents/managers/admin)
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String }, // base32 secret for TOTP apps (Google Authenticator, etc.)
    // Account verification (magic link)
    isVerified: { type: Boolean, default: false },
    magicToken: { type: String }, // Magic link token
    magicTokenExpires: { type: Date }, // Magic link expiration
    // Password reset fields
    resetToken: { type: String }, // Password reset token
    resetTokenExpires: { type: Date }, // Password reset token expiration
    passwordLastChanged: { type: Date }, // Track when password was last changed
  },
  { timestamps: true }
);

// Create case-insensitive unique index for email (if not using unique: true)
// userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Index for municipality queries
userSchema.index({ municipality: 1 });
userSchema.index({ municipalityName: 1 });

// Compare password method
userSchema.methods.comparePassword = async function (inputPassword) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
