const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    moderated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Comment", commentSchema);
