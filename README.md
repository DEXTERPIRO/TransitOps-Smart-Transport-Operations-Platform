# TransitOps — Smart Transport Operations Platform

A full-stack fleet & transport management system built with:
- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6
- **Real-time**: Socket.io
- **Charts**: Recharts
- **Maps**: Leaflet.js + react-leaflet
- **Auth**: JWT (access + refresh tokens)

## Demo Credentials

| Role              | Email                        | Password       |
|-------------------|------------------------------|----------------|
| Fleet Manager     | fleet@transitops.com         | Fleet@123      |
| Dispatcher        | dispatch@transitops.com      | Dispatch@123   |
| Safety Officer    | safety@transitops.com        | Safety@123     |
| Financial Analyst | finance@transitops.com       | Finance@123    |

## Setup

```bash
# 1. Backend
cd backend
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values.

## Features

- 🚌 **Fleet Management** — track vehicles, status, assignments
- 👨‍✈️ **Driver Management** — profiles, licenses, safety score tracking, and auto-dispatch validation
- 🗺️ **Trip Tracking** — live GPS with Leaflet maps and interactive dispatch board
- 🔧 **Maintenance** — service logs, reminders, and predictive service alerts based on odometer tracking
- ⛽ **Fuel Logs** — consumption analytics and live cost calculation
- 💸 **Expenses** — cost tracking & categorization
- 📊 **Reports** — PDF/CSV export,Monthly Revenue and top vehicle ROI charts
- 🤖 **AI Assistant** — Claude-powered conversational agent accessing real-time fleet databases
- 🔔 **Real-time** — Socket.io live updates for instant dashboard refreshes

## Tech Stack

```
backend/
  Express 4   REST API
  Prisma 5    PostgreSQL ORM
  Socket.io   WebSocket server
  JWT         Auth (access + refresh)
  pdfkit      PDF generation
  nodemailer  Email notifications

frontend/
  React 18    UI framework
  Vite 5      Build tool
  Tailwind    Styling
  Zustand     Global state
  React Query Data fetching
  Recharts    Analytics charts
  Leaflet     Interactive maps
  Lucide      Icon library
```
