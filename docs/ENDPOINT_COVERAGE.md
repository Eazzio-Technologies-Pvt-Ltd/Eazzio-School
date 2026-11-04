# Endpoint Coverage & Mobile Caller Index

## 1. Overview
This document indexes all verified backend endpoints relevant to **Students** and **Teachers**, documenting their exact HTTP paths, allowed roles, mobile repository callers, and status.

---

## 2. In-Scope Endpoint Coverage Index

| HTTP Method | Backend Mounted Route | Allowed Roles | Mobile Caller (Repository & Screen) | Test Coverage | Status |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | Any (`STUDENT`, `TEACHER`, etc.) | `AuthRepository.login()` in `login_screen.dart` | `Shared login screen renders Student and Teacher portal selectors side by side` | **Covered & Verified** |
| `GET` | `/api/student/dashboard-summary` | `STUDENT` | `StudentRepository.getDashboardSummary()` in `student_dashboard_screen.dart` | `StudentDashboardData model handles null and empty fallbacks safely` | **Covered & Verified** |
| `GET` | `/api/student/profile` | `STUDENT` | `StudentRepository.getProfile()` in `student_profile_screen.dart` | Model unit tests | **Covered & Verified** |
| `PUT` | `/api/student/profile` | `STUDENT` | `StudentRepository.updateProfile()` in `student_profile_screen.dart` | Model unit tests | **Covered & Verified** |
| `GET` | `/api/student/attendance` | `STUDENT` | `StudentRepository.getAttendance()` in `student_attendance_screen.dart` | `AttendanceRecord deserialization and fallback values` | **Covered & Verified** |
| `GET` | `/api/student/routine` | `STUDENT` | `StudentRepository.getRoutine()` in `student_routine_screen.dart` | Router & network tests | **Covered & Verified** |
| `GET` | `/api/student/fees` | `STUDENT` | `StudentRepository.getFees()` in `student_fees_screen.dart` | `FeeInvoiceItem pending amount and paid calculations` | **Covered & Verified** |
| `POST` | `/api/student/fees/create-order` | `STUDENT` | `StudentRepository.createRazorpayOrder()` in `student_fees_screen.dart` | Repository suite | **Covered & Verified** |
| `POST` | `/api/student/fees/verify-payment` | `STUDENT` | `StudentRepository.verifyPayment()` in `student_fees_screen.dart` | Repository suite | **Covered & Verified** |
| `GET` | `/api/student/fees/receipt/:paymentId`| `STUDENT` | `StudentRepository.getReceipt()` in `student_fees_screen.dart` | `FeePayment receipt data structure parsing` | **Covered & Verified** |
| `GET` | `/api/student/results` | `STUDENT` | `StudentRepository.getResults()` in `student_results_screen.dart` | `StudentResultGroup terminalExams and generalExams matching backend schema` | **Covered & Verified** |
| `GET` | `/api/exams/timetable/list` | `STUDENT`, `TEACHER`, `ADMIN` | `StudentRepository.getExamTimetables()` in `student_results_screen.dart` | `ExamTimetableItem and ExamTimetableSlot parsing test` | **Covered & Verified** |
| `GET` | `/api/student/assignments` | `STUDENT` | `StudentRepository.getAssignments()` in `student_assignments_screen.dart` | Router & network tests | **Covered & Verified** |
| `PUT` | `/api/student/change-password` | `STUDENT` | `StudentRepository.changePassword()` in `student_profile_screen.dart` | Repository suite | **Covered & Verified** |
| `GET` | `/api/teacher/dashboard-summary` | `TEACHER` | `TeacherRepository.getDashboardSummary()` in `teacher_dashboard_screen.dart` | Router & network tests | **Covered & Verified** |
| `GET` | `/api/teacher/my-classes` | `TEACHER` | `TeacherRepository.getMyClasses()` in `teacher_attendance_screen.dart` | `TeacherClassItem parsing and student roster deserialization` | **Covered & Verified** |
| `GET` | `/api/teacher/class-details` | `TEACHER` | `TeacherRepository.getClassDetails()` in `teacher_attendance_screen.dart` | `TeacherClassItem parsing and student roster deserialization` | **Covered & Verified** |
| `POST` | `/api/teacher/attendance` | `TEACHER` | `TeacherRepository.submitAttendance()` in `teacher_attendance_screen.dart` | `AttendanceRecord deserialization and fallback values` | **Covered & Verified** |
| `GET` | `/api/teacher/attendance-history` | `TEACHER` | `TeacherRepository.getAttendanceHistory()` in `teacher_attendance_screen.dart` | Repository suite | **Covered & Verified** |
| `GET` | `/api/teacher/routine` | `TEACHER` | `TeacherRepository.getRoutine()` in `teacher_routine_screen.dart` | Router suite | **Covered & Verified** |
| `GET` | `/api/teacher/assignments` | `TEACHER` | `TeacherRepository.getAssignments()` in `teacher_assignments_screen.dart` | Repository suite | **Covered & Verified** |
| `POST` | `/api/teacher/assignments` | `TEACHER` | `TeacherRepository.createAssignment()` in `teacher_assignments_screen.dart` | Repository suite | **Covered & Verified** |
| `DELETE`| `/api/teacher/assignments/:id` | `TEACHER` | `TeacherRepository.deleteAssignment()` in `teacher_assignments_screen.dart` | Repository suite | **Covered & Verified** |
| `GET` | `/api/exams/list` | `TEACHER`, `ADMIN`, `PRINCIPAL` | `TeacherRepository.getExams()` in `teacher_marks_screen.dart` | `TeacherExamItem and MarksSheetStudentRow deserialization` | **Covered & Verified** |
| `GET` | `/api/exams/marks-sheet` | `TEACHER`, `ADMIN`, `PRINCIPAL` | `TeacherRepository.getMarksSheet()` in `teacher_marks_screen.dart` | `TeacherExamItem and MarksSheetStudentRow deserialization` | **Covered & Verified** |
| `POST` | `/api/exams/save-marks` | `TEACHER`, `ADMIN`, `PRINCIPAL` | `TeacherRepository.saveMarks()` in `teacher_marks_screen.dart` | `TeacherExamItem and MarksSheetStudentRow deserialization` | **Covered & Verified** |
| `GET` | `/api/notices` | Any Authenticated | `StudentRepository` & `TeacherRepository` in Dashboard screens | Repository suite | **Covered & Verified** |
| `GET` | `/api/feedback` | Any Authenticated | Shared repository services | Repository suite | **Covered & Verified** |
| `POST` | `/api/feedback` | Any Authenticated | Shared repository services | Repository suite | **Covered & Verified** |

---

## 3. Excluded Endpoints (Reason for Exclusion)

| Endpoint Prefix / Path | Reason for Exclusion from Mobile App |
|---|---|
| `/api/admin/*` | Superuser and school administration workflows; restricted to web portal per specifications. |
| `/api/principal/*` | Academic and staff oversight workflows; restricted to web portal per specifications. |
| `/api/accountant/*` | School cash/cheque fee collections, accountant ledger, and offline invoices; restricted to web portal. |
| `POST /api/auth/register-school` | Public onboarding and school registration with Razorpay subscription; web-only workflow. |
| `POST /api/exams/timetable/create` | Exam timetable creation; restricted to `ADMIN` and `PRINCIPAL` roles only. |
| `DELETE /api/exams/timetable/:id` | Exam timetable deletion; restricted to `ADMIN` and `PRINCIPAL` roles only. |
