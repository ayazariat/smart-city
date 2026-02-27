const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    email: String,
    phone: String,
    // Manager responsible for this department
    responsable: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("Department", departmentSchema);
