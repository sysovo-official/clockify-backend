import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      minlength: [1, 'Board name cannot be empty']
    },
    description: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'Board creator is required'],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
  timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }

  }
);

// Indexes for better query performance
boardSchema.index({ createdBy: 1, createdAt: -1 });
boardSchema.index({ members: 1 });
boardSchema.index({ name: 'text' });

export default mongoose.model("Board", boardSchema);



