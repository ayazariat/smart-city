const mongoose = require("mongoose");

const satisfactionSurveySchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    shownAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
    },
    nextEligibleDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index to prevent duplicate surveys for the same complaint
satisfactionSurveySchema.index({ complaint: 1, citizen: 1 }, { unique: true });
satisfactionSurveySchema.index({ citizen: 1, nextEligibleDate: 1 });
satisfactionSurveySchema.index({ complaint: 1 });

module.exports = mongoose.model("SatisfactionSurvey", satisfactionSurveySchema);
