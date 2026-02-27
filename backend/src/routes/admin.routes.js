const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const userController = require("../controllers/userController");

// All routes require admin authentication
router.use(authenticate);
router.use(authorize("ADMIN"));

// User management routes
router.get("/users", userController.getAllUsers);

// Statistics - must come BEFORE /users/:id to avoid matching issues
router.get("/users/stats", userController.getStats);

// Specific routes must come BEFORE parameterized /users/:id route
// Additional routes for frontend compatibility
router.put("/users/:id/role", userController.updateUserRole);
router.put("/users/:id/active", userController.toggleUserActive);

// User ID routes - must come AFTER specific routes
router.get("/users/:id", userController.getUserById);
router.post("/users", userController.createUser);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);
router.patch("/users/:id/toggle-status", userController.toggleUserStatus);

// Statistics

// Geography data for dropdowns
router.get("/geography", userController.getGeography);
router.get("/geography/:governorate/municipalities", userController.getMunicipalities);

// Department management
router.get("/departments", userController.getDepartments);

module.exports = router;
