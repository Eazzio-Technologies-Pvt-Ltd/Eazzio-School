import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/student_models.dart';
import 'student_dashboard_screen.dart';

/// Auto-dispose provider fetching the student's weekly timetable routine.
///
/// Returns a map grouping weekday strings (e.g. 'Monday', 'Tuesday') to their list of [RoutineItem]s.
final studentRoutineProvider =
    FutureProvider.autoDispose<Map<String, List<RoutineItem>>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getRoutine();
});

/// Presentation screen rendering the student's weekly class timetable.
///
/// Features:
/// - Tabbed horizontal navigation for each day of the week (Monday through Saturday).
/// - Period slot cards showing subject name, start & end time, room number, and teacher name.
/// - Pull-to-refresh and empty-state placeholders for free days.
class StudentRoutineScreen extends ConsumerWidget {
  /// Creates a [StudentRoutineScreen] instance.
  const StudentRoutineScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routineAsync = ref.watch(studentRoutineProvider);
    final days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];

    return DefaultTabController(
      length: days.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Weekly Timetable'),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: AppTheme.studentAccent,
            unselectedLabelColor: AppTheme.textMuted,
            indicatorColor: AppTheme.studentAccent,
            tabs: days.map((d) => Tab(text: d)).toList(),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.refresh(studentRoutineProvider),
            ),
          ],
        ),
        body: routineAsync.when(
          loading: () => const SkeletonListLoader(itemCount: 5, itemHeight: 85),
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
          data: (routineMap) {
            return TabBarView(
              children: days.map((day) {
                final periods = routineMap[day] ?? [];
                if (periods.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.event_available,
                            size: 48, color: AppTheme.textMuted),
                        const SizedBox(height: 12),
                        Text('No periods scheduled for $day',
                            style:
                                GoogleFonts.inter(color: AppTheme.textMuted)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: periods.length,
                  itemBuilder: (ctx, i) {
                    final item = periods[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor:
                              AppTheme.studentAccent.withValues(alpha: 0.12),
                          child: Text(item.period,
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.studentAccent)),
                        ),
                        title: Text(item.subject,
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600, fontSize: 15)),
                        subtitle: Text(
                          'Teacher: ${item.teacherName ?? "Faculty"} ${item.roomNo != null ? "• Room: ${item.roomNo}" : ""}',
                          style: GoogleFonts.inter(
                              fontSize: 12, color: AppTheme.textMuted),
                        ),
                        trailing:
                            (item.startTime != null && item.endTime != null)
                                ? Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                        '${item.startTime} - ${item.endTime}',
                                        style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500)),
                                  )
                                : null,
                      ),
                    );
                  },
                );
              }).toList(),
            );
          },
        ),
      ),
    );
  }
}
