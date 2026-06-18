# LinkShort - URL Shortener

A full-stack URL shortener with click analytics and user authentication.

## Live Demo
[url-shortener-ten-lime.vercel.app](https://url-shortener-ten-lime.vercel.app)

## Features
- User authentication (Register/Login) with JWT
- URL shortening using nanoid with collision-resistant codes
- Click tracking — device and browser detection via user-agent parsing
- Analytics dashboard per URL
- Stats overview — total links, total clicks, average clicks per link

## Tech Stack
- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Deployment:** Vercel (frontend) + Railway (backend + database)

## Architecture
- Decoupled REST API architecture
- JWT stateless authentication
- Per-user URL isolation in PostgreSQL
- Redirect route handles click tracking before forwarding
- Auto-deploys via GitHub CI/CD pipeline

## Running Locally

### Backend
```bash
cd backend
npm install
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in the backend folder:
```
GROQ_API_KEY=your-groq-api-key
JWT_SECRET=your-jwt-secret
DATABASE_URL=your-postgresql-url
PORT=5000
```