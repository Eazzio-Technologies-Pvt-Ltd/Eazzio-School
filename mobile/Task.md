# Mobile App Implementation Plan & Architecture Specification (Task.md)

**Product**: Eazzio-School Mobile App  
**Architecture**: Single Flutter Application (Android & iOS)  
**Portals**: Student Portal & Teacher Portal (Side-by-Side Unified Entry)  
**Backend Reference**: Express.js + Prisma ORM + PostgreSQL (`backend/`)  
**Frontend Reference**: React 19 SPA (`frontend/src/`)  

---

## 1. System Overview & Product Requirements

### 1.1 Non-Negotiable Rules
- **One App, Two Portals**: A single codebase, application package, and APK hosting both **Student** and **Teacher** experiences.
- **Shared Side-by-Side Login**: The launch login screen visibly displays two selectable portal cards: `[ Student Portal ]` and `[ Teacher Portal ]`.
- **Server-Authoritative RBAC**: Portal selection adjusts UI styling and hint placeholders; access to portals is governed strictly by the JWT payload role (`STUDENT` or `TEACHER`) returned by `POST /api/auth/login`.
- **Administrative Boundary**: Management-only roles (`PRINCIPAL`, `ADMIN`, `ACCOUNTANT`) are preserved on the web platform and excluded from mobile.

---

## 2. Backend Logic & API Contract Breakdown

### 2.1 Authentication & Multi-Tenancy (`backend/routes/auth.js`)
- **Login Endpoint**: `POST /api/auth/login`
  - **Payload**: `{ email: string, password: string, role?: string }` (where `email` supports Email, Employee ID, or Student ID).
  - **Success Response**: `{ success: true, data: { token: string, user: { userId, name, loginId, role, schoolId } } }`.
  - **Multi-Tenancy**: The JWT contains `schoolId` which automatically scopes all tenant database queries.

### 2.2 Student Route Family (`backend/routes/student.js`)
- **Dashboard**: `GET /api/student/dashboard-summary`
  - Returns `student` info, `attendance` summary (% present, count), `todayRoutine` schedule, `pendingFees` dues, `recentNotices`, `upcomingExams`.
- **Profile**: `GET /api/student/profile` & `PUT /api/student/profile`
  - Retrieves student details, parent names, roll number, course name. Allows contact updates (`phone`).
- **Attendance**: `GET /api/student/attendance?month=&year=`
  - Returns raw daily attendance logs (`PRESENT`, `ABSENT`, `LATE`) and monthly percentage metrics.
- **Routine**: `GET /api/student/routine`
  - Weekly class timetable mapped by day of the week, period, subject, and teacher.
- **Fees & Razorpay**:
  - `GET /api/student/fees`: Unpaid & paid invoices, due dates, late fine calculations.
  - `POST /api/student/fees/create-order`: Generates Razorpay order `{ invoiceId }` -> returns `{ orderId, amount, currency, keyId }`.
  - `POST /api/student/fees/verify-payment`: Validates Razorpay payment signature `{ invoiceId, razorpay_payment_id, razorpay_order_id, razorpay_signature }`.
  - `GET /api/student/fees/receipt/:paymentId`: Payment receipt details.
- **Exams & Report Cards**:
  - `GET /api/student/results`: Terminal exam marks, overall percentages, report cards, and weekly tests.
  - `GET /api/exams/timetable/list`: Published exam schedules, date sheets, and syllabus instructions.
- **Assignments**: `GET /api/student/assignments`: Homework titles, instructions, due dates, and attachment links.
- **Settings**: `PUT /api/student/change-password`: `{ currentPassword, newPassword }`.

### 2.3 Teacher Route Family (`backend/routes/teacher.js`)
- **Dashboard**: `GET /api/teacher/dashboard-summary`
  - Profile info, assigned courses, today's teaching routine, pending attendance count.
- **Assigned Classes & Roster**: `GET /api/teacher/my-classes` & `GET /api/teacher/class-details?courseId=`
  - Enrolled student list with roll numbers, names, and guardian phone numbers.
- **Daily Attendance Marking**: `POST /api/teacher/attendance`
  - Payload: `{ courseId: number, date: string, records: [{ studentId: number, status: "PRESENT"|"ABSENT"|"LATE" }] }`.
- **Attendance History**: `GET /api/teacher/attendance-history?courseId=&date=`
  - Historical classroom roll-call audit log.
- **Teacher Routine**: `GET /api/teacher/routine`
  - Weekly period schedule across all assigned courses and subjects.
- **Assignments**:
  - `GET /api/teacher/assignments?courseId=`: Created homework assignments.
  - `POST /api/teacher/assignments`: `{ title, description, courseId, dueDate, attachmentUrl }`.
  - `DELETE /api/teacher/assignments/:id`: Deletes homework assignment.
- **Marks Sheet Entry (`backend/routes/exams.js`)**:
  - `GET /api/exams/list?courseId=`: Exams for course.
  - `GET /api/exams/marks-sheet?examId=&subject=`: Student marks table.
  - `POST /api/exams/save-marks`: `{ examId, subject, maxMarks, marks: [{ studentId, marksObtained, grade, remarks }] }`.

### 2.4 Communication (`backend/routes/notice.js` & `feedback.js`)
- **Notices**: `GET /api/notices` (Role-targeted broadcast bulletins with PDF attachments).
- **Feedback**: `GET /api/feedback` & `POST /api/feedback` (Teacher-student feedback remarks).

---

## 3. UI/UX Workflow & Component Mapping (From Web Frontend)

| Feature Area | Frontend Reference Screen | Mobile Implementation Widget / Screen | Mobile UX Adaptation |
|---|---|---|---|
| **Portal Selector & Login** | `frontend/src/pages/Login.jsx` | `lib/features/auth/presentation/login_screen.dart` | Side-by-side cards with emerald/indigo highlights, dynamic field hints |
| **Student Dashboard** | `frontend/src/pages/student/StudentDashboard.jsx` | `lib/features/student/presentation/student_dashboard_screen.dart` | Quick action grid, attendance progress ring, today's schedule carousel |
| **Student Attendance** | `frontend/src/pages/student/MyAttendance.jsx` | `lib/features/student/presentation/student_attendance_screen.dart` | Month/Year date picker chip, status filters (`All`, `Present`, `Late`, `Absent`) |
| **Student Timetable** | `frontend/src/pages/student/Routine.jsx` | `lib/features/student/presentation/student_timetable_screen.dart` | Weekday tabs (Mon-Sat), period cards with teacher names |
| **Student Fees & Checkout** | `frontend/src/pages/student/MyFees.jsx` | `lib/features/student/presentation/student_fees_screen.dart` | Fee invoice cards, late fine badges, native Razorpay bottom sheet, receipt viewer |
| **Student Results & Datesheet**| `frontend/src/pages/student/AcademicReport.jsx` & `ExamSchedule.jsx` | `lib/features/student/presentation/student_results_screen.dart` | Dual tabs: "Report Cards" (terminal grades, marks) and "Exam Schedules" (datesheets) |
| **Student Assignments** | `frontend/src/pages/student/Assignments.jsx` | `lib/features/student/presentation/student_assignments_screen.dart` | Due date status chips (Active/Overdue), attachment URL tap-to-open |
| **Teacher Dashboard** | `frontend/src/pages/teacher/TeacherDashboard.jsx` | `lib/features/teacher/presentation/teacher_dashboard_screen.dart` | Schedule summary, pending roll-call banner, assigned class counts |
| **Teacher Take Attendance** | `frontend/src/pages/teacher/TakeAttendance.jsx` | `lib/features/teacher/presentation/teacher_attendance_screen.dart` | Roster list with 3-segment status buttons (P/L/A), bulk mark all present, offline draft sync |
| **Teacher Assignments** | `frontend/src/pages/teacher/Assignments.jsx` | `lib/features/teacher/presentation/teacher_assignments_screen.dart` | Create assignment bottom sheet with course picker, date picker, delete confirmation |
| **Teacher Marks Entry** | `frontend/src/pages/common/ExamsAndMarks.jsx` | `lib/features/teacher/presentation/teacher_marks_screen.dart` | Course/Exam dropdowns, subject/maxMarks config, student score input with 0..maxMarks validation |
| **Notices & PDF Viewer** | `frontend/src/pages/student/Notices.jsx` | `lib/features/notices/presentation/notices_screen.dart` & `pdf_viewer_screen.dart` | Notice card list, in-app PDF preview (`flutter_pdfview`) |
| **Feedback Remarks** | `frontend/src/pages/shared/Feedback.jsx` | `lib/features/feedback/presentation/feedback_screen.dart` | Chat-bubble style remark timeline, new remark composer |

---

## 4. Mobile Architecture & Technical Stack

```
mobile/
├── lib/
│   ├── core/
│   │   ├── config/app_config.dart          # Environment variables & configurable baseURL
│   │   ├── network/api_client.dart         # Central Dio client, Bearer JWT injector, error interceptors
│   │   ├── router/app_router.dart          # GoRouter configuration with role-based auth guards
│   │   ├── storage/local_database_service.dart # SQLite offline attendance drafts & cached notices
│   │   └── theme/app_theme.dart            # Material 3 typography & dual palette (Emerald/Indigo)
│   ├── features/
│   │   ├── auth/                           # Login screen, side-by-side selector, Riverpod auth notifier
│   │   ├── student/                        # Student dashboard, profile, fees, attendance, results, timetable
│   │   ├── teacher/                        # Teacher dashboard, attendance, assignments, marks entry, timetable
│   │   ├── notices/                        # Notice list & in-app PDF viewer
│   │   └── feedback/                       # Feedback remark timeline & composer
│   └── main.dart                           # ProviderScope bootstrap & initial route setup
├── test/
│   └── widget_test.dart                    # Comprehensive 11-scenario automated test suite
└── docs/                                  # API mapping, matrix, limitations, security reviews
```

---

## 5. Phased Implementation & Verification Tasks

### Phase 1: Foundation & Authentication (Completed & Verified)
- [x] Configure Dio client with base URL configuration dialog for Emulator (`10.0.2.2:5000`) and Local Network.
- [x] Implement secure storage (`FlutterSecureStorage`) for JWT tokens.
- [x] Build shared login screen with side-by-side Student and Teacher portal selectors.
- [x] Enforce server-side role validation on login callback with role-mismatch defense.

### Phase 2: Student Portal Workflows (Completed & Verified)
- [x] Implement Student Dashboard with live metrics from `GET /api/student/dashboard-summary`.
- [x] Implement Student Profile with phone number update dialog via `PUT /api/student/profile`.
- [x] Implement Student Attendance with month/year filtering and status chips.
- [x] Implement Student Weekly Routine with day tabs and period information.
- [x] Implement Student Fee Invoices, Razorpay SDK integration, and receipt viewer.
- [x] Implement Academic Report Cards and Exam Datesheets tabbed view.
- [x] Implement Homework Assignments list with deadline indicators.

### Phase 3: Teacher Portal Workflows (Completed & Verified)
- [x] Implement Teacher Dashboard with daily periods and assigned classes overview.
- [x] Implement Take Attendance with multi-student roll-call toggles and bulk-present shortcut.
- [x] Implement SQLite offline attendance drafts with manual sync modal on network reconnect.
- [x] Implement Teacher Weekly Routine.
- [x] Implement Homework Assignment creation modal with class selector and deletion dialog.
- [x] Implement Teacher Marks Entry sheet with subject specification, max marks constraints, and range validation.

### Phase 4: Shared Communication & PDF Support (Completed & Verified)
- [x] Implement Notice board with audience filtering (`SCHOOL`, `STUDENTS`, `TEACHERS`).
- [x] Implement In-App PDF viewer for notice attachments via `flutter_pdfview`.
- [x] Implement Feedback remarks timeline and submission form.

### Phase 5: QA, Security & Build Packaging (Completed & Verified)
- [x] Code formatting: `dart format .` executed cleanly.
- [x] Static Analysis: `flutter analyze` passing with 0 warnings / 0 errors.
- [x] Automated Unit & Widget Tests: 11 tests passing in `mobile/test/widget_test.dart`.
- [x] Android Release APK: Compiled cleanly at `mobile/build/app/outputs/flutter-apk/app-release.apk` (66MB).
- [x] Documentation: Complete suite maintained in `mobile/docs/`.
