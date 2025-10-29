import app from '../server.js';
import { createServer } from 'http';

// Create server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  const server = createServer(app);
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel serverless.
export default app;