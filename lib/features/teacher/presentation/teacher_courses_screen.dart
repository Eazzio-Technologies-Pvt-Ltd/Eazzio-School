import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import '../models/teacher_models.dart';
import 'teacher_attendance_screen.dart';

/// Screen displaying assigned courses, subject allocations, and student rosters.
///
/// Features:
/// - Horizontal selector cards for switching active course/section.
/// - Search filter for querying students by name, roll number, or student admission ID.
/// - Roster list cards with roll numbers and contact information.
class TeacherCoursesScreen extends ConsumerStatefulWidget {
  /// Constructs a [TeacherCoursesScreen].
  const TeacherCoursesScreen({super.key});

  @override
  ConsumerState<TeacherCoursesScreen> createState() =>
      _TeacherCoursesScreenState();
}

class _TeacherCoursesScreenState extends ConsumerState<TeacherCoursesScreen> {
  /// Currently selected class to view roster.
  TeacherClassItem? _selectedClass;

  /// Active search query string for filtering the student list.
  String _searchQuery = '';

  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(teacherClassesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Courses & Rosters'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(teacherClassesProvider),
          ),
        ],
      ),
      body: classesAsync.when(
        loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 90),
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
              child: Text(
                'No classes assigned to you.',
                style: GoogleFonts.inter(color: AppTheme.textMuted),
              ),
            );
          }

          final activeClass =
              _selectedClass != null && classes.contains(_selectedClass)
                  ? _selectedClass!
                  : classes.first;

          final filteredStudents = activeClass.students.where((s) {
            final query = _searchQuery.toLowerCase().trim();
            if (query.isEmpty) return true;
            return s.name.toLowerCase().contains(query) ||
                (s.rollNumber ?? '').toLowerCase().contains(query) ||
                s.studentId.toLowerCase().contains(query);
          }).toList();

          return Column(
            children: [
              // Horizontal Class Selector Cards
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: SizedBox(
                  height: 80,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemCount: classes.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (ctx, i) {
                      final c = classes[i];
                      final isSelected = c.courseId == activeClass.courseId;

                      return InkWell(
                        onTap: () {
                          setState(() {
                            _selectedClass = c;
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppTheme.teacherAccent
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? AppTheme.teacherAccent
                                  : const Color(0xFFE2E8F0),
                              width: 1.5,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                c.displayName,
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: isSelected
                                      ? Colors.white
                                      : AppTheme.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${c.students.length} Students ${c.isHomeroom ? "• Homeroom" : ""}',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  color: isSelected
                                      ? Colors.white.withValues(alpha: 0.85)
                                      : AppTheme.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText:
                        'Search students in ${activeClass.displayName}...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val);
                  },
                ),
              ),

              // Student Roster
              Expanded(
                child: filteredStudents.isEmpty
                    ? Center(
                        child: Text(
                          _searchQuery.isNotEmpty
                              ? 'No matching students found.'
                              : 'No students enrolled in this course.',
                          style: GoogleFonts.inter(color: AppTheme.textMuted),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: filteredStudents.length,
                        itemBuilder: (ctx, idx) {
                          final student = filteredStudents[idx];

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppTheme.teacherAccent
                                    .withValues(alpha: 0.12),
                                child: Text(
                                  student.rollNumber ?? '${idx + 1}',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                    color: AppTheme.teacherAccent,
                                  ),
                                ),
                              ),
                              title: Text(
                                student.name,
                                style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                              subtitle: Text(
                                'ID: ${student.studentId} ${student.phone != null ? "• 📞 ${student.phone}" : ""}',
                                style: GoogleFonts.inter(
                                    fontSize: 12, color: AppTheme.textMuted),
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
