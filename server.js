import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { seedCEO } from "./utils/seedCEO.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import listRoutes from "./routes/listRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === "production";

// FRONTEND_URL may contain one or more origins separated by commas.
// Example: https://myapp.vercel.app,https://myapp-qa.vercel.app
const rawFrontendUrls = process.env.FRONTEND_URL || "";
const allowedOrigins = rawFrontendUrls.split(",").map(u => u.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g., curl, server-to-server) or same-origin when origin is undefined
    if (!origin) return callback(null, true);
    // In development allow all origins
    if (!isProd) return callback(null, true);
    // If no FRONTEND_URL is configured in production, log a warning and allow the request (fallback)
    if (allowedOrigins.length === 0) {
      console.warn('⚠️  FRONTEND_URL not set in production; allowing all origins as fallback');
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

let cachedDb = null;

async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;

  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    w: 'majority',
    family: 4,
  };

  await mongoose.connect(process.env.MONGO_URI, options);
  cachedDb = mongoose.connection;
  if (!isProd) console.log("✅ MongoDB Connected");
  if (mongoose.connection.readyState === 1) await seedCEO();
  return cachedDb;
}

// MongoDB connection event listeners
mongoose.connection.on('error', err => {
  !isProd && console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  !isProd && console.log('⚠️  MongoDB disconnected');
});

app.get("/", (_req, res) => res.json({ status: "ok", db: mongoose.connection.readyState === 1, readyState: mongoose.connection.readyState }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/activities", activityRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

app.use((err, _req, res, _next) => {
  !isProd && console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;

if (!isProd) {
  const PORT = process.env.PORT || 5000;

  // Wait for DB connection before starting server
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    });
  }).catch(err => {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  });
}
