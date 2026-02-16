# Expense Tracker

A minimal full-stack personal expense tracker: backend API + simple web UI. Built for real-world conditions (retries, refreshes, slow/failed networks).

## Features

- **Create expenses**: amount, category, description, date
- **List expenses**: with filter by category and sort by date (newest first)
- **Total**: sum of currently visible expenses (after filter/sort)
- **Idempotent POST**: safe retries and duplicate submits (uses `Idempotency-Key` header)
- **Validation**: non-negative amount, required date; basic error and loading states in UI

## Quick start

### Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

### Run backend

```bash
cd backend
npm install
npm run dev
```

API runs at `http://localhost:3001`.

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173` and proxies `/api` to the backend.

### Run both (from repo root)

```bash
npm install
npm run dev
```

This starts the API and the UI; open `http://localhost:5173`.

## API

- **POST /expenses**  
  Body: `{ "amount": number, "category": string, "description": string, "date": "YYYY-MM-DD" }`  
  Optional header: `Idempotency-Key: <unique-string>` for safe retries.

- **GET /expenses**  
  Query: `?category=Food&sort=date_desc` (both optional).

## Deploy on Vercel (with MongoDB)

1. **Create a MongoDB database** (free tier):
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → Sign up / Log in.
   - Create a **free cluster** (M0).
   - Under **Database Access** → Add Database User (username + password).
   - Under **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) so Vercel can connect.
   - Under **Database** → **Connect** → **Drivers** → copy the connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/`). Replace `<password>` with your user password. Optionally add a database name: `...mongodb.net/expense-tracker`.

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → Import your repo.
   - Leave **Root Directory** as the repo root.
   - Before deploying, go to **Settings** → **Environment Variables**. Add:
     - **Name:** `MONGODB_URI`
     - **Value:** your MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/expense-tracker`)
   - Click **Deploy**. Your app will be live at `https://your-project.vercel.app`.

**Note:** If `MONGODB_URI` is not set on Vercel, the API falls back to an in-memory store (data is lost on cold starts). Setting `MONGODB_URI` gives you persistent storage with MongoDB.

## Design decisions

- **Money**: Stored as integer **paise** in the DB to avoid floating-point errors. API and UI use rupees; conversion at the boundary.
- **Persistence**: **SQLite** (file `backend/data/expenses.db`). No extra process, survives restarts, easy to backup and migrate later. Chosen over in-memory for realism and over a full RDBMS for simplicity.
- **Idempotency**: Client sends `Idempotency-Key` (e.g. UUID) on POST. Server stores key → expense id; repeated same key returns the same expense (201) without creating a duplicate. Frontend generates one key per “logical” submit and keeps it until success, so refresh/retry is safe.
- **Stack**: Express + better-sqlite3 (sync, simple). Frontend: React + Vite, minimal styling, focus on correctness and clarity.

## Trade-offs / not done

- **Timebox**: No auth, no multi-user. Single SQLite file is enough for a small personal tool.
- **Tests**: No automated tests in this repo; would add API integration tests and a few React tests next.
- **Summary view**: “Total per category” listed as nice-to-have; not implemented to keep scope small.
- **Deployment**: Vercel config included (`vercel.json` + `api/`); SQLite on Vercel is ephemeral. For production’d with persistent data, use a hosted database.

## Project structure

```
femmmo/
├── api/             # Vercel serverless: forwards /api/* to Express
│   └── index.js
├── backend/         # Express API
│   ├── src/
│   │   ├── index.js # Routes, server (export app for Vercel)
│   │   ├── expenses.js
│   │   └── db.js    # SQLite (uses /tmp on Vercel)
│   └── data/        # expenses.db (local only)
├── frontend/        # Vite + React
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── vercel.json      # Build + rewrites for Vercel
├── package.json     # Root scripts to run both
└── README.md
```
