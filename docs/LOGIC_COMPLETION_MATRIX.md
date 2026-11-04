# Logic Completion Matrix: End-to-End User Actions & API Handlers

## 1. Authentication & Session Flow

| User Action | Interactive Widget & Screen | Handler / Controller | Target API Endpoint & Method | Payload / Query | Response Model / State Update | UI Result & Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Select Portal Card** | `_PortalChoiceCard` in `LoginScreen` | `AuthNotifier.selectPortal(role)` | Client State | N/A | Updates `selectedPortal` (Student / Teacher) | Swaps form labels, icons, hints, and credentials synchronously without page navigation. **[Verified]** |
| **Submit Login** | `ElevatedButton` (`Enter Portal`) in `LoginScreen` | `AuthNotifier.login()` | `POST /api/auth/login` | `{ email: loginId, password: password, role: role }` | `LoginResponse` & `AuthUser` saved to `FlutterSecureStorage` | Navigates to `/student` or `/teacher` based on backend returned role. Displays error alert on 401/403. **[Verified]** |
| **Session Restore** | App cold launch (`main.dart`) | `AuthNotifier._restoreSession()` | Reads `FlutterSecureStorage` | Bearer Token | `AuthState(status: authenticated, user: ...)` | Automatically routes authenticated user to portal via GoRouter guards. **[Verified]** |
| **Logout** | Logout button in Profile & Dashboard | `AuthNotifier.logout()` | Client Purge | Bearer Token | Clears `FlutterSecureStorage` & invokes `LocalDatabaseService.clearUserData()` | Resets state and redirects to `/login`. Purges SQLite cached tables. **[Verified]** |

---

## 2. Student Workflows

| User Action | Interactive Widget & Screen | Handler / Controller | Target API Endpoint & Method | Payload / Query | State Update & Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **View Dashboard** | Auto-fetch in `StudentDashboardScreen` | `studentDashboardProvider` | `GET /api/student/dashboard-summary` | Bearer Token | `StudentDashboardData` populated | Renders stat ring, routine, pending fees, notices banner. Handles empty states. **[Verified]** |
| **Filter Attendance** | Filter chips (`All`, `Present`, `Late`, `Absent`) | `StudentAttendanceScreen` setState | `GET /api/student/attendance` | `?month=&year=` | `AttendanceRecord` list filtered | Highlights attendance badges and monthly summary counts. **[Verified]** |
| **View Routine** | Weekday TabBar (Mon–Sat) | `StudentRoutineScreen` | `GET /api/student/routine` | Bearer Token | `Map<String, List<RoutineItem>>` | Displays periods, subjects, time slots, and teacher names. **[Verified]** |
| **View Assignments** | Filter chips (`All`, `Active`, `Overdue`) | `StudentAssignmentsScreen` | `GET /api/student/assignments` | Bearer Token | `List<AssignmentItem>` | Lists tasks with due dates and PDF/attachment links. **[Verified]** |
| **View Exam Datesheets** | Tab 2 in `StudentResultsScreen` | `studentExamTimetablesProvider` | `GET /api/exams/timetable/list` | `?examType=` | `List<ExamTimetableItem>` | Renders datesheet timetable cards with dates, times, and syllabus. **[Verified]** |
| **View Term Results** | Tab 1 in `StudentResultsScreen` | `studentResultsProvider` | `GET /api/student/results` | Bearer Token | `StudentResultGroup` | Displays terminal exams, percentages, and subject marks. **[Verified]** |
| **Pay Fee Invoice** | "Pay Now" on pending invoice in `StudentFeesScreen` | `_handlePayment()` | `POST /api/student/fees/create-order` | `{ invoiceId }` | `orderData` (`orderId`, `amount`, `keyId`) | Opens Razorpay gateway modal. **[Verified]** |
| **Verify Fee Payment** | Gateway callback / "Confirm Payment" | `_verifySimulatedPayment()` | `POST /api/student/fees/verify-payment` | `{ invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` | Updates invoice status to `PAID` | Server verifies HMAC SHA256; refreshes `studentFeesProvider` on success. **[Verified]** |
| **Inspect Fee Receipt** | "Receipt" button on paid invoice | `_viewReceipt()` | `GET /api/student/fees/receipt/:paymentId` | `:paymentId` | Receipt dialog populated | Displays school name, receipt number, date, amount, and transaction ID. **[Verified]** |
| **Edit Phone Number** | Pencil icon in `StudentProfileScreen` | `_showEditPhoneDialog()` | `PUT /api/student/profile` | `{ phone }` | Refreshes `studentProfileProvider` | Updates contact details and shows success SnackBar. **[Verified]** |
| **Change Password** | ListTile in `StudentProfileScreen` | `_showChangePasswordDialog()` | `PUT /api/student/change-password` | `{ currentPassword, newPassword }` | Updates backend hash | Shows success SnackBar; handles invalid current password. **[Verified]** |

---

## 3. Teacher Workflows

| User Action | Interactive Widget & Screen | Handler / Controller | Target API Endpoint & Method | Payload / Query | State Update & Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **View Dashboard** | Auto-fetch in `TeacherDashboardScreen` | `teacherDashboardProvider` | `GET /api/teacher/dashboard-summary` | Bearer Token | `TeacherDashboardData` populated | Displays homeroom stats, class count, teaching schedule. **[Verified]** |
| **Select Class & Date** | Dropdowns in `TeacherAttendanceScreen` | `_selectedClass` & `_selectedDate` | `GET /api/teacher/my-classes` | Bearer Token | Loads student roster | Displays student list with roll numbers and status selectors. **[Verified]** |
| **Mark Attendance** | Status toggle (Present / Late / Absent) | Local attendance map | N/A (Client state) | N/A | Toggles student attendance state | Highlights active button with color feedback. **[Verified]** |
| **Submit Attendance** | "Submit Attendance" button | `_submitAttendance()` | `POST /api/teacher/attendance` | `{ courseId, date, records: [{ studentId, status }] }` | Server 200 OK confirmed | Locks submission and shows success SnackBar. Falls back to SQLite draft if offline. **[Verified]** |
| **Sync Offline Drafts** | Cloud upload icon in AppBar | `_syncOfflineDrafts()` | Replays `POST /api/teacher/attendance` | SQLite cached payload | Deletes draft on success | Syncs queued attendance records upon network reconnection. **[Verified]** |
| **Create Homework** | FloatingActionButton in `TeacherAssignmentsScreen` | `_showCreateAssignmentDialog()` | `POST /api/teacher/assignments` | `{ title, description, courseId, dueDate, attachmentUrl }` | Refreshes `teacherAssignmentsProvider` | Appends assignment to teacher's list; validates due date. **[Verified]** |
| **Delete Homework** | Trash icon with AlertDialog confirmation | `deleteAssignment()` | `DELETE /api/teacher/assignments/:id` | `:id` | Refreshes `teacherAssignmentsProvider` | Confirms destructive action and removes assignment. **[Verified]** |
| **Select Exam to Grade** | Dropdown in `TeacherMarksScreen` | `_loadMarksSheet()` | `GET /api/exams/marks-sheet` | `?courseId=&examId=&subject=` | Loads marks sheet roster | Displays roster rows with score text fields. **[Verified]** |
| **Save Student Marks** | "Save Marks Sheet" button | `_saveMarks()` | `POST /api/exams/save-marks` | `{ courseId, examId, subject, maxMarks, marksData }` | Server confirmation | Validates `0 <= mark <= maxMarks`; records marks on backend. **[Verified]** |
| **View Teaching Routine** | Day tabs in `TeacherRoutineScreen` | `TeacherRepository.getRoutine()` | `GET /api/teacher/routine` | Bearer Token | `Map<String, List<TeacherRoutineItem>>` | Displays periods, class sections, subjects, and room numbers. **[Verified]** |
