# Backend – Frontend – Mobile Feature Parity Matrix

## 1. Overview & Scope Definition

This matrix presents a comprehensive three-way verification linking:
1. **Backend Endpoint / Data Contract** (Express.js routes & Prisma schemas)
2. **Web Frontend Workflow** (React JSX pages & API clients)
3. **Mobile Application Screen & Service** (Flutter Flutter Riverpod screens, repositories & tests)

Scope strictly respects the architectural requirement:
- **Portals in Scope**: Student Portal & Teacher Portal
- **Out of Scope for Mobile**: Admin, Principal, Accountant Super Admin portals (read-only verification of shared APIs only).

---

## 2. Parity Coverage Matrix

| Feature / Workflow | Backend Contract | Frontend Workflow | Mobile Implementation | Status | Evidence & Test References |
|---|---|---|---|---|---|
| **Shared Auth: Login & Roles** | `POST /api/auth/login` | `Login.jsx` (`/login`), calls `authApi.login` | `LoginScreen`, `AuthRepository.login`, `AuthController` | **Verified Complete** | Side-by-side cards, JWT storage, role-mismatch protection. Unit & widget tests in `test/widget_test.dart`. |
| **Shared Auth: Session & Token** | JWT Bearer Auth in `middleware/auth.js` | `AuthContext.jsx` with Axios interceptors | `ApiClient`, `SecureStorageService` | **Verified Complete** | Secure storage, 401 interceptor trigger, auth session persistence. |
| **Shared Auth: Clean Logout** | Client token revocation | `AuthContext.jsx` logout | `AuthRepository.logout`, `LocalDatabaseService.clearUserData` | **Verified Complete** | Clears tokens, user profile, and SQLite cached data & offline drafts on sign out. |
| **Student: Dashboard Summary** | `GET /api/student/dashboard-summary` | `StudentDashboard.jsx` (`studentApi.getDashboardSummary`) | `StudentDashboardScreen`, `StudentRepository.getDashboardSummary` | **Verified Complete** | Renders profile, attendance %, dues, today schedule, notices. Regression test in `test/widget_test.dart`. |
| **Student: Profile View & Edit** | `GET /api/student/profile`, `PUT /api/student/profile` | `MyProfile.jsx` (`studentApi.getProfile`, `studentApi.updateProfile`) | `StudentProfileScreen`, `StudentRepository.getProfile`, `updateProfile` | **Verified Complete** | Profile fields, parents' names, class teacher name, phone update modal. |
| **Student: Password Change** | `PUT /api/student/change-password` | `StudentSettings.jsx` (`studentApi.changePassword`) | `StudentProfileScreen` change password modal, `StudentRepository.changePassword` | **Verified Complete** | Verifies current password before setting new password. |
| **Student: Attendance Log** | `GET /api/student/attendance` | `MyAttendance.jsx` (`studentApi.getAttendance`) | `StudentAttendanceScreen`, `StudentRepository.getAttendance` | **Verified Complete** | Statistics overview, status filters (Present, Absent, Late), month/year filter picker. |
| **Student: Weekly Timetable** | `GET /api/student/routine` | `ClassDetails.jsx` (`studentApi.getRoutine`) | `StudentRoutineScreen`, `StudentRepository.getRoutine` | **Verified Complete** | Day-by-day tabbed view (Mon-Sat), period timings, room numbers, teacher names. |
| **Student: Homework / Assignments** | `GET /api/student/assignments` | `Assignments.jsx` (`studentApi.getAssignments`) | `StudentAssignmentsScreen`, `StudentRepository.getAssignments` | **Verified Complete** | Lists assignments, due date status, overdue badge, in-app PDF attachment viewer. |
| **Student: Fees & Invoices** | `GET /api/student/fees` | `MyFees.jsx` (`studentApi.getFees`) | `StudentFeesScreen`, `StudentRepository.getFees` | **Verified Complete** | Invoice breakdown, total dues, pending amount calculations. Tested in `test/widget_test.dart`. |
| **Student: Online Fee Payment** | `POST /api/student/fees/create-order`, `POST /api/student/fees/verify-payment` | `MyFees.jsx` (`studentApi.createOrder`, `verifyPayment`) | `StudentFeesScreen`, `StudentRepository.createFeeOrder`, `verifyPayment` | **Verified Complete** | Server-side Razorpay order generation, signature verification requirement, receipt retrieval. |
| **Student: Payment Receipts** | `GET /api/student/fees/receipt/:paymentId` | `MyFees.jsx` (`studentApi.getReceipt`) | `StudentFeesScreen` receipt modal, `StudentRepository.getReceipt` | **Verified Complete** | Detailed breakdown of school, student, invoice, payment reference, and receipt number. |
| **Student: Results & Report Cards** | `GET /api/student/results` | `AcademicReport.jsx` (`studentApi.getResults`) | `StudentResultsScreen` (Tab 1), `StudentRepository.getResults` | **Verified Complete** | Handles results withholding on pending dues, weekly tests grouped by month, terminal/annual report cards. Tested in `test/widget_test.dart`. |
| **Student: Exam Timetable / Datesheet** | `GET /api/exams/timetable/list` | `ExamSchedule.jsx` (`examApi.getExamTimetables`) | `StudentResultsScreen` (Tab 2), `StudentRepository.getExamTimetables` | **Verified Complete** | Datesheet view for Half-Yearly and Annual exams with slot dates, subjects, timings, and rooms. Tested in `test/widget_test.dart`. |
| **Student: Broadcast Notices** | `GET /api/student/notices` | `Notices.jsx` (`studentApi.getNotices`) | `StudentDashboardScreen` notices list, `PdfViewerScreen` | **Verified Complete** | School and class audience filtering, PDF attachment viewing. |
| **Teacher: Dashboard Summary** | `GET /api/teacher/dashboard-summary` | `TeacherDashboard.jsx` (`teacherApi.getSummary`) | `TeacherDashboardScreen`, `TeacherRepository.getDashboardSummary` | **Verified Complete** | Homeroom status, student count, class attendance %, recent absentees, teaching schedule. |
| **Teacher: Class Rosters** | `GET /api/teacher/my-classes` | `TakeAttendance.jsx` (`teacherApi.getAllMyClasses`) | `TeacherAttendanceScreen`, `TeacherRepository.getMyClasses` | **Verified Complete** | Homeroom and subject classes, roster with student ID, name, and roll numbers. |
| **Teacher: Roll Call Attendance** | `POST /api/teacher/attendance` | `TakeAttendance.jsx` (`teacherApi.saveAttendance`) | `TeacherAttendanceScreen`, `TeacherRepository.submitAttendance` | **Verified Complete** | Roll call marking (Present, Absent, Late), mark all shortcuts, server submission. |
| **Teacher: Offline Attendance & Sync** | N/A (Client SQLite queue) | Web relies on continuous connection | `LocalDatabaseService`, `TeacherAttendanceScreen` offline draft manager | **Verified Complete** | Automatic local SQLite draft fallback on network failure; manual and batch synchronization with server. |
| **Teacher: Weekly Schedule** | `GET /api/teacher/routine` | `TeacherRoutine.jsx` (`teacherApi.getRoutine`) | `TeacherRoutineScreen`, `TeacherRepository.getRoutine` | **Verified Complete** | Tabbed Monday–Saturday teaching periods with course names and room numbers. |
| **Teacher: Post Assignments** | `POST /api/teacher/assignments` | `Assignments.jsx` (`teacherApi.createAssignment`) | `TeacherAssignmentsScreen`, `TeacherRepository.createAssignment` | **Verified Complete** | Target class dropdown, title, description, date picker for due date. |
| **Teacher: Delete Assignment** | `DELETE /api/teacher/assignments/:id` | `Assignments.jsx` (`teacherApi.deleteAssignment`) | `TeacherAssignmentsScreen`, `TeacherRepository.deleteAssignment` | **Verified Complete** | Confirmation dialog before deletion; handles 403 unauthorized if not creator. |
| **Teacher: Grade Exams & Marks Entry** | `GET /api/exams/list`, `GET /api/exams/marks-sheet`, `POST /api/exams/save-marks` | `ExamsAndMarks.jsx` (`examApi.getExamsList`, `getMarksSheet`, `saveMarks`) | `TeacherMarksScreen`, `TeacherRepository.getExams`, `getMarksSheet`, `saveMarks` | **Verified Complete** | Exam selection, subject specification, student score input, validation against max marks. Tested in `test/widget_test.dart`. |
| **Teacher: Register Student** | `POST /api/teacher/students` | `MyCourses.jsx` (`teacherApi.registerStudent`) | Admin/Principal web primary; mobile teacher class roster focuses on daily operations | **Not in mobile scope** | Roster management in mobile focuses on roll call, routine, grading, and assignments. |
| **Notice Publishing & Editing** | `POST /api/notices`, `PUT /api/notices/:id`, `DELETE /api/notices/:id` | Principal notice dashboard | Principal / Admin portal only | **Not in mobile scope** | Explicitly restricted to Principal / Admin on backend (`requirePrincipal`). |
| **Fee Structure Definition** | `POST /api/accountant/*`, `POST /api/admin/*` | Accountant Fee Structure | Accountant / Admin portal only | **Not in mobile scope** | Excluded by mobile scope boundaries. |

---

## 3. Discrepancy & Resolution Summary

1. **Student Exam Datesheet Parity Gap**:
   - Web frontend had `pages/student/ExamSchedule.jsx` pulling from `/api/exams/timetable/list`.
   - Mobile app lacked timetable datesheet visualization under student portal.
   - **Fix**: Implemented `ExamTimetableItem` / `ExamTimetableSlot` models, added `getExamTimetables()` in `StudentRepository`, and integrated a dedicated "Exam Schedules" tab in `StudentResultsScreen`.
2. **Student Receipt Retrieval Gap**:
   - Web frontend enabled invoice receipt downloads via `/api/student/fees/receipt/:paymentId`.
   - Mobile fees screen showed paid status but lacked receipt detail inspection.
   - **Fix**: Added `getReceipt` API in `StudentRepository` and added a "Receipt" action button on paid invoices in `StudentFeesScreen`.
3. **Cross-User Local Data Persistence Risk**:
   - On logout, secure credentials were cleared, but SQLite cached data and drafts were not wiped, risking data leaks if another user signed in on the same device.
   - **Fix**: Added `LocalDatabaseService.clearUserData()` called automatically during `AuthRepository.logout()`.
