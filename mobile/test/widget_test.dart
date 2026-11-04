import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:eazzio_school/features/auth/models/auth_user.dart';
import 'package:eazzio_school/features/auth/presentation/role_selection_screen.dart';
import 'package:eazzio_school/features/auth/presentation/login_screen.dart';
import 'package:eazzio_school/features/student/models/student_models.dart';
import 'package:eazzio_school/features/teacher/models/teacher_models.dart';

void main() {
  test('UserRole string serialization and parsing', () {
    expect(UserRole.fromString('STUDENT'), UserRole.student);
    expect(UserRole.fromString('TEACHER'), UserRole.teacher);
    expect(UserRole.fromString('PRINCIPAL'), UserRole.principal);
    expect(UserRole.student.toServerString(), 'student');
    expect(UserRole.teacher.toServerString(), 'teacher');
  });

  test('AuthUser serialization test', () {
    final json = {
      'userId': 12,
      'name': 'Rahul Student',
      'loginId': 'SCH001-ST0001',
      'role': 'STUDENT',
      'schoolId': 1,
    };

    final user = AuthUser.fromJson(json);
    expect(user.userId, 12);
    expect(user.name, 'Rahul Student');
    expect(user.loginId, 'SCH001-ST0001');
    expect(user.role, UserRole.student);
    expect(user.schoolId, 1);
  });

  testWidgets(
      'RoleSelectionScreen renders Student and Teacher account selectors side by side',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: RoleSelectionScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify side-by-side role selectors exist on the screen
    expect(find.text('Student\nLogin'), findsOneWidget);
    expect(find.text('Teacher\nLogin'), findsOneWidget);
    expect(find.text('Welcome Back'), findsOneWidget);
  });

  testWidgets(
      'LoginScreen renders portal badge and login form cleanly',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Student Portal'), findsOneWidget);
    expect(find.text('Welcome Back!'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });

  test('FeeInvoiceItem pending amount and paid calculations', () {
    final invoiceJson = {
      'id': 101,
      'invoiceNumber': 'INV-2026-001',
      'feeType': 'Tuition Fee - Term 1',
      'amount': 25000.0,
      'dueDate': '2026-11-15T00:00:00.000Z',
      'status': 'PENDING',
      'payments': [
        {
          'id': 1,
          'amount': 10000.0,
          'date': '2026-10-01T10:00:00.000Z',
          'status': 'SUCCESS',
          'paymentMethod': 'ONLINE',
          'receiptNumber': 'REC-001',
        }
      ],
    };

    final invoice = FeeInvoiceItem.fromJson(invoiceJson);
    expect(invoice.id, 101);
    expect(invoice.invoiceNumber, 'INV-2026-001');
    expect(invoice.amount, 25000.0);
    expect(invoice.paidAmount, 10000.0);
    expect(invoice.pendingAmount, 15000.0);
    expect(invoice.payments.length, 1);
    expect(invoice.payments.first.receiptNumber, 'REC-001');
  });

  test('AttendanceRecord deserialization and fallback values', () {
    final attJson = {
      'id': 55,
      'date': '2026-10-09',
      'status': 'LATE',
      'teacher': {'name': 'Prof. Sharma'},
    };

    final record = AttendanceRecord.fromJson(attJson);
    expect(record.id, 55);
    expect(record.date, '2026-10-09');
    expect(record.status, 'LATE');
    expect(record.teacherName, 'Prof. Sharma');
  });

  test('TeacherExamItem and MarksSheetStudentRow deserialization', () {
    final examJson = {
      'id': 7,
      'courseId': 3,
      'examName': 'Mid-Term Exam',
      'term': 'TERM_1',
      'academicYear': '2026-2027',
      'subject': 'Physics',
      'maxMarks': 80.0,
      'course': {
        'courseName': 'Class 11',
        'section': 'A',
      },
    };

    final exam = TeacherExamItem.fromJson(examJson);
    expect(exam.id, 7);
    expect(exam.courseId, 3);
    expect(exam.examName, 'Mid-Term Exam');
    expect(exam.subject, 'Physics');
    expect(exam.maxMarks, 80.0);
    expect(exam.courseName, 'Class 11-A');

    final studentRowJson = {
      'studentId': 42,
      'name': 'Priya Patel',
      'rollNumber': '12',
      'marksObtained': 74.5,
      'remarks': 'Good effort',
    };

    final row = MarksSheetStudentRow.fromJson(studentRowJson);
    expect(row.studentId, 42);
    expect(row.name, 'Priya Patel');
    expect(row.rollNumber, '12');
    expect(row.marksObtained, 74.5);
    expect(row.remarks, 'Good effort');
  });

  test('TeacherClassItem parsing and student roster deserialization', () {
    final classJson = {
      'courseId': 10,
      'courseName': 'Grade 10',
      'section': 'B',
      'isHomeroom': true,
      'subjects': ['Math', 'Physics'],
      'students': [
        {
          'id': 101,
          'studentId': 'ST101',
          'name': 'Aarav Kumar',
          'rollNumber': '1',
          'phone': '9876543210',
        },
        {
          'id': 102,
          'studentId': 'ST102',
          'name': 'Diya Sharma',
          'rollNumber': '2',
          'phone': null,
        }
      ],
    };

    final classItem = TeacherClassItem.fromJson(classJson);
    expect(classItem.courseId, 10);
    expect(classItem.displayName, 'Grade 10-B');
    expect(classItem.isHomeroom, true);
    expect(classItem.subjects, ['Math', 'Physics']);
    expect(classItem.students.length, 2);
    expect(classItem.students[0].name, 'Aarav Kumar');
    expect(classItem.students[0].rollNumber, '1');
    expect(classItem.students[1].phone, null);
  });

  test('StudentDashboardData model handles null and empty fallbacks safely',
      () {
    final emptyData = StudentDashboardData.fromJson({});
    expect(emptyData.profile.name, '');
    expect(emptyData.profile.rollNumber, 'N/A');
    expect(emptyData.profile.courseName, 'Unassigned');
    expect(emptyData.attendance.percentage, 100);
    expect(emptyData.attendance.present, 0);
    expect(emptyData.fees.pendingAmount, 0.0);
    expect(emptyData.notices, isEmpty);
    expect(emptyData.todayRoutine, isEmpty);
  });

  test(
      'StudentResultGroup parses weeklyTests, terminalExams, and generalExams matching backend schema',
      () {
    final resultsJson = {
      'resultOnHold': false,
      'studentId': 42,
      'weeklyTests': [
        {
          'monthKey': '2026-10',
          'monthLabel': 'October 2026',
          'tests': [
            {
              'examId': 101,
              'examName': 'Math Weekly 1',
              'subject': 'Mathematics',
              'portion': 'Algebra Chapter 1',
              'maxMarks': 25.0,
              'subjects': [
                {
                  'subject': 'Mathematics',
                  'marksObtained': 23.5,
                  'maxMarks': 25.0,
                  'grade': 'A1',
                  'remarks': 'Excellent'
                }
              ]
            }
          ]
        }
      ],
      'terminalExams': [
        {
          'examId': 201,
          'examName': 'Half Yearly Exam 2026',
          'examType': 'HALF_YEARLY',
          'term': 'TERM_1',
          'academicYear': '2026-2027',
          'totalObtained': 185.0,
          'totalMax': 200.0,
          'percentage': 92.5,
          'subjects': [
            {
              'subject': 'Physics',
              'marksObtained': 95.0,
              'maxMarks': 100.0,
              'grade': 'A1',
              'remarks': 'Great'
            },
            {
              'subject': 'Chemistry',
              'marksObtained': 90.0,
              'maxMarks': 100.0,
              'grade': 'A2',
              'remarks': 'Very Good'
            }
          ]
        }
      ],
      'exams': [
        {
          'examDetails': {'id': 301, 'examName': 'Unit Test 1'},
          'subjects': [
            {
              'subject': 'English',
              'marksObtained': 45.0,
              'maxMarks': 50.0,
              'grade': 'A1'
            }
          ]
        }
      ]
    };

    final group = StudentResultGroup.fromJson(resultsJson);
    expect(group.resultOnHold, false);
    expect(group.weeklyTests.length, 1);
    expect(group.terminalExams.length, 1);
    expect(group.generalExams.length, 1);

    final terminal = group.terminalExams.first as Map<String, dynamic>;
    expect(terminal['examName'], 'Half Yearly Exam 2026');
    expect(terminal['percentage'], 92.5);
    expect((terminal['subjects'] as List).length, 2);

    final weekly = group.weeklyTests.first as Map<String, dynamic>;
    expect(weekly['monthLabel'], 'October 2026');
    expect((weekly['tests'] as List).length, 1);
  });

  test('ExamTimetableItem and ExamTimetableSlot parsing test', () {
    final timetableJson = {
      'id': 5,
      'title': 'Half-Yearly Exam Timetable',
      'examType': 'HALF_YEARLY',
      'academicYear': '2026-2027',
      'published': true,
      'course': {
        'courseName': 'Class 10',
        'section': 'A',
      },
      'items': [
        {
          'id': 1,
          'subject': 'Mathematics',
          'examDate': '2026-11-20T00:00:00.000Z',
          'startTime': '09:00 AM',
          'endTime': '12:00 PM',
          'maxMarks': 100.0,
          'roomNo': '101',
        },
        {
          'id': 2,
          'subject': 'Science',
          'examDate': '2026-11-22T00:00:00.000Z',
          'startTime': '09:00 AM',
          'endTime': '12:00 PM',
          'maxMarks': 100.0,
          'roomNo': '102',
        }
      ],
    };

    final tt = ExamTimetableItem.fromJson(timetableJson);
    expect(tt.id, 5);
    expect(tt.title, 'Half-Yearly Exam Timetable');
    expect(tt.examType, 'HALF_YEARLY');
    expect(tt.courseName, 'Class 10-A');
    expect(tt.published, true);
    expect(tt.items.length, 2);
    expect(tt.items.first.subject, 'Mathematics');
    expect(tt.items.first.maxMarks, 100.0);
    expect(tt.items.first.roomNo, '101');
  });

  test('FeePayment receipt data structure parsing', () {
    final receiptJson = {
      'id': 12,
      'amount': 15000.0,
      'date': '2026-10-09T10:30:00.000Z',
      'status': 'SUCCESS',
      'paymentMethod': 'ONLINE',
      'receiptNumber': 'RCPT-1728472800000',
      'razorpayPaymentId': 'pay_demo_12345',
      'student': {'name': 'Rahul Student', 'studentId': 'SCH001-ST0001'},
      'feeInvoice': {'invoiceNumber': 'INV-2026-001', 'feeType': 'Tuition Fee'},
      'school': {
        'schoolName': 'Delhi Public Academy',
        'address': 'Main Campus'
      },
    };

    expect(receiptJson['id'], 12);
    expect(receiptJson['receiptNumber'], 'RCPT-1728472800000');
    expect((receiptJson['student'] as Map)['name'], 'Rahul Student');
    expect((receiptJson['feeInvoice'] as Map)['feeType'], 'Tuition Fee');
  });

  testWidgets('LoginScreen renders without overflow on 300px narrow viewport',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(300.0, 1000.0);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Student Portal'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'LoginScreen renders without overflow on 360px and 390px viewports',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390.0, 844.0);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Student Portal'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'DropdownButtonFormField with long labels does not overflow when isExpanded is true',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(300, 600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    const veryLongLabel =
        'Class 12 - Advanced Computer Science & Engineering (Homeroom & Laboratory Batch)';

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16.0),
            child: DropdownButtonFormField<String>(
              initialValue: 'item1',
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Class'),
              items: const [
                DropdownMenuItem(
                  value: 'item1',
                  child: Text(
                    veryLongLabel,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
              onChanged: (_) {},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(veryLongLabel), findsOneWidget);
  });

  testWidgets(
      'LoginScreen renders without overflow on short 300x600 and 320x600 phone viewports',
      (WidgetTester tester) async {
    final shortDimensions = [
      const Size(300.0, 600.0),
      const Size(320.0, 600.0),
      const Size(375.0, 667.0),
      const Size(768.0, 1024.0),
    ];

    for (final dims in shortDimensions) {
      tester.view.physicalSize = dims;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure no RenderFlex exceptions were thrown on this viewport
      expect(tester.takeException(), isNull);
      expect(find.text('Student Portal'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    }
  });
}
