import express from "express";
import { verifyToken } from "../middleware/authMidlleware.js";
import {
  punchIn,
  punchOut,
  getCurrentSession,
  getAllAttendance,
  deleteAttendance,
  getUserAttendance,
  getAttendanceStats,
  getTodayAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/punchin", verifyToken, punchIn);
router.post("/punchout", verifyToken, punchOut);
router.get("/current", verifyToken, getCurrentSession);
router.get("/all", verifyToken, getAllAttendance);
router.get("/stats", verifyToken, getAttendanceStats);
router.get("/today", verifyToken, getTodayAttendance);
router.get("/user/:userId", verifyToken, getUserAttendance);
router.delete("/:id", verifyToken, deleteAttendance);

export default router;
