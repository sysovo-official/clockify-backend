import User from "../models/User.js";
import Task from "../models/Task.js";
import Attendance from "../models/Attendance.js";
import Card from "../models/Card.js";
import {
  getDateRange,
  formatHours,
  formatDateRangeDisplay,
} from "../utils/dateHelpers.js";
import PDFDocument from "pdfkit";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET /api/analytics/all
 * Get analytics for all employees with task and attendance stats
 * Optimized with MongoDB aggregation to prevent N+1 queries
 */
export const getAllAnalytics = asyncHandler(async (req, res) => {
  const { timeRange = "monthly", date } = req.query;

  const { startDate, endDate } = getDateRange(timeRange, date);

  console.log(`📊 Analytics Request: ${timeRange}`, { startDate, endDate });

  // Get all employees with lean() for performance
  const employees = await User.find({ role: "Employee" })
    .select("_id name email subRole createdAt")
    .lean();

  if (employees.length === 0) {
    return res.json({
      success: true,
      timeRange,
      dateRange: {
        startDate,
        endDate,
        display: formatDateRangeDisplay(timeRange, startDate, endDate),
      },
      employeeStats: [],
      employees: [],
      summary: {
        totalEmployees: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalHoursWorked: 0,
      },
    });
  }

  const employeeIds = employees.map((e) => e._id);
  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]));

  // Aggregate tasks by employee
  const taskStats = await Task.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { assignedUser: { $in: employeeIds } },
          {
            assignedUser: null,
            assignedSubRole: { $in: employees.map((e) => e.subRole) },
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          userId: "$assignedUser",
          subRole: "$assignedSubRole",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Aggregate attendance by employee
  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: employeeIds },
        punchInTime: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalDuration: { $sum: "$duration" },
        attendanceDays: { $sum: 1 },
      },
    },
  ]);

  // Create attendance lookup
  const attendanceMap = new Map(
    attendanceStats.map((a) => [a._id.toString(), a])
  );

  // Build employee stats
  const employeeStats = employees.map((employee) => {
    const empId = employee._id.toString();

    // Calculate tasks
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let onHoldTasks = 0;
    let pendingTasks = 0;

    taskStats.forEach((stat) => {
      const matchesUser =
        stat._id.userId && stat._id.userId.toString() === empId;
      const matchesSubRole =
        !stat._id.userId && stat._id.subRole === employee.subRole;

      if (matchesUser || matchesSubRole) {
        const count = stat.count;
        totalTasks += count;

        switch (stat._id.status) {
          case "Completed":
            completedTasks += count;
            break;
          case "In Progress":
            inProgressTasks += count;
            break;
          case "OnHold":
            onHoldTasks += count;
            break;
          case "Pending":
            pendingTasks += count;
            break;
        }
      }
    });

    // Get attendance data
    const attendance = attendanceMap.get(empId);
    const totalHoursWorked = attendance
      ? formatHours(attendance.totalDuration || 0)
      : 0;
    const attendanceDays = attendance ? attendance.attendanceDays : 0;

    return {
      employeeId: employee._id,
      name: employee.name,
      email: employee.email,
      subRole: employee.subRole || "N/A",
      totalTasks,
      completedTasks,
      inProgressTasks,
      onHoldTasks,
      pendingTasks,
      totalHoursWorked,
      attendanceDays,
    };
  });

  res.json({
    success: true,
    timeRange,
    dateRange: {
      startDate,
      endDate,
      display: formatDateRangeDisplay(timeRange, startDate, endDate),
    },
    employeeStats,
    employees,
    summary: {
      totalEmployees: employees.length,
      totalTasks: employeeStats.reduce((sum, e) => sum + e.totalTasks, 0),
      completedTasks: employeeStats.reduce(
        (sum, e) => sum + e.completedTasks,
        0
      ),
      totalHoursWorked: employeeStats.reduce(
        (sum, e) => sum + e.totalHoursWorked,
        0
      ),
    },
  });
});

/**
 * GET /api/analytics/download-pdf
 * Generate and download PDF report of employee analytics
 * Optimized for better performance
 */
export const downloadPDF = asyncHandler(async (req, res) => {
  const { timeRange = "monthly", date } = req.query;
  const { startDate, endDate } = getDateRange(timeRange, date);

  console.log(`📄 PDF Download Request: ${timeRange}`, { startDate, endDate });

  // Reuse optimized logic from getAllAnalytics
  const employees = await User.find({ role: "Employee" })
    .select("_id name email subRole")
    .lean();

  if (employees.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No employees found"
    });
  }

  const employeeIds = employees.map((e) => e._id);

  // Use aggregation for better performance
  const taskStats = await Task.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { assignedUser: { $in: employeeIds } },
          {
            assignedUser: null,
            assignedSubRole: { $in: employees.map((e) => e.subRole) },
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          userId: "$assignedUser",
          subRole: "$assignedSubRole",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: employeeIds },
        punchInTime: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalDuration: { $sum: "$duration" },
        attendanceDays: { $sum: 1 },
      },
    },
  ]);

  const attendanceMap = new Map(
    attendanceStats.map((a) => [a._id.toString(), a])
  );

  // Build employee stats
  const employeeStats = employees.map((employee) => {
    const empId = employee._id.toString();

    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let onHoldTasks = 0;
    let pendingTasks = 0;

    taskStats.forEach((stat) => {
      const matchesUser =
        stat._id.userId && stat._id.userId.toString() === empId;
      const matchesSubRole =
        !stat._id.userId && stat._id.subRole === employee.subRole;

      if (matchesUser || matchesSubRole) {
        const count = stat.count;
        totalTasks += count;

        switch (stat._id.status) {
          case "Completed":
            completedTasks += count;
            break;
          case "In Progress":
            inProgressTasks += count;
            break;
          case "OnHold":
            onHoldTasks += count;
            break;
          case "Pending":
            pendingTasks += count;
            break;
        }
      }
    });

    const attendance = attendanceMap.get(empId);
    const totalHoursWorked = attendance
      ? formatHours(attendance.totalDuration || 0)
      : 0;
    const attendanceDays = attendance ? attendance.attendanceDays : 0;

    return {
      name: employee.name,
      email: employee.email,
      subRole: employee.subRole || "N/A",
      totalTasks,
      completedTasks,
      inProgressTasks,
      onHoldTasks,
      pendingTasks,
      totalHoursWorked,
      attendanceDays,
    };
  });

  // Calculate summary
  const summary = {
    totalEmployees: employees.length,
    totalTasks: employeeStats.reduce((sum, e) => sum + e.totalTasks, 0),
    completedTasks: employeeStats.reduce(
      (sum, e) => sum + e.completedTasks,
      0
    ),
    totalHoursWorked: parseFloat(
      employeeStats.reduce((sum, e) => sum + e.totalHoursWorked, 0).toFixed(2)
    ),
  };

  // Create PDF document
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=analytics-report-${timeRange}-${Date.now()}.pdf`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // HEADER SECTION
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("Employee Analytics Report", { align: "center" });

  doc.moveDown(0.5);

  doc
    .fontSize(12)
    .font("Helvetica")
    .text(
      `Report Period: ${formatDateRangeDisplay(
        timeRange,
        startDate,
        endDate
      )}`,
      { align: "center" }
    );

  doc
    .fontSize(10)
    .text(`Generated on: ${new Date().toLocaleString("en-US")}`, {
      align: "center",
    });

  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // SUMMARY SECTION
  doc.fontSize(16).font("Helvetica-Bold").text("Summary", { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica");

  const summaryData = [
    ["Total Employees:", summary.totalEmployees],
    ["Total Tasks:", summary.totalTasks],
    ["Completed Tasks:", summary.completedTasks],
    ["Total Hours Worked:", `${summary.totalHoursWorked} hrs`],
  ];

  summaryData.forEach(([label, value]) => {
    doc.text(`${label} `, { continued: true }).font("Helvetica-Bold").text(value);
    doc.font("Helvetica");
  });

  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // EMPLOYEE PERFORMANCE TABLE
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Employee Performance", { underline: true });
  doc.moveDown(1);

  // Table header
  const tableTop = doc.y;
  const col1 = 50;
  const col2 = 180;
  const col3 = 260;
  const col4 = 320;
  const col5 = 380;
  const col6 = 440;
  const col7 = 500;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Name", col1, tableTop, { width: 120 });
  doc.text("Role", col2, tableTop, { width: 70 });
  doc.text("Tasks", col3, tableTop, { width: 50 });
  doc.text("Done", col4, tableTop, { width: 50 });
  doc.text("Prog", col5, tableTop, { width: 50 });
  doc.text("Hours", col6, tableTop, { width: 50 });
  doc.text("Days", col7, tableTop, { width: 50 });

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  // Table rows
  doc.font("Helvetica").fontSize(9);

  employeeStats.forEach((emp) => {
    const y = doc.y;

    // Check if we need a new page
    if (y > 700) {
      doc.addPage();
      doc.y = 50;
    }

    doc.text(emp.name.substring(0, 18), col1, doc.y, { width: 120 });
    doc.text(emp.subRole, col2, y, { width: 70 });
    doc.text(emp.totalTasks.toString(), col3, y, { width: 50 });
    doc.text(emp.completedTasks.toString(), col4, y, { width: 50 });
    doc.text(emp.inProgressTasks.toString(), col5, y, { width: 50 });
    doc.text(emp.totalHoursWorked.toFixed(1), col6, y, { width: 50 });
    doc.text(emp.attendanceDays.toString(), col7, y, { width: 50 });

    doc.moveDown(0.8);
  });

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  // FOOTER
  doc.moveDown(2);
  doc
    .fontSize(9)
    .font("Helvetica-Oblique")
    .text("Generated by Employee Management System", { align: "center" });
  doc.text(`Report ID: RPT-${Date.now()}`, { align: "center" });

  // Finalize PDF
  doc.end();
});

/**
 * GET /api/analytics/comprehensive
 * Get comprehensive analytics including Trello cards, tasks, and time tracking
 */
export const getComprehensiveAnalytics = asyncHandler(async (req, res) => {
  const { timeRange = "monthly", date, employeeId } = req.query;
  const { startDate, endDate } = getDateRange(timeRange, date);

  // Build query for employees
  const employeeQuery = { role: "Employee" };
  if (employeeId) {
    employeeQuery._id = employeeId;
  }

  const employees = await User.find(employeeQuery)
    .select("_id name email subRole createdAt")
    .lean();

  const employeeIds = employees.map((e) => e._id);

  // Get Trello card statistics
  const cardStats = await Card.aggregate([
    {
      $match: {
        assignedTo: { $in: employeeIds },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          userId: "$assignedTo",
          status: "$status"
        },
        count: { $sum: 1 },
        totalMinutes: { $sum: "$totalMinutes" }
      }
    }
  ]);

  // Get all cards for detailed view
  const allCards = await Card.find({
    assignedTo: { $in: employeeIds },
    createdAt: { $gte: startDate, $lte: endDate }
  })
    .populate("listId", "name")
    .populate("assignedTo", "name email")
    .lean();

  // Get task statistics
  const taskStats = await Task.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { assignedUser: { $in: employeeIds } },
          {
            assignedUser: null,
            assignedSubRole: { $in: employees.map((e) => e.subRole) }
          }
        ]
      }
    },
    {
      $group: {
        _id: {
          userId: "$assignedUser",
          subRole: "$assignedSubRole",
          status: "$status"
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get attendance statistics
  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: employeeIds },
        punchInTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$userId",
        totalDuration: { $sum: "$duration" },
        attendanceDays: { $sum: 1 }
      }
    }
  ]);

  // Create maps for quick lookup
  const attendanceMap = new Map(
    attendanceStats.map((a) => [a._id.toString(), a])
  );

  // Build comprehensive employee stats
  const employeeStats = employees.map((employee) => {
    const empId = employee._id.toString();

    // Calculate Trello card stats
    let trelloCards = {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      onHold: 0,
      totalMinutes: 0,
      totalHours: 0
    };

    cardStats.forEach((stat) => {
      if (stat._id.userId && stat._id.userId.toString() === empId) {
        trelloCards.total += stat.count;
        trelloCards.totalMinutes += stat.totalMinutes || 0;

        switch (stat._id.status) {
          case "Completed":
            trelloCards.completed += stat.count;
            break;
          case "In Progress":
            trelloCards.inProgress += stat.count;
            break;
          case "OnHold":
            trelloCards.onHold += stat.count;
            break;
          case "Pending":
            trelloCards.pending += stat.count;
            break;
        }
      }
    });

    trelloCards.totalHours = Math.floor(trelloCards.totalMinutes / 60);
    const remainingMins = trelloCards.totalMinutes % 60;

    // Calculate regular task stats
    let regularTasks = {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      onHold: 0
    };

    taskStats.forEach((stat) => {
      const matchesUser =
        stat._id.userId && stat._id.userId.toString() === empId;
      const matchesSubRole =
        !stat._id.userId && stat._id.subRole === employee.subRole;

      if (matchesUser || matchesSubRole) {
        const count = stat.count;
        regularTasks.total += count;

        switch (stat._id.status) {
          case "Completed":
            regularTasks.completed += count;
            break;
          case "In Progress":
            regularTasks.inProgress += count;
            break;
          case "OnHold":
            regularTasks.onHold += count;
            break;
          case "Pending":
            regularTasks.pending += count;
            break;
        }
      }
    });

    // Get attendance data
    const attendance = attendanceMap.get(empId);
    const totalHoursWorked = attendance
      ? formatHours(attendance.totalDuration || 0)
      : 0;
    const attendanceDays = attendance ? attendance.attendanceDays : 0;

    // Get employee's cards for board breakdown
    const employeeCards = allCards.filter(
      (card) => card.assignedTo && card.assignedTo._id.toString() === empId
    );

    const boardBreakdown = {};
    employeeCards.forEach((card) => {
      const boardName = card.listId?.name || "Unassigned";
      if (!boardBreakdown[boardName]) {
        boardBreakdown[boardName] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          totalMinutes: 0
        };
      }
      boardBreakdown[boardName].total++;
      boardBreakdown[boardName][
        card.status === "Completed"
          ? "completed"
          : card.status === "In Progress"
          ? "inProgress"
          : "pending"
      ]++;
      boardBreakdown[boardName].totalMinutes += card.totalMinutes || 0;
    });

    return {
      employeeId: employee._id,
      name: employee.name,
      email: employee.email,
      subRole: employee.subRole || "N/A",
      trelloCards,
      regularTasks,
      attendance: {
        totalHoursWorked,
        attendanceDays
      },
      boardBreakdown,
      timeTracking: {
        trelloMinutes: trelloCards.totalMinutes,
        trelloHours: trelloCards.totalHours,
        trelloRemainingMinutes: remainingMins,
        attendanceHours: totalHoursWorked,
        attendanceDays
      }
    };
  });

  // Calculate overall summary
  const summary = {
    totalEmployees: employees.length,
    totalTrelloCards: employeeStats.reduce((sum, e) => sum + e.trelloCards.total, 0),
    completedTrelloCards: employeeStats.reduce((sum, e) => sum + e.trelloCards.completed, 0),
    totalRegularTasks: employeeStats.reduce((sum, e) => sum + e.regularTasks.total, 0),
    completedRegularTasks: employeeStats.reduce((sum, e) => sum + e.regularTasks.completed, 0),
    totalTrelloMinutes: employeeStats.reduce((sum, e) => sum + e.trelloCards.totalMinutes, 0),
    totalTrelloHours: Math.floor(
      employeeStats.reduce((sum, e) => sum + e.trelloCards.totalMinutes, 0) / 60
    ),
    totalAttendanceHours: employeeStats.reduce((sum, e) => sum + e.attendance.totalHoursWorked, 0)
  };

  res.json({
    success: true,
    timeRange,
    dateRange: {
      startDate,
      endDate,
      display: formatDateRangeDisplay(timeRange, startDate, endDate)
    },
    employeeStats,
    summary
  });
});

/**
 * GET /api/analytics/download-comprehensive-pdf
 * Generate comprehensive PDF report with Trello cards and time tracking
 */
export const downloadComprehensivePDF = asyncHandler(async (req, res) => {
  const { timeRange = "monthly", date } = req.query;
  const { startDate, endDate } = getDateRange(timeRange, date);

  // Reuse data fetching from comprehensive analytics
  const employees = await User.find({ role: "Employee" })
    .select("_id name email subRole")
    .lean();

  if (employees.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No employees found"
    });
  }

  const employeeIds = employees.map((e) => e._id);

  // Get Trello card statistics
  const cardStats = await Card.aggregate([
    {
      $match: {
        assignedTo: { $in: employeeIds },
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          userId: "$assignedTo",
          status: "$status"
        },
        count: { $sum: 1 },
        totalMinutes: { $sum: "$totalMinutes" }
      }
    }
  ]);

  // Get task statistics
  const taskStats = await Task.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { assignedUser: { $in: employeeIds } },
          {
            assignedUser: null,
            assignedSubRole: { $in: employees.map((e) => e.subRole) }
          }
        ]
      }
    },
    {
      $group: {
        _id: {
          userId: "$assignedUser",
          subRole: "$assignedSubRole",
          status: "$status"
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get attendance statistics
  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: employeeIds },
        punchInTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$userId",
        totalDuration: { $sum: "$duration" },
        attendanceDays: { $sum: 1 }
      }
    }
  ]);

  const attendanceMap = new Map(
    attendanceStats.map((a) => [a._id.toString(), a])
  );

  // Build employee stats
  const employeeStats = employees.map((employee) => {
    const empId = employee._id.toString();

    // Calculate Trello card stats
    let trelloCards = {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      totalMinutes: 0,
      totalHours: 0
    };

    cardStats.forEach((stat) => {
      if (stat._id.userId && stat._id.userId.toString() === empId) {
        trelloCards.total += stat.count;
        trelloCards.totalMinutes += stat.totalMinutes || 0;

        switch (stat._id.status) {
          case "Completed":
            trelloCards.completed += stat.count;
            break;
          case "In Progress":
            trelloCards.inProgress += stat.count;
            break;
          case "Pending":
            trelloCards.pending += stat.count;
            break;
        }
      }
    });

    trelloCards.totalHours = Math.floor(trelloCards.totalMinutes / 60);

    // Calculate regular task stats
    let regularTasks = {
      total: 0,
      completed: 0
    };

    taskStats.forEach((stat) => {
      const matchesUser =
        stat._id.userId && stat._id.userId.toString() === empId;
      const matchesSubRole =
        !stat._id.userId && stat._id.subRole === employee.subRole;

      if (matchesUser || matchesSubRole) {
        regularTasks.total += stat.count;
        if (stat._id.status === "Completed") {
          regularTasks.completed += stat.count;
        }
      }
    });

    // Get attendance data
    const attendance = attendanceMap.get(empId);
    const totalHoursWorked = attendance
      ? formatHours(attendance.totalDuration || 0)
      : 0;
    const attendanceDays = attendance ? attendance.attendanceDays : 0;

    return {
      name: employee.name,
      email: employee.email,
      subRole: employee.subRole || "N/A",
      trelloCards,
      regularTasks,
      totalHoursWorked,
      attendanceDays
    };
  });

  // Calculate summary
  const summary = {
    totalEmployees: employees.length,
    totalTrelloCards: employeeStats.reduce((sum, e) => sum + e.trelloCards.total, 0),
    completedTrelloCards: employeeStats.reduce((sum, e) => sum + e.trelloCards.completed, 0),
    totalRegularTasks: employeeStats.reduce((sum, e) => sum + e.regularTasks.total, 0),
    completedRegularTasks: employeeStats.reduce((sum, e) => sum + e.regularTasks.completed, 0),
    totalTrelloHours: Math.floor(
      employeeStats.reduce((sum, e) => sum + e.trelloCards.totalMinutes, 0) / 60
    ),
    totalAttendanceHours: parseFloat(
      employeeStats.reduce((sum, e) => sum + e.totalHoursWorked, 0).toFixed(2)
    )
  };

  // Create PDF document
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=comprehensive-analytics-${timeRange}-${Date.now()}.pdf`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // HEADER SECTION
  doc
    .fontSize(26)
    .font("Helvetica-Bold")
    .fillColor("#1a1a2e")
    .text("Comprehensive Analytics Report", { align: "center" });

  doc.moveDown(0.3);

  doc
    .fontSize(12)
    .font("Helvetica")
    .fillColor("#555")
    .text(
      `Period: ${formatDateRangeDisplay(timeRange, startDate, endDate)}`,
      { align: "center" }
    );

  doc
    .fontSize(10)
    .fillColor("#777")
    .text(`Generated: ${new Date().toLocaleString("en-US")}`, {
      align: "center"
    });

  doc.moveDown(1.5);
  doc.strokeColor("#ccff00").lineWidth(2);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // SUMMARY SECTION
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text("Executive Summary");
  doc.moveDown(0.8);

  doc.fontSize(11).font("Helvetica").fillColor("#333");

  const summaryData = [
    ["Total Employees", summary.totalEmployees],
    ["Trello Cards", `${summary.completedTrelloCards} / ${summary.totalTrelloCards} completed`],
    ["Regular Tasks", `${summary.completedRegularTasks} / ${summary.totalRegularTasks} completed`],
    ["Total Trello Time", `${summary.totalTrelloHours} hours`],
    ["Total Attendance", `${summary.totalAttendanceHours} hours`]
  ];

  summaryData.forEach(([label, value]) => {
    doc
      .fillColor("#555")
      .text(`${label}: `, { continued: true })
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(value);
    doc.font("Helvetica");
    doc.moveDown(0.3);
  });

  doc.moveDown(1);
  doc.strokeColor("#ddd").lineWidth(1);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // EMPLOYEE PERFORMANCE TABLE
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor("#1a1a2e")
    .text("Employee Performance Details");
  doc.moveDown(1.2);

  // Table header with background
  const tableTop = doc.y;
  const rowHeight = 20;

  // Header background
  doc.fillColor("#f5f5f5").rect(50, tableTop - 5, 500, rowHeight).fill();

  // Column positions
  const col1 = 55;
  const col2 = 160;
  const col3 = 230;
  const col4 = 295;
  const col5 = 355;
  const col6 = 420;
  const col7 = 485;

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#1a1a2e");
  doc.text("Employee", col1, tableTop, { width: 100 });
  doc.text("Role", col2, tableTop, { width: 65 });
  doc.text("Trello", col3, tableTop, { width: 60 });
  doc.text("Tasks", col4, tableTop, { width: 55 });
  doc.text("Hours", col5, tableTop, { width: 60 });
  doc.text("Attend", col6, tableTop, { width: 60 });
  doc.text("Days", col7, tableTop, { width: 40 });

  doc.moveDown(1.2);
  doc.strokeColor("#ddd");
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);

  // Table rows
  doc.font("Helvetica").fontSize(9).fillColor("#333");

  employeeStats.forEach((emp, index) => {
    const y = doc.y;

    // Alternate row background
    if (index % 2 === 0) {
      doc.fillColor("#fafafa").rect(50, y - 2, 500, 18).fill();
    }

    // Check if we need a new page
    if (y > 700) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fillColor("#333");
    doc.text(emp.name.substring(0, 16), col1, doc.y, { width: 100 });
    doc.text(emp.subRole.substring(0, 10), col2, y, { width: 65 });
    doc.text(
      `${emp.trelloCards.completed}/${emp.trelloCards.total}`,
      col3,
      y,
      { width: 60 }
    );
    doc.text(
      `${emp.regularTasks.completed}/${emp.regularTasks.total}`,
      col4,
      y,
      { width: 55 }
    );
    doc.text(`${emp.trelloCards.totalHours}h`, col5, y, { width: 60 });
    doc.text(`${emp.totalHoursWorked.toFixed(1)}h`, col6, y, { width: 60 });
    doc.text(emp.attendanceDays.toString(), col7, y, { width: 40 });

    doc.moveDown(0.9);
  });

  doc.moveDown(0.5);
  doc.strokeColor("#ccff00").lineWidth(2);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  // FOOTER
  doc.moveDown(2);
  doc
    .fontSize(9)
    .font("Helvetica-Oblique")
    .fillColor("#777")
    .text("Sysovo Employee Management System", { align: "center" });
  doc
    .fontSize(8)
    .text(`Document ID: RPT-COMP-${Date.now()}`, { align: "center" });

  // Finalize PDF
  doc.end();
});
