# College Queue Management System (CQMS) — REST API Specification

**Base URL**: `/api`  
**Authentication**: Bearer JWT in `Authorization` header (`Authorization: Bearer <token>`)

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "identifier": "student@cqms.edu",
    "password": "student123"
  }
  ```
  *(Accepts email address or College ID)*
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 4,
      "collegeId": "STU-2024-001",
      "name": "Soumyadip Kar",
      "email": "student@cqms.edu",
      "role": "STUDENT",
      "studentId": 1,
      "course": "B.Tech Computer Science & Engineering",
      "semester": "6th Semester",
      "year": 3
    }
  }
  ```

### `GET /api/auth/me`
- **Access**: Authenticated
- **Response (200 OK)**: Returns the current authenticated user's active session profile and counter assignments.

---

## 2. Department & Service Endpoints

### `GET /api/departments`
- **Access**: Authenticated
- **Description**: Returns all active college departments (Library & Fees Office) with open counter counts and current waiting load.

### `GET /api/departments/:id/services`
- **Access**: Authenticated
- **Description**: Returns all active services under a specific department, including live queue size and estimated wait times.

---

## 3. Token Endpoints

### `POST /api/tokens`
- **Access**: Student only (`role: 'STUDENT'`)
- **Request Body**:
  ```json
  {
    "serviceId": 1
  }
  ```
- **Rules**: Enforces one active token per department rule. Rejects duplicate active tokens.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Token LIB-001 generated successfully.",
    "token": {
      "id": 12,
      "tokenNumber": "LIB-001",
      "sequenceNumber": 1,
      "serviceId": 1,
      "serviceName": "Book Issue",
      "departmentId": 1,
      "departmentName": "College Library",
      "departmentCode": "LIB",
      "status": "WAITING",
      "peopleAhead": 0,
      "estimatedWaitMinutes": 0,
      "currentServingToken": "None"
    }
  }
  ```

### `GET /api/tokens/active`
- **Access**: Student only
- **Description**: Retrieves current active tokens (`WAITING`, `CALLED`, `SERVING`) with live position and wait times.

### `GET /api/tokens/history`
- **Access**: Student only
- **Query Params**: `limit` (default 20)
- **Description**: Retrieves historical tokens (`COMPLETED`, `CANCELLED`, `SKIPPED`).

### `POST /api/tokens/:id/cancel`
- **Access**: Student (owns token) or Admin
- **Description**: Cancels a `WAITING` token and removes it from the active queue.

---

## 4. Staff Counter Operations

### `GET /api/staff/assigned-counter`
- **Access**: Staff (`LIBRARY_STAFF` or `FEES_STAFF`)
- **Description**: Retrieves the staff member's assigned counter terminal, current serving token, and FIFO waiting queue.

### `POST /api/counters/:id/toggle-status`
- **Access**: Staff / Admin
- **Request Body**: `{ "status": "OPEN" | "CLOSED" }`
- **Description**: Opens or closes the counter terminal.

### `POST /api/counters/:id/call-next`
- **Access**: Staff
- **Description**: Atomically calls the oldest eligible `WAITING` token in FIFO order for this counter. Transitions token to `CALLED`. Sends in-app turn alert and audio chime to the student.

### `POST /api/tokens/:id/recall`
- **Access**: Staff
- **Description**: Re-notifies a called student who has not yet arrived at the counter.

### `POST /api/tokens/:id/serve`
- **Access**: Staff
- **Description**: Transitions token from `CALLED` to `SERVING`. Records `serving_at` timestamp.

### `POST /api/tokens/:id/complete`
- **Access**: Staff
- **Description**: Transitions token from `SERVING` to `COMPLETED`. Records `completed_at` timestamp and duration.

### `POST /api/tokens/:id/skip`
- **Access**: Staff
- **Request Body**:
  ```json
  {
    "reason": "Student Not Present / No Show"
  }
  ```
- **Description**: Marks the token as `SKIPPED` with an audit reason.

### `GET /api/counters/:id/stats`
- **Access**: Staff / Admin
- **Description**: Retrieves today's completed, skipped, and average service time for this counter.

---

## 5. Admin & Analytics Endpoints

### `GET /api/admin/analytics`
- **Access**: Admin only (`role: 'ADMIN'`)
- **Query Params**:
  - `range`: `today` | `week` | `month` | `custom`
  - `departmentId`: `ALL` | `1` | `2`
- **Returns**: KPIs, department comparison, hourly peak traffic, 7-day trend, counter metrics, service breakdown.

### `GET /api/admin/reports`
- **Access**: Admin only
- **Query Params**:
  - `format`: `json` | `csv`
  - `departmentId`: `ALL` | `1` | `2`
  - `status`: `ALL` | `COMPLETED` | `SKIPPED` | etc.
- **Description**: Returns filterable queue records or generates a direct CSV download.

### `POST /api/admin/services` & `PUT /api/admin/services/:id`
- **Access**: Admin only
- **Description**: Create or edit queue services and average service duration.

### `POST /api/admin/counters` & `POST /api/admin/counters/assign`
- **Access**: Admin only
- **Description**: Create counters and assign staff operators.

---

## 6. Socket.IO Real-Time Events

| Event Name | Direction | Room | Payload Description |
| :--- | :--- | :--- | :--- |
| `join:student` | Client $\to$ Server | N/A | Subscribes student to `student:{id}` |
| `join:counter` | Client $\to$ Server | N/A | Subscribes staff to `counter:{id}` |
| `join:admin` | Client $\to$ Server | N/A | Subscribes admin to `admin:room` |
| `queue:updated` | Server $\to$ Client | Broadcast | Queue moved / new token generated |
| `token:called` | Server $\to$ Client | `student:{id}` | Turn alert with counter name |
| `token:serving` | Server $\to$ Client | `student:{id}` | Service started |
| `token:completed`| Server $\to$ Client | `student:{id}` | Service completed |
| `token:skipped` | Server $\to$ Client | `student:{id}` | Token skipped with reason |
| `counter:status`| Server $\to$ Client | Broadcast | Counter opened / closed |
