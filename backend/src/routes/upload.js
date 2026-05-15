const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const useCloudinary = cloudName && cloudName !== 'demo' && apiKey && apiKey !== '123456789012345';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/webm"];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".jfif", ".png", ".gif", ".webp", ".mp4", ".mov", ".webm"];
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and videos are allowed."), false);
  }
};

let upload;

if (useCloudinary) {
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'smart-city-complaints',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm'],
      resource_type: 'auto',
      transformation: [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto:good' }],
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
} else {
  const uploadDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `${uuidv4()}${ext}`); },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
}

// POST /api/upload - Upload media
router.post("/", (req, res, next) => {
  console.log('[Upload] Route hit');
  console.log('[Upload] Headers:', req.headers['content-type']);
  console.log('[Upload] Auth:', req.headers['authorization'] ? 'Present' : 'Missing');
  next();
}, authenticate, (req, res, next) => {
  console.log('[Upload] After auth, before multer');
  upload.array("media", 5)(req, res, (err) => {
    if (err) {
      console.error('[Upload] Multer error:', err);
      return res.status(500).json({ success: false, message: "Upload error: " + err.message });
    }
    console.log('[Upload] Multer success, files:', req.files ? req.files.length : 0);
    next();
  });
}, async (req, res) => {
  try {
    console.log('[Upload] Request received after middleware');
    console.log('[Upload] Files:', req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
      console.log('[Upload] No files in request');
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const uploadedFiles = req.files.map((file) => {
      const isCloud = file.path && file.path.startsWith('http');
      const fileUrl = isCloud ? file.path : `${API_BASE_URL}/uploads/${file.filename || file.originalname}`;
      return {
        type: file.mimetype.startsWith("video/") ? "video" : "photo",
        url: fileUrl,
        publicId: isCloud ? file.filename : (file.filename || file.originalname),
        originalName: file.originalname,
        size: file.size,
      };
    });

    console.log('[Upload] Sending success response');
    res.json({
      success: true,
      message: "Files uploaded successfully",
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    console.error("[Upload] Error stack:", error.stack);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: "File size exceeds 10MB limit" });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: "Too many files. Maximum 5 files allowed" });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, message: "Unexpected file field" });
    }
    res.status(500).json({ success: false, message: "Failed to upload files: " + error.message });
  }
});

// DELETE /api/upload - Delete media
router.delete("/", authenticate, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, message: "Public ID is required" });
    }

    if (useCloudinary) {
      const cloudinary = require('cloudinary').v2;
      await cloudinary.uploader.destroy(`smart-city-complaints/${publicId}`);
    } else {
      const filePath = path.join(__dirname, "../../uploads", publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: "Failed to delete file" });
  }
});

module.exports = router;
