import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import 'student_profile_screen.dart';
import 'student_routine_screen.dart';

/// Presentation screen showing classroom enrollment details, class teacher credentials,
/// and subject instructors.
///
/// Features:
/// - Class banner card presenting course title, section name, and academic session.
/// - Assigned Class Teacher card highlighting lead instructor credentials.
/// - Subject Instructors directory parsed dynamically from the weekly timetable via [studentRoutineProvider].
/// - Integrated refresh action for both profile and routine providers.
class StudentClassDetailsScreen extends ConsumerWidget {
  /// Creates a [StudentClassDetailsScreen] instance.
  const StudentClassDetailsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider);
    final routineAsync = ref.watch(studentRoutineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Class & Faculty'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.refresh(studentProfileProvider);
              ref.refresh(studentRoutineProvider);
            },
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 110),
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
        data: (profile) {
          final course = profile.course;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Class Banner Card
              Card(
                color: AppTheme.studentAccent,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        child: const Icon(Icons.school_rounded,
                            size: 32, color: Colors.white),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course != null
                                  ? '${course.courseName} - Section ${course.section}'
                                  : 'General Enrollment',
                              style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Academic Year: ${course?.academicYear ?? "Current"}',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                            Text(
                              'Class Teacher: ${course?.classTeacherName ?? "Faculty In-Charge"}',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.white.withValues(alpha: 0.95),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Section Header: Faculty & Subjects
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Subject Faculty Directory',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              routineAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Could not load subjects: $err'),
                data: (routineMap) {
                  // Derive unique subjects and instructors from routine
                  final Map<String, String> subjectsTaught = {};
                  for (final periods in routineMap.values) {
                    for (final p in periods) {
                      if (!subjectsTaught.containsKey(p.subject)) {
                        subjectsTaught[p.subject] =
                            p.teacherName ?? 'Assigned Faculty';
                      }
                    }
                  }

                  if (subjectsTaught.isEmpty) {
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Center(
                          child: Text(
                            'No subjects mapped to your timetable yet.',
                            style: GoogleFonts.inter(color: AppTheme.textMuted),
                          ),
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: subjectsTaught.entries.map((entry) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor:
                                AppTheme.studentAccent.withValues(alpha: 0.12),
                            child: const Icon(Icons.book_outlined,
                                color: AppTheme.studentAccent, size: 20),
                          ),
                          title: Text(
                            entry.key,
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          subtitle: Text(
                            'Instructor: ${entry.value}',
                            style: GoogleFonts.inter(
                                fontSize: 12, color: AppTheme.textMuted),
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
