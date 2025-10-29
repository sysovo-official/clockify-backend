import User from "../models/User.js";

export async function seedCEO() {
  try {
    const existing = await User.findOne({ email: process.env.CEO_EMAIL }).lean();
    if (existing) return;

    await User.create({
      name: "CEO",
      email: process.env.CEO_EMAIL,
      password: process.env.CEO_PASSWORD,
      role: "CEO",
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("👑 CEO account created:", process.env.CEO_EMAIL);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("CEO seed error:", err);
  }
}
