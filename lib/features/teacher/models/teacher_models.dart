/// Represents aggregated metric data and daily schedule for the teacher's dashboard view.
class TeacherDashboardData {
  /// Whether the teacher is currently assigned as a homeroom / class teacher.
  final bool hasHomeroom;

  /// Display string of the assigned course or class name (or 'Unassigned').
  final String assignedCourse;

  /// Total count of students under the teacher's primary course or homeroom.
  final int? studentCount;

  /// Attendance rate percentage for the course.
  final int? courseAttendanceRate;

  /// List of students recently recorded as absent.
  final List<AbsenteeItem> recentAbsentees;

  /// Timetable routine schedule items for today.
  final List<TeacherRoutineItem> routine;

  /// Constructs a [TeacherDashboardData] snapshot.
  TeacherDashboardData({
    required this.hasHomeroom,
    required this.assignedCourse,
    this.studentCount,
    this.courseAttendanceRate,
    required this.recentAbsentees,
    required this.routine,
  });

  /// Deserializes a [TeacherDashboardData] from backend JSON payload.
  factory TeacherDashboardData.fromJson(Map<String, dynamic> json) {
    return TeacherDashboardData(
      hasHomeroom: json['hasHomeroom'] == true,
      assignedCourse: json['assignedCourse'] ?? 'Unassigned',
      studentCount: (json['studentCount'] as num?)?.toInt(),
      courseAttendanceRate: (json['courseAttendanceRate'] as num?)?.toInt(),
      recentAbsentees: (json['recentAbsentees'] as List? ?? [])
          .map((a) => AbsenteeItem.fromJson(a))
          .toList(),
      routine: (json['routine'] as List? ?? [])
          .map((r) => TeacherRoutineItem.fromJson(r))
          .toList(),
    );
  }
}

/// Represents an individual student absentee record shown on the teacher dashboard.
class AbsenteeItem {
  /// Unique identifier of the student.
  final int studentId;

  /// Full name of the absent student.
  final String name;

  /// Class roll number of the student, if available.
  final String? rollNumber;

  /// Date when the absence was recorded (e.g. `YYYY-MM-DD`).
  final String date;

  /// Constructs an [AbsenteeItem].
  AbsenteeItem({
    required this.studentId,
    required this.name,
    this.rollNumber,
    required this.date,
  });

  /// Deserializes an [AbsenteeItem] from backend JSON payload.
  factory AbsenteeItem.fromJson(Map<String, dynamic> json) {
    return AbsenteeItem(
      studentId: json['studentId'] is int
          ? json['studentId']
          : int.tryParse(json['studentId'].toString()) ?? 0,
      name: json['name'] ?? '',
      rollNumber: json['rollNumber'],
      date: json['date'] ?? '',
    );
  }
}

/// Represents a period or timetable lecture slot in the teacher's routine schedule.
class TeacherRoutineItem {
  /// Unique routine record identifier.
  final int id;

  /// Period number or label (e.g. "1", "2").
  final String period;

  /// Name of the subject being taught during this slot.
  final String subject;

  /// Day of the week for this timetable slot (e.g. "MONDAY").
  final String dayOfWeek;

  /// Scheduled start time string (e.g. "09:00 AM").
  final String? startTime;

  /// Scheduled end time string (e.g. "09:45 AM").
  final String? endTime;

  /// Assigned classroom or hall number.
  final String? roomNo;

  /// Formatted course and section name (e.g. "Grade 10-A").
  final String? courseName;

  /// Constructs a [TeacherRoutineItem].
  TeacherRoutineItem({
    required this.id,
    required this.period,
    required this.subject,
    required this.dayOfWeek,
    this.startTime,
    this.endTime,
    this.roomNo,
    this.courseName,
  });

  /// Deserializes a [TeacherRoutineItem] from backend JSON payload.
  factory TeacherRoutineItem.fromJson(Map<String, dynamic> json) {
    String? courseStr;
    if (json['course'] != null) {
      courseStr =
          '${json['course']['courseName']}-${json['course']['section']}';
    }
    return TeacherRoutineItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      period: json['period']?.toString() ?? '1',
      subject: json['subject'] ?? '',
      dayOfWeek: json['dayOfWeek'] ?? '',
      startTime: json['startTime'],
      endTime: json['endTime'],
      roomNo: json['roomNo'],
      courseName: courseStr,
    );
  }
}

/// Represents a class / course assigned to the teacher, including enrolled student roster.
class TeacherClassItem {
  /// Unique identifier of the course.
  final int courseId;

  /// Name or grade level of the course (e.g. "Grade 10").
  final String courseName;

  /// Section identifier (e.g. "A").
  final String section;

  /// Whether the teacher is the homeroom / class teacher for this class.
  final bool isHomeroom;

  /// Subjects assigned to this class.
  final List<String> subjects;

  /// Enrolled students roster in this class.
  final List<RosterStudent> students;

  /// Constructs a [TeacherClassItem].
  TeacherClassItem({
    required this.courseId,
    required this.courseName,
    required this.section,
    required this.isHomeroom,
    required this.subjects,
    required this.students,
  });

  /// Deserializes a [TeacherClassItem] from backend JSON payload.
  factory TeacherClassItem.fromJson(Map<String, dynamic> json) {
    return TeacherClassItem(
      courseId: json['courseId'] is int
          ? json['courseId']
          : int.tryParse(json['courseId'].toString()) ?? 0,
      courseName: json['courseName'] ?? '',
      section: json['section'] ?? '',
      isHomeroom: json['isHomeroom'] == true,
      subjects:
          (json['subjects'] as List? ?? []).map((s) => s.toString()).toList(),
      students: (json['students'] as List? ?? [])
          .map((s) => RosterStudent.fromJson(s))
          .toList(),
    );
  }

  /// Combined display label showing course name and section (e.g. "Grade 10-A").
  String get displayName => '$courseName-$section';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TeacherClassItem &&
          runtimeType == other.runtimeType &&
          courseId == other.courseId;

  @override
  int get hashCode => courseId.hashCode;
}

/// Represents a student enrolled in a class roster for attendance and grading.
class RosterStudent {
  /// Internal database ID of the student.
  final int id;

  /// School-assigned student admission ID string.
  final String studentId;

  /// Full name of the student.
  final String name;

  /// Roll number of the student in the class.
  final String? rollNumber;

  /// Contact phone number of student/parent.
  final String? phone;

  /// Constructs a [RosterStudent] model.
  RosterStudent({
    required this.id,
    required this.studentId,
    required this.name,
    this.rollNumber,
    this.phone,
  });

  /// Deserializes a [RosterStudent] from backend JSON payload.
  factory RosterStudent.fromJson(Map<String, dynamic> json) {
    return RosterStudent(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      studentId: json['studentId'] ?? '',
      name: json['name'] ?? '',
      rollNumber: json['rollNumber'] ?? 'N/A',
      phone: json['phone'],
    );
  }
}

/// Represents a homework assignment created by a teacher.
class TeacherAssignmentItem {
  /// Unique identifier of the assignment.
  final int id;

  /// Title of the assignment.
  final String title;

  /// Detailed description or instructions for students.
  final String description;

  /// Course ID to which this assignment belongs.
  final int courseId;

  /// Display name of the course/section.
  final String? courseName;

  /// Deadline date string for submission (e.g. `YYYY-MM-DD`).
  final String? dueDate;

  /// Attachment URL (document/image) for assignment details.
  final String? attachmentUrl;

  /// Timestamp when the assignment was created.
  final String createdAt;

  /// Constructs a [TeacherAssignmentItem].
  TeacherAssignmentItem({
    required this.id,
    required this.title,
    required this.description,
    required this.courseId,
    this.courseName,
    this.dueDate,
    this.attachmentUrl,
    required this.createdAt,
  });

  /// Deserializes a [TeacherAssignmentItem] from backend JSON payload.
  factory TeacherAssignmentItem.fromJson(Map<String, dynamic> json) {
    return TeacherAssignmentItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      courseId: (json['courseId'] as num?)?.toInt() ?? 0,
      courseName: json['course'] != null
          ? '${json['course']['courseName']}-${json['course']['section']}'
          : null,
      dueDate: json['dueDate'],
      attachmentUrl: json['attachmentUrl'],
      createdAt: json['createdAt'] ?? '',
    );
  }
}

/// Represents an examination created or graded by a teacher.
class TeacherExamItem {
  /// Unique identifier of the exam.
  final int id;

  /// Name of the exam (e.g. "Midterm Examination", "Unit Test 1").
  final String examName;

  /// Term period (e.g. "Term 1", "Semester 1").
  final String term;

  /// Academic year string (e.g. "2026-2027").
  final String academicYear;

  /// Type or category of exam (e.g. "GENERAL", "PRACTICAL").
  final String? examType;

  /// Specific subject for this exam.
  final String? subject;

  /// Maximum total achievable score / marks.
  final double? maxMarks;

  /// Scheduled date string for the exam.
  final String? examDate;

  /// Associated course ID.
  final int courseId;

  /// Formatted course and section name.
  final String? courseName;

  /// Constructs a [TeacherExamItem].
  TeacherExamItem({
    required this.id,
    required this.examName,
    required this.term,
    required this.academicYear,
    this.examType,
    this.subject,
    this.maxMarks,
    this.examDate,
    required this.courseId,
    this.courseName,
  });

  /// Deserializes a [TeacherExamItem] from backend JSON payload.
  factory TeacherExamItem.fromJson(Map<String, dynamic> json) {
    return TeacherExamItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      examName: json['examName'] ?? '',
      term: json['term'] ?? '',
      academicYear: json['academicYear'] ?? '',
      examType: json['examType'],
      subject: json['subject'],
      maxMarks: (json['maxMarks'] as num?)?.toDouble(),
      examDate: json['examDate'],
      courseId: json['courseId'] is int
          ? json['courseId']
          : int.tryParse(json['courseId'].toString()) ?? 0,
      courseName: json['course'] != null
          ? '${json['course']['courseName']}-${json['course']['section']}'
          : null,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TeacherExamItem &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Represents a single student's row in an exam marks sheet for entry and review.
class MarksSheetStudentRow {
  /// Internal student ID.
  final int studentId;

  /// Student's full name.
  final String name;

  /// Student's roll number in the class.
  final String rollNumber;

  /// Marks obtained by the student in the exam.
  double? marksObtained;

  /// Letter grade awarded (e.g. "A+", "B").
  String? grade;

  /// Optional remarks or feedback note for this student.
  String? remarks;

  /// Constructs a [MarksSheetStudentRow].
  MarksSheetStudentRow({
    required this.studentId,
    required this.name,
    required this.rollNumber,
    this.marksObtained,
    this.grade,
    this.remarks,
  });

  /// Deserializes a [MarksSheetStudentRow] from backend JSON payload.
  factory MarksSheetStudentRow.fromJson(Map<String, dynamic> json) {
    return MarksSheetStudentRow(
      studentId: json['studentId'] is int
          ? json['studentId']
          : int.tryParse(json['studentId'].toString()) ?? 0,
      name: json['name'] ?? '',
      rollNumber: json['rollNumber'] ?? 'N/A',
      marksObtained: (json['marksObtained'] as num?)?.toDouble(),
      grade: json['grade'],
      remarks: json['remarks'],
    );
  }
}

