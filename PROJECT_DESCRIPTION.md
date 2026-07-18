# Eazzio School Management System

Eazzio School is a modern, multi-tenant educational management platform designed to centralize and streamline the administrative, academic, and financial operations of multiple schools within a single system. The platform offers a secure, role-based architecture ensuring data privacy across different institutions while providing distinct, customized experiences for School Administrators, Principals, Accountants, Teachers, and Students.

## 🚀 Tech Stack

The platform is built using a robust, modern Javascript/Typescript ecosystem.

### Frontend
*   **Core Library**: React 19
*   **Build Tool**: Vite (Lightning-fast HMR and optimized production builds)
*   **Routing**: React Router DOM (v7)
*   **Styling**: Tailwind CSS (v3.4 / v4 paradigm) for utility-first responsive design
*   **Icons**: Lucide React
*   **Data Handling**: 
    *   `axios` for API communication with automated token interceptors.
    *   `xlsx` for client-side parsing and generation of CSV/Excel bulk imports and exports.

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js (RESTful API architecture)
*   **Security & Authentication**: 
    *   `jsonwebtoken` (JWT) for stateless session management.
    *   `bcryptjs` for secure password hashing.
*   **File Uploads**: `multer` for handling multipart/form-data.
*   **Payments**: Razorpay SDK integration for fee processing.

### Database
*   **Database Engine**: PostgreSQL (Hosted on Neon.tech serverless platform)
*   **ORM**: Prisma (v5.14) for type-safe database queries, schema migrations, and relational modeling.

## 🏛️ Architecture & Role-Based Access Control (RBAC)

The system relies on a rigid RBAC model. Every API request is guarded by JWT middleware that authenticates the user and authorizes access based on their exact role and `schoolId`, ensuring complete data isolation between different schools (multi-tenancy).

1.  **Admin (`Admin`)**: Global oversight of a specific school. Can manage principal accounts, oversee high-level configurations, and monitor system health.
2.  **Principal (`Principal`)**: The core academic manager. Manages teachers, students, courses, global attendance metrics, and broad school communications (Notices).
3.  **Accountant (`Accountant`)**: Financial controller. Exclusively handles fee structures, invoice generation, payment processing, and financial reporting.
4.  **Teacher (`Teacher`)**: Academic executor. Manages their specific assigned courses, takes daily student attendance, and views student academic profiles.
5.  **Student (`Student`)**: The end-user. Accesses their personal dashboard to view attendance records, fee payment status, course details, and school notices.

## 🗄️ Database Schema Details

The database is highly relational, utilizing PostgreSQL capabilities via Prisma.

*   **`School`**: The root tenant model. Contains `schoolName`, `schoolCode` (unique identifier), `subscriptionStatus`, and contact info. Every other entity belongs to a `School`.
*   **`Admin`, `Principal`, `Accountant`**: Dedicated models for administrative roles, linked to a specific `schoolId`.
*   **`Teacher`**: Contains `employeeId`, personal info, and links to an `assignedCourse`.
*   **`Course`**: Replaced the legacy "Class" structure. Represents an academic group (e.g., "Grade 10 - Section A"). Linked to a specific `Teacher` (Class Teacher) and contains multiple `Students`.
*   **`Student`**: Contains `studentId`, `rollNumber`, and is linked to a specific `Course`.
*   **`Attendance`**: Granular daily tracking. Links a `Student`, a `date`, and an `AttendanceStatus` (`PRESENT`, `ABSENT`, `LATE`).
*   **`Timetable`**: Manages the schedule, linking a `Course`, a `Teacher`, `dayOfWeek`, `period`, and `subject`.
*   **`FeeStructure`**: Defines reusable fee templates (e.g., "Tuition Fee - $500") for the school or a specific course.
*   **`FeeInvoice`**: A generated bill for a specific `Student`. Tracks the `amount`, `dueDate`, and `status` (`PENDING`, `PAID`, `OVERDUE`).
*   **`FeePayment`**: A transactional record of money paid against a specific `FeeInvoice`.
*   **`Notice`**: System-wide or targeted announcements. Uses the `NoticeAudience` enum to target the entire `SCHOOL`, specific `COURSE`, `TEACHERS`, or `STUDENTS`.

## ✨ Core Features & Implementations

*   **Multi-Tenancy via `schoolId`**: Every database query implicitly filters by the authenticated user's `schoolId`, ensuring cross-contamination of data is impossible.
*   **Intelligent Routing**: The frontend uses an Axios interceptor to globally catch `401 Unauthorized` responses and redirect users to the login portal.
*   **Bulk Student Operations**: The Principal and Accountant dashboards feature native CSV/Excel drag-and-drop zones. The system parses the spreadsheet, validates the data, and utilizes backend UPSERT logic to instantly register or update hundreds of students simultaneously.
*   **Real-time Financial Tracking**: Financial dashboards aggregate `FeeInvoice` and `FeePayment` relations in real-time, instantly calculating total revenue, pending balances, and overdue accounts without the need for manual batch processing.
*   **Vercel-Ready SPA Routing**: Fully configured for modern cloud deployment. A `vercel.json` rewrite rule is integrated to ensure React Router handles deep linking and page refreshes natively without throwing `404 Not Found` errors.
