import Activity from "../models/Activity.js";
import User from "../models/User.js";

// Helper function to log activity
export const logActivity = async (userId, action, targetType, targetId, targetName, details = {}, boardId = null, boardName = null) => {
  try {
    const user = await User.findById(userId).select("name role subRole");
    if (!user) return;

    const activity = new Activity({
      user: userId,
      userName: user.name,
      userRole: user.role === "CEO" ? "CEO" : user.subRole || "Employee",
      action,
      targetType,
      targetId,
      targetName,
      details,
      boardId,
      boardName,
    });

    await activity.save();
  } catch (err) {
    console.error("Error logging activity:", err.message);
  }
};

// ✅ Get all activities (CEO can see all, employees see their own)
export const getAllActivities = async (req, res) => {
  try {
    const { limit = 50, page = 1, userId, boardId } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // If not CEO, only show their own activities
    if (req.user.role !== "CEO") {
      query.user = req.user.id;
    }

    // Filter by specific user (for CEO viewing specific employee)
    if (userId && req.user.role === "CEO") {
      query.user = userId;
    }

    // Filter by board
    if (boardId) {
      query.boardId = boardId;
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate("user", "name email role subRole")
      .lean();

    const totalCount = await Activity.countDocuments(query);

    res.json({
      success: true,
      count: activities.length,
      totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
      activities,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get recent activities (last 24 hours) for dashboard
export const getRecentActivities = async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let query = { createdAt: { $gte: last24Hours } };

    // If not CEO, only show their own activities
    if (req.user.role !== "CEO") {
      query.user = req.user.id;
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "name email role subRole")
      .lean();

    res.json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get activity statistics by employee (CEO only)
export const getActivityStatsByEmployee = async (req, res) => {
  try {
    if (req.user.role !== "CEO") {
      return res.status(403).json({ message: "Access denied. CEO only." });
    }

    const { period = "weekly" } = req.query; // daily, weekly, monthly
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get all employees
    const employees = await User.find({ role: "Employee" }).select("name email subRole");

    // Get activities for each employee
    const stats = await Promise.all(
      employees.map(async (employee) => {
        const activities = await Activity.find({
          user: employee._id,
          createdAt: { $gte: startDate },
        });

        const actionCounts = {
          created_board: 0,
          created_list: 0,
          created_card: 0,
          updated_card: 0,
          moved_card: 0,
          changed_card_status: 0,
          total: activities.length,
        };

        activities.forEach((activity) => {
          if (actionCounts.hasOwnProperty(activity.action)) {
            actionCounts[activity.action]++;
          }
        });

        return {
          employee: {
            id: employee._id,
            name: employee.name,
            email: employee.email,
            role: employee.subRole,
          },
          actionCounts,
          lastActivity: activities.length > 0 ? activities[0].createdAt : null,
        };
      })
    );

    res.json({
      success: true,
      period,
      stats,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete old activities (cleanup - admin only)
export const deleteOldActivities = async (req, res) => {
  try {
    if (req.user.role !== "CEO") {
      return res.status(403).json({ message: "Access denied. CEO only." });
    }

    const { daysOld = 90 } = req.body;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await Activity.deleteMany({ createdAt: { $lt: cutoffDate } });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} activities older than ${daysOld} days`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
