import Attendance from "../models/Attendance.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/attendance/punchin
export const punchIn = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const existing = await Attendance.findOne({ userId, punchOutTime: null }).lean();
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Already punched in!"
    });
  }

  const attendance = new Attendance({
    userId,
    punchInTime: new Date(),
  });

  await attendance.save();

  res.status(201).json({
    success: true,
    message: "Punch In successful",
    attendance
  });
});

// POST /api/attendance/punchout
export const punchOut = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const attendance = await Attendance.findOne({ userId, punchOutTime: null });
  if (!attendance) {
    return res.status(400).json({
      success: false,
      message: "No active session found!"
    });
  }

  attendance.punchOutTime = new Date();
  const duration =
    (attendance.punchOutTime.getTime() - attendance.punchInTime.getTime()) / 1000;
  attendance.duration = duration;

  await attendance.save();

  res.json({
    success: true,
    message: "Punch Out successful",
    duration,
    attendance
  });
});

// GET /api/attendance/current
export const getCurrentSession = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const session = await Attendance.findOne({
    userId,
    punchOutTime: null,
  }).lean();

  if (!session) {
    return res.json({
      success: true,
      isActive: false
    });
  }

  res.json({
    success: true,
    isActive: true,
    punchInTime: session.punchInTime,
    session
  });
});

// GET /api/attendance/all
export const getAllAttendance = asyncHandler(async (req, res) => {
  // Add pagination and limit for better performance
  const limit = parseInt(req.query.limit) || 100; // Default limit 100 records
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const records = await Attendance.find()
    .populate("userId", "name subRole email")
    .sort({ punchInTime: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  // Get total count for pagination
  const totalCount = await Attendance.countDocuments();

  res.json({
    success: true,
    count: records.length,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    records
  });
});

// DELETE /api/attendance/:id
export const deleteAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await Attendance.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Attendance record not found"
    });
  }

  res.json({
    success: true,
    message: "Attendance record deleted successfully"
  });
});

// GET /api/attendance/user/:userId - Get attendance records for specific user
export const getUserAttendance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate, limit = 50 } = req.query;

  const query = { userId };

  // Add date range filter if provided
  if (startDate || endDate) {
    query.punchInTime = {};
    if (startDate) query.punchInTime.$gte = new Date(startDate);
    if (endDate) query.punchInTime.$lte = new Date(endDate);
  }

  const records = await Attendance.find(query)
    .sort({ punchInTime: -1 })
    .limit(parseInt(limit))
    .lean();

  // Calculate statistics
  const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
  const totalHours = (totalDuration / 3600).toFixed(2);
  const completedSessions = records.filter(r => r.punchOutTime).length;
  const activeSessions = records.filter(r => !r.punchOutTime).length;

  res.json({
    success: true,
    count: records.length,
    records,
    statistics: {
      totalHours: parseFloat(totalHours),
      totalSessions: records.length,
      completedSessions,
      activeSessions,
      averageHoursPerDay: records.length > 0 ? (parseFloat(totalHours) / records.length).toFixed(2) : 0
    }
  });
});

// GET /api/attendance/stats - Get attendance statistics
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const { timeRange = "monthly", startDate, endDate } = req.query;

  // Determine date range
  let queryStartDate, queryEndDate;
  if (startDate && endDate) {
    queryStartDate = new Date(startDate);
    queryEndDate = new Date(endDate);
  } else {
    queryEndDate = new Date();
    if (timeRange === "daily") {
      queryStartDate = new Date();
      queryStartDate.setHours(0, 0, 0, 0);
    } else if (timeRange === "weekly") {
      queryStartDate = new Date();
      queryStartDate.setDate(queryStartDate.getDate() - 7);
    } else {
      // monthly
      queryStartDate = new Date();
      queryStartDate.setMonth(queryStartDate.getMonth() - 1);
    }
  }

  const stats = await Attendance.aggregate([
    {
      $match: {
        punchInTime: { $gte: queryStartDate, $lte: queryEndDate }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    {
      $unwind: "$user"
    },
    {
      $group: {
        _id: "$userId",
        name: { $first: "$user.name" },
        email: { $first: "$user.email" },
        subRole: { $first: "$user.subRole" },
        totalSessions: { $sum: 1 },
        totalDuration: { $sum: "$duration" },
        completedSessions: {
          $sum: { $cond: [{ $ne: ["$punchOutTime", null] }, 1, 0] }
        },
        activeSessions: {
          $sum: { $cond: [{ $eq: ["$punchOutTime", null] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        subRole: 1,
        totalSessions: 1,
        completedSessions: 1,
        activeSessions: 1,
        totalHours: { $round: [{ $divide: ["$totalDuration", 3600] }, 2] },
        averageHoursPerSession: {
          $round: [
            { $divide: [{ $divide: ["$totalDuration", 3600] }, "$totalSessions"] },
            2
          ]
        }
      }
    },
    {
      $sort: { totalHours: -1 }
    }
  ]);

  const summary = {
    totalEmployees: stats.length,
    totalSessions: stats.reduce((sum, s) => sum + s.totalSessions, 0),
    totalHours: stats.reduce((sum, s) => sum + s.totalHours, 0),
    averageHoursPerEmployee: stats.length > 0
      ? (stats.reduce((sum, s) => sum + s.totalHours, 0) / stats.length).toFixed(2)
      : 0
  };

  res.json({
    success: true,
    timeRange,
    dateRange: {
      startDate: queryStartDate,
      endDate: queryEndDate
    },
    summary,
    employeeStats: stats
  });
});

// GET /api/attendance/today - Get today's attendance summary
export const getTodayAttendance = asyncHandler(async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await Attendance.find({
    punchInTime: { $gte: today, $lt: tomorrow }
  })
    .populate("userId", "name email subRole")
    .sort({ punchInTime: -1 })
    .lean();

  const activeCount = records.filter(r => !r.punchOutTime).length;
  const completedCount = records.filter(r => r.punchOutTime).length;

  res.json({
    success: true,
    date: today.toISOString().split('T')[0],
    summary: {
      total: records.length,
      active: activeCount,
      completed: completedCount
    },
    records
  });
});



