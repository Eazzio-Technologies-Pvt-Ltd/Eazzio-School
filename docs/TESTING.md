# Testing & Verification Report

## Automated Test Execution

Run all test suites using:
```bash
flutter test
```

### Test Results Record
```
00:03 +0: UserRole string serialization and parsing
00:03 +1: AuthUser serialization test
00:05 +2: Shared login screen renders Student and Teacher portal selectors side by side
00:05 +3: FeeInvoiceItem pending amount and paid calculations
00:05 +4: AttendanceRecord deserialization and fallback values
00:05 +5: TeacherExamItem and MarksSheetStudentRow deserialization
00:05 +6: TeacherClassItem parsing and student roster deserialization
00:05 +7: StudentDashboardData model handles null and empty fallbacks safely
00:05 +8: StudentResultGroup parses weeklyTests, terminalExams, and generalExams matching backend schema
00:05 +9: ExamTimetableItem and ExamTimetableSlot parsing test
00:05 +10: FeePayment receipt data structure parsing
00:06 +11: LoginScreen renders without overflow on 300px narrow viewport
00:06 +12: LoginScreen renders without overflow on 360px and 390px viewports
00:06 +13: DropdownButtonFormField with long labels does not overflow when isExpanded is true
00:06 +14: All tests passed!
```

### Coverage
1. **Model Parsing & Serialization**:
   - `UserRole.fromString` and `.toServerString` parsing.
   - `AuthUser` deserialization from backend JSON payloads.
   - `FeeInvoiceItem` and `FeePaymentRecord` deserialization, paid/pending dues calculations.
   - `AttendanceRecord` parsing with teacher association and status fallbacks.
   - `TeacherExamItem` and `MarksSheetStudentRow` models for grading workflows.
   - `TeacherClassItem` parsing and student roster deserialization.
   - `StudentDashboardData` model handling empty and null fallbacks safely.
   - `StudentResultGroup` parsing `weeklyTests`, `terminalExams`, and legacy `generalExams`.
   - `ExamTimetableItem` and `ExamTimetableSlot` datesheet parsing.
   - `FeePayment` receipt structure parsing.
2. **Product Requirement Smoke Test**:
   - Verification that the shared initial screen renders `Student Portal` and `Teacher Portal` side by side.
   - Verification that switching between the portal choices dynamically updates the form without navigating out of the screen.
3. **Responsive Viewport & Overflow Regression Tests**:
   - Verification of `LoginScreen` on 300px ultra-narrow viewport without any `RenderFlex` exceptions.
   - Verification of `LoginScreen` on 360px and 390px mobile viewports.
   - Verification of `DropdownButtonFormField` with long item labels preventing overflow when `isExpanded` is true.

---

## Static Code Analysis & Formatting

1. **Formatting**:
   ```bash
   dart format --output=none --set-exit-if-changed .
   ```
   Outcome: Clean (0 files changed, 100% formatted).

2. **Analysis**:
   ```bash
   flutter analyze
   ```
   Outcome:
   ```
   Analyzing mobile...
   No issues found! (ran in 4.3s)
   ```

---

## Chrome Web & Playwright Browser Audit Record

- Web URL: `http://localhost:8080/#/login`
- Tested Viewports:
  - `300px × 600px`: Zero overflows, submit button text flexible with ellipsis.
  - `375px × 667px`: Verified clean layout.
  - `390px × 844px`: Standard mobile layout verified clean.
  - `412px × 915px`: Large mobile layout verified clean.
- Screenshots stored under `mobile/docs/screenshots/`:
  - `login_390x844_clean.png`
  - `login_300x600_fixed.png`
  - `login_375x667.png`
  - `login_412x915.png`

---

## Release APK Build Verification

Run build command inside `mobile/`:
```bash
JAVA_HOME=/usr/lib/jvm/java-1.21.0-openjdk-amd64 flutter build apk --release
```

**Build Outcome**:
- Exit code: `0` (Success)
- Output artifact: `mobile/build/app/outputs/flutter-apk/app-release.apk`
- Artifact size: ~66MB
- Both Student and Teacher portals are bundled together in this single Android application package.
