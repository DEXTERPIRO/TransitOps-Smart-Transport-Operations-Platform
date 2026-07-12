# TransitOps - Smart Transport Operations Platform

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-39827F?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![React 18](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![JWT Auth](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

TransitOps is an enterprise-grade, full-stack fleet management and smart transport operations platform designed to optimize vehicle logistics, driver compliance, route scheduling, predictive maintenance, and real-time operations telemetry. It provides operations teams with a single pane of glass to oversee complex transport environments.

## Screenshots

<table width="100%">
  <tr>
    <td width="33.3%" align="center" valign="top">
      <strong>Login Screen</strong><br/><br/>
      <img src="assets/screenshots/login.png" width="100%" />
    </td>
    <td width="33.3%" align="center" valign="top">
      <strong>Operations Dashboard</strong><br/><br/>
      <img src="assets/screenshots/dashboard.png" width="100%" />
    </td>
    <td width="33.3%" align="center" valign="top">
      <strong>Fleet Management</strong><br/><br/>
      <img src="assets/screenshots/fleet.png" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="33.3%" align="center" valign="top">
      <strong>Driver Registry</strong><br/><br/>
      <img src="assets/screenshots/drivers.png" width="100%" />
    </td>
    <td width="33.3%" align="center" valign="top">
      <strong>Trip Dispatch Board</strong><br/><br/>
      <img src="assets/screenshots/trips.png" width="100%" />
    </td>
    <td width="33.3%" align="center" valign="top">
      <strong>Maintenance Logs</strong><br/><br/>
      <img src="assets/screenshots/maintenance.png" width="100%" />
    </td>
  </tr>
  <tr>
    <td width="33.3%" align="center" valign="top">
      <strong>Fuel Logs</strong><br/><br/>
      <img src="assets/screenshots/fuel.png" width="100%" />
    </td>
    <td width="33.3%" align="center" valign="top">
      <strong>Reports & Analytics</strong><br/><br/>
      <img src="assets/screenshots/reports.png" width="100%" />
    </td>
    <td width="33.3%" align="center" valign="top">
      <strong>System Settings</strong><br/><br/>
      <img src="assets/screenshots/settings.png" width="100%" />
    </td>
  </tr>
</table>

---

## Technical Architecture

The platform uses a decoupled client-server architecture built on Node.js and React:

```
[ Frontend Client (React) ]
      │ (HTTP REST / JSON)  ◄── Axios Client with JWT Refresh Interceptors
      ▼
[ API Gateway / Express Server ]
      │ (CORS Multi-Origin) ◄── Allows localhost:5173 and localhost:5174
      ├──────────────────────── Socket.io WebSocket Server (Real-time telemetry)
      ▼
[ Database Access Layer (Prisma) ]
      │ (Connection Pooling)
      ▼
[ Relational Database (PostgreSQL) ]
```

---

## Detailed System Modules

### 1. Fleet & Asset Management
* Track vehicle metadata, registration numbers, loading capacities, acquisition costs, and current odometers.
* Supported Vehicle Types: Van, Truck, Bus, Bike, Car.
* Vehicle Status Engine:
  * Available: Ready to be dispatched.
  * On Trip: Locked and currently assigned to an active route.
  * In Shop: Locked in maintenance status; cannot be assigned to new trips.
  * Retired: Decommissioned from the active fleet.

### 2. Driver Registry & Compliance
* Profiles tracking driver license numbers, safety scores (0-100), and status (Available, On Trip, Off Duty, Suspended).
* Dispatch Safety Guards:
  * Prevents selection of suspended drivers.
  * Checks for expired status before confirming route dispatch.
  * Integrates real-time badge visualization using high-contrast styling in light and dark modes.

### 3. Route Scheduling & Dispatch Board
* Route mapping driven by Leaflet.js interactive maps.
* Live dispatcher dashboard that controls active route transitions.
* Instant update distribution using Socket.io:
  * When a trip is dispatched, status coordinates broadcast to the general dashboard dashboard room.
  * Individual trip rooms (`trip-{id}`) receive targeted telemetry updates.

### 4. Predictive Maintenance Alert Engine
* Service logs tracking maintenance dates, cost calculations, and service types.
* Predictive Odometer Checking:
  * The backend scans vehicle odometers relative to their last recorded service.
  * If a vehicle surpasses 10,000 km since its last service, it registers a predictive warning alert.
  * If it surpasses 15,000 km, the warning escalates to a high-priority service request.

### 5. Financial & Fuel Analytics
* Fuel log tracker calculating exact fuel efficiency (km/liter) and costs.
* Categorized operational expenses (Tolls, Parking, Repairs, and miscellaneous items).
* Dynamic analytics dashboard using Recharts featuring Monthly Revenue trends, fuel usage, and vehicle ROI charts.
* Rupee font fallbacks (`Rs.` and `₹` font stacks) integrated into index.css and PDF exports.

### 6. AI Operations Assistant
* An on-demand LLM chatbot powered by Groq.
* Connects directly to the PostgreSQL database using Prisma schema metadata.
* Allows operators to query database stats (e.g. "What is our highest earning truck?" or "Show pending maintenance alerts") in plain natural language.

---

## Database Schema (Prisma Models)

```prisma
enum Role {
  FLEET_MANAGER
  DISPATCHER
  SAFETY_OFFICER
  FINANCIAL_ANALYST
}

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  password     String
  role         Role
  region       String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  trips        Trip[]
}

model Vehicle {
  id               String        @id @default(uuid())
  registrationNo   String        @unique
  name             String
  type             VehicleType
  maxLoadCapacity  Float
  odometer         Float         @default(0)
  acquisitionCost  Float
  region           String?
  status           VehicleStatus @default(AVAILABLE)
  isActive         Boolean       @default(true)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  trips            Trip[]
  maintenanceLogs  MaintenanceLog[]
  fuelLogs         FuelLog[]
  expenses         Expense[]
}

model Driver {
  id           String       @id @default(uuid())
  name         String
  email        String       @unique
  phone        String
  licenseNo    String       @unique
  status       DriverStatus @default(AVAILABLE)
  safetyScore  Float        @default(100)
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  trips        Trip[]
}

model Trip {
  id              String     @id @default(uuid())
  tripCode        String     @unique
  source          String
  destination     String
  status          TripStatus @default(DRAFT)
  cargoWeight     Float
  plannedDistance Float
  actualDistance  Float?
  revenue         Float?
  fuelConsumed    Float?
  vehicleId       String
  vehicle         Vehicle    @relation(fields: [vehicleId], references: [id])
  driverId        String
  driver          Driver     @relation(fields: [driverId], references: [id])
  dispatchedById  String
  dispatchedBy    User       @relation(fields: [dispatchedById], references: [id])
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}
```

---

## Role-Based Access Matrix

The platform enforces strict client-side routing blocks and server-side middleware validation:

| View / Module | Fleet Manager | Dispatcher | Safety Officer | Financial Analyst |
|---|:---:|:---:|:---:|:---:|
| Operations Dashboard | Yes | Yes | Yes | Yes |
| Fleet Fleet Management | Yes | Yes | No | No |
| Driver Management | Yes | Yes | Yes | No |
| Trip Dispatch Board | Yes | Yes | No | No |
| Maintenance Logs | Yes | No | No | No |
| Fuel & Expense Logs | Yes | No | No | Yes |
| Financial Reports | Yes | No | No | Yes |
| System Settings | Yes | No | No | No |

---

## API Documentation Examples

### 1. User Login
* **URL**: `/api/auth/login`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "email": "fleet@transitops.com",
    "password": "Fleet@123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "7ca64b-e85d-4f10-91a...",
      "name": "Fleet Manager",
      "email": "fleet@transitops.com",
      "role": "FLEET_MANAGER"
    }
  }
  ```

### 2. Forgot Password Request
* **URL**: `/api/auth/forgot-password`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "email": "fleet@transitops.com"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Temporary password sent to your email."
  }
  ```

### 3. Generate Trip Dispatch
* **URL**: `/api/trips`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "tripCode": "TR007",
    "source": "Mumbai",
    "destination": "Pune",
    "vehicleId": "v-uuid-1234",
    "driverId": "d-uuid-5678",
    "cargoWeight": 450,
    "plannedDistance": 150
  }
  ```

---

## Getting Started

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DEXTERPIRO/TransitOps-Smart-Transport-Operations-Platform.git
   cd TransitOps-Smart-Transport-Operations-Platform
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/transitops"
   JWT_SECRET="transitops_jwt_secret_2024"
   JWT_REFRESH_SECRET="transitops_refresh_2024"
   PORT=5000
   FRONTEND_URL="http://localhost:5173"
   EMAIL_USER="strangegaming66@gmail.com"
   EMAIL_PASS="xuthwmbdmsgembpz"
   GROQ_API_KEY="gsk_7K66w2Njv..."
   ```

3. **Initialize Database**
   Install packages and execute migrations to generate the PostgreSQL tables:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run seed
   ```

4. **Start backend Node Server**
   ```bash
   npm run dev
   ```

5. **Start Frontend Vite Client**
   Open a new terminal shell:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Troubleshooting & Port Allocation

### Stale Node Process Termination (Windows)
If you get `Error: listen EADDRINUSE: address already in use :::5000` when running the backend, it means a background process is already occupying port 5000. 

1. Find the process ID (PID) holding port 5000:
   ```powershell
   netstat -ano | findstr :5000
   ```
2. Kill the process (replace `PID` with the actual number found, e.g. 10688):
   ```powershell
   taskkill /F /PID PID
   ```

### Vite Port Collision and CORS Mismatch
If Vite starts the frontend on `http://localhost:5174` because port 5173 was busy, you might face a CORS blocking error during login. 

The backend CORS settings are configured to accept requests from both `localhost:5173` and `localhost:5174` by default. If you need to add custom local network IPs, update the `allowedOrigins` array inside `backend/server.js`:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean);
```
