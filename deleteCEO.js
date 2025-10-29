import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function deleteCEO() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Delete the old CEO account
    const result = await User.deleteOne({ email: "ceo@demo.com" });

    if (result.deletedCount > 0) {
      console.log("🗑️  Old CEO account (ceo@demo.com) deleted successfully!");
    } else {
      console.log("⚠️  CEO account not found (may already be deleted)");
    }

    console.log("\n✅ Done! Restart the server to create new CEO account.");
    console.log("   New credentials: Admin@sysovo.com / SysovoAdmin123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

deleteCEO();
