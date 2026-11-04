# Comprehensive Codebase Scan & Mobile Developer Architecture Report: Eazzio-School

## Executive Summary
This document provides a complete scan of the **Eazzio-School** codebase tailored specifically for **Mobile App Developers** (React Native, Flutter, Swift/Kotlin). It details the overall repository architecture, folder/file hierarchy, multi-tenant authentication protocols, database models, and the complete REST API surface needed to build Student/Parent, Teacher, and Management mobile apps.

---

## 1. Project Directory & File Structure

```
Eazzio-School/
├── .gitignore
├── PROJECT_DESCRIPTION.md                 # Product specifications, credentials & feature map
├── README.md                              # Setup instructions, demo credentials & project overview
│
├── backend/                               # Express.js REST API & PostgreSQL Engine (Prisma ORM)
│   ├── middleware/
│   │   ├── auth.js                        # JWT validation & Role Guards (Admin, Principal, Teacher, Student, Accountant)
│   │   └── validate.js                    # Zod request validation middleware
│   ├── prisma/
│   │   ├── schema.prisma                  # 14 Relational Models (School, Course, Teacher, Student, Fee, Exam, Timetable, etc.)
│   │   └── seed.js                        # Database seeder (Demo school, teachers, students, invoices)
│   ├── routes/
│   │   ├── accountant.js                  # 20 endpoints: Fee structures, student roster, cash/cheque fee collections
│   │   ├── admin.js                       # 34 endpoints: Superuser management, school staff, fee structure, timetable auto-gen
│   │   ├── auth.js                        # 4 endpoints: Multi-role login, school registration, Razorpay subscription order
│   │   ├── exams.js                       # 17 endpoints: Terms, exams, marks entry, student report cards, exam timetables
│   │   ├── feedback.js                    # 2 endpoints: Remarks between teachers, principals, and students
│   │   ├── notice.js                      # 4 endpoints: Notice CRUD with Multer PDF attachment support & scheduled cron
│   │   ├── principal.js                   # 33 endpoints: Academic oversight, teacher bulk updates, attendance reports
│   │   ├── student.js                     # 13 endpoints: Profile, dues, routine, Razorpay fee payment, results, assignments
│   │   └── teacher.js                     # 11 endpoints: Roll call, class roster, routine, homework assignments
│   ├── utils/
│   │   └── idGenerator.js                 # Auto-generators for schoolCode, employeeId, and studentId
│   ├── validators/
│   │   └── schemas.js                     # Zod input schemas (Login, RegisterSchool, Class, Student, Teacher, Notice)
│   ├── create_admin.js                    # CLI utility to create an initial super admin
│   ├── migrate.js                         # DB migration script
│   ├── prismaClient.js                    # Singleton PrismaClient instance
│   ├── scratch_get_school.js              # Diagnostic helper script
│   ├── server.js                          # Server entrypoint (CORS, JSON limits, static /uploads, notice auto-publish cron)
│   ├── test_timetable.cjs                 # Timetable generation test script
│   └── package.json                       # Dependencies (@prisma/client, bcryptjs, razorpay, jsonwebtoken, zod)
│
└── frontend/                              # Vite + React 19 Web App (Reference for Mobile UI/UX)
    ├── public/                            # Static icons (favicon.png, favicon.svg, icons.svg)
    ├── src/
    │   ├── api/                           # Role-based Axios clients (axios.js, authApi.js, studentApi.js, teacherApi.js, etc.)
    │   ├── assets/                        # Branding images, logos, hero banners
    │   ├── components/                    # UI primitives (DataTable, StatCard, ChartCard, Loader, ProtectedRoute)
    │   ├── context/                       # AuthContext, ThemeContext, ToastContext
    │   ├── pages/
    │   │   ├── Landing.jsx                # Public landing page
    │   │   ├── Login.jsx                  # Single login screen routing to 5 role dashboards
    │   │   ├── RegisterSchool.jsx         # School registration & Razorpay subscription onboarding
    │   │   ├── accountant/                # 8 views (Dashboard, Fees, FeeStructure, Students, Classes, Reports, Settings, Notices)
    │   │   ├── admin/                     # 11 views (Dashboard, Teachers, Students, Courses, Attendance, Timetable, Fees, Reports, Staff, Settings, Notices)
    │   │   ├── principal/                 # 12 views (Dashboard, Teachers, Students, Courses, Timetable, FeesOverview, Attendance, Reports, Settings, Notices)
    │   │   ├── teacher/                   # 8 views (Dashboard, TakeAttendance, AttendanceHistory, MyCourses, Routine, Assignments, Profile, Notices)
    │   │   ├── student/                   # 10 views (Dashboard, MyAttendance, Routine, ExamSchedule, AcademicReport, Assignments, MyFees, MyProfile, Settings, Notices)
    │   │   ├── common/                    # Shared complex view (ExamsAndMarks.jsx)
    │   │   └── shared/                    # Shared feedback view (Feedback.jsx)
    │   ├── utils/                         # excelUtils.js (XLSX export/import)
    │   ├── App.jsx                        # Route table & RBAC route wrapper
    │   ├── main.jsx                       # Entrypoint
    │   └── index.css / App.css            # Tailwind & CSS styling
    ├── tailwind.config.js / postcss.config.js
    ├── vite.config.js / vercel.json
    └── package.json                       # Dependencies (react 19, react-router-dom 7, jspdf, lucide-react, xlsx)
```

---

## 2. Authentication & Tenant Model

### Single-Endpoint Universal Login
- **Endpoint**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "student1@demo.com",
    "password": "password",
    "role": "STUDENT" // Optional: "principal", "teacher", "student", "accountant", "admin"
  }
  ```
  *(Note: The `email` field also accepts `employeeId` or `studentId`)*.
- **JWT Token**: Valid for 24 hours. The payload contains `{ userId, schoolId, role }`.
- **Tenant Isolation**: Backend automatically scopes all database operations using `req.user.schoolId`.
- **Password Reset**: Students change their passwords via `PUT /api/student/change-password` with `{ currentPassword, newPassword }`.

> [!WARNING]
> **Dev Backdoor in Backend**: [`backend/routes/auth.js`](file:///home/rahul-kumar/Desktop/Eazzio-School/backend/routes/auth.js#L67-L70) currently allows login with `'password'` or `'password123'` regardless of hashed password match. Ensure this bypass is disabled before launching to production.

---

## 3. Database Entities (Prisma PostgreSQL)

- **`School`**: Root tenant containing school settings, code, and fee configuration (`feeDueDay`, `allowPartPayment`, `lateFineAmount`).
- **`Student`**: Personal and enrollment records (`studentId`, `rollNumber`, parents' info, `feeCycle`, `courseId`).
- **`Teacher`**: Faculty records, assigned to courses as homeroom teacher or to subjects.
- **`Course` & `CourseSubject`**: Class and section representations with mapped subjects and credit allocations.
- **`Attendance`**: Daily status per student (`PRESENT`, `ABSENT`, `LATE`) with unique constraint on `[studentId, date]`.
- **`Timetable`**: Class weekly schedules mapping period, weekday, subject, teacher, and course.
- **`FeeStructure`, `FeeInvoice`, `FeePayment`**: Complete financial engine with Razorpay support, monthly/quarterly cycles, and receipt IDs.
- **`Exam`, `ExamTimetable`, `Result`**: Academic assessment schedules, term results, grades, and report card metrics.
- **`Assignment`**: Homework posted by teachers with attachments and due dates.
- **`Notice`**: Multi-audience broadcast bulletins (`SCHOOL`, `STAFF`, `TEACHERS`, `STUDENTS`, `COURSE`) with PDF attachments.
- **`Feedback`**: Notes and disciplinary remarks between school personnel and students.

---

## 4. Mobile API Catalog

### A. Student & Parent Module (`/api/student`)
| Endpoint | Method | Payload / Query | Description |
|---|---|---|---|
| `/dashboard-summary` | `GET` | — | Summary of attendance, pending fees, today's schedule & notices |
| `/profile` | `GET` | — | Full student profile including parent details |
| `/profile` | `PUT` | `{ phone, address }` | Update student contact information |
| `/attendance` | `GET` | `?month=&year=` | Monthly attendance records and percentage breakdown |
| `/fees` | `GET` | — | Invoices list with paid/unpaid status and late fines |
| `/fees/create-order` | `POST` | `{ invoiceId }` | Generate Razorpay order for in-app fee payment |
| `/fees/verify-payment` | `POST` | `{ invoiceId, razorpay_payment_id, razorpay_order_id, razorpay_signature }` | Verify payment signature and complete invoice payment |
| `/fees/receipt/:paymentId` | `GET` | `:paymentId` | Fetch receipt information |
| `/routine` | `GET` | — | Weekly class schedule |
| `/results` | `GET` | — | Published exam report cards, marks, and grades |
| `/assignments` | `GET` | — | Class homework assignments and submission deadlines |
| `/notices` | `GET` | — | Targeted announcements for students |
| `/change-password` | `PUT` | `{ currentPassword, newPassword }` | Update student account password |

### B. Teacher Module (`/api/teacher`)
| Endpoint | Method | Payload / Query | Description |
|---|---|---|---|
| `/dashboard-summary` | `GET` | — | Homeroom class stats, pending attendance, schedule for today |
| `/my-classes` | `GET` | — | Classes where the teacher is homeroom or subject faculty |
| `/class-details` | `GET` | `?courseId=` | Student roster for taking attendance |
| `/attendance` | `POST` | `{ courseId, date, records: [{ studentId, status }] }` | Submit daily roll call |
| `/attendance-history`| `GET` | `?courseId=&date=` | Retrieve historical attendance records |
| `/routine` | `GET` | — | Teacher's personal weekly class schedule |
| `/assignments` | `GET` | `?courseId=` | List assignments created by the teacher |
| `/assignments` | `POST` | `{ title, description, courseId, dueDate, attachmentUrl }` | Post new homework assignment |
| `/assignments/:id` | `DELETE`| `:id` | Delete homework assignment |

### C. Exams & Grading Module (`/api/exams`)
| Endpoint | Method | Description |
|---|---|---|
| `/list` | `GET` | List all exams for a course (`?courseId=`) |
| `/marks-sheet` | `GET` | Retrieve marks entry sheet for a given exam & subject |
| `/save-marks` | `POST` | Submit student scores (`{ examId, subject, maxMarks, marks: [{ studentId, marksObtained, grade, remarks }] }`) |
| `/student-report-card/:studentId` | `GET` | Fetch comprehensive term report card |
| `/timetable/list` | `GET` | Fetch published exam schedule / datesheets |

### D. Notices & Communication Module
| Endpoint | Method | Content-Type | Description |
|---|---|---|---|
| `/api/notices` | `GET` | `application/json` | Fetch role-targeted notices |
| `/api/notices` | `POST` | `multipart/form-data` | Publish notice (`title`, `content`, `audience`, `attachment` [PDF]) |
| `/api/feedback` | `GET` | `application/json` | Fetch feedback remarks |
| `/api/feedback` | `POST` | `application/json` | Submit new feedback remark |

---

## 5. Mobile App Engineering Guide

1. **Authentication & Session**:
   - Store the JWT securely using `FlutterSecureStorage` (Flutter) or `expo-secure-store` / `Keychain` (React Native / iOS).
   - Add a global Axios/Dio interceptor adding `Authorization: Bearer <token>`.
   - On HTTP `401` / `403`, clear the token and redirect to Login.
2. **File & Media Handling**:
   - Backend serves static uploads via `http://<API_HOST>:5000/uploads/notices/<filename>`.
   - Use an in-app PDF reader plugin to render notice documents.
3. **Razorpay In-App Payment Flow**:
   - Integrate `razorpay_flutter` or `react-native-razorpay`.
   - Call `/api/student/fees/create-order` -> launch native Razorpay checkout with `order_id` -> forward response signature to `/api/student/fees/verify-payment`.
4. **Push Notifications & Offline Support**:
   - The current backend has no FCM/APNs push notification dispatchers or device token tables; implement a device token registration endpoint for mobile push.
   - For Teacher attendance roll-call in offline areas, implement a local SQLite cache and queue.
