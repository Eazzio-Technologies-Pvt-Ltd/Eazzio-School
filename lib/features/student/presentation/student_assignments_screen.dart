import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/student_models.dart';
import 'student_dashboard_screen.dart';
import 'package:eazzio_school/features/shared/presentation/pdf_viewer_screen.dart';

/// Auto-dispose provider fetching assigned homework and tasks for the student's class.
final studentAssignmentsProvider =
    FutureProvider.autoDispose<List<AssignmentItem>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getAssignments();
});

/// Presentation screen listing homework and coursework assignments.
///
/// Features:
/// - List of class assignments with title, description, instructor, and course tags.
/// - Overdue and pending due date chips.
/// - Direct PDF viewer integration for downloadable attachment files via [PdfViewerScreen].
/// - Pull-to-refresh and network error handling.
class StudentAssignmentsScreen extends ConsumerWidget {
  /// Creates a [StudentAssignmentsScreen] instance.
  const StudentAssignmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignmentsAsync = ref.watch(studentAssignmentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Homework & Assignments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(studentAssignmentsProvider),
          ),
        ],
      ),
      body: assignmentsAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 5, itemHeight: 100),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_rounded, size: 40, color: AppTheme.errorRed),
                const SizedBox(height: 8),
                Text(
                  ApiClient.parseError(err),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        data: (assignments) {
          if (assignments.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.task_alt,
                      size: 48, color: AppTheme.textMuted),
                  const SizedBox(height: 12),
                  Text('No assignments posted for your class yet.',
                      style: GoogleFonts.inter(color: AppTheme.textMuted)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(studentAssignmentsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: assignments.length,
              itemBuilder: (ctx, i) {
                final item = assignments[i];
                DateTime? due;
                if (item.dueDate != null) {
                  due = DateTime.tryParse(item.dueDate!);
                }
                final isOverdue = due != null && due.isBefore(DateTime.now());

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
                                item.title,
                                style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textDark),
                              ),
                            ),
                            if (due != null)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: (isOverdue
                                          ? AppTheme.errorRed
                                          : AppTheme.studentAccent)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isOverdue
                                      ? 'Overdue'
                                      : 'Due: ${DateFormat('dd MMM').format(due)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isOverdue
                                        ? AppTheme.errorRed
                                        : AppTheme.studentAccent,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.description,
                          style: GoogleFonts.inter(
                              fontSize: 13, color: AppTheme.textDark),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Teacher: ${item.teacherName ?? "Class Faculty"}',
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: AppTheme.textMuted),
                            ),
                            if (item.attachmentUrl != null &&
                                item.attachmentUrl!.isNotEmpty)
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                icon: const Icon(Icons.attachment,
                                    size: 16, color: AppTheme.primaryBlue),
                                label: Text('Attachment',
                                    style: GoogleFonts.inter(
                                        fontSize: 12,
                                        color: AppTheme.primaryBlue)),
                                onPressed: () {
                                  final fullUrl = item.attachmentUrl!
                                          .startsWith('http')
                                      ? item.attachmentUrl!
                                      : '${AppConfig.uploadsBaseUrl}${item.attachmentUrl}';
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => PdfViewerScreen(
                                          title: item.title, pdfUrl: fullUrl),
                                    ),
                                  );
                                },
                              ),
                          ],
                        ),
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
