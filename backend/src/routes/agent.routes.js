const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const agentController = require("../controllers/agentController");

router.get("/complaints", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.getComplaints(req, res));
router.get("/queue", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.getQueue(req, res));
router.put("/complaints/:id/validate", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.validate(req, res));
router.put("/complaints/:id/reject", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.reject(req, res));
router.put("/complaints/:id/close", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.close(req, res));
router.put("/complaints/:id/assign-department", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.assignDepartment(req, res));
router.get("/departments", authenticate, authorize("MUNICIPAL_AGENT"), (req, res) => agentController.getDepartments(req, res));
router.post("/complaints/:id/approve-resolution", authenticate, authorize("MUNICIPAL_AGENT", "ADMIN"), (req, res) => agentController.approveResolution(req, res));
router.post("/complaints/:id/reject-resolution", authenticate, authorize("MUNICIPAL_AGENT", "ADMIN"), (req, res) => agentController.rejectResolution(req, res));

module.exports = router;