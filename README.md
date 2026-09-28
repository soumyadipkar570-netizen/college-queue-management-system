# College Queue Management System (CQMS)
### 📚 College Library + 💳 Fees Payment Office

A modern, production-style, responsive full-stack digital queue management web application built strictly to the specifications of the CQMS PRD, LQMS Architecture, and Fees Payment Architecture documents.

---

## 1. Project Overview & Scope

The **College Queue Management System (CQMS)** replaces congested physical lines with transparent, real-time digital queues for two high-traffic college administrative facilities:
1. **College Library (LQMS)**: Book Issue, Book Return, Book Renewal, Fine / Overdue Queries, and Library Card Help (`LIB-XXX`).
2. **Fees Payment Office (FQMS)**: Semester Fee Payment, Receipt Collection, Payment Verification, Due / Fine Queries, and Scholarship Inquiries (`FEE-XXX`).

> **MVP Scope Boundary Note:**  
> The Fees Payment Office module manages digital queues, service counters, verification, and receipt desks. It is strictly a **queue management engine** and does **not** process online monetary payments via external gateways in the MVP.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Axios, Socket.IO Client, Lucide React, Recharts
- **Backend**: Node.js, Express.js, Socket.IO, `mysql2/promise` (connection pooling with transaction locks), JWT (`jsonwebtoken`), bcryptjs, cors, dotenv
- **Database**: MySQL 8.0+ (strictly relational schema, foreign key constraints, indexes, audit logging)
- **Audio Chime**: Web Audio API synthesizer for instant in-browser turn alerts when tokens are called

---

## 3. Demo Credentials (For Evaluation & Viva)

| Persona | Role | Email / Login ID | Password | College / Employee ID |
| :--- | :--- | :--- | :--- | :--- |
| **Demo Student 1** | `STUDENT` | `student@cqms.edu` | `student123` | `STU-2024-001` (Soumyadip Kar) |
| **Demo Student 2** | `STUDENT` | `student2@cqms.edu` | `student123` | `STU-2024-002` (Ananya Sen) |
| **Library Staff** | `LIBRARY_STAFF` | `library@cqms.edu` | `library123` | `LIB-STAFF-01` (Rajesh Sharma) |
| **Fees Staff** | `FEES_STAFF` | `fees@cqms.edu` | `fees123` | `FEE-STAFF-01` (Priya Patel) |
| **System Admin** | `ADMIN` | `admin@cqms.edu` | `admin123` | `ADM-001` (Dr. Amit Roy) |

*The login page also features a **Quick Persona Switcher** for one-click fast login during presentations.*

---

## 4. Key Workflows & State Machine

### Token Lifecycle
$$\text{WAITING} \xrightarrow{\text{Call Next}} \text{CALLED} \xrightarrow{\text{Start Serving}} \text{SERVING} \xrightarrow{\text{Complete}} \text{COMPLETED}$$
- $\text{WAITING} \xrightarrow{\text{Cancel by Student}} \text{CANCELLED}$
- $\text{CALLED} \xrightarrow{\text{Skip + Reason}} \text{SKIPPED}$
- $\text{SKIPPED} \xrightarrow{\text{Recall}} \text{CALLED}$

### Wait-Time Estimation Formula
$$\text{Approximate Wait Time} = \frac{\text{People Ahead in Queue} \times \text{Average Service Time}}{\text{Active Open Counters}}$$
- Automatically falls back to configured service average if historical transactions are $< 3$.
- Clearly marked on student screens as **"Approximate waiting time"**.

---

## 5. Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+) running locally on port `3306`

### Step 1: Configure Database Environment
Edit `server/.env` with your local MySQL credentials:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cqms_db
JWT_SECRET=cqms_super_secret_jwt_key_2026_secure!
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Step 2: Initialize Schema & Seed Data
Run the automated seed runner from the root directory:
```bash
npm run seed
```
This executes `database/schema.sql`, applies `database/seed.sql`, hashes passwords using bcrypt, initializes staff counter assignments, and sets up today's daily queues.

### Step 3: Run the Application

#### Option A: Run Full-Stack with Unified Server (Recommended)
```bash
# 1. Build client assets
npm run build

# 2. Start server (serves API + Socket.IO + React frontend on port 5000)
npm run server
```
Open **`http://localhost:5000`** in your browser.

#### Option B: Run in Development Mode (Vite Hot-Reload)
In terminal 1:
```bash
npm --prefix server run dev
```
In terminal 2:
```bash
npm --prefix client dev
```
Open **`http://localhost:5173`** in your browser.

---

## 6. End-to-End Demo Scenario (Evaluation Walkthrough)

1. **Student Queue Creation**:
   - Open browser tab $\to$ Log in as **Demo Student** (`student@cqms.edu` / `student123`).
   - Click **💳 Fees Payment Office**.
   - Select **Semester Fee Payment** $\to$ Click **Get Token**.
   - Token **`FEE-001`** is generated. The live active token card shows:
     - Token Number: `FEE-001`
     - Status: `WAITING`
     - People Ahead: `0`
     - Approximate wait time: `~8 min`

2. **Staff Real-Time Counter Control**:
   - Open a second (incognito) window $\to$ Log in as **Fees Staff** (`fees@cqms.edu` / `fees123`).
   - Notice the terminal displays **Fees Counter 1 (Payment & Receipts)** in `OPEN` state with `FEE-001` visible in the FIFO waiting queue.
   - Click **[ CALL NEXT TOKEN ]**.

3. **Instant Live Push & Turn Alert**:
   - Return to the Student window. Without refreshing, the student dashboard:
     - Plays an audible two-tone audio chime (`587Hz` $\to$ `880Hz`).
     - Pops up a prominent alert: **"🔔 YOUR TURN NOW! Token FEE-001: Please proceed immediately to Fees Counter 1"**.
     - Token status badge transitions to glowing **CALLED**.

4. **Service Progression & Completion**:
   - In the Fees Staff terminal, click **[ START SERVING ]** $\to$ Status becomes **SERVING**.
   - Click **[ COMPLETE ]** $\to$ Confirms completion.
   - The student view updates to **COMPLETED** and moves the token to their past history table.

5. **Repeat for Library**:
   - Log in as student $\to$ Generate **`LIB-001`** for Book Return.
   - Log in as **Library Staff** (`library@cqms.edu` / `library123`) at **Library Counter 1** $\to$ Call Next, Recall, or Skip with reason.

6. **Admin Dashboard & Analytics**:
   - Log in as **System Admin** (`admin@cqms.edu` / `admin123`).
   - View real-time KPIs: Total Tokens, Waiting Now, Completed, Skipped, and Average Wait time.
   - Inspect interactive Recharts charts:
     - Hourly peak traffic distribution
     - 7-day volume trends
     - Counter performance metrics
     - Service category popularity breakdown
   - Go to **Queue History & Reports** $\to$ Click **[ Export to CSV ]** to download the complete audit spreadsheet.
   - Manage services, create new counters, assign staff operators, and inspect audit logs.

---

## 7. Project Folder Structure

```
college-qms/
├── client/
│   ├── src/
│   │   ├── api/          # Axios instance and request/response interceptors
│   │   ├── components/   # Reusable components (Navbar, StatusBadge, Modals, Toasts)
│   │   ├── context/      # AuthContext & SocketContext (real-time listeners + audio chime)
│   │   ├── pages/        # Role-based pages (Student, Library Staff, Fees Staff, Admin)
│   │   ├── routes/       # Protected routes with server-side and client-side guards
│   │   └── utils/        # Web Audio API sound synthesizer
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/       # MySQL pool configuration & environment variables
│   │   ├── controllers/  # Route handlers (auth, tokens, counters, queues, admin)
│   │   ├── middleware/   # JWT verification, role authorization, safe error handler, audit logger
│   │   ├── routes/       # Express REST API routes
│   │   ├── services/     # Core Queue engine, wait time calculator, notification service
│   │   ├── sockets/      # Socket.IO room manager and live event emitters
│   │   ├── scripts/      # Automated seed runner
│   │   └── server.js     # Main HTTP, Socket.IO & SPA server
│   └── package.json
├── database/
│   ├── schema.sql        # Relational MySQL DDL
│   └── seed.sql          # Seed data for departments, services, counters & rules
├── docs/
│   ├── API.md            # REST API Specification
│   └── ERD.md            # Entity-Relationship Diagram in Mermaid
├── README.md             # Complete documentation and setup guide
└── package.json
```

---

## 8. Viva & Examination Highlights

- **Relational Integrity**: Built on MySQL with foreign keys, transactional locking (`FOR UPDATE`) for concurrency-safe token generation, preventing race conditions or duplicate token sequence numbers.
- **Strict Role-Based Access Control**: Student accounts can never call staff/admin APIs. Library staff are restricted to Library queues; Fees staff are restricted to Fees Payment queues.
- **Real-Time Push Architecture**: Powered by Socket.IO rooms (`student:{id}`, `counter:{id}`, `dept:{code}`, `admin:room`). Students and staff never need to manually refresh their browser.
- **Audio Chime Feedback**: Web Audio API generates an instant, reliable synthesized chime on turn call without relying on external assets.
- **Production-Ready UX**: Includes loading states, empty states, confirmation modals, reason captures for skipped tickets, and CSV export.
