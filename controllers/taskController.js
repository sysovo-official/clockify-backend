import Task from "../models/Task.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/tasks/add
export const addTask = asyncHandler(async (req, res) => {
  const { title, assignedTo, specificUser } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({
      success: false,
      message: "Title and SubRole are required"
    });
  }

  let assignedUserName = "";

  if (specificUser && specificUser !== "all") {
    const user = await User.findById(specificUser).select("name").lean();
    if (user) {
      assignedUserName = user.name;
    }
  }

  const newTask = new Task({
    title,
    assignedSubRole: assignedTo,
    assignedUser: specificUser === "all" ? null : specificUser,
    assignedUserName,
    status: "Pending",
  });

  await newTask.save();

  res.status(201).json({
    success: true,
    message: "Task added successfully",
    task: newTask
  });
});

// GET /api/tasks/my-tasks
export const getMyTasks = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  const user = await User.findById(userId).select("subRole").lean();
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const tasks = await Task.find({
    $or: [
      { assignedUser: userId },
      { assignedUser: null, assignedSubRole: user.subRole },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    count: tasks.length,
    tasks
  });
});

// GET /api/tasks/all
export const getAllTasks = asyncHandler(async (_req, res) => {
  const tasks = await Task.find()
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    count: tasks.length,
    tasks
  });
});

// PUT /api/tasks/:id/status
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required"
    });
  }

  const validStatuses = ["Pending", "In Progress", "OnHold", "Completed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    });
  }

  const task = await Task.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  res.json({
    success: true,
    message: `Task marked as ${task.status}`,
    task
  });
});

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, assignedTo, specificUser } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({
      success: false,
      message: "Title and SubRole are required"
    });
  }

  let assignedUserName = "";
  if (specificUser && specificUser !== "all") {
    const user = await User.findById(specificUser).select("name").lean();
    if (user) {
      assignedUserName = user.name;
    }
  }

  const updatedTask = await Task.findByIdAndUpdate(
    id,
    {
      title,
      assignedSubRole: assignedTo,
      assignedUser: specificUser === "all" ? null : specificUser,
      assignedUserName,
    },
    { new: true, runValidators: true }
  );

  if (!updatedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  res.json({
    success: true,
    message: "Task updated successfully",
    task: updatedTask
  });
});

// DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedTask = await Task.findByIdAndDelete(id);

  if (!deletedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  res.json({
    success: true,
    message: "Task deleted successfully"
  });
});


