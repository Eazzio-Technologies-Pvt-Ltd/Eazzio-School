import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/student_models.dart';
import 'package:eazzio_school/core/services/notification_service.dart';
import 'package:eazzio_school/features/shared/presentation/pdf_viewer_screen.dart';
import 'notice_details_screen.dart';
import 'student_dashboard_screen.dart';

/// Auto-dispose provider retrieving official circulars and campus notices.
final studentAllNoticesProvider =
    FutureProvider.autoDispose<List<NoticeItem>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getNotices();
});

/// Presentation screen listing official circulars, administrative alerts, and bulletins.
///
/// Features:
/// - List of notices with audience tag, formatted publication date, title, and body preview.
/// - Unread tracking: automatically marks loaded notices as seen in local storage via [NotificationService].
/// - Quick attachment chip to view PDF files with [PdfViewerScreen].
/// - Card tap navigation to [NoticeDetailsScreen] for full content display.
class StudentNoticesScreen extends ConsumerWidget {
  /// Creates a [StudentNoticesScreen] instance.
  const StudentNoticesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final noticesAsync = ref.watch(studentAllNoticesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notice Board'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(studentAllNoticesProvider),
          ),
        ],
      ),
      body: noticesAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 5, itemHeight: 95),
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
        data: (notices) {
          if (notices.isNotEmpty) {
            NotificationService.markNoticesAsSeen(notices.map((n) => n.id).toList());
          }
          if (notices.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.campaign_outlined,
                      size: 48, color: AppTheme.textMuted),
                  const SizedBox(height: 12),
                  Text('No active announcements',
                      style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textDark)),
                  const SizedBox(height: 4),
                  Text(
                    'There are currently no circulars for your class.',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppTheme.textMuted),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: notices.length,
            itemBuilder: (ctx, idx) {
              final n = notices[idx];
              String formattedDate = '';
              if (n.date != null) {
                try {
                  formattedDate = DateFormat('MMM dd, yyyy')
                      .format(DateTime.parse(n.date!));
                } catch (_) {
                  formattedDate = n.date!;
                }
              }

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => NoticeDetailsScreen(notice: n),
                    ),
                  ),
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
                              color: AppTheme.studentAccent
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              n.audience,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.studentAccent,
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
                        n.title,
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppTheme.textDark,
                        ),
                      ),
                      if (n.content.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          n.content,
                          style: GoogleFonts.inter(
                              fontSize: 13, color: const Color(0xFF475569)),
                        ),
                      ],
                      if (n.attachmentUrl != null &&
                          n.attachmentUrl!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: () {
                            final fullUrl =
                                '${AppConfig.uploadsBaseUrl}${n.attachmentUrl}';
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PdfViewerScreen(
                                    title: n.title, pdfUrl: fullUrl),
                              ),
                            );
                          },
                          icon: const Icon(Icons.picture_as_pdf,
                              color: AppTheme.errorRed, size: 18),
                          label: const Text('View Circular (PDF)'),
                        ),
                      ],
                    ],
                  ),
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
