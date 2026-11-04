import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import 'teacher_dashboard_screen.dart';

/// Screen displaying faculty profile information, school credentials, and logout controls.
///
/// Features:
/// - User profile avatar and personal credentials.
/// - Assigned homeroom class indicator.
/// - Active API server endpoint information.
/// - Logout confirmation dialog.
class TeacherProfileScreen extends ConsumerWidget {
  /// Constructs a [TeacherProfileScreen].
  const TeacherProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final dashboardAsync = ref.watch(teacherDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Faculty Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: CircleAvatar(
              radius: 46,
              backgroundColor: AppTheme.teacherAccent.withValues(alpha: 0.15),
              child: Text(
                user?.name.isNotEmpty == true
                    ? user!.name[0].toUpperCase()
                    : 'T',
                style: GoogleFonts.inter(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.teacherAccent,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              user?.name ?? 'Faculty Member',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textDark,
              ),
            ),
          ),
          Center(
            child: Text(
              user?.loginId ?? '',
              style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textMuted),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ProfileItem(
                    label: 'Instructor Full Name',
                    value: user?.name ?? '-',
                    icon: Icons.person_outline,
                  ),
                  const Divider(height: 20),
                  _ProfileItem(
                    label: 'Email / Username',
                    value: user?.loginId ?? '-',
                    icon: Icons.email_outlined,
                  ),
                  const Divider(height: 20),
                  _ProfileItem(
                    label: 'Employee / Login ID',
                    value: user?.loginId ?? '-',
                    icon: Icons.badge_outlined,
                  ),
                  const Divider(height: 20),
                  dashboardAsync.when(
                    loading: () => const _ProfileItem(
                      label: 'Assigned Homeroom Class',
                      value: 'Loading...',
                      icon: Icons.school_outlined,
                    ),
                    error: (_, __) => const _ProfileItem(
                      label: 'Assigned Homeroom Class',
                      value: 'Not Assigned',
                      icon: Icons.school_outlined,
                    ),
                    data: (data) => Column(
                      children: [
                        _ProfileItem(
                          label: 'Assigned Homeroom Class',
                          value: data.hasHomeroom
                              ? data.assignedCourse
                              : 'None (Subject Teacher)',
                          icon: Icons.school_outlined,
                          valueColor: AppTheme.teacherAccent,
                        ),
                        if (data.hasHomeroom) ...[
                          const Divider(height: 20),
                          _ProfileItem(
                            label: 'Students Enrolled in Homeroom',
                            value: '${data.studentCount ?? 0} Students',
                            icon: Icons.groups_outlined,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outline, color: AppTheme.textMuted),
              title: const Text('App Version'),
              trailing: Text(AppConfig.appVersion,
                  style: GoogleFonts.inter(color: AppTheme.textMuted)),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorRed,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign Out of Teacher Portal'),
            onPressed: () {
              ref.read(authNotifierProvider.notifier).logout();
            },
          ),
        ],
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? valueColor;

  const _ProfileItem({
    required this.label,
    required this.value,
    required this.icon,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.textMuted),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style:
                    GoogleFonts.inter(fontSize: 12, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? AppTheme.textDark,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
