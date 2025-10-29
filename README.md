# Sysovo Backend

Production-ready Node.js backend with Express and MongoDB.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CEO_EMAIL=Admin@sysovo.com
CEO_PASSWORD=your_password
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

## Deployment to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Local Development

```bash
npm install
npm run dev
```
