import express from "express";
import {
  createList,
  getListsByBoard,
  updateList,
  deleteList,
} from "../controllers/listController.js";
import { verifyToken } from "../middleware/authMidlleware.js";

const router = express.Router();

router.post("/", verifyToken, createList);
router.get("/:boardId", verifyToken, getListsByBoard);
router.put("/:id", verifyToken, updateList);
router.delete("/:id", verifyToken, deleteList);

export default router;
