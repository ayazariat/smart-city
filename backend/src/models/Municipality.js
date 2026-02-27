const mongoose = require("mongoose");

const municipalitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Reference to governorate
  governorate: { 
    type: String, 
    required: true 
  },
  // Code identifiant (like INSEE code in France)
  code: { 
    type: String 
  },
  // Additional info
  description: String,
  // Contact information
  phone: String,
  email: String,
  // Geographic coordinates for the municipality center
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  // Municipal agent responsible for this municipality
  responsable: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, { timestamps: true });

// Index for performance
municipalitySchema.index({ governorate: 1 });
municipalitySchema.index({ name: 1 });
municipalitySchema.index({ code: 1 });

module.exports = mongoose.model("Municipality", municipalitySchema);
