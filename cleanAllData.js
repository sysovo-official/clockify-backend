import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Task from "./models/Task.js";
import Attendance from "./models/Attendance.js";
import Board from "./models/Board.js";
import List from "./models/List.js";
import Card from "./models/Card.js";

dotenv.config();

async function cleanAllData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("🧹 Cleaning ALL test/dummy data...\n");

    // Delete all employees (keep CEO)
    const deletedUsers = await User.deleteMany({ role: "Employee" });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} employees`);

    // Delete all tasks
    const deletedTasks = await Task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.deletedCount} tasks`);

    // Delete all attendance
    const deletedAttendance = await Attendance.deleteMany({});
    console.log(`✅ Deleted ${deletedAttendance.deletedCount} attendance records`);

    // Delete all boards
    const deletedBoards = await Board.deleteMany({});
    console.log(`✅ Deleted ${deletedBoards.deletedCount} boards`);

    // Delete all lists
    const deletedLists = await List.deleteMany({});
    console.log(`✅ Deleted ${deletedLists.deletedCount} lists`);

    // Delete all cards
    const deletedCards = await Card.deleteMany({});
    console.log(`✅ Deleted ${deletedCards.deletedCount} cards`);

    console.log("\n✅ Database is now CLEAN!");
    console.log("📊 Only CEO account remains: ceo@demo.com");
    console.log("\n🚀 System is ready for your REAL production data!");
    console.log("   All data will be fetched dynamically from database.");
    console.log("   Add employees, tasks, attendance through the UI.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

cleanAllData();
