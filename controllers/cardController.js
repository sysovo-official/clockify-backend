import Card from "../models/Card.js";
import List from "../models/List.js";
import Board from "../models/Board.js";
import { logActivity } from "./activityController.js";

// ✅ Create card
export const createCard = async (req, res) => {
  try {
    const { listId, title, description, assignedTo, dueDate } = req.body;

    if (!listId || !title)
      return res.status(400).json({ message: "List and title required" });

    const list = await List.findById(listId).populate("boardId");
    if (!list) return res.status(404).json({ message: "List not found" });

    const card = new Card({
      title,
      description,
      listId,
      assignedTo,
      dueDate,
    });

    await card.save();

    // Log activity
    const board = await Board.findById(list.boardId);
    await logActivity(
      req.user.id,
      "created_card",
      "card",
      card._id,
      title,
      { listId, listName: list.title },
      board?._id,
      board?.name
    );

    res.status(201).json({ message: "Card created", card });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all cards in list
export const getCardsByList = async (req, res) => {
  try {
    const { listId } = req.params;
    const cards = await Card.find({ listId })
      .populate("assignedTo", "name email")
      .sort({ position: 1 });
    res.json({ cards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update card (move/edit)
export const updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const card = await Card.findById(id).populate("listId");
    if (!card) return res.status(404).json({ message: "Card not found" });

    // Check permissions: CEO, assigned employee, or card creator (employee who created unassigned card) can edit
    const isCEO = req.user.role === "CEO";
    const isAssignedEmployee = card.assignedTo && card.assignedTo.toString() === req.user.id;
    const isCreatedByEmployee = !card.assignedTo && req.user.role === "Employee"; // Unassigned card created by employee

    if (!isCEO && !isAssignedEmployee && !isCreatedByEmployee) {
      return res.status(403).json({
        message: "You don't have permission to edit this card. Only admin or assigned employee can edit."
      });
    }

    // Store old values for activity logging
    const oldStatus = card.status;
    const oldListId = card.listId;
    const oldPosition = card.position;

    // Update the card
    const updated = await Card.findByIdAndUpdate(id, updates, { new: true })
      .populate("assignedTo", "name email")
      .populate("listId");

    // Log activity based on what changed
    const list = await List.findById(updated.listId).populate("boardId");
    const board = list ? await Board.findById(list.boardId) : null;

    if (updates.status && oldStatus !== updates.status) {
      // Status changed
      await logActivity(
        req.user.id,
        "changed_card_status",
        "card",
        updated._id,
        updated.title,
        { oldStatus, newStatus: updates.status },
        board?._id,
        board?.name
      );
    } else if (updates.listId && oldListId?.toString() !== updates.listId) {
      // Moved to different list
      await logActivity(
        req.user.id,
        "moved_card",
        "card",
        updated._id,
        updated.title,
        { fromList: oldListId, toList: updates.listId },
        board?._id,
        board?.name
      );
    } else if (updates.position !== undefined && oldPosition !== updates.position) {
      // Position changed (drag within list)
      await logActivity(
        req.user.id,
        "moved_card",
        "card",
        updated._id,
        updated.title,
        { fromPosition: oldPosition, toPosition: updates.position },
        board?._id,
        board?.name
      );
    } else {
      // General update
      await logActivity(
        req.user.id,
        "updated_card",
        "card",
        updated._id,
        updated.title,
        updates,
        board?._id,
        board?.name
      );
    }

    res.json({ message: "Card updated", card: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete card
export const deleteCard = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: "Card not found" });

    await card.deleteOne();
    res.json({ message: "Card deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get yesterday's incomplete cards for an employee
export const getYesterdayIncompleteCards = async (req, res) => {
  try {
    const userId = req.user.id;

    // Calculate yesterday's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find incomplete cards created before today that are not completed
    const incompleteCards = await Card.find({
      assignedTo: userId,
      status: { $ne: "Completed" },
      createdAt: { $lt: today },
      acknowledgedByEmployee: false
    })
      .populate("assignedTo", "name email")
      .populate("listId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incompleteCards.length,
      cards: incompleteCards
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Acknowledge carried over cards (OK button)
export const acknowledgeCarriedCards = async (req, res) => {
  try {
    const { cardIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ message: "Card IDs array required" });
    }

    // Update all cards to be acknowledged and mark as carried over
    const result = await Card.updateMany(
      {
        _id: { $in: cardIds },
        assignedTo: userId
      },
      {
        $set: {
          acknowledgedByEmployee: true,
          isCarriedOver: true,
          carriedFromDate: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} cards acknowledged and added to today's work`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Start time tracking on a card
export const startCardTimer = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: "Card not found" });

    // Check if there's already an active timer
    const activeEntry = card.timeEntries.find(entry => !entry.endTime);
    if (activeEntry) {
      return res.status(400).json({
        message: "Timer already running for this card",
        activeEntry
      });
    }

    // Add new time entry
    card.timeEntries.push({
      startTime: new Date(),
      note: note || ""
    });

    if (!card.startTime) {
      card.startTime = new Date();
    }

    await card.save();

    res.json({
      success: true,
      message: "Timer started",
      card: await card.populate("assignedTo", "name email")
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Stop time tracking on a card
export const stopCardTimer = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: "Card not found" });

    // Find active time entry
    const activeEntry = card.timeEntries.find(entry => !entry.endTime);
    if (!activeEntry) {
      return res.status(400).json({ message: "No active timer found" });
    }

    // Calculate duration in minutes
    const endTime = new Date();
    const durationMs = endTime - activeEntry.startTime;
    const durationMinutes = Math.round(durationMs / 60000);

    activeEntry.endTime = endTime;
    activeEntry.duration = durationMinutes;

    // Update total minutes
    card.totalMinutes = (card.totalMinutes || 0) + durationMinutes;
    card.endTime = endTime;

    await card.save();

    res.json({
      success: true,
      message: "Timer stopped",
      duration: durationMinutes,
      totalMinutes: card.totalMinutes,
      card: await card.populate("assignedTo", "name email")
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get employee's work summary (for analytics)
export const getEmployeeWorkSummary = async (req, res) => {
  try {
    const { employeeId, period } = req.params; // period: daily, weekly, monthly
    const userId = employeeId || req.user.id;

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get all cards for the employee in the period
    const cards = await Card.find({
      assignedTo: userId,
      createdAt: { $gte: startDate }
    })
      .populate("listId", "name")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalTasks = cards.length;
    const completedTasks = cards.filter(c => c.status === "Completed").length;
    const inProgressTasks = cards.filter(c => c.status === "In Progress").length;
    const pendingTasks = cards.filter(c => c.status === "Pending").length;
    const onHoldTasks = cards.filter(c => c.status === "OnHold").length;

    const totalMinutes = cards.reduce((sum, card) => sum + (card.totalMinutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Group by board/list
    const tasksByBoard = {};
    cards.forEach(card => {
      const boardName = card.listId?.name || "Unassigned";
      if (!tasksByBoard[boardName]) {
        tasksByBoard[boardName] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          totalMinutes: 0
        };
      }
      tasksByBoard[boardName].total++;
      tasksByBoard[boardName][card.status === "Completed" ? "completed" :
                               card.status === "In Progress" ? "inProgress" : "pending"]++;
      tasksByBoard[boardName].totalMinutes += card.totalMinutes || 0;
    });

    res.json({
      success: true,
      period,
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        onHoldTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTimeSpent: {
          hours: totalHours,
          minutes: remainingMinutes,
          totalMinutes
        }
      },
      tasksByBoard,
      cards
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
