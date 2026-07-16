# 🎓 EduSphere: AI-Assisted Student Management System

EduSphere is a modern, premium, role-based school enterprise resource planning (ERP) commercial prototype. Designed with a dark glassmorphism interface, it streamlines administrative workflows, enables teachers to manage classroom rolls, allows students to track billing and academic presence, and employs AI-assisted operational insights to flag low attendance and fee dues risks.

---

## ✨ Key Features

### 🛡️ Principal Workspace
*   **Administrative Dashboard**: Unified analytics grid displaying total enrollment, active staff, live attendance counts (present/absent today), pending fees, and monthly fee collections.
*   **AI-Assisted Operational Insights**: Automated rule engines flagging attendance risks (under 75%), outstanding invoice ledgers, and recent absence trend warnings.
*   **Registry Systems**: Responsive management systems to add and monitor student registry logs and faculty classroom assignments.
*   **Tabbed Audits & Reports**: Visual vertical comparisons of class-wise attendance rates, collection indicators, and exportable CSV enrollment directories.
*   **Quick Action Shortcuts**: Direct focal redirects to key portal features (Add Student, Add Teacher, View Dues, Audit Attendance).

### 👩‍🏫 Faculty Workspace
*   **Roster Overview**: Direct lookup of classroom sizes, class attendance averages, and a feed of recent absentees.
*   **Roll Call Sheet**: Interactive present/absent roll toggle check sheets with "Select All Present" triggers, submission warnings, overwrite safeguards, and modal verification prompts.
*   **Historical Logs**: Aggregated class logs showing attendance roll rollups by date (students registered, present counts, absent counts, rates).

### 🎒 Student Workspace
*   **Overview Dashboard**: Radial attendance goal progress gauges, announcements bulletin boards, and term accounts ledger details.
*   **Attendance Ledger**: Complete rolls record sheets with month-by-month progress comparisons.
*   **Tuition Ledger**: Detailed balances card showing total dues, payment statuses, and transaction details, alongside an online payment gateway sandbox drawer popup.

### 🔒 Enterprise Security
*   **Authentication Route Guards**: Secure JWT access tokens storing session contexts, mapped to sub-profile IDs, and matching allowed role checks (PRINCIPAL, TEACHER, STUDENT).
*   **Token Expiry & Cleanup**: Global interceptors checking credential validity, logging out inactive sessions, and wiping localStorage tokens.

---

## 🛠️ Tech Stack

*   **Frontend**: React.js, Vite, React Router DOM (v6), Axios Clients
*   **Backend**: Node.js, Express.js REST API
*   **Database & ORM**: PostgreSQL with Prisma ORM
*   **Authentication**: JSON Web Tokens (JWT), bcryptjs
*   **UI & Theme**: Vanilla CSS (Responsive Flex/Grid layouts, Dark Mode Glassmorphism)

---

## 🔑 Demo Credentials Matrix

All seeded accounts share the password: **`123456`**

| Portal Role | Username / Email | Assigned Context |
| :--- | :--- | :--- |
| **Principal / Admin** | `principal@demo.com` | Full Administrative & Audits Control |
| **Teacher 1** | `teacher1@demo.com` | Assigned Class: `Grade 10-A` |
| **Teacher 2** | `teacher2@demo.com` | Assigned Class: `Grade 10-B` |
| **Teacher 3** | `teacher3@demo.com` | Assigned Class: `Grade 9-A` |
| **Student 1** | `student1@demo.com` | Class: `Grade 10-A` (PAID Tuition) |
| **Student 12** | `student12@demo.com` | Class: `Grade 10-B` (PENDING Tuition | Attendance Risk) |
| **Student 25** | `student25@demo.com` | Class: `Grade 9-A` (PAID Tuition) |

---

## 🚀 Setup & Execution Guide

### 1. Repository Installation
Clone the monorepo, and install packages for both sub-folders:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Migration & Seeding
Configure your environment variables by copying `backend/.env.example` to `backend/.env` and setting your connection string `DATABASE_URL`. Then run migration scripts and seed the database:
```bash
cd backend

# Push the schema changes to the database
npx prisma db push

# Seed the demo dataset (Admins, Teachers, 25 Students, 10 Weekdays logs)
npm run db:seed
```

### 3. Running Local Servers
Start backend and frontend development tasks in separate terminals:
*   **Backend REST API (Port 5000)**:
    ```bash
    cd backend
    npm run dev
    ```
*   **Frontend Client Client (Port 5173)**:
    ```bash
    cd frontend
    npm run dev
    ```

---

## 🧪 E2E Demo Walkthrough Flow

Launch your browser to **`http://localhost:5173/`**.

### Flow 1: Principal Operations
1.  Click the **💼 Principal** Quick Access Badge at the bottom of the Login form to autofill credentials, then click **Sign In**.
2.  Redirection lands on `/principal/dashboard`. Confirm the 6 analytics cards (Students, Teachers, Present/Absent Today, Outstanding Fees, Monthly Collections) and inspect the **AI Operational Insights** panel.
3.  Click **Add Student** Quick Action. The viewport scrolls smoothly to the registration card and focuses the name input.
4.  Navigate to **Reports**: Click through tabs to examine Class-wise CSS bar charts, fee breakdowns, and risk warning rosters.
5.  Click **Sign Out**.

### Flow 2: Classroom Attendance Logging
1.  Click the **👩‍🏫 Teacher** Quick Access Badge (`teacher1@demo.com`), and sign in.
2.  Go to **Take Attendance** tab:
    *   Change the date. A yellow warning alert pops up indicating "Attendance has already been logged for this date. Submitting again will overwrite records."
    *   Change the class dropdown. An informational info banner appears for demo classrooms.
    *   Toggle student sliders or click **✓ Select All Present** to instantly check all boxes.
    *   Click **Submit Attendance**, and click **Confirm Submit** in the checkout modal.
3.  Go to **Roster History**: Check daily class roll rollups detailing present count, absent count, and computed rates.
4.  Sign out.

### Flow 3: Student Portal Audits
1.  Click the **🎒 Student** Quick Access Badge (`student1@demo.com`), and sign in.
2.  Examine the radial progress attendance goal gauge and announcements feed.
3.  Go to **My Attendance**: Check the month-by-month attendance statistics and roll checklists.
4.  Go to **My Fees**: View invoice balances, click **💳 Pay Online** to launch the sandbox checkout form, and click pay to trigger confirmation alerts.
5.  Sign out.

---

## 🎯 API Integration Testing
The project includes a REST API integration suite that acts as an automated mock walkthrough, testing registrations, classroom rolls, and summaries. To run tests, execute inside the `backend` directory:
```bash
node test-api.js
```

---

## 🔮 Future Development Roadmap
1.  **AI Timetable Generation**: Automated engine balancing period frequency, teacher workload limits, and subject weight.
2.  **Academic Examinations & Results Ledger**: Dynamic report cards publishing grade books directly to the student portal.
3.  **Parent Workspace Portal**: Read-only portal for parents to monitor attendance alerts and due balances.
4.  **Instant Notifications Feed**: Webhook messaging triggers via SMS/Email for low attendance warnings.
5.  **Gateway Payment Cleared Integrations**: Fully functional Stripe/PayPal SDK payment drawers.
6.  **Multi-School SaaS Tenant Architecture**: Secure isolation scheme to support multiple institutional instances under one tenant domain.
