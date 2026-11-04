import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/teacher_models.dart';
import 'teacher_attendance_screen.dart';
import 'teacher_dashboard_screen.dart';

/// Screen displaying previous student attendance records by class and date.
///
/// Features:
/// - Class selection dropdown.
/// - Scrollable list of recorded attendance dates.
/// - Attendance summary counters (total students, present, absent, late).
/// - Detailed student list showing individual attendance status.
class TeacherAttendanceHistoryScreen extends ConsumerStatefulWidget {
  /// Constructs a [TeacherAttendanceHistoryScreen].
  const TeacherAttendanceHistoryScreen({super.key});

  @override
  ConsumerState<TeacherAttendanceHistoryScreen> createState() =>
      _TeacherAttendanceHistoryScreenState();
}

class _TeacherAttendanceHistoryScreenState
    extends ConsumerState<TeacherAttendanceHistoryScreen> {
  /// Currently selected class to inspect.
  TeacherClassItem? _selectedClass;

  /// Selected attendance date string (ISO format).
  String? _selectedDate;

  /// Available dates for which attendance records exist for the selected class.
  List<String> _dates = [];

  /// Attendance records for the selected date and class.
  List<Map<String, dynamic>> _records = [];

  /// Whether dates are actively being loaded.
  bool _isLoadingDates = false;

  /// Whether records for the selected date are actively being loaded.
  bool _isLoadingRecords = false;

  /// Fetches available attendance dates for a given [courseId].
  Future<void> _loadDates(int courseId) async {
    setState(() {
      _isLoadingDates = true;
      _dates = [];
      _selectedDate = null;
      _records = [];
    });

    try {
      final repo = ref.read(teacherRepositoryProvider);
      final dates = await repo.getAttendanceHistoryDates(courseId: courseId);
      if (mounted) {
        setState(() {
          _dates = dates;
          if (dates.isNotEmpty) {
            _selectedDate = dates.first;
            _loadRecords(dates.first, courseId);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to load attendance dates. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingDates = false);
    }
  }

  /// Fetches attendance records for the given [dateStr] and [courseId].
  Future<void> _loadRecords(String dateStr, int courseId) async {
    setState(() => _isLoadingRecords = true);
    try {
      final repo = ref.read(teacherRepositoryProvider);
      final records = await repo.getAttendanceHistoryRecords(
        date: dateStr,
        courseId: courseId,
      );
      if (mounted) {
        setState(() => _records = records);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to load attendance records. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingRecords = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(teacherClassesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance History'),
      ),
      body: classesAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 100),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.info_outline, size: 48, color: AppTheme.textMuted),
                const SizedBox(height: 12),
                Text(
                  ApiClient.parseError(err),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 14, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
        ),
        data: (classes) {
          if (classes.isEmpty) {
            return Center(
              child: Text(
                'No classes assigned to view history.',
                style: GoogleFonts.inter(color: AppTheme.textMuted),
              ),
            );
          }

          if (_selectedClass == null || !classes.contains(_selectedClass)) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              setState(() {
                _selectedClass = classes.first;
              });
              _loadDates(classes.first.courseId);
            });
          }

          return Column(
            children: [
              // Course selector
              Container(
                color: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DropdownButtonFormField<TeacherClassItem>(
                      initialValue: classes.contains(_selectedClass)
                          ? _selectedClass
                          : classes.first,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Select Class',
                        contentPadding:
                            EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: classes.map((c) {
                        return DropdownMenuItem(
                          value: c,
                          child: Text(
                            c.displayName,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedClass = val);
                          _loadDates(val.courseId);
                        }
                      },
                    ),
                    const SizedBox(height: 12),

                    // Available Dates Chips
                    Text(
                      'Recorded Dates',
                      style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textMuted),
                    ),
                    const SizedBox(height: 6),
                    if (_isLoadingDates)
                      const SizedBox(
                        height: 36,
                        child: Center(
                            child: SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))),
                      )
                    else if (_dates.isEmpty)
                      Text('No recorded dates found for this class.',
                          style: GoogleFonts.inter(
                              fontSize: 12, color: AppTheme.textMuted))
                    else
                      SizedBox(
                        height: 38,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _dates.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (ctx, i) {
                            final d = _dates[i];
                            final isSel = d == _selectedDate;
                            String formatted = d;
                            try {
                              formatted = DateFormat('MMM dd, yyyy')
                                  .format(DateTime.parse(d));
                            } catch (_) {}

                            return ChoiceChip(
                              label: Text(formatted,
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontWeight: isSel
                                          ? FontWeight.bold
                                          : FontWeight.normal,
                                      color: isSel
                                          ? Colors.white
                                          : AppTheme.textDark)),
                              selected: isSel,
                              selectedColor: AppTheme.teacherAccent,
                              onSelected: (_) {
                                setState(() => _selectedDate = d);
                                if (_selectedClass != null) {
                                  _loadRecords(d, _selectedClass!.courseId);
                                }
                              },
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Records Table
              Expanded(
                child: _isLoadingRecords
                    ? const SkeletonListLoader(itemCount: 6, itemHeight: 70)
                    : _records.isEmpty
                        ? Center(
                            child: Text(
                              _selectedDate == null
                                  ? 'Select a date above to review attendance.'
                                  : 'No records found for the selected date.',
                              style:
                                  GoogleFonts.inter(color: AppTheme.textMuted),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _records.length,
                            itemBuilder: (ctx, idx) {
                              final r = _records[idx];
                              final status =
                                  (r['status'] ?? 'PRESENT').toString();
                              final student =
                                  r['student'] as Map<String, dynamic>? ?? {};
                              final name = student['name'] ?? 'Student';
                              final roll =
                                  student['rollNumber'] ?? '${idx + 1}';

                              Color statusColor;
                              IconData statusIcon;
                              switch (status.toUpperCase()) {
                                case 'PRESENT':
                                  statusColor = AppTheme.successGreen;
                                  statusIcon = Icons.check_circle_rounded;
                                  break;
                                case 'ABSENT':
                                  statusColor = AppTheme.errorRed;
                                  statusIcon = Icons.cancel_rounded;
                                  break;
                                case 'LATE':
                                  statusColor = AppTheme.warningAmber;
                                  statusIcon = Icons.watch_later_rounded;
                                  break;
                                default:
                                  statusColor = AppTheme.textMuted;
                                  statusIcon = Icons.help_outline;
                              }

                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor:
                                        statusColor.withValues(alpha: 0.12),
                                    child: Text(
                                      roll,
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: statusColor,
                                      ),
                                    ),
                                  ),
                                  title: Text(
                                    name,
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14),
                                  ),
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color:
                                          statusColor.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                          color: statusColor.withValues(
                                              alpha: 0.3)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(statusIcon,
                                            size: 14, color: statusColor),
                                        const SizedBox(width: 4),
                                        Text(
                                          status,
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: statusColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}
