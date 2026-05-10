const mongoose = require('mongoose');

const slaRuleSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['ROAD', 'LIGHTING', 'WASTE', 'WATER', 'SAFETY', 'PUBLIC_PROPERTY', 'GREEN_SPACE', 'BUILDING', 'OTHER']
  },
  urgency: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  },
  deadlineHours: {
    type: Number,
    required: true,
    min: 1,
    max: 720 // max 30 days
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique category+urgency combination
slaRuleSchema.index({ category: 1, urgency: 1 }, { unique: true });

module.exports = mongoose.model('SLARule', slaRuleSchema);
