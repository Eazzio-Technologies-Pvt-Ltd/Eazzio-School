import '../../../core/network/api_client.dart';
import '../models/student_models.dart';

/// Repository that handles data operations and HTTP communications for the Student module.
///
/// Communicates with backend endpoints under `/api/student/` and `/api/exams/` via [ApiClient].
/// Provides typed models for dashboard statistics, profiles, daily routines, attendance logs,
/// fee transactions, assignment submissions, academic results, and exam schedules.
class StudentRepository {
  final ApiClient _apiClient;

  /// Creates a [StudentRepository] with the given configured [_apiClient].
  StudentRepository(this._apiClient);

  /// Fetches an aggregated dashboard summary for the authenticated student.
  ///
  /// Returns a [StudentDashboardData] object containing profile summaries, attendance metrics,
  /// pending fee balances, today's schedule, and latest notice bulletins.
  /// Throws an [Exception] if the network request fails or API reports an error.
  Future<StudentDashboardData> getDashboardSummary() async {
    final res = await _apiClient.dio.get('/student/dashboard-summary');
    if (res.data['success'] == true && res.data['data'] != null) {
      return StudentDashboardData.fromJson(res.data['data']);
    }
    throw Exception(res.data['error'] ?? 'Failed to load dashboard summary');
  }

  /// Retrieves the detailed personal and academic profile for the current student.
  ///
  /// Returns a [StudentFullProfile] containing enrollment details, guardian contacts,
  /// roll number, admission records, and assigned course metadata.
  /// Throws an [Exception] on server error or failed response.
  Future<StudentFullProfile> getProfile() async {
    final res = await _apiClient.dio.get('/student/profile');
    if (res.data['success'] == true && res.data['data'] != null) {
      return StudentFullProfile.fromJson(res.data['data']);
    }
    throw Exception(res.data['error'] ?? 'Failed to load profile');
  }

  /// Updates student profile details, such as their primary contact [phone] number.
  ///
  /// Returns the updated [StudentFullProfile].
  /// Throws an [Exception] if the update request cannot be completed.
  Future<StudentFullProfile> updateProfile({String? phone}) async {
    final res =
        await _apiClient.dio.put('/student/profile', data: {'phone': phone});
    if (res.data['success'] == true && res.data['data'] != null) {
      return StudentFullProfile.fromJson(res.data['data']);
    }
    throw Exception(res.data['error'] ?? 'Failed to update profile');
  }

  /// Fetches student attendance history and aggregate statistics.
  ///
  /// Returns a [Map] containing:
  /// - `'stats'`: A map with metrics such as percentage, present count, absent count, and late count.
  /// - `'records'`: A [List] of [AttendanceRecord] entries logging individual dates and statuses.
  /// Throws an [Exception] on network or server error.
  Future<Map<String, dynamic>> getAttendance() async {
    final res = await _apiClient.dio.get('/student/attendance');
    if (res.data['success'] == true && res.data['data'] != null) {
      final data = res.data['data'];
      final stats = data['stats'] as Map<String, dynamic>? ?? {};
      final recordsRaw = (data['records'] as List? ?? []);
      final records =
          recordsRaw.map((r) => AttendanceRecord.fromJson(r)).toList();
      return {
        'stats': stats,
        'records': records,
      };
    }
    throw Exception(res.data['error'] ?? 'Failed to load attendance');
  }

  /// Fetches the weekly academic timetable grouped by day of the week.
  ///
  /// Returns a mapping of weekday names (e.g. "Monday", "Tuesday") to lists of [RoutineItem].
  /// Throws an [Exception] if routine data cannot be loaded.
  Future<Map<String, List<RoutineItem>>> getRoutine() async {
    final res = await _apiClient.dio.get('/student/routine');
    if (res.data['success'] == true && res.data['data'] != null) {
      final Map<String, dynamic> rawMap = res.data['data'];
      final Map<String, List<RoutineItem>> result = {};
      rawMap.forEach((day, items) {
        if (items is List) {
          result[day] = items.map((i) => RoutineItem.fromJson(i)).toList();
        }
      });
      return result;
    }
    throw Exception(res.data['error'] ?? 'Failed to load routine');
  }

  /// Retrieves all fee invoices issued to the authenticated student along with their payment history.
  ///
  /// Returns a [List] of [FeeInvoiceItem] objects.
  /// Throws an [Exception] if loading fees fails.
  Future<List<FeeInvoiceItem>> getFees() async {
    final res = await _apiClient.dio.get('/student/fees');
    if (res.data['success'] == true && res.data['data'] != null) {
      final invoices = res.data['data']['invoices'] as List? ?? [];
      return invoices.map((i) => FeeInvoiceItem.fromJson(i)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load fees');
  }

  /// Initiates a payment gateway transaction order for the given [invoiceId].
  ///
  /// Returns a [Map] containing Razorpay order credentials such as `orderId`, `amount`, and `razorpayKeyId`.
  /// Throws an [Exception] if order creation fails.
  Future<Map<String, dynamic>> createFeeOrder(int invoiceId) async {
    final res = await _apiClient.dio.post('/student/fees/create-order', data: {
      'invoiceId': invoiceId,
    });
    if (res.data['success'] == true && res.data['data'] != null) {
      return res.data['data'];
    }
    throw Exception(res.data['error'] ?? 'Failed to create fee order');
  }

  /// Verifies a completed Razorpay payment against the backend server.
  ///
  /// Parameters:
  /// - [invoiceId]: The ID of the fee invoice being paid.
  /// - [razorpayOrderId]: The Razorpay generated order identifier.
  /// - [razorpayPaymentId]: The unique transaction payment reference returned by Razorpay.
  /// - [razorpaySignature]: The cryptographically signed payment token for authenticity verification.
  ///
  /// Returns `true` if the backend successfully verified and recorded the transaction, otherwise `false`.
  Future<bool> verifyPayment({
    required int invoiceId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final res =
        await _apiClient.dio.post('/student/fees/verify-payment', data: {
      'invoiceId': invoiceId,
      'razorpayOrderId': razorpayOrderId,
      'razorpayPaymentId': razorpayPaymentId,
      'razorpaySignature': razorpaySignature,
    });
    return res.data['success'] == true;
  }

  /// Retrieves homework and coursework assignments posted for the student's enrolled class.
  ///
  /// Returns a [List] of [AssignmentItem] records.
  /// Throws an [Exception] if assignments cannot be fetched.
  Future<List<AssignmentItem>> getAssignments() async {
    final res = await _apiClient.dio.get('/student/assignments');
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data'] as List;
      return list.map((a) => AssignmentItem.fromJson(a)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load assignments');
  }

  /// Fetches published academic examination marks and report cards for the student.
  ///
  /// Returns a [StudentResultGroup] holding weekly tests, terminal evaluations, and hold flags.
  /// Throws an [Exception] if the result records cannot be retrieved.
  Future<StudentResultGroup> getResults() async {
    final res = await _apiClient.dio.get('/student/results');
    if (res.data['success'] == true && res.data['data'] != null) {
      return StudentResultGroup.fromJson(res.data['data']);
    }
    throw Exception(res.data['error'] ?? 'Failed to load results');
  }

  /// Fetches campus bulletin and administrative notices relevant to the student.
  ///
  /// Returns a [List] of [NoticeItem] announcements.
  /// Throws an [Exception] if notices fail to load.
  Future<List<NoticeItem>> getNotices() async {
    final res = await _apiClient.dio.get('/student/notices');
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data'] as List;
      return list.map((n) => NoticeItem.fromJson(n)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load notices');
  }

  /// Updates the student account login password.
  ///
  /// Parameters:
  /// - [currentPassword]: The existing account password for verification.
  /// - [newPassword]: The new secure replacement password.
  ///
  /// Throws an [Exception] if the current password is wrong or validation fails.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await _apiClient.dio.put('/student/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    if (res.data['success'] != true) {
      throw Exception(res.data['error'] ?? 'Failed to change password');
    }
  }

  /// Retrieves scheduled exam timetables for the student's class.
  ///
  /// Optional [examType] filters by category (e.g. "MIDTERM", "FINAL", "ALL").
  /// Returns a [List] of [ExamTimetableItem] schedules.
  /// Throws an [Exception] if exam timetables cannot be fetched.
  Future<List<ExamTimetableItem>> getExamTimetables({String? examType}) async {
    final queryParams = <String, dynamic>{};
    if (examType != null && examType != 'ALL') {
      queryParams['examType'] = examType;
    }
    final res = await _apiClient.dio
        .get('/exams/timetable/list', queryParameters: queryParams);
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data'] as List;
      return list.map((t) => ExamTimetableItem.fromJson(t)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load exam schedules');
  }

  /// Retrieves structured payment receipt data for a successful transaction.
  ///
  /// Parameter [paymentId] identifies the unique payment entry.
  /// Returns a [Map] containing institutional, student, and transaction details.
  /// Throws an [Exception] if the receipt cannot be fetched.
  Future<Map<String, dynamic>> getReceipt(int paymentId) async {
    final res = await _apiClient.dio.get('/student/fees/receipt/$paymentId');
    if (res.data['success'] == true && res.data['data'] != null) {
      return res.data['data'] as Map<String, dynamic>;
    }
    throw Exception(res.data['error'] ?? 'Failed to load receipt');
  }
}
