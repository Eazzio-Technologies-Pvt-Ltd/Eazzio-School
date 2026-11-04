import 'package:flutter/material.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/theme/app_icons.dart';
import 'teacher_dashboard_screen.dart';
import 'teacher_attendance_screen.dart';
import 'teacher_assignments_screen.dart';
import 'teacher_routine_screen.dart';
import 'teacher_marks_screen.dart';
import 'teacher_profile_screen.dart';

/// Root navigation screen for the Teacher portal.
///
/// Houses the primary [NavigationBar] destination tabs:
/// - Dashboard / Home: Summary metrics and quick actions.
/// - Roll: Class attendance taking and status toggling.
/// - Tasks: Assignment creation and management.
/// - Routine: Weekly timetable view.
/// - Marks: Exam marks entry and grade sheets.
/// - Profile: Teacher account information and logout.
///
/// Uses an [IndexedStack] to preserve screen state across tab switches.
class TeacherMainScreen extends StatefulWidget {
  /// Constructs a [TeacherMainScreen].
  const TeacherMainScreen({super.key});

  @override
  State<TeacherMainScreen> createState() => _TeacherMainScreenState();
}

class _TeacherMainScreenState extends State<TeacherMainScreen> {
  /// Current index of the selected bottom navigation bar destination.
  int _currentIndex = 0;

  /// Ordered list of primary teacher destination screens.
  final List<Widget> _screens = const [
    TeacherDashboardScreen(),
    TeacherAttendanceScreen(),
    TeacherAssignmentsScreen(),
    TeacherRoutineScreen(),
    TeacherMarksScreen(),
    TeacherProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        height: 64,
        indicatorColor: AppTheme.teacherAccent.withValues(alpha: 0.15),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: [
          NavigationDestination(
            icon: AppIcons.render(AppIcons.teacherPortal, size: 22),
            selectedIcon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: AppTheme.teacherAccent.withValues(alpha: 0.2),
              ),
              child: AppIcons.render(AppIcons.teacherPortal, size: 22),
            ),
            label: 'Home',
          ),
          NavigationDestination(
            icon: AppIcons.render(AppIcons.attendance, size: 22),
            selectedIcon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: AppTheme.teacherAccent.withValues(alpha: 0.2),
              ),
              child: AppIcons.render(AppIcons.attendance, size: 22),
            ),
            label: 'Roll',
          ),
          NavigationDestination(
            icon: AppIcons.render(AppIcons.assignments, size: 22),
            selectedIcon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: AppTheme.teacherAccent.withValues(alpha: 0.2),
              ),
              child: AppIcons.render(AppIcons.assignments, size: 22),
            ),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: AppIcons.render(AppIcons.routine, size: 22),
            selectedIcon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: AppTheme.teacherAccent.withValues(alpha: 0.2),
              ),
              child: AppIcons.render(AppIcons.routine, size: 22),
            ),
            label: 'Routine',
          ),
          NavigationDestination(
            icon: AppIcons.render(AppIcons.marks, size: 22),
            selectedIcon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: AppTheme.teacherAccent.withValues(alpha: 0.2),
              ),
              child: AppIcons.render(AppIcons.marks, size: 22),
            ),
            label: 'Marks',
          ),
          NavigationDestination(
            icon: AppIcons.render(AppIcons.profile, size: 22),
            selectedIcon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6),
                color: AppTheme.teacherAccent.withValues(alpha: 0.2),
              ),
              child: AppIcons.render(AppIcons.profile, size: 22),
            ),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
