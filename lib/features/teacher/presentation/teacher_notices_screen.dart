import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import 'teacher_dashboard_screen.dart';

/// Riverpod provider returning school circulars and faculty notices.
final teacherNoticesProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final user = ref.watch(authNotifierProvider).user;
  final schoolId = user?.schoolId ?? 1;
  final repo = ref.watch(teacherRepositoryProvider);
  return await repo.getNotices(schoolId: schoolId);
});

/// Screen displaying official announcements and notices directed to faculty members.
///
/// Features:
/// - List of notices tagged by audience category (e.g. ALL, TEACHER).
/// - Publication date formatting.
/// - Attachment link handler opening external documents via [launchUrl].
class TeacherNoticesScreen extends ConsumerWidget {
  /// Constructs a [TeacherNoticesScreen].
  const TeacherNoticesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final noticesAsync = ref.watch(teacherNoticesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Faculty Notice Board'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(teacherNoticesProvider),
          ),
        ],
      ),
      body: noticesAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 5, itemHeight: 90),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              ref.read(apiClientProvider).parseErrorMessage(err),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
            ),
          ),
        ),
        data: (notices) {
          if (notices.isEmpty) {
            return Center(
              child: Text(
                'No announcements posted.',
                style: GoogleFonts.inter(color: AppTheme.textMuted),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: notices.length,
            itemBuilder: (ctx, idx) {
              final note = notices[idx];
              final title = note['title'] ?? 'Notice';
              final content = note['content'] ?? '';
              final audience = note['audience'] ?? 'ALL';
              final dateStr = note['date'] ?? note['createdAt'];
              final attachmentUrl = note['attachmentUrl'];

              String formattedDate = '';
              if (dateStr != null) {
                try {
                  formattedDate = DateFormat('MMM dd, yyyy')
                      .format(DateTime.parse(dateStr.toString()));
                } catch (_) {
                  formattedDate = dateStr.toString();
                }
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
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.teacherAccent
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              audience.toString(),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.teacherAccent,
                              ),
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
                      const SizedBox(height: 10),
                      Text(
                        title.toString(),
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppTheme.textDark,
                        ),
                      ),
                      if (content.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          content.toString(),
                          style: GoogleFonts.inter(
                              fontSize: 13, color: const Color(0xFF475569)),
                        ),
                      ],
                      if (attachmentUrl != null &&
                          attachmentUrl.toString().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final rawUrl = attachmentUrl.toString();
                            final fullUrl = rawUrl.startsWith('http')
                                ? rawUrl
                                : '${AppConfig.uploadsBaseUrl}$rawUrl';
                            final uri = Uri.tryParse(fullUrl);
                            if (uri != null && (uri.isScheme('http') || uri.isScheme('https')) && await canLaunchUrl(uri)) {
                              await launchUrl(uri,
                                  mode: LaunchMode.externalApplication);
                            } else {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content:
                                          Text('Could not open attachment.')),
                                );
                              }
                            }
                          },
                          icon: const Icon(Icons.picture_as_pdf,
                              color: AppTheme.errorRed, size: 18),
                          label: const Text('View PDF Attachment'),
                        ),
                      ],
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
