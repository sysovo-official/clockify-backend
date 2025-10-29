import express from "express";
import {
  loginUser,
  logout,
  addEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getDepartmentStats,
  changeEmployeePassword
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMidlleware.js";

const router = express.Router();

// Authentication routes
router.post("/login", loginUser);
router.post("/logout", logout);

// Employee management routes
router.post("/add", verifyToken, addEmployee);
router.get("/employees", verifyToken, getAllEmployees);
router.get("/employee/:id", verifyToken, getEmployeeById);
router.put("/employee/:id", verifyToken, updateEmployee);
router.put("/employee/:id/change-password", verifyToken, changeEmployeePassword);
router.delete("/employee/:id", verifyToken, deleteEmployee);

// Department statistics
router.get("/department-stats", verifyToken, getDepartmentStats);

export default router;
