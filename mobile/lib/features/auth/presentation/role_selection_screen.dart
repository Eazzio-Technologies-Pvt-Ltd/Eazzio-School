import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:eazzio_school/features/auth/models/auth_user.dart';
import 'auth_controller.dart';

/// Landing screen that prompts users to select their target portal (Student or Teacher).
///
/// Features clean animated role cards that navigate to the credential login screen
/// pre-configured with the chosen role.
class RoleSelectionScreen extends ConsumerStatefulWidget {
  /// Creates the role selection screen widget.
  const RoleSelectionScreen({super.key});

  @override
  ConsumerState<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends ConsumerState<RoleSelectionScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 480),
          child: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: FadeTransition(
                opacity: _fadeAnim,
                child: SlideTransition(
                  position: _slideAnim,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      SizedBox(height: size.height * 0.06),

                      // Clean Brand Logo
                      SizedBox(
                        width: size.width * 0.75,
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(height: 36),

                      // Header
                      Text(
                        'Welcome Back',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF000000),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Select your account type to continue',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.black.withValues(alpha: 0.6),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 36),

                      // Role Selection Cards side-by-side
                      Row(
                        children: [
                          Expanded(
                            child: _AccountRoleCard(
                              title: 'Student\nLogin',
                              icon: Icons.school_rounded,
                              accentColor: const Color(0xFF2563EB),
                              bgColor: const Color(0xFFEFF6FF),
                              onTap: () {
                                ref.read(authNotifierProvider.notifier).selectPortal(UserRole.student);
                                context.push('/login');
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _AccountRoleCard(
                              title: 'Teacher\nLogin',
                              icon: Icons.groups_rounded,
                              accentColor: const Color(0xFF008080),
                              bgColor: const Color(0xFFE6F5F5),
                              onTap: () {
                                ref.read(authNotifierProvider.notifier).selectPortal(UserRole.teacher);
                                context.push('/login');
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 48),

                      // Footer
                      Text(
                        'v1.0.3 · Powered by Eazzio Technologies Pvt Ltd',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.black.withValues(alpha: 0.4),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Interactive button card representing a specific user role selection.
class _AccountRoleCard extends StatefulWidget {
  final String title;
  final IconData icon;
  final Color accentColor;
  final Color bgColor;
  final VoidCallback onTap;

  const _AccountRoleCard({
    required this.title,
    required this.icon,
    required this.accentColor,
    required this.bgColor,
    required this.onTap,
  });

  @override
  State<_AccountRoleCard> createState() => _AccountRoleCardState();
}

class _AccountRoleCardState extends State<_AccountRoleCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 100),
        curve: Curves.easeOut,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: _pressed
                  ? widget.accentColor.withValues(alpha: 0.5)
                  : const Color(0xFFE4E4EC),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.accentColor.withValues(alpha: _pressed ? 0.12 : 0.04),
                blurRadius: _pressed ? 20 : 12,
                spreadRadius: 0,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Icon bubble
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: widget.bgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  widget.icon,
                  color: widget.accentColor,
                  size: 28,
                ),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                widget.title,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF000000),
                  height: 1.25,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
