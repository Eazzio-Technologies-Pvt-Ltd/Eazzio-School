import 'dart:convert';
import '../../../core/network/api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/storage/local_database_service.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/teacher_models.dart';
import 'teacher_dashboard_screen.dart';

/// Riverpod provider delivering the list of classes assigned to the active teacher.
final teacherClassesProvider =
    FutureProvider.autoDispose<List<TeacherClassItem>>((ref) async {
  final repo = ref.watch(teacherRepositoryProvider);
  return await repo.getMyClasses();
});

/// Interactive screen allowing teachers to mark student attendance.
///
/// Features:
/// - Class/section selection dropdown.
/// - Date picker for historical or current day attendance entry.
/// - Bulk status toggles ("All Present", "All Absent").
/// - Per-student status toggling (Present, Late, Absent).
/// - Offline SQLite drafting via [LocalDatabaseService] with manual/auto sync.
class TeacherAttendanceScreen extends ConsumerStatefulWidget {
  /// Constructs a [TeacherAttendanceScreen].
  const TeacherAttendanceScreen({super.key});

  @override
  ConsumerState<TeacherAttendanceScreen> createState() =>
      _TeacherAttendanceScreenState();
}

class _TeacherAttendanceScreenState
    extends ConsumerState<TeacherAttendanceScreen> {
  /// Currently selected attendance date.
  DateTime _selectedDate = DateTime.now();

  /// Currently selected class item.
  TeacherClassItem? _selectedClass;

  /// In-memory attendance mapping of student ID to status ('PRESENT', 'ABSENT', 'LATE').
  final Map<int, String> _attendanceMap = {};

  /// Whether an attendance submission or sync is in progress.
  bool _isSubmitting = false;

  /// Marks all students in [students] with the provided [status] string.
  void _markAll(String status, List<RosterStudent> students) {
    setState(() {
      for (final s in students) {
        _attendanceMap[s.id] = status;
      }
    });
  }

  /// Submits the current attendance records to the server or stores offline draft on network error.
  Future<void> _submitAttendance() async {
    if (_selectedClass == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a class.')));
      return;
    }

    final students = _selectedClass!.students;
    if (students.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No students in selected class.')));
      return;
    }

    final records = students.map((s) {
      return {
        'studentId': s.id,
        'status': _attendanceMap[s.id] ?? 'PRESENT',
      };
    }).toList();

    setState(() => _isSubmitting = true);

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);

    try {
      final repo = ref.read(teacherRepositoryProvider);
      await repo.submitAttendance(
        courseId: _selectedClass!.courseId,
        date: dateStr,
        records: records,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.successGreen,
            content: Text(
                'Attendance recorded successfully for ${_selectedClass!.displayName} on $dateStr!'),
          ),
        );
      }
    } catch (e) {
      // Offline fallback: save draft in local SQLite
      await LocalDatabaseService.insertAttendanceDraft(
        courseId: _selectedClass!.courseId,
        courseName: _selectedClass!.displayName,
        date: dateStr,
        records: records,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.warningAmber,
            content: Text(
                'Network unavailable. Draft saved locally to offline queue.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  int _pendingDraftsCount = 0;

  @override
  void initState() {
    super.initState();
    _refreshPendingDrafts();
  }

  Future<void> _refreshPendingDrafts() async {
    try {
      final drafts = await LocalDatabaseService.getPendingAttendanceDrafts();
      if (mounted) {
        setState(() => _pendingDraftsCount = drafts.length);
      }
    } catch (_) {}
  }

  /// Shows a modal dialog listing locally queued offline attendance drafts.
  Future<void> _showOfflineDraftsDialog() async {
    final drafts = await LocalDatabaseService.getPendingAttendanceDrafts();
    if (!mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.cloud_off, color: AppTheme.warningAmber),
              SizedBox(width: 8),
              Text('Offline Attendance Drafts'),
            ],
          ),
          content: drafts.isEmpty
              ? const Text('No pending offline drafts in local queue.')
              : SizedBox(
                  width: double.maxFinite,
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: drafts.length,
                    itemBuilder: (ctx, idx) {
                      final d = drafts[idx];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('${d['course_name']} - ${d['date']}'),
                        subtitle: Text(
                            'Status: ${d['status']} | Created: ${d['created_at'].toString().split("T").first}'),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline,
                              color: AppTheme.errorRed),
                          onPressed: () async {
                            await LocalDatabaseService.deleteDraft(d['id']);
                            drafts.removeAt(idx);
                            setDialogState(() {});
                            _refreshPendingDrafts();
                          },
                        ),
                      );
                    },
                  ),
                ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close')),
            if (drafts.isNotEmpty)
              ElevatedButton.icon(
                icon: const Icon(Icons.sync),
                label: const Text('Sync All Now'),
                onPressed: () async {
                  Navigator.pop(ctx);
                  _syncOfflineDrafts(drafts);
                },
              ),
          ],
        ),
      ),
    );
  }

  /// Synchronizes offline drafts with backend server sequentially.
  Future<void> _syncOfflineDrafts(List<Map<String, dynamic>> drafts) async {
    setState(() => _isSubmitting = true);
    int successCount = 0;
    final repo = ref.read(teacherRepositoryProvider);

    for (final d in drafts) {
      try {
        final recordsList = jsonDecode(d['records_json']) as List;
        final records = recordsList.cast<Map<String, dynamic>>();
        await repo.submitAttendance(
          courseId: d['course_id'],
          date: d['date'],
          records: records,
        );
        await LocalDatabaseService.deleteDraft(d['id']);
        successCount++;
      } catch (e) {
        await LocalDatabaseService.updateDraftStatus(d['id'], 'FAILED');
      }
    }

    await _refreshPendingDrafts();
    if (mounted) {
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Synced $successCount of ${drafts.length} offline attendance drafts.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(teacherClassesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mark Attendance'),
        actions: [
          if (_pendingDraftsCount > 0)
            IconButton(
              icon: Badge(
                label: Text('$_pendingDraftsCount'),
                child: const Icon(Icons.cloud_upload_outlined,
                    color: AppTheme.warningAmber),
              ),
              tooltip: 'Offline Drafts ($_pendingDraftsCount)',
              onPressed: _showOfflineDraftsDialog,
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.refresh(teacherClassesProvider);
              _refreshPendingDrafts();
            },
          ),
        ],
      ),
      body: classesAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 120),
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
        data: (classes) {
          if (classes.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.class_outlined,
                        size: 48, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text('No assigned classes found.',
                        style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textMuted)),
                    const SizedBox(height: 6),
                    Text(
                      'You do not have any homeroom or course subject classes assigned yet.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                          fontSize: 13, color: AppTheme.textMuted),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Refresh'),
                      onPressed: () {
                        ref.refresh(teacherClassesProvider);
                        _refreshPendingDrafts();
                      },
                    ),
                  ],
                ),
              ),
            );
          }

          _selectedClass ??= classes.first;
          final students = _selectedClass!.students;

          return Column(
            children: [
              // Selector Card
              Container(
                color: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        // Class dropdown
                        Expanded(
                          child: DropdownButtonFormField<TeacherClassItem>(
                            initialValue: classes.contains(_selectedClass)
                                ? _selectedClass
                                : null,
                            isExpanded: true,
                            decoration: const InputDecoration(
                                labelText: 'Select Class',
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8)),
                            items: classes.map((c) {
                              return DropdownMenuItem(
                                value: c,
                                child: Text(
                                  '${c.displayName} ${c.isHomeroom ? "(Homeroom)" : ""}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedClass = val;
                                  _attendanceMap.clear();
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Date picker
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate,
                              firstDate: DateTime.now()
                                  .subtract(const Duration(days: 30)),
                              lastDate: DateTime.now(),
                            );
                            if (picked != null) {
                              setState(() => _selectedDate = picked);
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today,
                                    size: 16, color: AppTheme.teacherAccent),
                                const SizedBox(width: 6),
                                Text(DateFormat('dd MMM').format(_selectedDate),
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    // Quick Action Buttons
                    Row(
                      children: [
                        Text('Bulk:',
                            style: GoogleFonts.inter(
                                fontSize: 12, color: AppTheme.textMuted)),
                        const SizedBox(width: 8),
                        ActionChip(
                          label: const Text('All Present',
                              style: TextStyle(fontSize: 11)),
                          backgroundColor:
                              AppTheme.successGreen.withValues(alpha: 0.1),
                          side: BorderSide.none,
                          onPressed: () => _markAll('PRESENT', students),
                        ),
                        const SizedBox(width: 6),
                        ActionChip(
                          label: const Text('All Absent',
                              style: TextStyle(fontSize: 11)),
                          backgroundColor:
                              AppTheme.errorRed.withValues(alpha: 0.1),
                          side: BorderSide.none,
                          onPressed: () => _markAll('ABSENT', students),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Student List
              Expanded(
                child: students.isEmpty
                    ? Center(
                        child: Text(
                            'No students enrolled in ${_selectedClass!.displayName}',
                            style:
                                GoogleFonts.inter(color: AppTheme.textMuted)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: students.length,
                        itemBuilder: (ctx, i) {
                          final s = students[i];
                          final currentStatus =
                              _attendanceMap[s.id] ?? 'PRESENT';

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 18,
                                    backgroundColor: const Color(0xFFE2E8F0),
                                    child: Text(
                                      s.rollNumber ?? '${i + 1}',
                                      style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.textDark),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(s.name,
                                            style: GoogleFonts.inter(
                                                fontWeight: FontWeight.w600,
                                                fontSize: 14)),
                                        Text('ID: ${s.studentId}',
                                            style: GoogleFonts.inter(
                                                fontSize: 11,
                                                color: AppTheme.textMuted)),
                                      ],
                                    ),
                                  ),
                                  // Status Toggle Group: P, L, A
                                  Row(
                                    children: [
                                      _buildStatusBtn(
                                          'P',
                                          'PRESENT',
                                          currentStatus,
                                          AppTheme.successGreen,
                                          s.id),
                                      const SizedBox(width: 4),
                                      _buildStatusBtn(
                                          'L',
                                          'LATE',
                                          currentStatus,
                                          AppTheme.warningAmber,
                                          s.id),
                                      const SizedBox(width: 4),
                                      _buildStatusBtn(
                                          'A',
                                          'ABSENT',
                                          currentStatus,
                                          AppTheme.errorRed,
                                          s.id),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),

              // Submit Bar
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, -2)),
                  ],
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.teacherAccent),
                  onPressed: _isSubmitting ? null : _submitAttendance,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Submit Attendance'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatusBtn(String label, String value, String currentStatus,
      Color activeColor, int studentId) {
    final isSelected = currentStatus == value;
    return InkWell(
      onTap: () {
        setState(() {
          _attendanceMap[studentId] = value;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: isSelected ? activeColor : Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.grey.shade600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
