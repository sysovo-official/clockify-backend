import express from "express";
import {
  createBoard,
  getBoards,
  addMemberToBoard,
  updateBoard,
  deleteBoard,
} from "../controllers/boardController.js";
import { verifyToken } from "../middleware/authMidlleware.js";

const router = express.Router();

router.post("/", verifyToken, createBoard);
router.get("/", verifyToken, getBoards);
router.post("/add-member", verifyToken, addMemberToBoard);
router.put("/:id", verifyToken, updateBoard);
router.delete("/:id", verifyToken, deleteBoard);

export default router;
