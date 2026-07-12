<p align="center">
  <img src="assets/logo.svg" alt="TransitOps Logo" width="120" height="120" />
</p>

<h1 align="center">TransitOps</h1>
<p align="center"><strong>Smart Transport Operations Platform</strong></p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" /></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-39827F?style=for-the-badge&logo=prisma&logoColor=white" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" /></a>
  <a href="https://socket.io/"><img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" /></a>
  <a href="https://jwt.io/"><img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" /></a>
</p>

TransitOps is an enterprise-grade, full-stack fleet management and smart transport operations platform designed to optimize vehicle logistics, driver compliance, route scheduling, predictive maintenance, and real-time operations telemetry. It provides logistics and operations teams with a single, synchronized platform to manage and monitor complex transport networks.

---

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

### Technical Architecture

The platform is designed around a decoupled, service-oriented client-server architecture. The diagrams below illustrate the system boundary layers, sequence flows, and event orchestration pipelines.

### System Boundary Layers

```
+---------------------------------------------------------------------------------+
|                                 React Frontend                                  |
|  [Zustand Stores] ◄──► [Components & Views] ◄──► [Axios Interceptors / HTTP]     |
+----------------------------------------┬----------------------------------------+
                                         │ JSON HTTP Requests / JWT Bearer
                                         ▼
+---------------------------------------------------------------------------------+
|                             Express Backend Gateway                             |
|  [Auth Validation Guard] ◄──► [Controllers Layer] ◄──► [Socket.io Event Hub]   |
+----------------------------------------┬----------------------------------------+
                                         │ Database Connections / Prisma ORM
                                         ▼
+---------------------------------------------------------------------------------+
|                                PostgreSQL DB                                    |
|  [Users Table] ◄──► [Vehicles] ◄──► [Drivers] ◄──► [Trips] ◄──► [Maintenance]   |
+---------------------------------------------------------------------------------+
```

### 1. Authentication & JWT Session Lifecycle

The backend manages state-free authorization using token pairs. Access tokens are passed via HTTP headers, while refresh tokens are secured in HttpOnly cookies:

```mermaid
sequenceDiagram
    autonumber
    actor User as Operations Agent
    participant Client as React Client (Memory)
    participant Server as Express Server
    participant DB as PostgreSQL DB

    User->>Client: Enter Email & Password
    Client->>Server: POST /api/auth/login
    Server->>DB: Query User Record & Verify Password Hash
    DB-->>Server: Return User Data (Role Match)
    Server-->>Client: Set HttpOnly Cookie (Refresh Token) & JSON Body (Access Token)
    Note over Client: Save Access Token in Memory (State)
    Client->>Server: HTTP Request (Headers: Bearer Access Token)
    Server-->>Client: Access Granted (200 OK)
```

### 2. Trip Dispatch & State Management Lifecycle

Active trips progress through structured validation checks before updates are emitted to the fleet:

```mermaid
graph TD
    A["Draft Trip Created"] --> B{"Dispatch Clicked"}
    B --> C{"Check Driver Status"}
    B --> D{"Check Vehicle Status"}
    C -- "Suspended or Expired" --> E["Dispatch Rejected"]
    D -- "In Shop or Retired" --> E
    C -- "Available" --> F{"Create Dispatch Event"}
    D -- "Available" --> F
    F --> G["Prisma DB Transaction: Update Status to DISPATCHED"]
    G --> H["Socket.io: Broadcast Alert to Room 'trip-{id}'"]
    H --> I["Dashboard Telemetry Active"]
```

### 3. Real-Time Telemetry Pipeline

Real-time telemetry coordinates are pushed instantly to dispatcher maps via Socket.io channels:

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Dispatcher Client
    participant Server as Socket.io Server
    participant Channel as Room: dashboard
    participant DB as Prisma PostgreSQL

    Agent->>Server: Connect and join "dashboard" room
    Server-->>Agent: Connection Established
    Note over Server: Active dispatch triggers status update
    Server->>DB: Write Odometer / Location telemetry
    Server->>Channel: Emit status update to room
    Channel-->>Agent: React client state updates, re-rendering Leaflet Map Marker
```

---

## System Design Philosophy

### Neumorphic UI / UX Design
The frontend layout departs from standard flat aesthetics in favor of a skeuomorphic and neumorphic visual system:
* Recessed Inputs: Interactive forms feature inset shadows simulating tactile physically-indented components.
* Raised Panels: Containers and UI panels feature soft drop shadows to represent raised control boards.
* Textured Gradients: Panels use dark and light gradients combined with a global fractal SVG noise filter overlay layer (5% opacity in dark mode, 15% opacity in light mode) to replicate concrete industrial materials.
* Typography: Mono-spaced, high-tech engineering typefaces are utilized for operational statistics and KPI data.

---

## Detailed System Modules

### 1. Fleet & Vehicle Tracking
* Dynamic tracking of registration numbers, odometer mileage, acquisition costs, vehicle status, and assigned regions.
* Supported Vehicle Status Engine:
  * `AVAILABLE`: Vehicle is ready and idle for dispatching.
  * `ON_TRIP`: Vehicle is locked and assigned to an active trip.
  * `IN_SHOP`: Vehicle is undergoing repair and locked from dispatching.
  * `RETIRED`: Vehicle is permanently deactivated.

### 2. Driver Registry & Validation
* Driver metadata tracking license numbers, safety scores (scale of 0-100), and availability.
* Strict validation guards prevent suspended or expired drivers from being assigned to any active dispatches.
* Odometer compliance: Logs active vehicle odometer mileage upon route assignment.

### 3. Route Dispatch Board
* Route planning coordinates resolved in real-time using Leaflet.js interactive maps.
* Live status board for trip state tracking (`DRAFT` -> `DISPATCHED` -> `COMPLETED` / `CANCELLED`).
* WebSockets (Socket.io) broadcast real-time location telemetry to all active dashboard clients, eliminating the need for polling.

### 4. Predictive Maintenance Alert Engine
* Scans odometer progression from the database.
* Identifies mileage delta since the last recorded maintenance log for every vehicle:
  * Delta > 10,000 km: Triggers a medium-priority warning alert.
  * Delta > 15,000 km: Triggers a high-priority warning alert requesting immediate service.

### 5. Fuel & Expense Accounting
* Fuel logs calculate vehicle fuel efficiency (km/liter) and costs.
* Categorized operational expenses (Tolls, Parking, Repair, and Miscellaneous).
* Recharts integration plots revenue streams and top vehicle ROI.
* PDF reports use server-side PDFKit generation to export financial audits with standard rupee formatting (`Rs.` and `₹` fallbacks).

### 6. AI Database Assistant
* Connects to a Groq-powered LLM.
* Utilizes database schema context mapping to translate plain text queries (e.g., "Find the vehicle with the highest maintenance cost") into accurate PostgreSQL database lookups, returning natural language answers.

---

## Database Schema

The database relational structure is defined using Prisma ORM. For detailed model specifications, relationships, and schema enums, please refer directly to the [schema.prisma](backend/prisma/schema.prisma) file.

---

## Role-Based Access Control

The platform enforces strict role-based access control (RBAC) across all client routes and backend controllers:

| View / Module | Fleet Manager | Dispatcher | Safety Officer | Financial Analyst |
|---|:---:|:---:|:---:|:---:|
| Operations Dashboard | Yes | Yes | Yes | Yes |
| Fleet Management | Yes | Yes | No | No |
| Driver Management | Yes | Yes | Yes | No |
| Trip Dispatch Board | Yes | Yes | No | No |
| Maintenance Logs | Yes | No | No | No |
| Fuel & Expense Logs | Yes | No | No | Yes |
| Financial Reports | Yes | No | No | Yes |
| System Settings | Yes | No | No | No |

---

## Security Architecture

### Token Storage Strategy
* **Access Tokens**: Short-lived JSON Web Tokens (15 minutes) returned directly in the login response body. These are stored in React application state memory and injected into headers by Axios middleware.
* **Refresh Tokens**: Long-lived secure session tokens (7 days) sent via HTTP response cookies with the `HttpOnly`, `Secure`, and `SameSite=Strict` flags set. This prevents scripts from accessing tokens, securing operations against XSS attacks.

### Multi-Origin CORS Integration
To handle local development port redirection dynamically, the API backend configures CORS rules allowing both standard Vite development ports:
* `http://localhost:5173`
* `http://localhost:5174`

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
   DATABASE_URL="postgresql://username:password@localhost:5432/transitops"
   JWT_SECRET="your_jwt_access_secret_key"
   JWT_REFRESH_SECRET="your_jwt_refresh_secret_key"
   PORT=5000
   FRONTEND_URL="http://localhost:5173"
   EMAIL_USER="your_email@gmail.com"
   EMAIL_PASS="your_gmail_app_password"
   GROQ_API_KEY="your_groq_api_key_here"
   ```

   ### Environment Variables Specifications

   | Variable Name | Purpose | Description & Configuration Guidelines |
   |---|---|---|
   | `DATABASE_URL` | PostgreSQL Connection URI | The connection string specifying host, port, database name, and credentials. Prisma ORM uses this link to sync schemas, perform migrations, and run queries against the PostgreSQL instance. |
   | `JWT_SECRET` | JSON Web Access Token Secret | Cryptographic key utilized to sign short-lived access tokens (15-minute duration). Verified by Express middleware guards to authenticate API endpoints. |
   | `JWT_REFRESH_SECRET` | JSON Web Refresh Token Secret | Cryptographic key used to sign long-lived refresh tokens (7-day duration) stored in secure cookies, allowing users to renew expired sessions seamlessly. |
   | `PORT` | API Server Host Port | The network port the Express application server binds to. All API requests and Socket.io WebSocket connections route to `http://localhost:5000`. |
   | `FRONTEND_URL` | Authorized Client Origin | The origin URL of the Vite React frontend. Backend CORS middleware whitelists this URL to prevent requests from being blocked by web browser origin policies. |
   | `EMAIL_USER` | SMTP Notification Sender Email | The Gmail address utilized by Nodemailer SMTP transport to send automated temporary passwords when resetting dispatch accounts. |
   | `EMAIL_PASS` | SMTP Sender App Password | The secure Google-generated App Password that permits Nodemailer to securely connect and authenticate SMTP requests. |
   | `GROQ_API_KEY` | Groq AI Service API Token | The API authentication key used by the Groq SDK client to query the AI assistant model for natural language database operations. |

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
