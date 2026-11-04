import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/theme/app_icons.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../data/student_repository.dart';
import '../models/student_models.dart';
import 'package:eazzio_school/features/shared/presentation/pdf_viewer_screen.dart';
import 'package:eazzio_school/core/services/notification_service.dart';
import 'student_notices_screen.dart';
import 'notice_details_screen.dart';
import 'student_class_details_screen.dart';
import 'student_results_screen.dart';

/// Riverpod provider for the [StudentRepository] data layer.
final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return StudentRepository(client);
});

/// Async data provider fetching the student dashboard overview.
/// 
/// WHAT IT DOES:
/// Retrieves student identity, attendance summary metrics, invoice pending status,
/// today's lecture routine, and recent bulletin notices.
/// 
/// HOW IT WORKS:
/// - Calls `GET /api/student/dashboard-summary` via [StudentRepository].
/// - Inspects bulletin notices. If a fresh notice exists that was never displayed locally,
///   triggers a system push notification via [NotificationService].
final studentDashboardProvider =
    FutureProvider.autoDispose<StudentDashboardData>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  final data = await repo.getDashboardSummary();

  // If there are notices, show native push notification for the newest one if not seen
  if (data.notices.isNotEmpty) {
    final newest = data.notices.first;
    await NotificationService.showNotificationIfNew(
      id: newest.id,
      title: 'New Notice: ${newest.title}',
      body: newest.content,
    );
  }

  return data;
});

/// Checks if there are any unread notices by comparing IDs against local SQLite storage.
final unreadNoticesProvider = FutureProvider.autoDispose<bool>((ref) async {
  final dashboard = await ref.watch(studentDashboardProvider.future);
  final noticeIds = dashboard.notices.map((n) => n.id).toList();
  return await NotificationService.hasUnreadNotices(noticeIds);
});

/// The primary home screen for authenticated students.
class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(studentDashboardProvider);
    final user = ref.watch(authNotifierProvider).user;
    final dashboardData = dashboardAsync.valueOrNull;

    // Resolve student display name cleanly: dashboard profile name -> auth user name -> 'Student'
    final displayName = (dashboardData?.profile.name.trim().isNotEmpty ?? false)
        ? dashboardData!.profile.name.trim()
        : (user?.name.trim().isNotEmpty ?? false)
            ? user!.name.trim()
            : 'Student';

    final unreadNoticesAsync = ref.watch(unreadNoticesProvider);
    final hasUnreadNotices = unreadNoticesAsync.valueOrNull ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Student Portal',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 18)),
            Text(displayName,
                style:
                    GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
        actions: [
          _NotificationIconButton(
            hasNewNotification: hasUnreadNotices,
            onPressed: () async {
              if (dashboardData != null && dashboardData.notices.isNotEmpty) {
                await NotificationService.markNoticesAsSeen(
                    dashboardData.notices.map((n) => n.id).toList());
                ref.refresh(unreadNoticesProvider);
              }
              if (context.mounted) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const StudentNoticesScreen()),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.refresh(studentDashboardProvider);
              ref.refresh(unreadNoticesProvider);
            },
          ),
        ],
      ),
      body: dashboardAsync.when(
        loading: () => const SkeletonDashboardLoader(),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_rounded,
                    size: 48, color: AppTheme.errorRed),
                const SizedBox(height: 12),
                Text('Could not load dashboard data',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 6),
                Text(
                    ref.read(apiClientProvider).parseErrorMessage(err),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                        color: AppTheme.textMuted, fontSize: 13)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.refresh(studentDashboardProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final profile = data.profile;
          final att = data.attendance;
          final fees = data.fees;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(studentDashboardProvider),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Greeting & Profile Card
                  Card(
                    color: AppTheme.studentAccent,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor:
                                Colors.white.withValues(alpha: 0.2),
                            child: const Icon(Icons.school,
                                size: 32, color: Colors.white),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  profile.name.trim().isNotEmpty
                                      ? profile.name.trim()
                                      : (user?.name.trim().isNotEmpty ?? false)
                                          ? user!.name.trim()
                                          : 'Student',
                                  style: GoogleFonts.inter(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Class: ${profile.courseName} | Roll: ${profile.rollNumber}',
                                  style: GoogleFonts.inter(
                                      fontSize: 13,
                                      color:
                                          Colors.white.withValues(alpha: 0.9)),
                                ),
                                Text(
                                  'ID: ${profile.studentId}',
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color:
                                          Colors.white.withValues(alpha: 0.75)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Stats Grid: Attendance & Fees (Matching frontend Lucide design)
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isVeryNarrow = constraints.maxWidth < 280;
                      final attendanceCard = Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  AppIcons.render(AppIcons.attendance,
                                      size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text('Attendance',
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 12,
                                            color: AppTheme.textMuted)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  '${att.percentage}%',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.textDark),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Present: ${att.present} / ${att.total} days',
                                style: GoogleFonts.plusJakartaSans(
                                    fontSize: 10, color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        ),
                      );

                      final feeCard = Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  AppIcons.render(AppIcons.fees, size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text('Fee Status',
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 12,
                                            color: AppTheme.textMuted)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  '₹${fees.pendingAmount.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    color: fees.pendingAmount > 0
                                        ? AppTheme.errorRed
                                        : AppTheme.successGreen,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                fees.pendingAmount > 0
                                    ? 'Pending Dues'
                                    : 'All Clear',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  color: fees.pendingAmount > 0
                                      ? AppTheme.errorRed
                                      : AppTheme.successGreen,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );

                      if (isVeryNarrow) {
                        return Column(
                          children: [
                            attendanceCard,
                            const SizedBox(height: 8),
                            feeCard,
                          ],
                        );
                      }

                      return Row(
                        children: [
                          Expanded(child: attendanceCard),
                          const SizedBox(width: 8),
                          Expanded(child: feeCard),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // Student Workspaces & Actions (Academic Sapphire Design)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Student Workspaces',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      // On mobile screens (< 380px), single column or responsive grid
                      final useTwoCols = constraints.maxWidth >= 330;
                      final itemWidth = useTwoCols
                          ? (constraints.maxWidth - 12) / 2
                          : constraints.maxWidth;
                      return Wrap(
                        spacing: 12,
                        runSpacing: 10,
                        children: [
                          SizedBox(
                            width: itemWidth,
                            child: _StudentWorkspaceCard(
                              customAsset: AppIcons.courses,
                              title: 'Class Details',
                              subtitle: 'Faculty & Routine',
                              badgeText: null,
                              color: const Color(0xFF1E3A8A),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        const StudentClassDetailsScreen()),
                              ),
                            ),
                          ),
                          SizedBox(
                            width: itemWidth,
                            child: _StudentWorkspaceCard(
                              customAsset: AppIcons.notices,
                              title: 'Notice Board',
                              subtitle: 'Circulars & Notes',
                              badgeText: data.notices.isNotEmpty
                                  ? '${data.notices.length} New'
                                  : null,
                              color: const Color(0xFF0D9488),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        const StudentNoticesScreen()),
                              ),
                            ),
                          ),
                          SizedBox(
                            width: itemWidth,
                            child: _StudentWorkspaceCard(
                              customAsset: AppIcons.routine,
                              title: 'Exam Schedule',
                              subtitle: 'Datesheets',
                              badgeText: null,
                              color: const Color(0xFF0284C7),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        const StudentResultsScreen()),
                              ),
                            ),
                          ),
                          SizedBox(
                            width: itemWidth,
                            child: _StudentWorkspaceCard(
                              customAsset: AppIcons.results,
                              title: 'Report Cards',
                              subtitle: 'Grades & GPA',
                              badgeText: 'Term 1',
                              color: const Color(0xFF16A34A),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        const StudentResultsScreen()),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Today's Timetable Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              width: 4,
                              height: 18,
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E3A8A),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                "Today's Schedule",
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.plusJakartaSans(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textDark),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5EEFF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          DateFormat('EEEE, MMM d').format(DateTime.now()),
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              color: const Color(0xFF1E3A8A),
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (data.todayRoutine.isEmpty)
                    Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Column(
                            children: [
                              const Icon(Icons.event_available_outlined,
                                  size: 40, color: Color(0xFF0D9488)),
                              const SizedBox(height: 10),
                              Text('No more classes scheduled today!',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.textDark,
                                      fontSize: 14)),
                              const SizedBox(height: 4),
                              Text(
                                  'Enjoy your study time or review your homework.',
                                  style: GoogleFonts.plusJakartaSans(
                                      color: AppTheme.textMuted, fontSize: 12)),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    ...data.todayRoutine.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final r = entry.value;
                      final isOngoing = idx == 0;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isOngoing
                                ? const Color(0xFF90A8FF)
                                : const Color(0xFFE2E8F0),
                            width: isOngoing ? 1.5 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isOngoing
                                      ? const Color(0xFF1E3A8A)
                                      : const Color(0xFFEFF4FF),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                alignment: Alignment.center,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Period',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w600,
                                        color: isOngoing
                                            ? Colors.white
                                                .withValues(alpha: 0.8)
                                            : const Color(0xFF64748B),
                                      ),
                                    ),
                                    Text(
                                      r.period
                                              .replaceAll(RegExp(r'[^0-9]'), '')
                                              .isNotEmpty
                                          ? r.period
                                              .replaceAll(RegExp(r'[^0-9]'), '')
                                          : r.period,
                                      style: GoogleFonts.plusJakartaSans(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                        height: 1.1,
                                        color: isOngoing
                                            ? Colors.white
                                            : const Color(0xFF1E3A8A),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            r.subject,
                                            style: GoogleFonts.plusJakartaSans(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 14,
                                              color: AppTheme.textDark,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (isOngoing) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFCCFBF1),
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              'Active',
                                              style:
                                                  GoogleFonts.plusJakartaSans(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w700,
                                                color: const Color(0xFF0F766E),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      'Teacher: ${r.teacherName ?? "Faculty"}${r.roomNo != null ? " • Room ${r.roomNo}" : ""}',
                                      style: GoogleFonts.plusJakartaSans(
                                          fontSize: 11,
                                          color: AppTheme.textMuted),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              if (r.startTime != null && r.endTime != null) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                        color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Text(
                                    '${r.startTime}\n${r.endTime}',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF475569),
                                      height: 1.2,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    }),

                  const SizedBox(height: 20),

                  // Recent Notices Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Recent School Notices',
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textDark),
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const StudentNoticesScreen()),
                        ),
                        child: Text(
                          'View All',
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.studentAccent),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (data.notices.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Center(
                          child: Text('No recent notices',
                              style: GoogleFonts.inter(
                                  color: AppTheme.textMuted, fontSize: 13)),
                        ),
                      ),
                    )
                  else
                    ...data.notices.map((n) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => NoticeDetailsScreen(notice: n),
                              ),
                            ),
                            leading: const Icon(Icons.campaign_outlined,
                                color: AppTheme.studentAccent),
                            title: Text(n.title,
                                style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w600, fontSize: 14)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(n.content,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(fontSize: 12)),
                                if (n.attachmentUrl != null) ...[
                                  const SizedBox(height: 4),
                                  InkWell(
                                    onTap: () {
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
                                    child: Row(
                                      children: [
                                        const Icon(Icons.picture_as_pdf,
                                            size: 14, color: AppTheme.errorRed),
                                        const SizedBox(width: 4),
                                        Text('View Attachment (PDF)',
                                            style: GoogleFonts.inter(
                                                fontSize: 11,
                                                color: AppTheme.primaryBlue,
                                                fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        )),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StudentWorkspaceCard extends StatelessWidget {
  final String customAsset;
  final String title;
  final String subtitle;
  final String? badgeText;
  final Color color;
  final VoidCallback onTap;

  const _StudentWorkspaceCard({
    required this.customAsset,
    required this.title,
    required this.subtitle,
    this.badgeText,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              AppIcons.render(customAsset, size: 36),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.plusJakartaSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: AppTheme.textDark,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (badgeText != null) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badgeText!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1D4ED8),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        color: AppTheme.textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationIconButton extends StatefulWidget {
  final bool hasNewNotification;
  final VoidCallback onPressed;

  const _NotificationIconButton({
    required this.hasNewNotification,
    required this.onPressed,
  });

  @override
  State<_NotificationIconButton> createState() =>
      _NotificationIconButtonState();
}

class _NotificationIconButtonState extends State<_NotificationIconButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _blinkController;

  @override
  void initState() {
    super.initState();
    _blinkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    if (widget.hasNewNotification) {
      _blinkController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant _NotificationIconButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.hasNewNotification != oldWidget.hasNewNotification) {
      if (widget.hasNewNotification) {
        _blinkController.repeat(reverse: true);
      } else {
        _blinkController.stop();
        _blinkController.value = 0.0;
      }
    }
  }

  @override
  void dispose() {
    _blinkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      child: Material(
        color: const Color(0xFFFEF2F2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: Color(0xFFFECACA), width: 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: widget.onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.hasNewNotification)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: FadeTransition(
                      opacity: _blinkController,
                      child: Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: AppTheme.errorRed,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                const Icon(
                  Icons.notifications_active_outlined,
                  size: 16,
                  color: Color(0xFFDC2626),
                ),
                const SizedBox(width: 4),
                Text(
                  'Notices',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFFB91C1C),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

