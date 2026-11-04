import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import '../models/student_models.dart';
import 'package:eazzio_school/features/shared/presentation/pdf_viewer_screen.dart';

/// Presentation screen displaying the full details, formatted body, and attachments of a notice.
///
/// Features:
/// - Target audience badge and formatted date header.
/// - Unabridged notice headline and multi-paragraph content.
/// - Embedded PDF document attachment preview card routing to [PdfViewerScreen].
class NoticeDetailsScreen extends StatelessWidget {
  /// The [NoticeItem] model whose details and attachments are displayed.
  final NoticeItem notice;

  /// Creates a [NoticeDetailsScreen] for the given [notice].
  const NoticeDetailsScreen({super.key, required this.notice});

  @override
  Widget build(BuildContext context) {
    String formattedDate = '';
    if (notice.date != null) {
      try {
        formattedDate = DateFormat('EEEE, MMMM d, yyyy')
            .format(DateTime.parse(notice.date!));
      } catch (_) {
        formattedDate = notice.date!;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notice Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Audience & Date Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppTheme.studentAccent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    notice.audience.toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.studentAccent,
                    ),
                  ),
                ),
                if (formattedDate.isNotEmpty)
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 14, color: AppTheme.textMuted),
                      const SizedBox(width: 5),
                      Text(
                        formattedDate,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppTheme.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 18),

            // Title
            Text(
              notice.title,
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textDark,
                height: 1.3,
              ),
            ),
            const Divider(height: 32),

            // Full Notice Content
            Text(
              notice.content,
              style: GoogleFonts.inter(
                fontSize: 15,
                height: 1.6,
                color: const Color(0xFF334155),
              ),
            ),

            // PDF Attachment Section (if available)
            if (notice.attachmentUrl != null &&
                notice.attachmentUrl!.isNotEmpty) ...[
              const SizedBox(height: 28),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.attach_file_rounded,
                            color: AppTheme.studentAccent, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Official Document Attachment',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textDark,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.studentAccent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        onPressed: () {
                          final fullUrl =
                              '${AppConfig.uploadsBaseUrl}${notice.attachmentUrl}';
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PdfViewerScreen(
                                title: notice.title,
                                pdfUrl: fullUrl,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.picture_as_pdf_rounded, size: 20),
                        label: const Text(
                          'Open PDF Attachment',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
