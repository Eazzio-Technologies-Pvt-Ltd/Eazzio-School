import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/student_models.dart';
import 'student_dashboard_screen.dart';

/// Auto-dispose provider retrieving student attendance statistics and daily records.
///
/// Returns a [Map] with two keys:
/// - `'stats'`: Aggregated percentages, total present, late, and absent days.
/// - `'records'`: A list of typed [AttendanceRecord] entries.
final studentAttendanceProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getAttendance();
});

/// Presentation screen rendering the student's attendance records and performance metrics.
///
/// Features:
/// - Summary percentage card with presence, tardiness, and absence count breakdown.
/// - Status filters (ALL, PRESENT, LATE, ABSENT) and month/year date range picker.
/// - History log showing recorded dates, verified teacher names, and status indicators.
/// - Pull-to-refresh and network error recovery.
class StudentAttendanceScreen extends ConsumerStatefulWidget {
  /// Creates a [StudentAttendanceScreen] instance.
  const StudentAttendanceScreen({super.key});

  @override
  ConsumerState<StudentAttendanceScreen> createState() =>
      _StudentAttendanceScreenState();
}

class _StudentAttendanceScreenState
    extends ConsumerState<StudentAttendanceScreen> {
  /// Currently selected status filter chip value ('ALL', 'PRESENT', 'LATE', or 'ABSENT').
  String _selectedStatusFilter = 'ALL';

  /// Currently selected calendar month for log filtering (1-12, or null for all).
  int? _selectedMonth; // null = all months, 1-12

  /// Currently selected calendar year for log filtering (or null for all).
  int? _selectedYear;

  @override
  Widget build(BuildContext context) {
    final attAsync = ref.watch(studentAttendanceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Records'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(studentAttendanceProvider),
          ),
        ],
      ),
      body: attAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 5, itemHeight: 80),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 40, color: AppTheme.errorRed),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  ApiClient.parseError(err),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                  onPressed: () => ref.refresh(studentAttendanceProvider),
                  child: const Text('Retry')),
            ],
          ),
        ),
        data: (data) {
          final stats = data['stats'] as Map<String, dynamic>;
          final records = data['records'] as List<AttendanceRecord>;

          final percentage = stats['percentage'] ?? 100;
          final present = stats['present'] ?? 0;
          final lateCount = stats['late'] ?? 0;
          final absent = stats['absent'] ?? 0;
          final total = stats['totalDays'] ?? records.length;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(studentAttendanceProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Summary Stat Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Text('Overall Attendance',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textMuted)),
                        const SizedBox(height: 6),
                        Text('$percentage%',
                            style: GoogleFonts.inter(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.studentAccent)),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatItem(
                                'Present', '$present', AppTheme.successGreen),
                            _buildStatItem(
                                'Late', '$lateCount', AppTheme.warningAmber),
                            _buildStatItem(
                                'Absent', '$absent', AppTheme.errorRed),
                            _buildStatItem(
                                'Total', '$total', AppTheme.textDark),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Month, Year & Status Filter Controls
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('History Log',
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    if (_selectedStatusFilter != 'ALL' ||
                        _selectedMonth != null)
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _selectedStatusFilter = 'ALL';
                            _selectedMonth = null;
                            _selectedYear = null;
                          });
                        },
                        child: const Text('Reset Filter',
                            style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                // Filter row: Month picker & Status Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Status filter chips
                      ChoiceChip(
                        label: const Text('All'),
                        selected: _selectedStatusFilter == 'ALL',
                        onSelected: (_) =>
                            setState(() => _selectedStatusFilter = 'ALL'),
                      ),
                      const SizedBox(width: 6),
                      ChoiceChip(
                        label: const Text('Present'),
                        selected: _selectedStatusFilter == 'PRESENT',
                        selectedColor:
                            AppTheme.successGreen.withValues(alpha: 0.2),
                        onSelected: (_) =>
                            setState(() => _selectedStatusFilter = 'PRESENT'),
                      ),
                      const SizedBox(width: 6),
                      ChoiceChip(
                        label: const Text('Late'),
                        selected: _selectedStatusFilter == 'LATE',
                        selectedColor:
                            AppTheme.warningAmber.withValues(alpha: 0.2),
                        onSelected: (_) =>
                            setState(() => _selectedStatusFilter = 'LATE'),
                      ),
                      const SizedBox(width: 6),
                      ChoiceChip(
                        label: const Text('Absent'),
                        selected: _selectedStatusFilter == 'ABSENT',
                        selectedColor: AppTheme.errorRed.withValues(alpha: 0.2),
                        onSelected: (_) =>
                            setState(() => _selectedStatusFilter = 'ABSENT'),
                      ),
                      const SizedBox(width: 10),
                      // Month selector chip
                      ActionChip(
                        avatar: const Icon(Icons.date_range, size: 16),
                        label: Text(_selectedMonth != null
                            ? DateFormat('MMM yyyy').format(DateTime(
                                _selectedYear ?? DateTime.now().year,
                                _selectedMonth!))
                            : 'Month / Year'),
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: DateTime.now(),
                            firstDate: DateTime(2020),
                            lastDate: DateTime.now(),
                            initialDatePickerMode: DatePickerMode.year,
                          );
                          if (picked != null) {
                            setState(() {
                              _selectedMonth = picked.month;
                              _selectedYear = picked.year;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                () {
                  final filteredRecords = records.where((r) {
                    if (_selectedStatusFilter != 'ALL' &&
                        r.status != _selectedStatusFilter) {
                      return false;
                    }
                    if (_selectedMonth != null) {
                      try {
                        final d = DateTime.parse(r.date);
                        if (d.month != _selectedMonth ||
                            (_selectedYear != null &&
                                d.year != _selectedYear)) {
                          return false;
                        }
                      } catch (_) {}
                    }
                    return true;
                  }).toList();

                  if (filteredRecords.isEmpty) {
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Text(
                            records.isEmpty
                                ? 'No attendance records logged yet.'
                                : 'No records match the selected filters.',
                            style: GoogleFonts.inter(color: AppTheme.textMuted),
                          ),
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: filteredRecords.map((r) {
                      final isPresent = r.status == 'PRESENT';
                      final isLate = r.status == 'LATE';
                      final color = isPresent
                          ? AppTheme.successGreen
                          : (isLate
                              ? AppTheme.warningAmber
                              : AppTheme.errorRed);

                      DateTime? parsedDate;
                      try {
                        parsedDate = DateTime.parse(r.date);
                      } catch (_) {}

                      final formattedDate = parsedDate != null
                          ? DateFormat('EEE, dd MMM yyyy').format(parsedDate)
                          : r.date;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: color.withValues(alpha: 0.12),
                            child: Icon(
                              isPresent
                                  ? Icons.check_circle_outline
                                  : (isLate
                                      ? Icons.alarm
                                      : Icons.cancel_outlined),
                              color: color,
                              size: 20,
                            ),
                          ),
                          title: Text(formattedDate,
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            r.teacherName != null
                                ? 'Marked by: ${r.teacherName}'
                                : 'Status recorded',
                            style: GoogleFonts.inter(
                                fontSize: 12, color: AppTheme.textMuted),
                          ),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              r.status,
                              style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: color),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  );
                }(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(value,
            style: GoogleFonts.inter(
                fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: GoogleFonts.inter(fontSize: 11, color: AppTheme.textMuted)),
      ],
    );
  }
}
