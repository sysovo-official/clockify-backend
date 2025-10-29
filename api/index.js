import app from '../server.js';
import { createServer } from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// For serverless (Vercel) we must ensure mongoose is connected when the function is invoked.
// Connect on import when not already connected.
const connectMongooseIfNeeded = async () => {
  if (mongoose.connection.readyState === 1) return;

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

  try {
    await mongoose.connect(process.env.MONGO_URI, options);
    if (process.env.NODE_ENV !== 'production') console.log('✅ MongoDB connected (from api/index.js)');
  } catch (err) {
    console.error('❌ MongoDB connection error (from api/index.js):', err.message || err);
    // Do not throw - let requests return errors instead of crashing the serverless function
  }
};

// In development start a normal server (so local dev behaves the same)
if (process.env.NODE_ENV !== 'production') {
  const server = createServer(app);
  const PORT = process.env.PORT || 5000;
  // Ensure DB is connected before starting the server locally
  connectMongooseIfNeeded().then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
} else {
  // In production (Vercel serverless) connect once on cold start
  connectMongooseIfNeeded();
}

// Export the Express app for Vercel serverless
export default app;