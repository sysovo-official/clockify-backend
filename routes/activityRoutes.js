import express from "express";
import {
  getAllActivities,
  getRecentActivities,
  getActivityStatsByEmployee,
  deleteOldActivities,
} from "../controllers/activityController.js";
import { verifyToken } from "../middleware/authMidlleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all activities (with filters)
router.get("/", getAllActivities);

// Get recent activities (last 24 hours)
router.get("/recent", getRecentActivities);

// Get activity stats by employee (CEO only)
router.get("/stats/employees", getActivityStatsByEmployee);

// Delete old activities (CEO only)
router.delete("/cleanup", deleteOldActivities);

export default router;
