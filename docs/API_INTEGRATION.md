# API Integration Catalog & Verification Record

All mobile features integrate with real backend endpoints implemented across Express.js and Prisma ORM.

---

## 1. Authentication (`/api/auth`)

| Endpoint | Method | Payload / Parameters | Notes / Role Guards |
|---|---|---|---|
| `/auth/login` | `POST` | `{ "email": "<loginId>", "password": "<password>", "role": "student\|teacher" }` | Handles `studentId`, `employeeId`, or `email`. Returns JWT token and User object. |
| `/auth/change-password` | `POST` | `{ "tempToken": "<token>", "newPassword": "<pass>" }` | Temporary token password change for newly onboarded students. |

---

## 2. Student Portal (`/api/student` & `/api/exams`)

| Endpoint | Method | Description |
|---|---|---|
| `/student/dashboard-summary` | `GET` | Returns student profile, attendance percentage, fees summary, today's schedule, and top 3 notices. |
| `/student/profile` | `GET` | Detailed profile with enrollment data and parent contact info. |
| `/student/profile` | `PUT` | Update contact phone number (`{ "phone": "<newPhone>" }`). |
| `/student/attendance` | `GET` | Historical attendance log with `PRESENT`, `ABSENT`, `LATE` indicators. |
| `/student/routine` | `GET` | Full weekly timetable grouped by day of week. |
| `/student/fees` | `GET` | Issued fee invoices, paid/pending amounts, and payment history. |
| `/student/fees/create-order` | `POST` | Razorpay order creation for in-app fee clearance (`{ "invoiceId": <id> }`). |
| `/student/fees/verify-payment` | `POST` | Razorpay payment signature verification (`{ invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature }`). |
| `/student/fees/receipt/:paymentId` | `GET` | Retrieve official payment receipt breakdown by payment ID. |
| `/student/results` | `GET` | Academic report cards, terminal exams, and weekly tests. Automatically withheld by backend if overdue dues exist. |
| `/exams/timetable/list` | `GET` | Fetch published Half-Yearly and Annual examination datesheets (`?examType=`). Non-admin/principal roles only see `published: true`. |
| `/student/assignments` | `GET` | Class assignments posted by teachers, due dates, and attachment URLs. |
| `/student/notices` | `GET` | School-wide and course-targeted broadcast notices. |
| `/student/change-password` | `PUT` | Change password with current password verification (`{ "currentPassword": "...", "newPassword": "..." }`). |

---

## 3. Teacher Portal (`/api/teacher` & `/api/exams`)

| Endpoint | Method | Description |
|---|---|---|
| `/teacher/dashboard-summary` | `GET` | Homeroom status, class strength, attendance rate, absentees, and teaching schedule. |
| `/teacher/my-classes` | `GET` | List of classes where faculty is homeroom or subject teacher, including student rosters. |
| `/teacher/class-details` | `GET` | Detailed class roster for homeroom classes. |
| `/teacher/attendance` | `POST` | Submit daily roll call (`{ "date": "YYYY-MM-DD", "records": [{ "studentId": <id>, "status": "PRESENT" }] }`). |
| `/teacher/attendance-history` | `GET` | Fetch dates or records for a specific date (`?courseId=&date=`). |
| `/teacher/routine` | `GET` | Teacher's personal weekly routine. |
| `/teacher/assignments` | `GET` | List assignments created by the teacher. |
| `/teacher/assignments` | `POST` | Post new homework assignment (`{ "title": "...", "description": "...", "courseId": <id>, "dueDate": "..." }`). |
| `/teacher/assignments/:id` | `DELETE` | Delete assignment created by the teacher (must be creator). |
| `/exams/list` | `GET` | Fetch scheduled exams for teacher's assigned classes. |
| `/exams/marks-sheet` | `GET` | Fetch student roster with existing marks for a given exam, course, and subject (`?courseId=&examId=&subject=`). |
| `/exams/save-marks` | `POST` | Bulk save/upsert student marks (`{ "courseId": <id>, "examId": <id>, "subject": "...", "maxMarks": 100, "marksData": [{ "studentId": <id>, "marksObtained": <num>, "remarks": "..." }] }`). |

---

## 4. Confirmed Backend Capabilities & Limitations

1. **Push Notifications**:
   - Backend does NOT currently feature device token tables (`FCMToken`) or Firebase Admin SDK dispatchers.
   - Real-time updates rely on user refresh / poll on demand.
2. **Assignment Submissions**:
   - The backend does NOT have a student homework submission table or file upload endpoint for students; assignments are read-only for students and writeable for teachers.
3. **Razorpay Signature Verification**:
   - In production, real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must be set in the server environment. The mobile app implements the full creation, checkout handling, and verification request sequence.
