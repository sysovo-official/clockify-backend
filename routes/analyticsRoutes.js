import express from "express";
import {
  getAllAnalytics,
  downloadPDF,
  getComprehensiveAnalytics,
  downloadComprehensivePDF,
} from "../controllers/analyticsController.js";
import { verifyToken } from "../middleware/authMidlleware.js";

const router = express.Router();

// Both routes require authentication
// CEO-only access should be enforced in the middleware or controller
router.get("/all", verifyToken, getAllAnalytics);
router.get("/comprehensive", verifyToken, getComprehensiveAnalytics);
router.get("/download-pdf", verifyToken, downloadPDF);
router.get("/download-comprehensive-pdf", verifyToken, downloadComprehensivePDF);

export default router;
