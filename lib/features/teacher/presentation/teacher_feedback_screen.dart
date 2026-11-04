import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import 'teacher_attendance_screen.dart';
import 'teacher_dashboard_screen.dart';

/// Riverpod provider returning student remarks and feedback records.
final teacherFeedbackProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(teacherRepositoryProvider);
  return await repo.getFeedbacks();
});

/// Screen allowing teachers to review and post feedback remarks for students.
///
/// Features:
/// - Student selection modal dialog with multi-line note entry.
/// - Feed list of feedback records showing target student details and timestamps.
/// - Pull-to-refresh integration.
class TeacherFeedbackScreen extends ConsumerStatefulWidget {
  /// Constructs a [TeacherFeedbackScreen].
  const TeacherFeedbackScreen({super.key});

  @override
  ConsumerState<TeacherFeedbackScreen> createState() =>
      _TeacherFeedbackScreenState();
}

class _TeacherFeedbackScreenState extends ConsumerState<TeacherFeedbackScreen> {
  final _contentController = TextEditingController();
  int? _selectedStudentId;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  /// Displays dialog allowing the teacher to select a student and submit a remark.
  void _showCreateFeedbackDialog() {
    final classesAsync = ref.read(teacherClassesProvider);
    classesAsync.whenData((classes) {
      final allStudents = classes.expand((c) => c.students).toList();

      showDialog(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: const Text('Add Student Feedback'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (allStudents.isEmpty)
                      const Text('No students enrolled in your classes.')
                    else
                      DropdownButtonFormField<int>(
                        initialValue: _selectedStudentId ??
                            (allStudents.isNotEmpty
                                ? allStudents.first.id
                                : null),
                        isExpanded: true,
                        decoration:
                            const InputDecoration(labelText: 'Select Student'),
                        items: allStudents.map((s) {
                          return DropdownMenuItem<int>(
                            value: s.id,
                            child: Text('${s.name} (${s.rollNumber ?? s.id})'),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setDialogState(() => _selectedStudentId = val);
                        },
                      ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _contentController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Feedback / Remark Content',
                        hintText: 'Enter student behavior or academic notes...',
                      ),
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
                  style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.teacherAccent),
                  onPressed: _isSubmitting || allStudents.isEmpty
                      ? null
                      : () async {
                          final text = _contentController.text.trim();
                          final sId =
                              _selectedStudentId ?? allStudents.first.id;
                          if (text.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Please enter feedback text.')),
                            );
                            return;
                          }

                          Navigator.pop(ctx);
                          setState(() => _isSubmitting = true);
                          try {
                            final repo = ref.read(teacherRepositoryProvider);
                            await repo.createFeedback(
                              targetType: 'STUDENT',
                              targetId: sId,
                              content: text,
                            );
                            _contentController.clear();
                            ref.refresh(teacherFeedbackProvider);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: AppTheme.successGreen,
                                  content:
                                      Text('Feedback submitted successfully!'),
                                ),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text('Unable to submit feedback. Please try again.')),
                              );
                            }
                          } finally {
                            if (mounted) setState(() => _isSubmitting = false);
                          }
                        },
                  child: const Text('Submit'),
                ),
              ],
            );
          },
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final feedbackAsync = ref.watch(teacherFeedbackProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Remarks & Feedback'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(teacherFeedbackProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.teacherAccent,
        icon: const Icon(Icons.add_comment_rounded, color: Colors.white),
        label:
            const Text('Add Feedback', style: TextStyle(color: Colors.white)),
        onPressed: _showCreateFeedbackDialog,
      ),
      body: feedbackAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 95),
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
        data: (feedbacks) {
          if (feedbacks.isEmpty) {
            return Center(
              child: Text(
                'No feedback records found.',
                style: GoogleFonts.inter(color: AppTheme.textMuted),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: feedbacks.length,
            itemBuilder: (ctx, idx) {
              final f = feedbacks[idx];
              final content = f['content'] ?? '';
              final author = f['authorTeacher']?['name'] ??
                  f['authorPrincipal']?['name'] ??
                  'Instructor';
              final student = f['targetStudent'];
              final studentName = student?['name'] ?? 'General Note';
              final studentRoll = student?['rollNumber'] != null
                  ? ' (${student['rollNumber']})'
                  : '';
              final dateStr = f['createdAt'];

              String formattedDate = '';
              if (dateStr != null) {
                try {
                  formattedDate = DateFormat('MMM dd, yyyy')
                      .format(DateTime.parse(dateStr.toString()));
                } catch (_) {}
              }

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              'To: $studentName$studentRoll',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: AppTheme.teacherAccent),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (formattedDate.isNotEmpty)
                            Text(
                              formattedDate,
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: AppTheme.textMuted),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        content.toString(),
                        style: GoogleFonts.inter(
                            fontSize: 14, color: AppTheme.textDark),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'By: $author',
                        style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppTheme.textMuted,
                            fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
