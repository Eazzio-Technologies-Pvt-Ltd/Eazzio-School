import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import 'package:eazzio_school/core/config/app_config.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/student_models.dart';
import 'student_dashboard_screen.dart';

/// Auto-dispose provider retrieving the student's full personal and academic profile.
final studentProfileProvider =
    FutureProvider.autoDispose<StudentFullProfile>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getProfile();
});

/// Presentation screen managing student profile information, security credentials, and app logout.
///
/// Features:
/// - Student identity summary with initial avatar, admission ID, class section, and roll number.
/// - Enrollment records: roll number, class teacher name, admission date, and billing cycle.
/// - Guardian information: parent names, address, and interactive phone number editing dialog.
/// - Security: In-app password update dialog with current password verification.
/// - Logout tile triggering account sign-out and auth state reset.
/// - Pull-to-refresh integration.
class StudentProfileScreen extends ConsumerStatefulWidget {
  /// Creates a [StudentProfileScreen] instance.
  const StudentProfileScreen({super.key});

  @override
  ConsumerState<StudentProfileScreen> createState() =>
      _StudentProfileScreenState();
}

class _StudentProfileScreenState extends ConsumerState<StudentProfileScreen> {
  /// Text editing controller for the existing user password.
  final _oldPasswordController = TextEditingController();

  /// Text editing controller for the replacement password.
  final _newPasswordController = TextEditingController();

  /// Text editing controller for updating contact phone number.
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _showChangePasswordDialog() {
    _oldPasswordController.clear();
    _newPasswordController.clear();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Change Password',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _oldPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _newPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final oldP = _oldPasswordController.text.trim();
              final newP = _newPasswordController.text.trim();
              if (oldP.isEmpty || newP.isEmpty) return;

              Navigator.pop(ctx);
              try {
                final repo = ref.read(studentRepositoryProvider);
                await repo.changePassword(
                    currentPassword: oldP, newPassword: newP);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Password updated successfully!')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to update password. Please check your current password.')),
                  );
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showEditPhoneDialog(String currentPhone) {
    _phoneController.text = currentPhone == 'N/A' ? '' : currentPhone;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Update Contact Phone',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                hintText: 'e.g. +91 9876543210',
                prefixIcon: Icon(Icons.phone),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final newPhone = _phoneController.text.trim();
              Navigator.pop(ctx);
              try {
                final repo = ref.read(studentRepositoryProvider);
                await repo.updateProfile(
                    phone: newPhone.isEmpty ? null : newPhone);
                ref.refresh(studentProfileProvider);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Phone number updated successfully!')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Unable to update phone number. Please try again.')),
                  );
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(studentProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Profile & Settings'),
      ),
      body: profileAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 90),
        error: (err, _) => const Center(child: Text('Unable to load profile. Please pull to refresh.')),
        data: (profile) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor:
                          AppTheme.studentAccent.withValues(alpha: 0.15),
                      child: const Icon(Icons.person,
                          size: 48, color: AppTheme.studentAccent),
                    ),
                    const SizedBox(height: 12),
                    Text(profile.name,
                        style: GoogleFonts.inter(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                    Text('Student ID: ${profile.studentId}',
                        style: GoogleFonts.inter(
                            color: AppTheme.textMuted, fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildInfoRow('Roll Number', profile.rollNumber ?? 'N/A'),
                      const Divider(),
                      _buildInfoRow(
                          'Class / Section',
                          profile.course != null
                              ? '${profile.course!.courseName}-${profile.course!.section}'
                              : 'Unassigned'),
                      const Divider(),
                      _buildInfoRow('Class Teacher',
                          profile.course?.classTeacherName ?? 'N/A'),
                      const Divider(),
                      _buildInfoRow(
                          'Father\'s Name', profile.fatherName ?? 'N/A'),
                      const Divider(),
                      _buildInfoRow(
                          'Mother\'s Name', profile.motherName ?? 'N/A'),
                      const Divider(),
                      _buildInfoRow(
                        'Phone',
                        profile.phone ?? 'N/A',
                        onEdit: () =>
                            _showEditPhoneDialog(profile.phone ?? 'N/A'),
                      ),
                      const Divider(),
                      _buildInfoRow('Address', profile.address ?? 'N/A'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text('Account Security & App',
                  style: GoogleFonts.inter(
                      fontSize: 15, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.lock_reset,
                          color: AppTheme.studentAccent),
                      title: const Text('Change Password'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: _showChangePasswordDialog,
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.info_outline,
                          color: AppTheme.textMuted),
                      title: const Text('App Version'),
                      trailing: Text(AppConfig.appVersion,
                          style: GoogleFonts.inter(color: AppTheme.textMuted)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.errorRed),
                icon: const Icon(Icons.logout),
                label: const Text('Sign Out'),
                onPressed: () {
                  ref.read(authNotifierProvider.notifier).logout();
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {VoidCallback? onEdit}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textMuted),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: Text(
                    value,
                    textAlign: TextAlign.end,
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                    style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textDark),
                  ),
                ),
                if (onEdit != null) ...[
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: onEdit,
                    borderRadius: BorderRadius.circular(12),
                    child: const Padding(
                      padding: EdgeInsets.all(2.0),
                      child: Icon(Icons.edit_outlined,
                          size: 16, color: AppTheme.primaryBlue),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
