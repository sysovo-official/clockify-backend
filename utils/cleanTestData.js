import User from "../models/User.js";
import Task from "../models/Task.js";
import Attendance from "../models/Attendance.js";
import Board from "../models/Board.js";
import List from "../models/List.js";
import Card from "../models/Card.js";

export async function cleanTestData() {
  try {
    console.log("🧹 Cleaning test data...");

    // Delete all test employees (keep only CEO)
    const result = await User.deleteMany({ role: "Employee" });
    console.log(`✅ Deleted ${result.deletedCount} employees`);

    // Delete all tasks
    const taskResult = await Task.deleteMany({});
    console.log(`✅ Deleted ${taskResult.deletedCount} tasks`);

    // Delete all attendance
    const attendanceResult = await Attendance.deleteMany({});
    console.log(`✅ Deleted ${attendanceResult.deletedCount} attendance records`);

    // Delete all boards
    const boardResult = await Board.deleteMany({});
    console.log(`✅ Deleted ${boardResult.deletedCount} boards`);

    // Delete all lists
    const listResult = await List.deleteMany({});
    console.log(`✅ Deleted ${listResult.deletedCount} lists`);

    // Delete all cards
    const cardResult = await Card.deleteMany({});
    console.log(`✅ Deleted ${cardResult.deletedCount} cards`);

    console.log("✅ Database cleaned! Ready for production data.");
  } catch (err) {
    console.error("❌ Error cleaning test data:", err);
  }
}
