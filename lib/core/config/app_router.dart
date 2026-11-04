import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:eazzio_school/features/auth/models/auth_user.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import 'package:eazzio_school/features/auth/presentation/role_selection_screen.dart';
import 'package:eazzio_school/features/auth/presentation/login_screen.dart';
import 'package:eazzio_school/features/student/presentation/student_main_screen.dart';
import 'package:eazzio_school/features/teacher/presentation/teacher_main_screen.dart';

/// Declarative navigation and role-based route guards for Eazzio School.
/// 
/// WHAT IT DOES:
/// Manages the application navigation hierarchy (`/`, `/login`, `/student`, `/teacher`),
/// automatically redirecting users depending on their session state and permission level.
/// 
/// HOW IT WORKS:
/// - Listens to [authNotifierProvider]. Whenever the user logs in, logs out, or switches role,
///   [RouterNotifier] notifies GoRouter to re-evaluate the redirect logic.
/// - Unauthenticated users attempting to access protected screens are redirected to `/`.
/// - Logged-in students attempting to access `/teacher` are bounced back to `/student`.
/// - Logged-in teachers/principals attempting to access `/student` are bounced back to `/teacher`.
class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    // Listens to authentication state changes and triggers route re-evaluations
    _ref.listen<AuthState>(
      authNotifierProvider,
      (_, __) => notifyListeners(),
    );
  }

  /// Global routing logic evaluated on every navigation change.
  /// Returns a path string to redirect, or null to allow navigation to proceed.
  String? redirect(context, GoRouterState state) {
    final authState = _ref.read(authNotifierProvider);
    final isAuth = authState.status == AuthStatus.authenticated;
    final loc = state.matchedLocation;
    final isAuthRoute = loc == '/' || loc == '/login';

    // 1. Not logged in: Allow auth pages, but block protected student/teacher routes
    if (!isAuth) {
      return isAuthRoute ? null : '/';
    }

    // 2. Already logged in: If user visits login/landing page, redirect straight to their portal
    if (isAuthRoute) {
      if (authState.user?.role == UserRole.teacher ||
          authState.user?.role == UserRole.admin ||
          authState.user?.role == UserRole.principal) {
        return '/teacher';
      } else {
        return '/student';
      }
    }

    // 3. Role Security Guards: Prevent cross-role portal access
    if (loc.startsWith('/teacher') &&
        authState.user?.role == UserRole.student) {
      return '/student';
    }
    if (loc.startsWith('/student') &&
        (authState.user?.role == UserRole.teacher ||
            authState.user?.role == UserRole.admin ||
            authState.user?.role == UserRole.principal)) {
      return '/teacher';
    }

    // Path is allowed as requested
    return null;
  }
}

/// Riverpod provider for the route guard notifier.
final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

/// Root GoRouter configuration consumed by [MaterialApp.router].
final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      // Landing / Account Selection Screen
      GoRoute(
        path: '/',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const RoleSelectionScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),
      // Login Form Screen (toggles student vs teacher portal)
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const LoginScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final curved = CurvedAnimation(parent: animation, curve: Curves.easeInOutCubic);
            return SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(1.0, 0),
                end: Offset.zero,
              ).animate(curved),
              child: child,
            );
          },
        ),
      ),
      // Student Main Portal (bottom navigation: dashboard, routine, attendance, fees, results)
      GoRoute(
        path: '/student',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const StudentMainScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),
      // Teacher Main Portal (bottom navigation: dashboard, classes, marks, attendance, notices)
      GoRoute(
        path: '/teacher',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const TeacherMainScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),
    ],
  );
});
