# Eazzio School Mobile App - Complete Developer Guide

Welcome to the **Eazzio School** mobile codebase (`mobile/`). This guide explains **WHAT** each component does, **HOW** it works under the hood, and **WHY** it was built this way so any developer can onboard immediately.

---

## 1. High-Level Architecture (The Big Picture)

The app is built with **Flutter** using **Riverpod** for state management and **GoRouter** for declarative role-based routing.

```
                          ┌────────────────────────┐
                          │       main.dart        │
                          │ Initializes Services   │
                          └──────────┬─────────────┘
                                     │
                        ┌────────────▼──────────┐
                        │   app_router.dart     │
                        │ (Guards & Navigation) │
                        └────────────┬──────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Auth Feature    │       │ Student Feature  │       │ Teacher Feature  │
│ - Login Screen   │       │ - Dashboard      │       │ - Dashboard      │
│ - Portal Toggle  │       │ - Attendance     │       │ - Mark Attendance│
│ - AuthController │       │ - Fees / Routine │       │ - Routine / Marks│
└────────┬─────────┘       └─────────┬────────┘       └─────────┬────────┘
         │                           │                          │
         └───────────────────────────┼──────────────────────────┘
                                     │
                        ┌────────────▼──────────┐
                        │    api_client.dart    │
                        │ (Dio + JWT Interceptor│
                        └────────────┬──────────┘
                                     │ HTTPS
                        ┌────────────▼──────────┐
                        │   Render Backend API  │
                        └───────────────────────┘
```

---

## 2. Directory Breakdown (`mobile/lib/`)

### `core/` — App Foundation
* [`app_config.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/core/config/app_config.dart):
  - **What**: Holds application configuration constants and default base URLs.
  - **How**: Reads `API_BASE_URL` from `--dart-define` or falls back to production: `https://eazzio-school.onrender.com/api`.
  - **Why**: Keeps server environments decoupled from code.
* [`app_router.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/core/config/app_router.dart):
  - **What**: Defines all navigation routes (`/`, `/login`, `/student`, `/teacher`).
  - **How**: Listens to `authNotifierProvider`. If not logged in, redirects to `/`. If a student tries accessing `/teacher`, it kicks them back to `/student` (and vice-versa).
  - **Why**: Prevents unauthorized route navigation without scattered `if` checks across UI screens.
* [`api_client.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/core/network/api_client.dart):
  - **What**: Centralized network client built on `Dio`.
  - **How**: Automatically grabs the JWT token from `FlutterSecureStorage` and attaches `Authorization: Bearer <token>` to outgoing requests. Intercepts `401` errors to trigger automatic logout/session expiry.
  - **Why**: Single place for all auth headers, error translation, and network timeout handling.
* [`secure_storage_service.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/core/storage/secure_storage_service.dart):
  - **What**: Stores sensitive tokens and user session data securely in Android Keystore / iOS Keychain.
* [`notification_service.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/core/services/notification_service.dart):
  - **What**: Handles local notifications using `flutter_local_notifications`.

---

## 3. Features Walkthrough

### `features/auth/` — Login & Session
* **Key Files**: [`login_screen.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/features/auth/presentation/login_screen.dart), [`auth_controller.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/features/auth/presentation/auth_controller.dart), [`auth_repository.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/features/auth/data/auth_repository.dart).
* **How Login Works**:
  1. User toggles between Student Portal and Teacher Portal.
  2. Submits Login ID + Password.
  3. `AuthRepository.login()` calls `POST /api/auth/login`.
  4. On success: JWT token and user profile are saved to `SecureStorage`.
  5. `RouterNotifier` detects `AuthStatus.authenticated` and automatically switches view to `/student` or `/teacher`.

### `features/student/` — Student Experience
* **Main Screen**: [`student_main_screen.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/features/student/presentation/student_main_screen.dart) with bottom navigation tabs:
  - **Home / Dashboard**: Summary of attendance, notices, and pending fees.
  - **Routine**: Weekly schedule and classes.
  - **Attendance**: Detailed presence logs (Present, Absent, Late).
  - **Fees**: Pending invoices and Razorpay payment integration.
  - **Results / Profile**: Exam grades and student record details.
* **Data Flow**: `StudentRepository` queries `/api/student/*` endpoints using Riverpod FutureProviders that cache and refresh cleanly.

### `features/teacher/` — Teacher Experience
* **Main Screen**: [`teacher_main_screen.dart`](file:///home/rahul-kumar/Desktop/Eazzio-School/mobile/lib/features/teacher/presentation/teacher_main_screen.dart):
  - **Dashboard**: Quick metrics, class list, and notifications.
  - **Attendance Taking**: Class-wise attendance checklist with bulk submission (`POST /api/teacher/attendance`).
  - **Marks Entry**: Grade entry per course and subject.
  - **Timetable & Notices**: Faculty timetable and school-wide announcements.

---

## 4. Cheat Sheet for Common Tasks

| Task | Where to go |
|------|-------------|
| Change API base URL | Edit `defaultBaseUrl` in `lib/core/config/app_config.dart` |
| Add a new screen / route | Add route definition in `lib/core/config/app_router.dart` |
| Change app colors / theme | Edit `lib/core/theme/app_theme.dart` |
| Add an API endpoint | Add method in `StudentRepository` or `TeacherRepository` |
| Build release AAB for Play Store | `flutter build appbundle --release` |
