import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/theme/app_icons.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../data/teacher_repository.dart';
import '../models/teacher_models.dart';
import 'teacher_courses_screen.dart';
import 'teacher_attendance_history_screen.dart';
import 'teacher_notices_screen.dart';
import 'teacher_feedback_screen.dart';
import 'teacher_profile_screen.dart';

/// Riverpod provider for the [TeacherRepository] API layer.
final teacherRepositoryProvider = Provider<TeacherRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return TeacherRepository(client);
});

/// Async data provider loading teacher overview statistics, class assignments, and schedule.
final teacherDashboardProvider =
    FutureProvider.autoDispose<TeacherDashboardData>((ref) async {
  final repo = ref.watch(teacherRepositoryProvider);
  return await repo.getDashboardSummary();
});

/// The primary landing dashboard for authenticated teachers and faculty.
class TeacherDashboardScreen extends ConsumerWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(teacherDashboardProvider);
    final user = ref.watch(authNotifierProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Teacher Portal',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 18)),
            Text(user?.name ?? 'Faculty',
                style:
                    GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => ref.refresh(teacherDashboardProvider),
          ),
        ],
      ),
      body: dashboardAsync.when(
        loading: () => const SkeletonDashboardLoader(),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off, size: 48, color: AppTheme.errorRed),
              const SizedBox(height: 12),
              Text(
                'Could not load dashboard data',
                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  ref.read(apiClientProvider).parseErrorMessage(err),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => ref.refresh(teacherDashboardProvider),
                  child: const Text('Retry')),
            ],
          ),
        ),
        data: (data) {
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(teacherDashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Faculty Profile Card
                Card(
                  color: AppTheme.teacherAccent,
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const TeacherProfileScreen()),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: Colors.white.withValues(alpha: 0.2),
                            child: const Icon(Icons.co_present_rounded,
                                size: 30, color: Colors.white),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user?.name ?? 'Teacher',
                                  style: GoogleFonts.inter(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  data.hasHomeroom
                                      ? 'Class Teacher: ${data.assignedCourse}'
                                      : 'Subject Faculty',
                                  style: GoogleFonts.inter(
                                      fontSize: 13,
                                      color: Colors.white.withValues(alpha: 0.9)),
                                ),
                                Text(
                                  'Employee ID: ${user?.loginId ?? "EMP"}',
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color:
                                          Colors.white.withValues(alpha: 0.75)),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right,
                              color: Colors.white70, size: 24),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Homeroom Class Quick Stats (Academic Sapphire Design)
                if (data.hasHomeroom) ...[
                  Row(
                    children: [
                      Expanded(
                        child: Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    AppIcons.render(AppIcons.profile, size: 20),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        'Students',
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.textMuted),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${data.studentCount ?? 0}',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.textDark),
                                ),
                                Text(data.assignedCourse,
                                    style: GoogleFonts.plusJakartaSans(
                                        fontSize: 11,
                                        color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    AppIcons.render(AppIcons.attendance,
                                        size: 20),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        'Class Attendance',
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.textMuted),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${data.courseAttendanceRate ?? 0}%',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.successGreen),
                                ),
                                Text('Recent average',
                                    style: GoogleFonts.plusJakartaSans(
                                        fontSize: 11,
                                        color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],

                // Courseroom Workspaces (Academic Sapphire Design)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
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
                        Text(
                          'Courseroom Workspaces',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textDark),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                LayoutBuilder(
                  builder: (context, constraints) {
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
                          child: _QuickActionCard(
                            customAsset: AppIcons.courses,
                            title: 'My Courses',
                            subtitle: 'Roster Directory',
                            badgeText: data.hasHomeroom ? 'Homeroom' : null,
                            color: const Color(0xFF1E3A8A),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const TeacherCoursesScreen()),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: itemWidth,
                          child: _QuickActionCard(
                            customAsset: AppIcons.attendance,
                            title: 'Attendance Log',
                            subtitle: 'Historical Records',
                            badgeText: null,
                            color: const Color(0xFF0D9488),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) =>
                                      const TeacherAttendanceHistoryScreen()),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: itemWidth,
                          child: _QuickActionCard(
                            customAsset: AppIcons.notices,
                            title: 'Notice Board',
                            subtitle: 'Announcements',
                            badgeText: null,
                            color: const Color(0xFF0284C7),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const TeacherNoticesScreen()),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: itemWidth,
                          child: _QuickActionCard(
                            customAsset: AppIcons.feedback,
                            title: 'Feedback',
                            subtitle: 'Remarks & Notes',
                            badgeText: null,
                            color: const Color(0xFF16A34A),
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) =>
                                      const TeacherFeedbackScreen()),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 24),

                // Today's Routine
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
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
                        Text(
                          "Today's Schedule",
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textDark),
                        ),
                      ],
                    ),
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

                if (data.routine.isEmpty)
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
                            const Icon(Icons.wb_sunny_outlined,
                                size: 40, color: Color(0xFFF59E0B)),
                            const SizedBox(height: 10),
                            Text('Free Day! No teaching periods today.',
                                style: GoogleFonts.plusJakartaSans(
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textDark,
                                    fontSize: 14)),
                            const SizedBox(height: 4),
                            Text(
                                'Use this time for lesson planning or grading.',
                                style: GoogleFonts.plusJakartaSans(
                                    color: AppTheme.textMuted, fontSize: 12)),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  ...data.routine.asMap().entries.map((entry) {
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
                                          ? Colors.white.withValues(alpha: 0.8)
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
                                            style: GoogleFonts.plusJakartaSans(
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
                                    'Class: ${r.courseName ?? "Assigned Class"}${r.roomNo != null ? " • Room ${r.roomNo}" : ""}',
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

                const SizedBox(height: 16),

                // Recent Absentees from Class
                if (data.recentAbsentees.isNotEmpty) ...[
                  Text('Recent Absentees (Homeroom)',
                      style: GoogleFonts.inter(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...data.recentAbsentees.map((a) => Card(
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          leading: const Icon(Icons.person_off_outlined,
                              color: AppTheme.errorRed),
                          title: Text(a.name,
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600, fontSize: 13)),
                          subtitle: Text('Roll No: ${a.rollNumber ?? "N/A"}',
                              style: GoogleFonts.inter(
                                  fontSize: 11, color: AppTheme.textMuted)),
                          trailing: Text(a.date.split('T').first,
                              style: GoogleFonts.inter(
                                  fontSize: 11, color: AppTheme.textMuted)),
                        ),
                      )),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final String customAsset;
  final String title;
  final String subtitle;
  final String? badgeText;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
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
                              color: const Color(0xFFE5EEFF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badgeText!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1E3A8A),
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
