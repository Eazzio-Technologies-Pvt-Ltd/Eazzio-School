import '../../../core/network/api_client.dart';
import '../models/teacher_models.dart';

/// Repository handling all teacher-specific network requests and data operations.
///
/// Communicates with backend endpoints under `/teacher`, `/exams`, `/notices`,
/// and `/feedback` to provide dashboard metrics, class rosters, attendance management,
/// timetable routines, assignments, exam grades, notices, and feedback submissions.
class TeacherRepository {
  final ApiClient _apiClient;

  /// Creates a [TeacherRepository] using the provided [ApiClient].
  TeacherRepository(this._apiClient);

  /// Fetches summary metrics and schedule for the teacher's dashboard.
  ///
  /// Returns a [TeacherDashboardData] instance containing homeroom details,
  /// attendance statistics, recent absentees, and today's routine.
  /// Throws an [Exception] if the request fails or returns an error.
  Future<TeacherDashboardData> getDashboardSummary() async {
    final res = await _apiClient.dio.get('/teacher/dashboard-summary');
    if (res.data['success'] == true && res.data['data'] != null) {
      return TeacherDashboardData.fromJson(res.data['data']);
    }
    throw Exception(
        res.data['error'] ?? 'Failed to load teacher dashboard summary');
  }

  /// Retrieves the list of classes/courses assigned to the logged-in teacher.
  ///
  /// Returns a list of [TeacherClassItem] representing courses, their sections,
  /// assigned subjects, and enrolled students.
  /// Throws an [Exception] if fetching fails.
  Future<List<TeacherClassItem>> getMyClasses() async {
    final res = await _apiClient.dio.get('/teacher/my-classes');
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data'] as List;
      return list.map((c) => TeacherClassItem.fromJson(c)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load teacher classes');
  }

  /// Fetches detailed roster and attendance information for teacher's classes.
  ///
  /// Returns a [Map] containing class details from the server.
  /// Throws an [Exception] if the request does not succeed.
  Future<Map<String, dynamic>> getClassDetails() async {
    final res = await _apiClient.dio.get('/teacher/class-details');
    if (res.data['success'] == true && res.data['data'] != null) {
      return res.data['data'];
    }
    throw Exception(res.data['error'] ?? 'Failed to load class details');
  }

  /// Submits student attendance records for a specific course and date.
  ///
  /// [courseId] identifies the course/section being marked.
  /// [date] is the ISO date string (e.g. `YYYY-MM-DD`).
  /// [records] is a list of maps containing student IDs and attendance status (e.g. PRESENT, ABSENT).
  /// Throws an [Exception] if recording attendance fails.
  Future<void> submitAttendance({
    required int courseId,
    required String date,
    required List<Map<String, dynamic>> records,
  }) async {
    final res = await _apiClient.dio.post('/teacher/attendance', data: {
      'courseId': courseId,
      'date': date,
      'records': records,
    });
    if (res.data['success'] != true) {
      throw Exception(res.data['error'] ?? 'Failed to record attendance');
    }
  }

  /// Fetches a list of past dates for which attendance has been recorded.
  ///
  /// [courseId] optionally filters attendance dates by course.
  /// Returns a list of date strings (ISO format).
  /// Throws an [Exception] if fetching history dates fails.
  Future<List<String>> getAttendanceHistoryDates({int? courseId}) async {
    final res = await _apiClient.dio.get(
      '/teacher/attendance-history',
      queryParameters: courseId != null ? {'courseId': courseId} : null,
    );
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data']['dates'] as List? ?? [];
      return list.map((d) => d.toString()).toList();
    }
    throw Exception(
        res.data['error'] ?? 'Failed to fetch attendance history dates');
  }

  /// Retrieves student attendance history records for a specific date and optional course.
  ///
  /// [date] specifies the date to inspect (e.g. `YYYY-MM-DD`).
  /// [courseId] optionally filters the records by a specific course.
  /// Returns a list of attendance entry maps.
  /// Throws an [Exception] if fetching records fails.
  Future<List<Map<String, dynamic>>> getAttendanceHistoryRecords({
    required String date,
    int? courseId,
  }) async {
    final queryParams = {'date': date};
    if (courseId != null) queryParams['courseId'] = courseId.toString();

    final res = await _apiClient.dio
        .get('/teacher/attendance-history', queryParameters: queryParams);
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data']['records'] as List? ?? [];
      return list.cast<Map<String, dynamic>>();
    }
    throw Exception(res.data['error'] ?? 'Failed to fetch attendance history');
  }

  /// Retrieves the teacher's weekly class routine/timetable.
  ///
  /// Returns a map keyed by day of the week (e.g., 'MONDAY') containing
  /// lists of [TeacherRoutineItem] ordered by period.
  /// Throws an [Exception] if fetching the routine fails.
  Future<Map<String, List<TeacherRoutineItem>>> getRoutine() async {
    final res = await _apiClient.dio.get('/teacher/routine');
    if (res.data['success'] == true && res.data['data'] != null) {
      final Map<String, dynamic> rawMap = res.data['data'];
      final Map<String, List<TeacherRoutineItem>> result = {};
      rawMap.forEach((day, items) {
        if (items is List) {
          result[day] =
              items.map((i) => TeacherRoutineItem.fromJson(i)).toList();
        }
      });
      return result;
    }
    throw Exception(res.data['error'] ?? 'Failed to load teacher routine');
  }

  /// Fetches homework assignments created by or assigned to the teacher.
  ///
  /// [courseId] optionally filters assignments by course.
  /// Returns a list of [TeacherAssignmentItem].
  /// Throws an [Exception] if fetching assignments fails.
  Future<List<TeacherAssignmentItem>> getAssignments({int? courseId}) async {
    final queryParams = <String, dynamic>{};
    if (courseId != null) queryParams['courseId'] = courseId;

    final res = await _apiClient.dio
        .get('/teacher/assignments', queryParameters: queryParams);
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data'] as List;
      return list.map((a) => TeacherAssignmentItem.fromJson(a)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load assignments');
  }

  /// Publishes a new assignment for a course.
  ///
  /// [title] and [description] specify the assignment content.
  /// [courseId] is the target course/class.
  /// [dueDate] is an optional ISO deadline string.
  /// [attachmentUrl] is an optional link to an uploaded attachment.
  /// Returns the newly created [TeacherAssignmentItem].
  /// Throws an [Exception] if creation fails.
  Future<TeacherAssignmentItem> createAssignment({
    required String title,
    required String description,
    required int courseId,
    String? dueDate,
    String? attachmentUrl,
  }) async {
    final res = await _apiClient.dio.post('/teacher/assignments', data: {
      'title': title,
      'description': description,
      'courseId': courseId,
      'dueDate': dueDate,
      'attachmentUrl': attachmentUrl,
    });
    if (res.data['success'] == true && res.data['data'] != null) {
      return TeacherAssignmentItem.fromJson(res.data['data']);
    }
    throw Exception(res.data['error'] ?? 'Failed to create assignment');
  }

  /// Deletes an existing assignment by its [id].
  ///
  /// Throws an [Exception] if the deletion fails on the server.
  Future<void> deleteAssignment(int id) async {
    final res = await _apiClient.dio.delete('/teacher/assignments/$id');
    if (res.data['success'] != true) {
      throw Exception(res.data['error'] ?? 'Failed to delete assignment');
    }
  }

  // Exams & Marks for Teacher

  /// Fetches exams relevant to the teacher, optionally filtered by [courseId].
  ///
  /// Returns a list of [TeacherExamItem].
  /// Throws an [Exception] if the exam list fails to load.
  Future<List<TeacherExamItem>> getExams({int? courseId}) async {
    final queryParams = <String, dynamic>{};
    if (courseId != null) queryParams['courseId'] = courseId;

    final res =
        await _apiClient.dio.get('/exams/list', queryParameters: queryParams);
    if (res.data['success'] == true && res.data['data'] != null) {
      final list = res.data['data'] as List;
      return list.map((e) => TeacherExamItem.fromJson(e)).toList();
    }
    throw Exception(res.data['error'] ?? 'Failed to load exams');
  }

  /// Creates a new examination schedule entry.
  ///
  /// [courseId] specifies the course class.
  /// [examName], [term], and [academicYear] identify the examination session.
  /// Optional parameters include [examDate], [subject], [maxMarks], [examType], and [portion] syllabus.
  /// Returns the created [TeacherExamItem].
  /// Throws an [Exception] if exam creation fails.
  Future<TeacherExamItem> createExam({
    required int courseId,
    required String examName,
    required String term,
    required String academicYear,
    String? examDate,
    String? subject,
    double? maxMarks,
    String examType = 'GENERAL',
    String? portion,
  }) async {
    final res = await _apiClient.dio.post('/exams/create', data: {
      'courseId': courseId,
      'examName': examName,
      'term': term,
      'academicYear': academicYear,
      if (examDate != null) 'examDate': examDate,
      if (subject != null) 'subject': subject,
      if (maxMarks != null) 'maxMarks': maxMarks,
      'examType': examType,
      if (portion != null) 'portion': portion,
    });
    if (res.data['success'] == true && res.data['data'] != null) {
      return TeacherExamItem.fromJson(res.data['data']);
    }
    throw Exception(res.data['error'] ?? 'Failed to create exam');
  }

  /// Retrieves the marks sheet roster for a given [courseId], [examId], and [subject].
  ///
  /// Returns a map containing student list, max marks, and existing graded marks.
  /// Throws an [Exception] if fetching the sheet fails.
  Future<Map<String, dynamic>> getMarksSheet({
    required int courseId,
    required int examId,
    required String subject,
  }) async {
    final res =
        await _apiClient.dio.get('/exams/marks-sheet', queryParameters: {
      'courseId': courseId,
      'examId': examId,
      'subject': subject,
    });
    if (res.data['success'] == true && res.data['data'] != null) {
      return res.data['data'];
    }
    throw Exception(res.data['error'] ?? 'Failed to load marks sheet');
  }

  /// Persists entered grades and marks for students in an examination.
  ///
  /// [courseId], [examId], and [subject] identify the grading context.
  /// [maxMarks] represents the total achievable marks.
  /// [marksData] is a list of student grade records (marks, grade, remarks).
  /// Throws an [Exception] if saving marks fails.
  Future<void> saveMarks({
    required int courseId,
    required int examId,
    required String subject,
    required double maxMarks,
    required List<Map<String, dynamic>> marksData,
  }) async {
    final res = await _apiClient.dio.post('/exams/save-marks', data: {
      'courseId': courseId,
      'examId': examId,
      'subject': subject,
      'maxMarks': maxMarks,
      'marksData': marksData,
    });
    if (res.data['success'] != true) {
      throw Exception(res.data['error'] ?? 'Failed to save marks');
    }
  }

  // Notices for Teacher

  /// Retrieves notices relevant to teachers for a given [schoolId].
  ///
  /// Returns a list of notice records.
  Future<List<Map<String, dynamic>>> getNotices({required int schoolId}) async {
    final res = await _apiClient.dio.get('/notices', queryParameters: {
      'schoolId': schoolId,
      'role': 'TEACHER',
    });
    if (res.data is List) {
      return (res.data as List).cast<Map<String, dynamic>>();
    }
    if (res.data['success'] == true && res.data['data'] != null) {
      return (res.data['data'] as List).cast<Map<String, dynamic>>();
    }
    return [];
  }

  // Feedback for Teacher

  /// Retrieves feedback submitted by or addressed to the teacher.
  ///
  /// Returns a list of feedback records.
  Future<List<Map<String, dynamic>>> getFeedbacks() async {
    final res = await _apiClient.dio.get('/feedback');
    if (res.data is List) {
      return (res.data as List).cast<Map<String, dynamic>>();
    }
    return [];
  }

  /// Submits feedback or remarks regarding a specific entity (e.g., student or course).
  ///
  /// [targetType] specifies the feedback category (e.g. STUDENT).
  /// [targetId] is the unique identifier for the targeted subject.
  /// [content] is the feedback text message.
  /// Throws an [Exception] if submitting feedback fails.
  Future<void> createFeedback({
    required String targetType,
    required int targetId,
    required String content,
  }) async {
    final res = await _apiClient.dio.post('/feedback', data: {
      'targetType': targetType,
      'targetId': targetId,
      'content': content,
    });
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(res.data['error'] ?? 'Failed to submit feedback');
    }
  }
}

