import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Task from "./models/Task.js";
import Attendance from "./models/Attendance.js";

dotenv.config();

async function testDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check Users/Employees
    const allUsers = await User.find().select("-password");
    console.log(`👥 Total Users: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}, SubRole: ${user.subRole || 'N/A'}`);
    });
    console.log("");

    // Check Tasks
    const allTasks = await Task.find().populate("assignedUser", "name email");
    console.log(`📋 Total Tasks: ${allTasks.length}`);
    allTasks.forEach(task => {
      console.log(`  - ${task.title} - Assigned to: ${task.assignedSubRole}, Status: ${task.status}`);
    });
    console.log("");

    // Check Attendance
    const allAttendance = await Attendance.find().populate("userId", "name email");
    console.log(`⏰ Total Attendance Records: ${allAttendance.length}`);
    allAttendance.forEach(att => {
      const duration = att.duration ? `${Math.floor(att.duration / 3600)}h ${Math.floor((att.duration % 3600) / 60)}m` : "Active";
      console.log(`  - ${att.userId?.name || 'Unknown'} - In: ${new Date(att.punchInTime).toLocaleString()}, Duration: ${duration}`);
    });
    console.log("");

    console.log("✅ Database test completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testDatabase();
