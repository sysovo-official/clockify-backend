import express from "express";
import {
  createCard,
  getCardsByList,
  updateCard,
  deleteCard,
  getYesterdayIncompleteCards,
  acknowledgeCarriedCards,
  startCardTimer,
  stopCardTimer,
  getEmployeeWorkSummary,
} from "../controllers/cardController.js";
import { verifyToken } from "../middleware/authMidlleware.js";

const router = express.Router();

router.post("/", verifyToken, createCard);
router.get("/:listId", verifyToken, getCardsByList);
router.put("/:id", verifyToken, updateCard);
router.delete("/:id", verifyToken, deleteCard);

// Daily progress tracking
router.get("/progress/yesterday-incomplete", verifyToken, getYesterdayIncompleteCards);
router.post("/progress/acknowledge", verifyToken, acknowledgeCarriedCards);

// Time tracking
router.post("/:id/timer/start", verifyToken, startCardTimer);
router.post("/:id/timer/stop", verifyToken, stopCardTimer);

// Analytics
router.get("/analytics/:employeeId/:period", verifyToken, getEmployeeWorkSummary);

export default router;
