import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    assignedSubRole: {
      type: String,
      enum: ["Developer", "Designer", "Content Writer", "SEO", "Marketing"],
      required: true,
    },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, //  optional, if specific user selected
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "OnHold", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
