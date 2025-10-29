import mongoose from "mongoose";

const listSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'List title is required'],
      trim: true,
      minlength: [1, 'List title cannot be empty']
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: [true, 'Board reference is required'],
    },
    position: {
      type: Number,
      default: 0
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
listSchema.index({ boardId: 1, position: 1 });
listSchema.index({ boardId: 1, createdAt: -1 });

export default mongoose.model("List", listSchema);
