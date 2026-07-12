# TransitOps - Smart Transport Operations Platform

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-39827F?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![React 18](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![JWT Auth](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

TransitOps is a enterprise-grade full-stack fleet management and smart transport operations platform designed to streamline vehicle logistics, driver compliance, route scheduling, predictive maintenance, and real-time operations telemetry.

---

## System Modules

### Fleet Management
* Track and manage vehicle assets, registration details, maximum payload capacities, and current odometers.
* Categorize vehicles by type (Vans, Trucks, Buses, Bikes, Cars).
* View status indicators (Available, On Trip, In Shop, Retired) for live allocation.

### Driver Management
* Comprehensive profiles including license numbers, verification statuses, and historical safety scores.
* Smart validation guards that prevent suspended or expired drivers from being dispatched on active routes.

### Real-Time Dispatch and Map Routing
* Live vehicle routing and geolocational updates driven by Leaflet.js interactive map layers.
* Real-time dispatch board that transmits active route updates to drivers using Socket.io web sockets.

### Maintenance and Predictive Alerts
* Service logs tracking maintenance costs, service dates, and repair descriptions.
* Predictive maintenance module that monitors odometer mileage and flags warning alerts for vehicles exceeding 10,000 km since their last service.

### Fuel and Expense Analytics
* Fuel log tracker calculating exact consumption efficiency (km/liter) and fueling costs.
* Categorized operational expenses (Tolls, Parking, Repairs, and miscellaneous items) to capture total cost of ownership.

### Automated Reports Export
* Dynamic analytical charting illustrating Monthly Revenue flows and Vehicle ROI (Return on Investment) statistics using Recharts.
* Server-side PDF and CSV generation helpers to export active records instantly.

---

## Role-Based Access Control

The platform enforces strict role-based access control (RBAC) across all endpoints and UI views:

| Role | Permitted Actions | Accessible Sections |
|---|---|---|
| Fleet Manager | Full administrative access, user creation, assets management | Fleet, Maintenance, Drivers, Dashboard, Reports, Settings |
| Dispatcher | Trip creation, route assignment, live dispatch controls | Dashboard, Fleet, Drivers, Trips |
| Safety Officer | Driver verification, compliance checking, license auditing | Dashboard, Drivers, Compliance |
| Financial Analyst | Cost tracking, fuel analytics, ROI evaluations | Dashboard, Fuel, Expenses, Reports |

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Fleet Manager | fleet@transitops.com | Fleet@123 |
| Dispatcher | dispatch@transitops.com | Dispatch@123 |
| Safety Officer | safety@transitops.com | Safety@123 |
| Financial Analyst | finance@transitops.com | Finance@123 |

---

## API Reference

### Authentication Endpoints
* `POST /api/auth/login` - Authenticates user credentials and sets HttpOnly refresh cookies.
* `POST /api/auth/refresh` - Reissues JSON Web Access Tokens using secure refresh sessions.
* `POST /api/auth/logout` - Revokes session cookies and logs user out.
* `POST /api/auth/forgot-password` - Generates a temporary reset password and emails it to the user.
* `GET /api/auth/me` - Retrieves profile details of the active authenticated session.

### Fleet & Operations Endpoints
* `GET /api/vehicles` - List vehicle assets (supports pagination, filtering, and search).
* `POST /api/vehicles` - Register new vehicle to the fleet.
* `GET /api/drivers` - Retrieve driver logs and compliance safety scores.
* `POST /api/trips` - Create a dispatch request.
* `PUT /api/trips/:id/dispatch` - Transition trip status to active and send web socket alerts.
* `PUT /api/trips/:id/complete` - Log completed odometer changes and trip revenue.

### Reporting & AI Endpoints
* `GET /api/reports/analytics` - Get aggregated revenue, fuel, and trip metrics.
* `GET /api/reports/export/pdf` - Generates server-side PDF report containing complete financial charts.
* `POST /api/ai/chat` - Queries the AI helper using dynamic context from the PostgreSQL database.

---

## Project Structure

```
TransitOps/
├── backend/
│   ├── prisma/             # Database schema definition and seed scripts
│   ├── src/
│   │   ├── controllers/    # Route controllers handling business logic
│   │   ├── middleware/     # Auth checks, rate limiters, validation guards
│   │   ├── routes/         # Express endpoint definitions
│   │   └── utils/          # PDF generator, mailer setup, and AI logic
│   ├── server.js           # Server initialization and Socket.io binding
│   └── .env                # Server credentials (gitignored)
│
└── frontend/
    ├── src/
    │   ├── api/            # API client wrappers using Axios
    │   ├── components/     # Reusable layout shells, charts, and badging
    │   ├── pages/          # View entrypoints (Dashboard, Reports, Fleet, etc.)
    │   ├── store/          # Zustand global states
    │   └── App.jsx         # Router configuration and state provider definitions
```

---

## Getting Started

### Prerequisites
* Node.js v18 or above
* PostgreSQL database instance running locally or on cloud

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DEXTERPIRO/TransitOps-Smart-Transport-Operations-Platform.git
   cd TransitOps-Smart-Transport-Operations-Platform
   ```

2. **Configure Backend Settings**
   * Navigate to the `backend` directory.
   * Copy `.env.example` into a new `.env` file.
   * Update the `DATABASE_URL` string to connect to your PostgreSQL instance.
   * Provide valid `EMAIL_USER` and `EMAIL_PASS` credentials for Nodemailer password recovery.

3. **Install Dependencies and Setup Database**
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run seed
   ```

4. **Start the Backend Server**
   ```bash
   npm run dev
   ```

5. **Start the Frontend Client**
   * Open a new terminal window.
   * Navigate to the `frontend` directory.
   * Install client modules and start the Vite dev server.
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The frontend client will now be accessible at `http://localhost:5173` (or `http://localhost:5174` if port 5173 is occupied). All API operations route to `http://localhost:5000/api`.
