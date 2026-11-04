import 'package:flutter/material.dart';

/// Central registry of bespoke high-resolution vector-rendered icons for Eazzio-School.
///
/// Contains asset paths for portal and module icons, along with a fallback mechanism
/// and helper widget renderer [render].
class AppIcons {
  /// Asset path for Student Portal icon.
  static const String studentPortal = 'assets/icons/icon_student_portal.png';

  /// Asset path for Teacher Portal icon.
  static const String teacherPortal = 'assets/icons/icon_teacher_portal.png';

  /// Asset path for Attendance module icon.
  static const String attendance = 'assets/icons/icon_attendance.png';

  /// Asset path for Class Routine/Timetable icon.
  static const String routine = 'assets/icons/icon_routine.png';

  /// Asset path for Homework & Assignments icon.
  static const String assignments = 'assets/icons/icon_assignments.png';

  /// Asset path for Fees & Billing icon.
  static const String fees = 'assets/icons/icon_fees.png';

  /// Asset path for Exam Results icon.
  static const String results = 'assets/icons/icon_results.png';

  /// Asset path for Notices & Announcements icon.
  static const String notices = 'assets/icons/icon_notices.png';

  /// Asset path for User Profile icon.
  static const String profile = 'assets/icons/icon_profile.png';

  /// Asset path for Courses & Subjects icon.
  static const String courses = 'assets/icons/icon_courses.png';

  /// Asset path for Feedback icon.
  static const String feedback = 'assets/icons/icon_feedback.png';

  /// Asset path for Marks & Grading icon.
  static const String marks = 'assets/icons/icon_marks.png';

  /// Returns a matching Material [IconData] when the asset fails to load.
  static IconData _fallbackIcon(String path) {
    if (path.contains('student')) return Icons.school_outlined;
    if (path.contains('teacher')) return Icons.co_present_outlined;
    if (path.contains('attendance')) return Icons.fact_check_outlined;
    if (path.contains('routine')) return Icons.calendar_today_outlined;
    if (path.contains('assignments')) return Icons.assignment_outlined;
    if (path.contains('fees')) return Icons.account_balance_wallet_outlined;
    if (path.contains('results')) return Icons.emoji_events_outlined;
    if (path.contains('notices')) return Icons.campaign_outlined;
    if (path.contains('profile')) return Icons.person_outline;
    if (path.contains('courses')) return Icons.menu_book_outlined;
    if (path.contains('feedback')) return Icons.rate_review_outlined;
    if (path.contains('marks')) return Icons.grade_outlined;
    return Icons.widgets_outlined;
  }

  /// Renders a custom styled app icon with optional dimensions and tinting.
  ///
  /// Displays the image specified by [assetPath]. If the asset cannot be loaded,
  /// it smoothly degrades to a Material icon equivalent via [_fallbackIcon].
  ///
  /// Parameters:
  /// - [assetPath]: Path of the target PNG/asset icon.
  /// - [size]: Width and height dimension for the icon. Defaults to `24`.
  /// - [fit]: How the icon fits within its allocated bounding box. Defaults to [BoxFit.contain].
  /// - [color]: Optional color tint filter applied to the icon.
  static Widget render(
    String assetPath, {
    double size = 24,
    BoxFit fit = BoxFit.contain,
    Color? color,
  }) {
    return Image.asset(
      assetPath,
      width: size,
      height: size,
      fit: fit,
      color: color,
      filterQuality: FilterQuality.high,
      errorBuilder: (context, error, stackTrace) {
        return Icon(
          _fallbackIcon(assetPath),
          size: size,
          color: color ?? const Color(0xFF0F766E),
        );
      },
    );
  }
}
