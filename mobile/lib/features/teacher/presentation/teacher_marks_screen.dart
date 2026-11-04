import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/teacher_models.dart';
import 'teacher_dashboard_screen.dart';
import 'teacher_attendance_screen.dart';

/// Riverpod provider returning all exams accessible to the teacher.
final teacherExamsProvider =
    FutureProvider.autoDispose<List<TeacherExamItem>>((ref) async {
  final repo = ref.watch(teacherRepositoryProvider);
  return await repo.getExams();
});

/// Interactive screen allowing teachers to create exams and enter student marks/grades.
///
/// Features:
/// - Dropdown or chip selection of exams.
/// - Subject and Max Marks configuration.
/// - Editable student marks sheet table with inline score input.
/// - Client-side validation ensuring marks do not exceed maximum achievable score.
/// - Dialog to create new tests and exams (Weekly, Surprise, Term exams, etc.).
class TeacherMarksScreen extends ConsumerStatefulWidget {
  /// Constructs a [TeacherMarksScreen].
  const TeacherMarksScreen({super.key});

  @override
  ConsumerState<TeacherMarksScreen> createState() => _TeacherMarksScreenState();
}

class _TeacherMarksScreenState extends ConsumerState<TeacherMarksScreen> {
  /// Currently selected exam item.
  TeacherExamItem? _selectedExam;

  /// Current subject being graded.
  String _subject = '';

  /// Maximum marks value for this exam and subject.
  double _maxMarks = 100.0;

  /// Roster of students and their marks in the loaded sheet.
  List<MarksSheetStudentRow> _studentRows = [];

  /// Whether marks sheet is currently loading from network.
  bool _isLoadingSheet = false;

  /// Whether updated marks are currently saving to backend.
  bool _isSavingMarks = false;

  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _maxMarksController = TextEditingController();
  final Map<int, TextEditingController> _marksControllers = {};

  @override
  void dispose() {
    _subjectController.dispose();
    _maxMarksController.dispose();
    for (final c in _marksControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  /// Loads the student marks sheet for [exam] and optional [customSubject].
  Future<void> _loadMarksSheet(TeacherExamItem exam,
      {String? customSubject}) async {
    final sub = (customSubject ?? exam.subject ?? 'General').trim();
    final maxM = exam.maxMarks ?? 100.0;
    setState(() {
      _selectedExam = exam;
      _subject = sub.isEmpty ? 'General' : sub;
      _subjectController.text = _subject;
      _maxMarks = maxM;
      _maxMarksController.text = _maxMarks.toStringAsFixed(0);
      _isLoadingSheet = true;
    });

    try {
      final repo = ref.read(teacherRepositoryProvider);
      final data = await repo.getMarksSheet(
        courseId: exam.courseId,
        examId: exam.id,
        subject: _subject,
      );

      final studentsRaw = (data['students'] as List? ?? []);
      _studentRows =
          studentsRaw.map((s) => MarksSheetStudentRow.fromJson(s)).toList();

      _marksControllers.clear();
      for (final s in _studentRows) {
        _marksControllers[s.studentId] = TextEditingController(
          text: s.marksObtained != null ? s.marksObtained.toString() : '',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Unable to load marks sheet. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _isLoadingSheet = false);
    }
  }

  /// Validates inputs and persists entered student marks to the backend.
  Future<void> _saveMarks() async {
    if (_selectedExam == null || _studentRows.isEmpty) return;

    final parsedMaxMarks =
        double.tryParse(_maxMarksController.text.trim()) ?? _maxMarks;
    final parsedSubject = _subjectController.text.trim();

    if (parsedSubject.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Please specify a valid subject name.')));
      return;
    }

    final marksData = <Map<String, dynamic>>[];
    for (final s in _studentRows) {
      final text = _marksControllers[s.studentId]?.text.trim() ?? '';
      if (text.isNotEmpty) {
        final obt = double.tryParse(text);
        if (obt == null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(
                  'Invalid mark value for ${s.name}. Please enter a number.')));
          return;
        }
        if (obt < 0 || obt > parsedMaxMarks) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(
                  'Marks for ${s.name} ($obt) cannot exceed Max Marks ($parsedMaxMarks) or be negative.')));
          return;
        }
        marksData.add({
          'studentId': s.studentId,
          'marksObtained': obt,
          'remarks': s.remarks,
        });
      }
    }

    if (marksData.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No marks entered to save.')));
      return;
    }

    setState(() => _isSavingMarks = true);
    try {
      final repo = ref.read(teacherRepositoryProvider);
      await repo.saveMarks(
        courseId: _selectedExam!.courseId,
        examId: _selectedExam!.id,
        subject: parsedSubject,
        maxMarks: parsedMaxMarks,
        marksData: marksData,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.successGreen,
            content: Text('Marks recorded and synchronized successfully!'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Unable to save marks. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _isSavingMarks = false);
    }
  }

  /// Displays dialog allowing the teacher to define a new test or exam schedule.
  Future<void> _showCreateExamDialog() async {
    final classesAsync = ref.read(teacherClassesProvider);
    final classes = classesAsync.value ?? [];
    if (classes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No classes assigned to create an exam.')),
      );
      return;
    }

    int selectedCourseId = classes.first.courseId;
    String examName = '';
    String term = 'Term 1';
    String academicYear = '2025-2026';
    String examType = 'WEEKLY';
    String subject = 'Mathematics';
    double maxMarks = 50.0;
    String portion = '';

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Create New Exam / Test',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<int>(
                  initialValue: selectedCourseId,
                  isExpanded: true,
                  decoration:
                      const InputDecoration(labelText: 'Class / Course'),
                  items: classes.map((c) {
                    return DropdownMenuItem(
                      value: c.courseId,
                      child: Text('${c.courseName}-${c.section}'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() => selectedCourseId = val);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Exam / Test Name',
                    hintText: 'e.g. Unit Test 2 or Mid-Term Assessment',
                  ),
                  onChanged: (val) => examName = val.trim(),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: examType,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Exam Type'),
                  items: const [
                    DropdownMenuItem(
                        value: 'WEEKLY', child: Text('Weekly Test')),
                    DropdownMenuItem(
                        value: 'SURPRISE', child: Text('Surprise Test')),
                    DropdownMenuItem(
                        value: 'GENERAL', child: Text('General Exam')),
                    DropdownMenuItem(
                        value: 'HALF_YEARLY', child: Text('Half-Yearly Exam')),
                    DropdownMenuItem(
                        value: 'ANNUAL', child: Text('Annual Exam')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() => examType = val);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    hintText: 'e.g. Mathematics, Science',
                  ),
                  controller: TextEditingController(text: subject),
                  onChanged: (val) => subject = val.trim(),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        keyboardType: TextInputType.number,
                        decoration:
                            const InputDecoration(labelText: 'Max Marks'),
                        controller: TextEditingController(text: '50'),
                        onChanged: (val) {
                          final p = double.tryParse(val);
                          if (p != null) maxMarks = p;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: term,
                        decoration: const InputDecoration(labelText: 'Term'),
                        items: const [
                          DropdownMenuItem(
                              value: 'Term 1', child: Text('Term 1')),
                          DropdownMenuItem(
                              value: 'Term 2', child: Text('Term 2')),
                          DropdownMenuItem(
                              value: 'Annual', child: Text('Annual')),
                        ],
                        onChanged: (val) {
                          if (val != null) setDialogState(() => term = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Syllabus / Portion (Optional)',
                    hintText: 'e.g. Chapters 3 & 4',
                  ),
                  onChanged: (val) => portion = val.trim(),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (examName.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Exam name is required')),
                  );
                  return;
                }
                Navigator.pop(ctx);
                try {
                  final repo = ref.read(teacherRepositoryProvider);
                  await repo.createExam(
                    courseId: selectedCourseId,
                    examName: examName,
                    term: term,
                    academicYear: academicYear,
                    examType: examType,
                    subject: subject.isEmpty ? null : subject,
                    maxMarks: maxMarks,
                    portion: portion.isEmpty ? null : portion,
                  );
                  ref.refresh(teacherExamsProvider);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: AppTheme.successGreen,
                        content: Text('Exam created successfully!'),
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Unable to create exam. Please try again.')),
                    );
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final examsAsync = ref.watch(teacherExamsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Exams & Marks Entry'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            tooltip: 'Create New Exam',
            onPressed: _showCreateExamDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(teacherExamsProvider),
          ),
        ],
      ),
      body: examsAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 120),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              ApiClient.parseError(err),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
            ),
          ),
        ),
        data: (exams) {
          if (exams.isEmpty) {
            return Center(
              child: Text('No exams scheduled for your classes.',
                  style: GoogleFonts.inter(color: AppTheme.textMuted)),
            );
          }

          return Column(
            children: [
              // Exam Selection & Configuration
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    DropdownButtonFormField<TeacherExamItem>(
                      initialValue:
                          exams.contains(_selectedExam) ? _selectedExam : null,
                      isExpanded: true,
                      decoration: const InputDecoration(
                          labelText: 'Select Exam to Grade'),
                      items: exams.map((e) {
                        return DropdownMenuItem(
                          value: e,
                          child: Text(
                            '${e.examName} (${e.courseName ?? "Class"})',
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (exam) {
                        if (exam != null) _loadMarksSheet(exam);
                      },
                    ),
                    if (_selectedExam != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextField(
                              controller: _subjectController,
                              decoration: const InputDecoration(
                                labelText: 'Subject',
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                              ),
                              onSubmitted: (val) {
                                if (_selectedExam != null &&
                                    val.trim().isNotEmpty) {
                                  _loadMarksSheet(_selectedExam!,
                                      customSubject: val.trim());
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 1,
                            child: TextField(
                              controller: _maxMarksController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Max Marks',
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                              ),
                              onChanged: (val) {
                                final parsed = double.tryParse(val);
                                if (parsed != null && parsed > 0) {
                                  setState(() => _maxMarks = parsed);
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const Divider(height: 1),

              // Marks Entry List
              Expanded(
                child: _isLoadingSheet
                    ? const SkeletonListLoader(itemCount: 6, itemHeight: 80)
                    : _selectedExam == null
                        ? Center(
                            child: Text(
                                'Select an exam above to start grading.',
                                style: GoogleFonts.inter(
                                    color: AppTheme.textMuted)),
                          )
                        : _studentRows.isEmpty
                            ? Center(
                                child: Text('No students found for this exam.',
                                    style: GoogleFonts.inter(
                                        color: AppTheme.textMuted)),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(12),
                                itemCount: _studentRows.length,
                                itemBuilder: (ctx, i) {
                                  final s = _studentRows[i];
                                  final controller =
                                      _marksControllers[s.studentId];

                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 14, vertical: 10),
                                      child: Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 16,
                                            backgroundColor:
                                                const Color(0xFFE2E8F0),
                                            child: Text(s.rollNumber,
                                                style: GoogleFonts.inter(
                                                    fontSize: 11,
                                                    fontWeight:
                                                        FontWeight.bold)),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Text(s.name,
                                                style: GoogleFonts.inter(
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 14)),
                                          ),
                                          SizedBox(
                                            width: 80,
                                            child: TextField(
                                              controller: controller,
                                              keyboardType:
                                                  TextInputType.number,
                                              textAlign: TextAlign.center,
                                              decoration: InputDecoration(
                                                hintText: '/$_maxMarks',
                                                contentPadding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 8,
                                                        horizontal: 8),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
              ),

              // Save Marks Bar
              if (_selectedExam != null && _studentRows.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.teacherAccent),
                    onPressed: _isSavingMarks ? null : _saveMarks,
                    child: _isSavingMarks
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Save Marks'),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
