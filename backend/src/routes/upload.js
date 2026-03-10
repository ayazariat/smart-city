const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { upload, cloudinary } = require("../middleware/upload");

// POST /api/upload - Upload media to Cloudinary
router.post("/", authenticate, upload.array('media', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const uploadedFiles = req.files.map(file => ({
      type: file.resource_type === 'video' ? 'video' : 'photo',
      url: file.path, // Cloudinary URL
      publicId: file.filename, // Cloudinary public ID for deletion
    }));

    res.json({
      success: true,
      message: "Files uploaded successfully",
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload files" });
  }
});

// DELETE /api/upload - Delete media from Cloudinary
router.delete("/", authenticate, async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ success: false, message: "Public ID is required" });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      return res.status(400).json({ success: false, message: "Failed to delete file" });
    }

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: "Failed to delete file" });
  }
});

module.exports = router;

