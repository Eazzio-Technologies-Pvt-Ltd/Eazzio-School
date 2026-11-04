# Eazzio-School Mobile Application

Native Flutter mobile application built for **Eazzio-School**, delivering a unified experience with **ONE single app**, **ONE shared login screen**, and **TWO role-based portals (Student Portal & Teacher Portal)**.

---

## 1. Key Architectural Decisions

- **Single Application Package**: Both Student and Teacher portals are housed inside a single Flutter mobile app (`mobile/`). No multiple APKs, independent app installations, or competing packages.
- **Shared Login Screen with Side-by-Side Selector**:
  - The login screen presents `Student Portal` and `Teacher Portal` side by side with responsive touch targets and dynamic styling.
  - Toggling between them adapts the input hints and role parameters while maintaining an unified brand identity.
- **Role Guards & JWT Security**:
  - Tokens and authenticated user states are saved in `FlutterSecureStorage`.
  - `GoRouter` prevents students from accessing teacher routes and teachers from accessing student views.
  - Permissions are strictly validated against the server-verified JWT claims (`role`, `schoolId`, `userId`), not solely on client preferences.
- **Offline Drafts & Local SQLite Support**:
  - `sqflite` database handles local caching of student records and teacher attendance drafts when network requests fail.
- **In-App Document Viewing**:
  - PDF attachments for school notices and assignment briefs are rendered using native PDF viewer integrations.
- **State Management**:
  - `flutter_riverpod` provides clean dependency injection, reactive states, and separation of concern across models, repositories, and UI.

---

## 2. Prerequisites & Requirements

- **Flutter SDK**: `>=3.0.0` (Tested on Flutter 3.44.x, Dart 3.12.x)
- **Node.js**: `v18+` (For running the Express backend)
- **PostgreSQL**: Local or hosted PostgreSQL database running with Prisma migrations

---

## 3. Configuration & Running the Application

### A. Environment Configuration
The application supports a dynamic and configurable backend API URL. By default, it targets the standard Android Emulator loopback:
```dart
http://10.0.2.2:5000/api
```

You can customize the base URL directly in the app at runtime via the **Settings** icon on the top right of the Login screen, or by updating `lib/core/config/app_config.dart`.

Address mappings:
- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Physical Device (Wi-Fi)**: `http://<YOUR_LAN_IP>:5000/api` (e.g. `http://192.168.1.15:5000/api`)

### B. Setup Commands
```bash
cd mobile

# 1. Fetch dependencies
flutter pub get

# 2. Run unit and widget test suite
flutter test

# 3. Analyze code
flutter analyze

# 4. Run application
flutter run
```

---

## 4. Application Structure
```
mobile/
├── assets/
│   └── images/                     # School logo and branding
├── lib/
│   ├── main.dart                   # Application entrypoint & ProviderScope
│   ├── core/
│   │   ├── config/                 # Base URL configuration & GoRouter routes
│   │   ├── network/                # Dio client with JWT interceptor & error parsing
│   │   ├── storage/                # FlutterSecureStorage & SQLite local drafts
│   │   └── theme/                  # Material 3 palette, typography & widget styles
│   ├── features/
│   │   ├── auth/                   # Shared login screen, models & auth notifier
│   │   ├── student/                # Student dashboard, attendance, routine, homework, fees, results
│   │   ├── teacher/                # Teacher dashboard, roll call, assignments, marks entry, routine
│   │   └── shared/                 # PDF viewer and common utilities
│   └── docs/                       # API integration, security reviews & test records
└── test/
    └── widget_test.dart            # Automated tests for login UI & role models
```
