const mongoose = require("mongoose");

// Tunisia Governorates
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
    // Geographical assignment for citizens (municipality)
    governorate: {
      type: String,
      enum: ["", ...TUNISIA_GOVERNORATES],
      default: "",
    },
    municipality: {
      type: String,
      default: "",
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
