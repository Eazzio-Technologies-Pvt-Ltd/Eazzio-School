# Known Backend Limitations & Gaps

This document catalogues all backend capabilities, endpoints, and architectural requirements that are currently missing, incomplete, or broken in the backend (`backend/`), which cannot be modified under the strict mobile-only scope. The mobile application has been built to adapt safely to these existing contracts.

---

## 1. Push Notifications Infrastructure
- **Status**: Not Implemented in Backend.
- **Details**:
  - The backend lacks tables for storing client device tokens (e.g., FCM / APNs device tokens).
  - There is no Firebase Admin SDK or WebPush integration in the Express server to dispatch push notifications when notices, homework, or exam marks are published.
- **Mobile Impact & Adaptation**:
  - The mobile app does not pretend that background remote push notifications are active or registered.
  - In-app notices and dashboard updates are fetched on screen load and pull-to-refresh.
- **Backend Resolution Needed**:
  - Create a migration adding a `DeviceToken` table (`userId`, `token`, `platform`, `updatedAt`).
  - Add `POST /api/notifications/register-token` endpoint.
  - Implement notification triggers in notice and assignment creation routes.

---

## 2. Student Assignment Submissions
- **Status**: Read-Only in Backend.
- **Details**:
  - Teachers can create assignments (`POST /api/teacher/assignments`) with due dates and descriptions.
  - There is no database table (e.g. `AssignmentSubmission`), file upload endpoint, or status field in the backend allowing students to submit files or homework responses.
- **Mobile Impact & Adaptation**:
  - The Student Portal provides a complete read-only view of assigned coursework, attachments, instructions, and due dates.
  - No fake submission forms or unbacked upload workflows are exposed to students.
- **Backend Resolution Needed**:
  - Add `AssignmentSubmission` model in `schema.prisma`.
  - Add `POST /api/student/assignments/:id/submit` with multipart/form-data upload or cloud storage integration.

---

## 3. Development Password Bypass in Authentication
- **Status**: Security Risk in Backend (`backend/routes/auth.js`).
- **Details**:
  - The login route permits login with `'password'` or `'password123'` regardless of bcrypt hash mismatch if development bypass is present.
- **Mobile Impact & Adaptation**:
  - The mobile application strictly sends raw user credentials directly to `POST /api/auth/login`. No bypass credentials or backdoor logic are hardcoded into the mobile app.
- **Backend Resolution Needed**:
  - Remove hardcoded password fallbacks from `backend/routes/auth.js` prior to production release.

---

## 4. Razorpay Production Credentials & Webhook Sync
- **Status**: Configuration Dependent.
- **Details**:
  - Fee orders are created via `POST /api/student/fees/create-order` and verified via `POST /api/student/fees/verify-payment`.
  - When backend environment variables `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not set or invalid, order generation will fail.
- **Mobile Impact & Adaptation**:
  - Mobile initiates order creation and launches Razorpay checkout using the server-supplied key ID.
  - Invoices are never marked paid client-side without backend verification confirmation.
- **Backend Resolution Needed**:
  - Ensure valid Razorpay credentials and webhook handlers are configured in server `.env`.

---

## 5. Token Refresh Endpoint
- **Status**: Not Supported.
- **Details**:
  - The backend issues a JWT on login without a dedicated refresh token flow (`/api/auth/refresh`).
- **Mobile Impact & Adaptation**:
  - Mobile intercepts HTTP 401/403 responses and securely purges the stored session, redirecting to the login screen for re-authentication.
