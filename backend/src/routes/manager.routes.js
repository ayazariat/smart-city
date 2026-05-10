const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const managerController = require("../controllers/managerController");

router.get("/complaints", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.getComplaints(req, res));
router.get("/complaints/geo", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.getComplaintsGeo(req, res));
router.get("/stats", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.getStats(req, res));
router.put("/complaints/:id/validate", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.validate(req, res));
router.put("/complaints/:id/reject", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.reject(req, res));
router.put("/complaints/:id/assign-technician", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.assignTechnician(req, res));
router.put("/complaints/:id/reassign-technician", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.reassignTechnician(req, res));
router.put("/complaints/:id/assign-team", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.assignTeam(req, res));
router.put("/complaints/:id/priority", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.updatePriority(req, res));
router.get("/technicians", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), (req, res) => managerController.getTechnicians(req, res));
router.get("/technicians/performance", authenticate, authorize("DEPARTMENT_MANAGER", "ADMIN"), (req, res) => managerController.getTechnicianPerformance(req, res));
router.post("/technicians/:id/message", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.sendMessage(req, res));
router.post("/technicians/:id/warning", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.sendWarning(req, res));
router.put("/complaints/:id/reassign", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => managerController.reassign(req, res));

// Resolution approval/rejection — Agent and Manager only (Admin removed)
const agentController = require("../controllers/agentController");
router.post("/complaints/:id/approve-resolution", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => agentController.approveResolution(req, res));
router.post("/complaints/:id/reject-resolution", authenticate, authorize("DEPARTMENT_MANAGER"), (req, res) => agentController.rejectResolution(req, res));

module.exports = router;