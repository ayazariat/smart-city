const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const userController = require("../controllers/userController");

// All routes require admin authentication
router.use(authenticate);
router.use(authorize("ADMIN"));

// User management routes
router.get("/users", userController.getAllUsers);
router.get("/users/:id", userController.getUserById);
router.post("/users", userController.createUser);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);
router.patch("/users/:id/toggle-status", userController.toggleUserStatus);

// Statistics
router.get("/stats", userController.getStats);

// Geography data for dropdowns
router.get("/geography", userController.getGeography);
router.get("/geography/:governorate/municipalities", userController.getMunicipalities);

module.exports = router;
