import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Card title is required'],
      trim: true,
      minlength: [1, 'Card title cannot be empty']
    },
    description: {
      type: String,
      trim: true
    },
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "List",
      required: [true, 'List reference is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dueDate: { type: Date },
    position: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: {
        values: ["Pending", "In Progress", "OnHold", "Completed"],
        message: '{VALUE} is not a valid status'
      },
      default: "Pending",
    },
    // Time tracking fields (like Clockify)
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    totalMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Total minutes cannot be negative']
    },
    timeEntries: [{
      startTime: { type: Date, required: true },
      endTime: { type: Date },
      duration: {
        type: Number,
        default: 0,
        min: [0, 'Duration cannot be negative']
      },
      note: { type: String, trim: true }
    }],
    // Daily progress tracking
    carriedFromDate: { type: Date, default: null },
    isCarriedOver: { type: Boolean, default: false },
    acknowledgedByEmployee: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance and data integrity
cardSchema.index({ listId: 1, position: 1 });
cardSchema.index({ assignedTo: 1, status: 1 });
cardSchema.index({ assignedTo: 1, createdAt: -1 });
cardSchema.index({ status: 1, dueDate: 1 });
cardSchema.index({ createdAt: -1 });

export default mongoose.model("Card", cardSchema);
