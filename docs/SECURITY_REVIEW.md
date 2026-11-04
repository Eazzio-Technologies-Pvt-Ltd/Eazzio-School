# Security & Privacy Review

## 1. Authentication & Session Management
- **Token Security**: Tokens are saved exclusively inside hardware-backed keychains (`FlutterSecureStorage` using Keystore on Android and Keychain on iOS).
- **Transport Security**: All requests route through Dio with Bearer tokens automatically attached. Production deployments MUST use HTTPS.
- **Role Separation**:
  - The mobile app employs local routing guards via `GoRouter` preventing students from navigating into teacher interfaces and vice versa.
  - Furthermore, the backend strictly validates role claims on all route families (`requireStudent`, `requireTeacher`, `requireRole`). Client-side state is never trusted as the sole security boundary.
- **Session Expiry & Clean Logout**:
  - `Dio` error interceptors monitor HTTP `401` and `403` responses across all protected endpoints.
  - Upon receiving an unauthorized error or user logout, the stored JWT and session state are purged.
  - **Local Storage Purge**: `LocalDatabaseService.clearUserData()` is invoked on logout, eliminating offline attendance drafts and cache store to eliminate cross-account cached leakage.

---

## 2. Security Audit of External Backend Findings (Read-Only Inspection)

### Finding 1: Development Password Bypass in `backend/routes/auth.js`
- **Location**: `backend/routes/auth.js` (lines 67–70)
- **Description**:
  ```javascript
  if (!isMatch && (password === 'password' || password === 'password123')) {
    isMatch = true;
  }
  ```
- **Risk Rating**: **CRITICAL (External Backend Risk)**
- **Mitigation & Compliance**:
  - The mobile application strictly sends raw user credentials directly to `POST /api/auth/login` without baking in or depending on development bypasses.
  - This bypass MUST be removed from `backend/routes/auth.js` by backend maintainers prior to production deployment.

### Finding 2: Plaintext Logging of Failed Passwords
- **Location**: `backend/routes/auth.js` (lines 59, 72, 78)
- **Description**: Failed login attempts append raw user passwords into `login_attempts.log`.
- **Risk Rating**: **HIGH (Privacy / Compliance Violation)**
- **Mobile Compliance**: Mobile application never prints user credentials into console or persistent logs.

---

## 3. Financial & Payment Safety
- **No Client-side Secrets**: The mobile application does NOT store Razorpay secret keys (`RAZORPAY_KEY_SECRET`). Only `key_id` returned dynamically from the server during order creation is used for client checkout.
- **Server-Side Verification**: Invoices are never marked as paid based on client success flags; completion is only credited after the backend confirms `razorpay_signature` through HMAC-SHA256 verification.
- **Receipt Transparency**: Payment receipts can be fetched and inspected directly via `GET /api/student/fees/receipt/:paymentId`.
