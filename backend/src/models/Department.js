const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    email: String,
    phone: String,
    // Categories this department handles
    categories: [{
      type: String,
      enum: ["ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "TRAFFIC", "URBAN_PLANNING", "EQUIPMENT"]
    }],
    // Manager responsible for this department
    responsable: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }
  },
  { timestamps: true },
);

module.exports = mongoose.model("Department", departmentSchema);
