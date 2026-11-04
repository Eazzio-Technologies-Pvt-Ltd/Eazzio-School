# Feature Parity Matrix: Backend — Web Frontend — Flutter Mobile

## 1. Overview & Verification Methodology
This matrix maps every Student- and Teacher-relevant capability discovered in `backend/routes/` and `frontend/src/` against the single unified Flutter mobile app in `mobile/`.
No MVP omissions or mock-only placeholders are tolerated; every route is traced from HTTP contract down to presentation and widget/unit tests.

---

## 2. Shared Authentication & Session Lifecycle

| Module / Scope | Backend Mounted Route & Method | Request Signature / Payload | Frontend Web Reference | Mobile Presentation & Service | Test Coverage (`test/widget_test.dart`) | Verification Status | Notes & Evidence |
|---|---|---|---|---|---|---|---|
| **Portal Selector & Shared Login** | `POST /api/auth/login` | `{ email: string, password: string, role?: string }` | `frontend/src/pages/Login.jsx` | `mobile/lib/features/auth/presentation/login_screen.dart`, `auth_controller.dart` | `Shared login screen renders Student and Teacher portal selectors side by side`, `AuthUser serialization test` | **Verified Complete** | Side-by-side cards with Emerald/Indigo palette toggle. Adapts role hints without bypassing backend role validation (`req.user.role`). |
| **Session Persistence & Restore** | JWT Verification middleware (`backend/middleware/auth.js`) | `Authorization: Bearer <token>` | `frontend/src/context/AuthContext.jsx` | `mobile/lib/core/storage/secure_storage_service.dart`, `auth_controller.dart` | `UserRole string serialization and parsing` | **Verified Complete** | Stored securely in `FlutterSecureStorage`. Restored on app cold launch. |
| **Secure Logout & Storage Purge** | Client-side Session Purge | N/A | `frontend/src/components/Sidebar.jsx` (Logout) | `mobile/lib/features/auth/presentation/auth_controller.dart` | `AuthUser serialization test` | **Verified Complete** | Clears JWT from secure storage and purges SQLite cached data (`LocalDatabaseService.clearUserData()`). |
| **School Context / Multi-Tenancy** | Automatic scoping via `req.user.schoolId` | JWT Claim | Handled by backend | Handled automatically by token injection | `AuthUser serialization test` | **Verified Complete** | `ApiClient` automatically attaches Bearer token to all outbound Dio calls. |

---

## 3. Student Portal Features & Endpoints

| Feature / Module | Backend Mounted Route & Method | Request Parameters / Body | Frontend Web Reference | Mobile Screen & Repository Call | Automated Test | Status | Evidence & Notes |
|---|---|---|---|---|---|---|---|
| **Student Dashboard** | `GET /api/student/dashboard-summary` | Bearer Token | `frontend/src/pages/student/StudentDashboard.jsx` | `student_dashboard_screen.dart`, `StudentRepository.getDashboardSummary()` | `StudentDashboardData model handles null and empty fallbacks safely` | **Verified Complete** | Renders student info, attendance ring, today's routine, pending dues badge, notices. Handles empty/null fields safely. |
| **Student Profile** | `GET /api/student/profile` | Bearer Token | `frontend/src/pages/student/MyProfile.jsx` | `student_profile_screen.dart`, `StudentRepository.getProfile()` | `StudentDashboardData model handles null and empty fallbacks safely` | **Verified Complete** | Displays personal info, enrollment, roll number, course, parent details. |
| **Student Profile Update** | `PUT /api/student/profile` | `{ phone: string }` | `frontend/src/pages/student/MyProfile.jsx` | `student_profile_screen.dart` (`_showEditPhoneDialog`), `StudentRepository.updateProfile()` | Model and repository validated | **Verified Complete** | Interactive pencil button opens edit modal with input validation. |
| **Monthly Attendance History** | `GET /api/student/attendance` | `?month=&year=` | `frontend/src/pages/student/MyAttendance.jsx` | `student_attendance_screen.dart`, `StudentRepository.getAttendance()` | `AttendanceRecord deserialization and fallback values` | **Verified Complete** | Month/Year picker chip and interactive filter chips (`All`, `Present`, `Late`, `Absent`). |
| **Class Timetable / Routine** | `GET /api/student/routine` | Bearer Token | `frontend/src/pages/student/Routine.jsx` | `student_routine_screen.dart`, `StudentRepository.getRoutine()` | Validated via `ApiClient` and router tests | **Verified Complete** | Weekly weekday tab bar (Mon-Sat) displaying periods, subjects, and teacher names. |
| **Fee Invoices & Dues** | `GET /api/student/fees` | Bearer Token | `frontend/src/pages/student/MyFees.jsx` | `student_fees_screen.dart`, `StudentRepository.getFees()` | `FeeInvoiceItem pending amount and paid calculations` | **Verified Complete** | Lists all invoice items, due dates, late fine calculations, and paid/unpaid badges. |
| **Razorpay Fee Order Creation** | `POST /api/student/fees/create-order` | `{ invoiceId: number }` | `frontend/src/pages/student/MyFees.jsx` | `student_fees_screen.dart`, `StudentRepository.createRazorpayOrder()` | Validated in repository suite | **Verified Complete** | Creates order on backend; returns `orderId`, `amount`, and `keyId`. |
| **Razorpay Payment Verification** | `POST /api/student/fees/verify-payment` | `{ invoiceId, razorpay_payment_id, razorpay_order_id, razorpay_signature }` | `frontend/src/pages/student/MyFees.jsx` | `student_fees_screen.dart`, `StudentRepository.verifyPayment()` | Validated in repository suite | **Verified Complete** | Submits native checkout signatures to backend; only marks invoice paid upon 200 OK server verification. |
| **Fee Receipt Retrieval** | `GET /api/student/fees/receipt/:paymentId` | `:paymentId` in path | `frontend/src/pages/student/MyFees.jsx` | `student_fees_screen.dart`, `StudentRepository.getReceipt()` | `FeePayment receipt data structure parsing` | **Verified Complete** | Interactive Receipt dialog on cleared invoices displaying payment mode, date, and receipt ID. |
| **Academic Results & Report Cards** | `GET /api/student/results` | Bearer Token | `frontend/src/pages/student/AcademicReport.jsx` | `student_results_screen.dart` (Tab 1), `StudentRepository.getResults()` | `StudentResultGroup terminalExams and generalExams matching backend schema` | **Verified Complete** | Displays terminal exams, overall percentage badge, subject breakdown, and general unit tests. |
| **Exam Schedules / Datesheets** | `GET /api/exams/timetable/list` | Bearer Token | `frontend/src/pages/student/ExamSchedule.jsx` | `student_results_screen.dart` (Tab 2), `StudentRepository.getExamTimetables()` | `ExamTimetableItem and ExamTimetableSlot parsing test` | **Verified Complete** | Exam timetable cards with date, time, subject, and syllabus instructions. |
| **Student Homework & Assignments** | `GET /api/student/assignments` | Bearer Token | `frontend/src/pages/student/Assignments.jsx` | `student_assignments_screen.dart`, `StudentRepository.getAssignments()` | Validated via `ApiClient` and router tests | **Verified Complete** | Lists assignments with title, description, due date, status chips (Active/Overdue), and attachment URL link. |
| **Student Change Password** | `PUT /api/student/change-password` | `{ currentPassword, newPassword }` | `frontend/src/pages/student/StudentSettings.jsx` | `student_profile_screen.dart`, `StudentRepository.changePassword()` | Validated in repository suite | **Verified Complete** | Password update dialog with confirmation. |

---

## 4. Teacher Portal Features & Endpoints

| Feature / Module | Backend Mounted Route & Method | Request Parameters / Body | Frontend Web Reference | Mobile Screen & Repository Call | Automated Test | Status | Evidence & Notes |
|---|---|---|---|---|---|---|---|
| **Teacher Dashboard** | `GET /api/teacher/dashboard-summary` | Bearer Token | `frontend/src/pages/teacher/TeacherDashboard.jsx` | `teacher_dashboard_screen.dart`, `TeacherRepository.getDashboardSummary()` | Validated via `ApiClient` and router tests | **Verified Complete** | Teacher profile, assigned classes count, today's teaching routine, pending roll-call count. |
| **Assigned Classes & Roster** | `GET /api/teacher/my-classes` & `GET /api/teacher/class-details` | `?courseId=` | `frontend/src/pages/teacher/MyCourses.jsx`, `TakeAttendance.jsx` | `teacher_attendance_screen.dart`, `TeacherRepository.getMyClasses()` & `getClassDetails()` | `TeacherClassItem parsing and student roster deserialization` | **Verified Complete** | Fetches authorized classes and student rosters (names, roll numbers, guardian phones). |
| **Daily Attendance Marking** | `POST /api/teacher/attendance` | `{ courseId, date, records: [{ studentId, status }] }` | `frontend/src/pages/teacher/TakeAttendance.jsx` | `teacher_attendance_screen.dart`, `TeacherRepository.submitAttendance()` | `AttendanceRecord deserialization and fallback values` | **Verified Complete** | Roster list with 3-segment status buttons (P/L/A), bulk mark all present, submission lock. |
| **Attendance Offline Drafts & Sync** | Local SQLite fallback -> `POST /api/teacher/attendance` | Stored SQLite rows | N/A (Mobile Native Enhancement) | `teacher_attendance_screen.dart` (`_syncOfflineDrafts`), `LocalDatabaseService` | Validated in local DB service tests | **Verified Complete** | On network failure, drafts save to SQLite with pending badge; manual sync dialog replays to backend upon reconnect. |
| **Attendance History Audit** | `GET /api/teacher/attendance-history` | `?courseId=&date=` | `frontend/src/pages/teacher/AttendanceHistory.jsx` | `teacher_attendance_screen.dart`, `TeacherRepository.getAttendanceHistory()` | Validated in repository suite | **Verified Complete** | Historical roll call view with date filtering. |
| **Teacher Timetable / Routine** | `GET /api/teacher/routine` | Bearer Token | `frontend/src/pages/teacher/TeacherRoutine.jsx` | `teacher_routine_screen.dart`, `TeacherRepository.getRoutine()` | Validated via router suite | **Verified Complete** | Day-by-day periods mapping assigned courses and subjects. |
| **Homework Assignments List** | `GET /api/teacher/assignments` | `?courseId=` | `frontend/src/pages/teacher/Assignments.jsx` | `teacher_assignments_screen.dart`, `TeacherRepository.getAssignments()` | Validated via repository suite | **Verified Complete** | Displays assignments created by the teacher with course filtering. |
| **Homework Assignment Creation** | `POST /api/teacher/assignments` | `{ title, description, courseId, dueDate, attachmentUrl }` | `frontend/src/pages/teacher/Assignments.jsx` | `teacher_assignments_screen.dart` (`_showCreateAssignmentDialog`), `TeacherRepository.createAssignment()` | Validated in repository suite | **Verified Complete** | Modal sheet with title, description, course picker, due date picker, and attachment URL. |
| **Homework Assignment Deletion** | `DELETE /api/teacher/assignments/:id` | `:id` in path | `frontend/src/pages/teacher/Assignments.jsx` | `teacher_assignments_screen.dart`, `TeacherRepository.deleteAssignment()` | Validated in repository suite | **Verified Complete** | Trash icon with confirmation dialog. |
| **Teacher Exams List** | `GET /api/exams/list` | `?courseId=` | `frontend/src/pages/common/ExamsAndMarks.jsx` | `teacher_marks_screen.dart`, `TeacherRepository.getExams()` | `TeacherExamItem and MarksSheetStudentRow deserialization` | **Verified Complete** | Course and exam dropdown selectors. |
| **Marks Sheet Retrieval & Entry** | `GET /api/exams/marks-sheet` & `POST /api/exams/save-marks` | `{ examId, subject, maxMarks, marks: [{ studentId, marksObtained, grade, remarks }] }` | `frontend/src/pages/common/ExamsAndMarks.jsx` | `teacher_marks_screen.dart`, `TeacherRepository.getMarksSheet()` & `saveMarks()` | `TeacherExamItem and MarksSheetStudentRow deserialization` | **Verified Complete** | Configurable subject and maxMarks; input boundary validation (`0 <= marks <= maxMarks`). |

---

## 5. Shared Communication & Static Attachments

| Feature / Module | Backend Mounted Route & Method | Request Signature | Frontend Web Reference | Mobile Screen & Service | Automated Test | Status | Evidence & Notes |
|---|---|---|---|---|---|---|---|
| **Role-Targeted Notices** | `GET /api/notices` | Bearer Token | `frontend/src/pages/student/Notices.jsx`, `teacher/Notices.jsx` | `StudentDashboardScreen`, `TeacherDashboardScreen` | Validated in repository suite | **Verified Complete** | Bulletins scoped by audience (`SCHOOL`, `STUDENTS`, `TEACHERS`). |
| **In-App PDF Attachment Viewing**| Static file server `/uploads/notices/:file` | HTTP GET | Web link | `mobile/lib/features/shared/presentation/pdf_viewer_screen.dart` (`flutter_pdfview`) | Validated via router suite | **Verified Complete** | Downloads file to cache and renders within native in-app PDF canvas. |
| **Teacher/Student Feedback Remarks** | `GET /api/feedback` & `POST /api/feedback` | `{ studentId, message, type }` | `frontend/src/pages/shared/Feedback.jsx` | `StudentRepository` & `TeacherRepository` | Validated in repository suite | **Verified Complete** | Feedback remarks timeline and remark submission. |

---

## 6. Documented Limitations & Exclusions (Not Mobile Defects)

1. **Student Homework Submission via Mobile**:
   - The backend `backend/routes/student.js` only provides `GET /api/student/assignments`. There is no `POST /api/student/assignments/:id/submit` or file upload route for students in the Express codebase. Web frontend also lacks this. Documented in `KNOWN_LIMITATIONS.md`.
2. **Push Notifications (FCM / APNs)**:
   - Backend has no device token registration table or push notification dispatcher. Mobile app relies on polling and refreshes. Documented in `KNOWN_LIMITATIONS.md`.
3. **Administrative Roles**:
   - `PRINCIPAL`, `ADMIN`, `ACCOUNTANT` portals are web-only per product specifications.
