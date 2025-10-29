  import express from "express";
  import { addTask, getMyTasks, getAllTasks, updateTaskStatus, updateTask,
    deleteTask } from "../controllers/taskController.js";
  import { verifyToken } from "../middleware/authMidlleware.js";

  const router = express.Router();

  router.post("/add", addTask); // CEO adds
  router.get("/my-tasks", verifyToken, getMyTasks); // Employee fetches
  router.get("/all", getAllTasks); // CEO fetches all
  router.put("/:id/status", verifyToken, updateTaskStatus);
  router.put("/:id", updateTask); // ✅ Update (edit) task
  router.delete("/:id", deleteTask); // ✅ Delete task



  export default router;
