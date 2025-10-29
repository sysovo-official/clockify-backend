import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Task from "./models/Task.js";
import Attendance from "./models/Attendance.js";

dotenv.config();

async function addSampleData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Add 3 sample employees
    console.log("➕ Adding sample employees...");

    const emp1 = await User.create({
      name: "Ahmed Khan",
      email: "ahmed@sysovo.com",
      password: "123456",
      role: "Employee",
      subRole: "Developer"
    });
    console.log(`  ✅ Added: ${emp1.name} (Developer)`);

    const emp2 = await User.create({
      name: "Sara Ali",
      email: "sara@sysovo.com",
      password: "123456",
      role: "Employee",
      subRole: "Designer"
    });
    console.log(`  ✅ Added: ${emp2.name} (Designer)`);

    const emp3 = await User.create({
      name: "Hassan Raza",
      email: "hassan@sysovo.com",
      password: "123456",
      role: "Employee",
      subRole: "Marketing"
    });
    console.log(`  ✅ Added: ${emp3.name} (Marketing)\n`);

    // Add sample tasks
    console.log("➕ Adding sample tasks...");

    await Task.create({
      title: "Build user authentication module",
      assignedSubRole: "Developer",
      assignedUser: emp1._id,
      status: "In Progress"
    });
    console.log("  ✅ Added task: Build user authentication module");

    await Task.create({
      title: "Design dashboard UI mockups",
      assignedSubRole: "Designer",
      assignedUser: emp2._id,
      status: "Completed"
    });
    console.log("  ✅ Added task: Design dashboard UI mockups");

    await Task.create({
      title: "Create social media campaign",
      assignedSubRole: "Marketing",
      assignedUser: emp3._id,
      status: "Pending"
    });
    console.log("  ✅ Added task: Create social media campaign\n");

    // Add sample attendance records
    console.log("➕ Adding sample attendance...");

    // Ahmed - completed session from today
    const today = new Date();
    const punchIn1 = new Date(today.setHours(9, 0, 0, 0));
    const punchOut1 = new Date(today.setHours(17, 30, 0, 0));
    const duration1 = (punchOut1 - punchIn1) / 1000;

    await Attendance.create({
      userId: emp1._id,
      punchInTime: punchIn1,
      punchOutTime: punchOut1,
      duration: duration1
    });
    console.log("  ✅ Added attendance: Ahmed (9:00 AM - 5:30 PM, 8.5 hours)");

    // Sara - active session (no punch out)
    const punchIn2 = new Date(today.setHours(10, 0, 0, 0));
    await Attendance.create({
      userId: emp2._id,
      punchInTime: punchIn2,
      punchOutTime: null,
      duration: 0
    });
    console.log("  ✅ Added attendance: Sara (10:00 AM - Active)\n");

    console.log("✅ Sample data added successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Employees: 3`);
    console.log(`  - Tasks: 3`);
    console.log(`  - Attendance: 2`);
    console.log("\n🌐 Now check your dashboard at http://localhost:5173");
    console.log("   Login with: Admin@sysovo.com / SysovoAdmin123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addSampleData();
