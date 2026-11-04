import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/teacher_models.dart';
import 'teacher_dashboard_screen.dart';
import 'teacher_attendance_screen.dart';

/// Riverpod provider returning assignments created by or visible to the teacher.
final teacherAssignmentsProvider =
    FutureProvider.autoDispose<List<TeacherAssignmentItem>>((ref) async {
  final repo = ref.watch(teacherRepositoryProvider);
  return await repo.getAssignments();
});

/// Screen allowing teachers to create, review, and delete homework assignments.
///
/// Features:
/// - Floating Action Button opening a creation dialog with class selector and date picker.
/// - List of existing assignments with course tags, due date badges, and deletion controls.
/// - Pull-to-refresh integration.
class TeacherAssignmentsScreen extends ConsumerStatefulWidget {
  /// Constructs a [TeacherAssignmentsScreen].
  const TeacherAssignmentsScreen({super.key});

  @override
  ConsumerState<TeacherAssignmentsScreen> createState() =>
      _TeacherAssignmentsScreenState();
}

class _TeacherAssignmentsScreenState
    extends ConsumerState<TeacherAssignmentsScreen> {
  /// Displays a modal dialog to create a new assignment for one of the [classes].
  void _showCreateAssignmentDialog(List<TeacherClassItem> classes) {
    if (classes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('No assigned classes to post assignments to.')));
      return;
    }

    final titleController = TextEditingController();
    final descController = TextEditingController();
    TeacherClassItem selectedClass = classes.first;
    DateTime? selectedDueDate;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Create Homework',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<TeacherClassItem>(
                  initialValue: selectedClass,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Target Class'),
                  items: classes
                      .map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(
                            c.displayName,
                            overflow: TextOverflow.ellipsis,
                          )))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setDialogState(() => selectedClass = val);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleController,
                  decoration:
                      const InputDecoration(labelText: 'Title / Subject Topic'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                      labelText: 'Instructions / Description'),
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading:
                      const Icon(Icons.event, color: AppTheme.teacherAccent),
                  title: Text(
                    selectedDueDate == null
                        ? 'Set Due Date'
                        : 'Due: ${DateFormat('dd MMM yyyy').format(selectedDueDate!)}',
                    style: GoogleFonts.inter(fontSize: 13),
                  ),
                  trailing: const Text('Pick',
                      style: TextStyle(color: AppTheme.primaryBlue)),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 1)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 60)),
                    );
                    if (picked != null) {
                      setDialogState(() => selectedDueDate = picked);
                    }
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final title = titleController.text.trim();
                final desc = descController.text.trim();
                if (title.isEmpty || desc.isEmpty) return;

                Navigator.pop(ctx);
                try {
                  final repo = ref.read(teacherRepositoryProvider);
                  await repo.createAssignment(
                    title: title,
                    description: desc,
                    courseId: selectedClass.courseId,
                    dueDate: selectedDueDate?.toIso8601String(),
                  );
                  ref.refresh(teacherAssignmentsProvider);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Assignment created successfully!')),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Unable to create assignment. Please try again.')),
                    );
                  }
                }
              },
              child: const Text('Post'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final assignmentsAsync = ref.watch(teacherAssignmentsProvider);
    final classesAsync = ref.watch(teacherClassesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assignments Posted'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(teacherAssignmentsProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.teacherAccent,
        onPressed: () {
          classesAsync
              .whenData((classes) => _showCreateAssignmentDialog(classes));
        },
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: assignmentsAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 5, itemHeight: 110),
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
        data: (assignments) {
          if (assignments.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.assignment_outlined,
                      size: 48, color: AppTheme.textMuted),
                  const SizedBox(height: 12),
                  Text('No assignments posted yet.',
                      style: GoogleFonts.inter(color: AppTheme.textMuted)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(teacherAssignmentsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: assignments.length,
              itemBuilder: (ctx, i) {
                final item = assignments[i];
                DateTime? due;
                if (item.dueDate != null) {
                  due = DateTime.tryParse(item.dueDate!);
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
                              child: Text(item.title,
                                  style: GoogleFonts.inter(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16)),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline,
                                  size: 20, color: AppTheme.errorRed),
                              onPressed: () async {
                                final messenger = ScaffoldMessenger.of(context);
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (c) => AlertDialog(
                                    title: const Text('Delete Assignment?'),
                                    content: const Text(
                                        'Are you sure you want to delete this assignment?'),
                                    actions: [
                                      TextButton(
                                          onPressed: () =>
                                              Navigator.pop(c, false),
                                          child: const Text('Cancel')),
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                            backgroundColor: AppTheme.errorRed),
                                        onPressed: () => Navigator.pop(c, true),
                                        child: const Text('Delete'),
                                      ),
                                    ],
                                  ),
                                );

                                if (confirm == true) {
                                  try {
                                    final repo =
                                        ref.read(teacherRepositoryProvider);
                                    await repo.deleteAssignment(item.id);
                                    ref.refresh(teacherAssignmentsProvider);
                                  } catch (e) {
                                    messenger.showSnackBar(
                                        const SnackBar(content: Text('Unable to delete assignment. Please try again.')));
                                  }
                                }
                              },
                            ),
                          ],
                        ),
                        Text('Class: ${item.courseName ?? "Assigned"}',
                            style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppTheme.teacherAccent,
                                fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        Text(item.description,
                            style: GoogleFonts.inter(fontSize: 13)),
                        const SizedBox(height: 10),
                        if (due != null)
                          Text(
                              'Due Date: ${DateFormat('dd MMM yyyy').format(due)}',
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
