import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User reference is required'],
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    userRole: {
      type: String,
      required: [true, 'User role is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: [
          "created_board",
          "created_list",
          "created_card",
          "updated_card",
          "moved_card",
          "moved_list",
          "deleted_card",
          "deleted_list",
          "changed_card_status",
        ],
        message: '{VALUE} is not a valid action'
      },
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ["board", "list", "card"],
        message: '{VALUE} is not a valid target type'
      },
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
    },
    targetName: {
      type: String,
      required: [true, 'Target name is required'],
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
    },
    boardName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries and better performance
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ boardId: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ targetType: 1, targetId: 1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
