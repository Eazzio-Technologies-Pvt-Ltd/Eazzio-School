import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/student_models.dart';
import 'student_dashboard_screen.dart';

/// Auto-dispose provider fetching student examination scores, terminal marks, and hold flags.
final studentResultsProvider =
    FutureProvider.autoDispose<StudentResultGroup>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getResults();
});

/// Auto-dispose provider fetching published examination schedules and timetables.
final studentExamTimetablesProvider =
    FutureProvider.autoDispose<List<ExamTimetableItem>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getExamTimetables();
});

/// Presentation screen rendering examination timetables and academic result cards.
///
/// Features:
/// - Tab 1 (Academic Results): Displays overall performance percentages, pass/fail status,
///   subject-level marks breakdowns, and result-on-hold warning notices.
/// - Tab 2 (Exam Schedules): Lists upcoming examination series, date timetables, subject timings,
///   maximum marks, and examination room assignments.
class StudentResultsScreen extends ConsumerStatefulWidget {
  /// Creates a [StudentResultsScreen] instance.
  const StudentResultsScreen({super.key});

  @override
  ConsumerState<StudentResultsScreen> createState() =>
      _StudentResultsScreenState();
}

class _StudentResultsScreenState extends ConsumerState<StudentResultsScreen>
    with SingleTickerProviderStateMixin {
  /// Controller managing switching between Academic Results and Exam Schedules tabs.
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final resultsAsync = ref.watch(studentResultsProvider);
    final timetablesAsync = ref.watch(studentExamTimetablesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Exams & Results'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.studentAccent,
          unselectedLabelColor: AppTheme.textMuted,
          indicatorColor: AppTheme.studentAccent,
          tabs: const [
            Tab(text: 'Academic Results', icon: Icon(Icons.grade_outlined)),
            Tab(
                text: 'Exam Schedules',
                icon: Icon(Icons.calendar_month_outlined)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.refresh(studentResultsProvider);
              ref.refresh(studentExamTimetablesProvider);
            },
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Academic Results
          _buildResultsTab(resultsAsync),
          // Tab 2: Exam Timetables / Schedules
          _buildTimetablesTab(timetablesAsync),
        ],
      ),
    );
  }

  Widget _buildTimetablesTab(
      AsyncValue<List<ExamTimetableItem>> timetablesAsync) {
    return timetablesAsync.when(
      loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 90),
      error: (err, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded,
                  size: 48, color: AppTheme.errorRed),
              const SizedBox(height: 12),
              Text(
                ApiClient.parseError(err),
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(studentExamTimetablesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (timetables) {
        if (timetables.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.event_note,
                    size: 56, color: AppTheme.textMuted),
                const SizedBox(height: 12),
                Text('No exam timetables published yet.',
                    style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textDark)),
                const SizedBox(height: 4),
                Text('Datesheets will appear here once announced.',
                    style: GoogleFonts.inter(
                        fontSize: 13, color: AppTheme.textMuted)),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(studentExamTimetablesProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: timetables.length,
            itemBuilder: (ctx, i) {
              final tt = timetables[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              tt.title,
                              style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textDark),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color:
                                  AppTheme.studentAccent.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              tt.examType.replaceAll('_', ' '),
                              style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.studentAccent),
                            ),
                          ),
                        ],
                      ),
                      if (tt.courseName != null ||
                          tt.academicYear.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          [tt.courseName, tt.academicYear]
                              .where((s) => s != null && s.isNotEmpty)
                              .join(' • '),
                          style: GoogleFonts.inter(
                              fontSize: 12, color: AppTheme.textMuted),
                        ),
                      ],
                      const Divider(height: 20),
                      if (tt.items.isEmpty)
                        Text('No paper slots defined.',
                            style: GoogleFonts.inter(
                                fontSize: 13, color: AppTheme.textMuted))
                      else
                        ...tt.items.map((slot) {
                          DateTime? parsedDate;
                          try {
                            parsedDate = DateTime.parse(slot.examDate);
                          } catch (_) {}
                          final dateStr = parsedDate != null
                              ? '${parsedDate.day.toString().padLeft(2, '0')}/${parsedDate.month.toString().padLeft(2, '0')}/${parsedDate.year}'
                              : slot.examDate;

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Column(
                                    children: [
                                      Text(dateStr,
                                          style: GoogleFonts.inter(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(slot.subject,
                                          style: GoogleFonts.inter(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 13)),
                                      Text(
                                        '${slot.startTime} - ${slot.endTime}${slot.roomNo != null ? " • Room: ${slot.roomNo}" : ""}',
                                        style: GoogleFonts.inter(
                                            fontSize: 11,
                                            color: AppTheme.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                if (slot.maxMarks != null)
                                  Text('${slot.maxMarks!.toStringAsFixed(0)} M',
                                      style: GoogleFonts.inter(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: AppTheme.studentAccent)),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildResultsTab(AsyncValue<StudentResultGroup> resultsAsync) {
    return resultsAsync.when(
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
      data: (group) {
        if (group.resultOnHold) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock_clock,
                      size: 56, color: AppTheme.errorRed),
                  const SizedBox(height: 16),
                  Text(
                    'Results On Hold',
                    style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.errorRed),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    group.holdMessage ??
                        'Results withheld due to pending fee dues. Please clear dues to view your academic report.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                        fontSize: 13, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
          );
        }

        final weeklyTests = group.weeklyTests;
        final terminalExams = group.terminalExams;
        final generalExams = group.generalExams;

        if (weeklyTests.isEmpty &&
            terminalExams.isEmpty &&
            generalExams.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.description_outlined,
                    size: 48, color: AppTheme.textMuted),
                const SizedBox(height: 12),
                Text('No examination results published yet.',
                    style: GoogleFonts.inter(color: AppTheme.textMuted)),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(studentResultsProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (terminalExams.isNotEmpty) ...[
                Text('Terminal & Annual Report Cards',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...terminalExams.map((exam) {
                  final examMap = exam as Map<String, dynamic>? ?? {};
                  final name = examMap['examName'] ?? 'Terminal Exam';
                  final term = examMap['term'] ?? '';
                  final academicYear = examMap['academicYear'] ?? '';
                  final subjects = (examMap['subjects'] as List? ?? []);
                  final totalObtained = examMap['totalObtained'] ?? 0;
                  final totalMax = examMap['totalMax'] ?? 0;
                  final percentage = examMap['percentage'] ?? 0;

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
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(name,
                                        style: GoogleFonts.inter(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15)),
                                    if (term.isNotEmpty ||
                                        academicYear.isNotEmpty)
                                      Text(
                                          [term, academicYear]
                                              .where((s) => s.isNotEmpty)
                                              .join(' • '),
                                          style: GoogleFonts.inter(
                                              fontSize: 11,
                                              color: AppTheme.textMuted)),
                                  ],
                                ),
                              ),
                              if (totalMax > 0)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.studentAccent
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '$percentage%',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.studentAccent),
                                  ),
                                ),
                            ],
                          ),
                          const Divider(height: 16),
                          ...subjects.map((s) {
                            final subMap = s as Map<String, dynamic>? ?? {};
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(subMap['subject'] ?? '',
                                      style: GoogleFonts.inter(fontSize: 13)),
                                  Text(
                                    '${subMap['marksObtained']} / ${subMap['maxMarks']}  (${subMap['grade'] ?? '-'})',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13),
                                  ),
                                ],
                              ),
                            );
                          }),
                          if (totalMax > 0) ...[
                            const Divider(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Total',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13)),
                                Text('$totalObtained / $totalMax',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        color: AppTheme.studentAccent)),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 16),
              ],
              if (generalExams.isNotEmpty) ...[
                Text('General Examinations',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...generalExams.map((g) {
                  final gMap = g as Map<String, dynamic>? ?? {};
                  final examDetails =
                      gMap['examDetails'] as Map<String, dynamic>? ?? {};
                  final name = examDetails['examName'] ?? 'Examination';
                  final subjects = (gMap['subjects'] as List? ?? []);

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name,
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold, fontSize: 15)),
                          const Divider(height: 16),
                          ...subjects.map((s) {
                            final subMap = s as Map<String, dynamic>? ?? {};
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(subMap['subject'] ?? '',
                                      style: GoogleFonts.inter(fontSize: 13)),
                                  Text(
                                    '${subMap['marksObtained']} / ${subMap['maxMarks']}  (${subMap['grade'] ?? '-'})',
                                    style: GoogleFonts.inter(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 16),
              ],
              if (weeklyTests.isNotEmpty) ...[
                Text('Weekly & Periodic Tests',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...weeklyTests.map((m) {
                  final label = m['monthLabel'] ?? 'Tests';
                  final tests = (m['tests'] as List? ?? []);

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ExpansionTile(
                      title: Text(label,
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text('${tests.length} tests evaluated',
                          style: GoogleFonts.inter(
                              fontSize: 12, color: AppTheme.textMuted)),
                      children: tests.map((t) {
                        return ListTile(
                          title: Text(t['examName'] ?? t['subject'] ?? 'Test',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600, fontSize: 13)),
                          subtitle: Text(
                              'Portion: ${t['portion'] ?? 'General'}',
                              style: GoogleFonts.inter(
                                  fontSize: 11, color: AppTheme.textMuted)),
                          trailing: Text(
                            t['subjects'] != null &&
                                    (t['subjects'] as List).isNotEmpty
                                ? '${t['subjects'][0]['marksObtained']}/${t['maxMarks']} (${t['subjects'][0]['grade']})'
                                : '${t['maxMarks']} M',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.studentAccent),
                          ),
                        );
                      }).toList(),
                    ),
                  );
                }),
              ],
            ],
          ),
        );
      },
    );
  }
}
