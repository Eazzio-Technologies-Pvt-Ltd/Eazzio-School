/// Data models representing Student-centric domain entities, summaries,
/// attendance registers, class routines, fee invoices, homework assignments,
/// and academic examination schedules.
library student_models;

/// Consolidated payload representing student overview information on the home dashboard.
class StudentDashboardData {
  /// Basic identity and enrollment summary.
  final StudentProfileSummary profile;

  /// Aggregated metrics for presence, absence, and late marks.
  final StudentAttendanceSummary attendance;

  /// Balance, paid figures, and overall fee status.
  final StudentFeesSummary fees;

  /// Recent campus notices and announcements.
  final List<NoticeItem> notices;

  /// Timetable periods scheduled for the current date.
  final List<RoutineItem> todayRoutine;

  /// Creates a [StudentDashboardData] aggregate instance.
  StudentDashboardData({
    required this.profile,
    required this.attendance,
    required this.fees,
    required this.notices,
    required this.todayRoutine,
  });

  /// Deserializes a [StudentDashboardData] instance from a JSON map.
  factory StudentDashboardData.fromJson(Map<String, dynamic> json) {
    return StudentDashboardData(
      profile: StudentProfileSummary.fromJson(json['profile'] ?? {}),
      attendance: StudentAttendanceSummary.fromJson(json['attendance'] ?? {}),
      fees: StudentFeesSummary.fromJson(json['fees'] ?? {}),
      notices: (json['notices'] as List? ?? [])
          .map((n) => NoticeItem.fromJson(n))
          .toList(),
      todayRoutine: (json['todayRoutine'] as List? ?? [])
          .map((r) => RoutineItem.fromJson(r))
          .toList(),
    );
  }
}

/// Brief student identity data used in dashboard header cards.
class StudentProfileSummary {
  /// Full name of the student.
  final String name;

  /// Unique institutional admission or registration identifier.
  final String studentId;

  /// Class roll number.
  final String rollNumber;

  /// Name and section of enrolled course/class.
  final String courseName;

  /// Creates a [StudentProfileSummary] instance.
  StudentProfileSummary({
    required this.name,
    required this.studentId,
    required this.rollNumber,
    required this.courseName,
  });

  /// Deserializes a [StudentProfileSummary] from JSON data with sensible defaults.
  factory StudentProfileSummary.fromJson(Map<String, dynamic> json) {
    return StudentProfileSummary(
      name: json['name'] ?? '',
      studentId: json['studentId'] ?? '',
      rollNumber: json['rollNumber'] ?? 'N/A',
      courseName: json['courseName'] ?? 'Unassigned',
    );
  }
}

/// Metric summary of student attendance across the current academic term.
class StudentAttendanceSummary {
  /// Percentage of total working days marked present.
  final int percentage;

  /// Total number of days present.
  final int present;

  /// Total number of days absent.
  final int absent;

  /// Total number of days arrived late.
  final int late;

  /// Total number of recorded school days.
  final int total;

  /// Creates a [StudentAttendanceSummary] instance.
  StudentAttendanceSummary({
    required this.percentage,
    required this.present,
    required this.absent,
    required this.late,
    required this.total,
  });

  /// Deserializes a [StudentAttendanceSummary] from JSON.
  factory StudentAttendanceSummary.fromJson(Map<String, dynamic> json) {
    return StudentAttendanceSummary(
      percentage: (json['percentage'] as num?)?.toInt() ?? 100,
      present: (json['present'] as num?)?.toInt() ?? 0,
      absent: (json['absent'] as num?)?.toInt() ?? 0,
      late: (json['late'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Snapshot of student fee liability, payments made, and due status.
class StudentFeesSummary {
  /// Total cumulative fee assessed for the academic period.
  final double totalFees;

  /// Total monetary amount paid to date.
  final double paidAmount;

  /// Outstanding balance amount awaiting payment.
  final double pendingAmount;

  /// High-level payment status tag (e.g., 'PAID', 'PENDING', 'OVERDUE').
  final String feeStatus;

  /// Upcoming payment deadline date string, if pending.
  final String? dueDate;

  /// Creates a [StudentFeesSummary] instance.
  StudentFeesSummary({
    required this.totalFees,
    required this.paidAmount,
    required this.pendingAmount,
    required this.feeStatus,
    this.dueDate,
  });

  /// Deserializes a [StudentFeesSummary] from JSON data.
  factory StudentFeesSummary.fromJson(Map<String, dynamic> json) {
    return StudentFeesSummary(
      totalFees: (json['totalFees'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0.0,
      pendingAmount: (json['pendingAmount'] as num?)?.toDouble() ?? 0.0,
      feeStatus: json['feeStatus'] ?? 'PAID',
      dueDate: json['dueDate'],
    );
  }
}

/// Comprehensive student profile containing personal, contact, and enrollment data.
class StudentFullProfile {
  /// Internal database record ID.
  final int id;

  /// Unique institutional student alphanumeric ID.
  final String studentId;

  /// Student's full legal name.
  final String name;

  /// Name of father or legal guardian.
  final String? fatherName;

  /// Name of mother or legal guardian.
  final String? motherName;

  /// Contact phone number.
  final String? phone;

  /// Residential address string.
  final String? address;

  /// Roll number in assigned class.
  final String? rollNumber;

  /// Date when admission was finalized.
  final String? admissionDate;

  /// Frequency or cycle of recurring fees (e.g. 'MONTHLY', 'QUARTERLY').
  final String? feeCycle;

  /// Enrolled course/class metadata, if assigned.
  final CourseInfo? course;

  /// Creates a [StudentFullProfile] instance.
  StudentFullProfile({
    required this.id,
    required this.studentId,
    required this.name,
    this.fatherName,
    this.motherName,
    this.phone,
    this.address,
    this.rollNumber,
    this.admissionDate,
    this.feeCycle,
    this.course,
  });

  /// Deserializes a [StudentFullProfile] from JSON.
  factory StudentFullProfile.fromJson(Map<String, dynamic> json) {
    return StudentFullProfile(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      studentId: json['studentId'] ?? '',
      name: json['name'] ?? '',
      fatherName: json['fatherName'],
      motherName: json['motherName'],
      phone: json['phone'],
      address: json['address'],
      rollNumber: json['rollNumber'],
      admissionDate: json['admissionDate'],
      feeCycle: json['feeCycle'],
      course:
          json['course'] != null ? CourseInfo.fromJson(json['course']) : null,
    );
  }
}

/// Academic course or classroom enrollment details.
class CourseInfo {
  /// Internal course database ID.
  final int id;

  /// Course or grade level title (e.g. "Grade 10").
  final String courseName;

  /// Classroom division or section (e.g. "A").
  final String section;

  /// Academic term or calendar year (e.g. "2024-2025").
  final String academicYear;

  /// Name of the primary class teacher or instructor.
  final String? classTeacherName;

  /// Creates a [CourseInfo] instance.
  CourseInfo({
    required this.id,
    required this.courseName,
    required this.section,
    required this.academicYear,
    this.classTeacherName,
  });

  /// Deserializes a [CourseInfo] from JSON.
  factory CourseInfo.fromJson(Map<String, dynamic> json) {
    return CourseInfo(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      courseName: json['courseName'] ?? '',
      section: json['section'] ?? '',
      academicYear: json['academicYear'] ?? '',
      classTeacherName:
          json['teacher'] != null ? json['teacher']['name'] : null,
    );
  }
}

/// An individual daily attendance record marked by faculty.
class AttendanceRecord {
  /// Record unique identifier.
  final int id;

  /// Calendar date string of the attendance check.
  final String date;

  /// Attendance status indicator ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED').
  final String status;

  /// Name of the teacher who submitted this attendance mark.
  final String? teacherName;

  /// Creates an [AttendanceRecord] instance.
  AttendanceRecord({
    required this.id,
    required this.date,
    required this.status,
    this.teacherName,
  });

  /// Deserializes an [AttendanceRecord] from JSON.
  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      date: json['date'] ?? '',
      status: json['status'] ?? 'PRESENT',
      teacherName: json['teacher'] != null ? json['teacher']['name'] : null,
    );
  }
}

/// Timetable item representing an individual class period in the weekly schedule.
class RoutineItem {
  /// Unique routine slot identifier.
  final int id;

  /// Class period ordinal or identifier (e.g. '1', '2').
  final String period;

  /// Academic subject name (e.g. 'Mathematics').
  final String subject;

  /// Day of the week for this timetable slot (e.g. 'Monday').
  final String dayOfWeek;

  /// Scheduled period start time (e.g. '09:00 AM').
  final String? startTime;

  /// Scheduled period end time (e.g. '09:45 AM').
  final String? endTime;

  /// Classroom or hall number assignment.
  final String? roomNo;

  /// Name of the faculty member conducting the class.
  final String? teacherName;

  /// Creates a [RoutineItem] instance.
  RoutineItem({
    required this.id,
    required this.period,
    required this.subject,
    required this.dayOfWeek,
    this.startTime,
    this.endTime,
    this.roomNo,
    this.teacherName,
  });

  /// Deserializes a [RoutineItem] from JSON.
  factory RoutineItem.fromJson(Map<String, dynamic> json) {
    return RoutineItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      period: json['period']?.toString() ?? '1',
      subject: json['subject'] ?? '',
      dayOfWeek: json['dayOfWeek'] ?? '',
      startTime: json['startTime'],
      endTime: json['endTime'],
      roomNo: json['roomNo'],
      teacherName: json['teacher'] != null ? json['teacher']['name'] : null,
    );
  }
}

/// Administrative circular or notice bulletin posted for students or school-wide.
class NoticeItem {
  /// Unique notice identifier.
  final int id;

  /// Headline title of the announcement.
  final String title;

  /// Detailed descriptive content or body text.
  final String content;

  /// Remote URL to an attached PDF or media document, if present.
  final String? attachmentUrl;

  /// Date string when published.
  final String? date;

  /// Target audience filter (e.g. 'ALL', 'STUDENT', 'CLASS').
  final String audience;

  /// Creates a [NoticeItem] announcement instance.
  NoticeItem({
    required this.id,
    required this.title,
    required this.content,
    this.attachmentUrl,
    this.date,
    required this.audience,
  });

  /// Deserializes a [NoticeItem] from JSON.
  factory NoticeItem.fromJson(Map<String, dynamic> json) {
    return NoticeItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      attachmentUrl: json['attachmentUrl'],
      date: json['date'] ?? json['createdAt'],
      audience: json['audience'] ?? 'SCHOOL',
    );
  }
}

/// An individual fee billing invoice issued to a student.
class FeeInvoiceItem {
  /// Internal database invoice identifier.
  final int id;

  /// Human-readable billing invoice number (e.g. 'INV-1024').
  final String invoiceNumber;

  /// Category or type of fee (e.g. 'Tuition Fee', 'Library Fee').
  final double amount;

  /// Category name description of fee type.
  final String feeType;

  /// Due date string by which payment must be made.
  final String dueDate;

  /// Settlement status (e.g. 'PAID', 'PENDING', 'PARTIAL').
  final String status;

  /// Historical payment transactions applied to this invoice.
  final List<FeePaymentRecord> payments;

  /// Creates a [FeeInvoiceItem] instance.
  FeeInvoiceItem({
    required this.id,
    required this.invoiceNumber,
    required this.feeType,
    required this.amount,
    required this.dueDate,
    required this.status,
    required this.payments,
  });

  /// Deserializes a [FeeInvoiceItem] from JSON data.
  factory FeeInvoiceItem.fromJson(Map<String, dynamic> json) {
    return FeeInvoiceItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      invoiceNumber: json['invoiceNumber'] ?? 'INV-${json['id']}',
      feeType: json['feeType'] ?? 'Tuition Fee',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      dueDate: json['dueDate'] ?? '',
      status: json['status'] ?? 'PENDING',
      payments: (json['payments'] as List? ?? [])
          .map((p) => FeePaymentRecord.fromJson(p))
          .toList(),
    );
  }

  /// Calculates the cumulative monetary amount paid across all settled payments.
  double get paidAmount => payments.fold(0.0, (acc, p) => acc + p.amount);

  /// Calculates remaining balance left unpaid on this invoice.
  double get pendingAmount => (amount - paidAmount).clamp(0.0, double.infinity);
}

/// A transaction record of a monetary payment applied against an invoice.
class FeePaymentRecord {
  /// Unique payment transaction ID.
  final int id;

  /// Monetary value paid in this transaction.
  final double amount;

  /// Date string when transaction completed.
  final String date;

  /// Transaction settlement status ('SUCCESS', 'FAILED', 'PENDING').
  final String status;

  /// Payment channel used (e.g. 'RAZORPAY', 'CASH', 'UPI').
  final String? paymentMethod;

  /// Institutional receipt voucher number.
  final String? receiptNumber;

  /// Creates a [FeePaymentRecord] instance.
  FeePaymentRecord({
    required this.id,
    required this.amount,
    required this.date,
    required this.status,
    this.paymentMethod,
    this.receiptNumber,
  });

  /// Deserializes a [FeePaymentRecord] from JSON.
  factory FeePaymentRecord.fromJson(Map<String, dynamic> json) {
    return FeePaymentRecord(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] ?? json['createdAt'] ?? '',
      status: json['status'] ?? 'SUCCESS',
      paymentMethod: json['paymentMethod'],
      receiptNumber: json['receiptNumber'],
    );
  }
}

/// Academic homework or coursework assignment assigned to the student's class.
class AssignmentItem {
  /// Unique assignment record identifier.
  final int id;

  /// Assignment headline title.
  final String title;

  /// Instructional text or problem description.
  final String description;

  /// Submission deadline date string.
  final String? dueDate;

  /// Remote link to supplementary task PDF or document.
  final String? attachmentUrl;

  /// Name of the teacher who published the assignment.
  final String? teacherName;

  /// Target course and section identifier.
  final String? courseName;

  /// Date string when assignment was published.
  final String createdAt;

  /// Creates an [AssignmentItem] instance.
  AssignmentItem({
    required this.id,
    required this.title,
    required this.description,
    this.dueDate,
    this.attachmentUrl,
    this.teacherName,
    this.courseName,
    required this.createdAt,
  });

  /// Deserializes an [AssignmentItem] from JSON.
  factory AssignmentItem.fromJson(Map<String, dynamic> json) {
    return AssignmentItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      dueDate: json['dueDate'],
      attachmentUrl: json['attachmentUrl'],
      teacherName: json['teacher'] != null ? json['teacher']['name'] : null,
      courseName: json['course'] != null
          ? '${json['course']['courseName']}-${json['course']['section']}'
          : null,
      createdAt: json['createdAt'] ?? '',
    );
  }
}

/// Grouping of academic results and exam performance reports for a student.
class StudentResultGroup {
  /// Flag indicating whether result cards are temporarily withheld (e.g. pending dues).
  final bool resultOnHold;

  /// Descriptive explanation message displayed if results are withheld.
  final String? holdMessage;

  /// Results from regular weekly quizzes or assessments.
  final List<dynamic> weeklyTests;

  /// Results from term or semester examinations.
  final List<dynamic> terminalExams;

  /// Results from general class assessments.
  final List<dynamic> generalExams;

  /// Creates a [StudentResultGroup] instance.
  StudentResultGroup({
    required this.resultOnHold,
    this.holdMessage,
    required this.weeklyTests,
    required this.terminalExams,
    required this.generalExams,
  });

  /// Deserializes a [StudentResultGroup] from JSON.
  factory StudentResultGroup.fromJson(Map<String, dynamic> json) {
    return StudentResultGroup(
      resultOnHold: json['resultOnHold'] == true,
      holdMessage: json['message'],
      weeklyTests: json['weeklyTests'] as List? ?? [],
      terminalExams: json['terminalExams'] as List? ?? [],
      generalExams: json['exams'] as List? ?? [],
    );
  }
}

/// Examination schedule timetable overview for an entire assessment cycle.
class ExamTimetableItem {
  /// Timetable entry identifier.
  final int id;

  /// Title of the exam series (e.g. 'First Term Midterms 2024').
  final String title;

  /// Examination classification category (e.g. 'MIDTERM', 'FINAL', 'UNIT_TEST').
  final String examType;

  /// Academic school year of the examination series.
  final String academicYear;

  /// Publication status flag indicating whether students can view the schedule.
  final bool published;

  /// Associated course and section title.
  final String? courseName;

  /// Scheduled subject slots and dates included in this timetable.
  final List<ExamTimetableSlot> items;

  /// Creates an [ExamTimetableItem] schedule instance.
  ExamTimetableItem({
    required this.id,
    required this.title,
    required this.examType,
    required this.academicYear,
    required this.published,
    this.courseName,
    required this.items,
  });

  /// Deserializes an [ExamTimetableItem] from JSON.
  factory ExamTimetableItem.fromJson(Map<String, dynamic> json) {
    String? courseStr;
    if (json['course'] != null) {
      courseStr =
          '${json['course']['courseName']}-${json['course']['section']}';
    }
    return ExamTimetableItem(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title'] ?? '',
      examType: json['examType'] ?? 'EXAM',
      academicYear: json['academicYear'] ?? '',
      published: json['published'] == true,
      courseName: courseStr,
      items: (json['items'] as List? ?? [])
          .map((i) => ExamTimetableSlot.fromJson(i))
          .toList(),
    );
  }
}

/// An individual exam paper or subject time slot within an examination timetable.
class ExamTimetableSlot {
  /// Internal timetable slot identifier.
  final int id;

  /// Name of the academic subject being tested (e.g. 'Physics').
  final String subject;

  /// Date string on which the paper is administered.
  final String examDate;

  /// Scheduled paper start time (e.g. '10:00 AM').
  final String startTime;

  /// Scheduled paper finish time (e.g. '01:00 PM').
  final String endTime;

  /// Maximum possible marks or total points allocated.
  final double? maxMarks;

  /// Assigned examination hall or room number.
  final String? roomNo;

  /// Creates an [ExamTimetableSlot] instance.
  ExamTimetableSlot({
    required this.id,
    required this.subject,
    required this.examDate,
    required this.startTime,
    required this.endTime,
    this.maxMarks,
    this.roomNo,
  });

  /// Deserializes an [ExamTimetableSlot] from JSON.
  factory ExamTimetableSlot.fromJson(Map<String, dynamic> json) {
    return ExamTimetableSlot(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      subject: json['subject'] ?? '',
      examDate: json['examDate'] ?? '',
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
      maxMarks: (json['maxMarks'] as num?)?.toDouble(),
      roomNo: json['roomNo'],
    );
  }
}
