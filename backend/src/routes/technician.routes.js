const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const technicianController = require("../controllers/technicianController");

router.get("/complaints", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.getComplaints(req, res));
router.get("/complaints/:id", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.getComplaintById(req, res));
router.put("/complaints/:id/start", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.start(req, res));
router.put("/complaints/:id/complete", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.complete(req, res));
router.post("/complaints/:id/before-photo", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.addBeforePhoto(req, res));
router.post("/complaints/:id/after-photo", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.addAfterPhoto(req, res));
router.post("/complaints/:id/comments", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.addComment(req, res));
router.put("/complaints/:id/location", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.updateLocation(req, res));
router.get("/stats", authenticate, authorize("TECHNICIAN"), (req, res) => technicianController.getStats(req, res));

module.exports = router;