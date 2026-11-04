# Eazzio-School: Complete Mobile Application Implementation Plan (`IMPLEMENTATION_PLAN.md`)

**Product**: One Flutter mobile app containing both the Student Portal and Teacher Portal  
**Primary Target**: Android (with cross-platform architecture)  
**Scope**: Full end-to-end implementation of all Student- and Teacher-relevant capabilities supported by the current backend (`backend/routes/`).  
**Filesystem Boundary**: `mobile/` is the only writable directory. Every other file and directory is strictly READ-ONLY.  

---

## Progress Checklist & Phase Execution Matrix

### Phase 0: Baseline Verification & Environment Sanity
- [x] Inspect `git status --short` and confirm no unintended changes outside `mobile/`.
- [x] Verify Dart code formatting: `dart format --output=none --set-exit-if-changed .` passes cleanly.
- [x] Run static code analysis: `flutter analyze` reports 0 errors and 0 warnings.
- [x] Run automated test suite: `flutter test --reporter expanded` executes with 11/11 tests passing.
- [x] Compile fresh Android release APK: `flutter build apk --release` produces `mobile/build/app/outputs/flutter-apk/app-release.apk` (69.5MB).
- [x] Create `mobile/docs/BASELINE_VERIFICATION.md` documenting verified outputs and timestamps.

### Phase 1: API Contract & Source Traceability Inventory
- [x] Scan `backend/routes/auth.js` for login payload serialization, multi-tenant `schoolId`, and JWT claims.
- [x] Scan `backend/routes/student.js` for all 13 Student endpoints.
- [x] Scan `backend/routes/teacher.js` for all 10 Teacher endpoints.
- [x] Scan `backend/routes/exams.js` for shared marks sheet, report cards, and datesheet endpoints.
- [x] Scan `backend/routes/notice.js` and `feedback.js` for communication workflows.
- [x] Maintain comprehensive coverage matrices in `FEATURE_PARITY_MATRIX.md` and `ENDPOINT_COVERAGE.md`.

### Phase 2: App Foundation & Shared Authentication
- [x] Implement single unified Flutter application with shared initial login screen (`login_screen.dart`).
- [x] Render Student Portal and Teacher Portal selection cards side by side with responsive layout.
- [x] Adapt input field hints, helper text, and theme accents (Emerald for Students, Indigo for Teachers) based on selection.
- [x] Enforce server-authoritative RBAC: user navigation is controlled strictly by the JWT payload role (`req.user.role`).
- [x] Secure token storage via `FlutterSecureStorage` with cold-launch session restoration.
- [x] Complete logout workflow: purges JWT from secure storage and purges SQLite cached data (`LocalDatabaseService.clearUserData()`).
- [x] Central Dio client (`api_client.dart`) with Bearer token injection, configurable base URL, and typed error interceptors.

### Phase 3: Complete Student Portal Workflows
- [x] **Student Dashboard (`student_dashboard_screen.dart`)**:
  - Live summary statistics from `GET /api/student/dashboard-summary` (attendance ring, schedule, pending fees badge, notices).
  - Safe null and empty fallback handling verified via automated tests.
- [x] **Student Profile (`student_profile_screen.dart`)**:
  - Personal information, enrollment IDs, class/course/section, and parent details from `GET /api/student/profile`.
  - In-app modal dialog for contact (`phone`) updates via `PUT /api/student/profile`.
- [x] **Attendance Tracking (`student_attendance_screen.dart`)**:
  - Full history breakdown with month/year date picker chip and interactive filter chips (`All`, `Present`, `Late`, `Absent`).
- [x] **Class Routine / Timetable (`student_routine_screen.dart`)**:
  - Weekly timetable with day tabs (Mon–Sat) mapping periods, subjects, and teacher names.
- [x] **Fees & Online Checkout (`student_fees_screen.dart`)**:
  - Invoice list, due dates, late fine calculations from `GET /api/student/fees`.
  - Backend Razorpay order creation via `POST /api/student/fees/create-order`.
  - Native Razorpay checkout launch with server key ID.
  - Signature submission & verification via `POST /api/student/fees/verify-payment`.
  - Paid invoice receipt modal from `GET /api/student/fees/receipt/:paymentId`.
- [x] **Academic Results & Exam Schedules (`student_results_screen.dart`)**:
  - Dual-tab interface:
    - Tab 1: Terminal report cards, marks obtained, overall percentages, and general unit tests from `GET /api/student/results`.
    - Tab 2: Published exam datesheets and instructions from `GET /api/exams/timetable/list`.
- [x] **Assignments (`student_assignments_screen.dart`)**:
  - Homework list with active/overdue status chips and attachment URL opening.
- [x] **Account Settings**:
  - In-app password change dialog via `PUT /api/student/change-password`.

### Phase 4: Complete Teacher Portal Workflows
- [x] **Teacher Dashboard (`teacher_dashboard_screen.dart`)**:
  - Teaching schedule overview, assigned classes count, and pending roll-call count from `GET /api/teacher/dashboard-summary`.
- [x] **Class Rosters & Attendance Roll Call (`teacher_attendance_screen.dart`)**:
  - Authorized assigned courses from `GET /api/teacher/my-classes` and student roster from `GET /api/teacher/class-details`.
  - 3-segment status buttons (Present/Late/Absent) per student with bulk-mark-present shortcut.
  - Server submission to `POST /api/teacher/attendance` with duplicate submission lock.
- [x] **Offline Attendance Drafts & Sync (`LocalDatabaseService`)**:
  - Automatic draft persistence to local SQLite upon network interruption.
  - Pending badge indicator and manual sync dialog to replay drafts upon reconnection.
- [x] **Attendance History (`teacher_attendance_screen.dart`)**:
  - Historical audit log with date filtering via `GET /api/teacher/attendance-history`.
- [x] **Teacher Routine (`teacher_routine_screen.dart`)**:
  - Weekly schedule across all assigned courses and periods from `GET /api/teacher/routine`.
- [x] **Assignments Management (`teacher_assignments_screen.dart`)**:
  - Assignment list with course filter from `GET /api/teacher/assignments`.
  - Creation modal dialog via `POST /api/teacher/assignments` (title, description, course picker, due date picker, attachment URL).
  - Deletion dialog with confirmation via `DELETE /api/teacher/assignments/:id`.
- [x] **Marks Sheet Entry (`teacher_marks_screen.dart`)**:
  - Course and exam dropdown selectors from `GET /api/exams/list`.
  - Subject and maximum marks configuration controls.
  - Student marks sheet entry with client-side range boundary validation (`0 <= mark <= maxMarks`).
  - Submission to `POST /api/exams/save-marks`.

### Phase 5: Shared Communication, Attachments & Local Data
- [x] Role-targeted notices board from `GET /api/notices` with audience badges (`SCHOOL`, `STUDENTS`, `TEACHERS`).
- [x] In-app PDF viewer via `flutter_pdfview` in `pdf_viewer_screen.dart` for notice attachments.
- [x] Feedback remarks timeline and remark submission dialog via `GET /api/feedback` and `POST /api/feedback`.
- [x] Secure local data scoping preventing cross-user data leakage across account switches.

### Phase 6: Testing, Quality Assurance & Release Packaging
- [x] Format checks: `dart format .` passing with 0 changes.
- [x] Static analysis: `flutter analyze` passing with 0 errors and 0 warnings.
- [x] Automated unit and widget tests: 11 tests passing via `flutter test --reporter expanded`.
- [x] Fresh Android release APK built at `mobile/build/app/outputs/flutter-apk/app-release.apk` (69.5MB).
- [x] Full documentation suite verified and maintained in `mobile/docs/`.
