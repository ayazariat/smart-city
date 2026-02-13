const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: String,
    role: {
      type: String,
      enum: ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN", "ADMIN"],
      default: "CITIZEN",
    },
    // Verification fields
    verificationToken: { type: String }, // Token for email/SMS verification
    verificationExpires: { type: Date },
    verificationMethod: {
      type: String,
      enum: ["email", "sms"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PendingUser", pendingUserSchema);
