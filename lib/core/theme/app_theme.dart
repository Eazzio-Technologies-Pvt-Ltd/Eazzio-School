import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central visual styling and theming configuration for Eazzio-School.
///
/// Defines brand colors, typography using Google Fonts (Inter),
/// custom component themes, and cross-platform page transition builders.
class AppTheme {
  /// Primary brand blue color.
  static const Color primaryBlue = Color(0xFF2563EB); // Modern Royal Blue

  /// Secondary indigo accent color.
  static const Color secondaryIndigo = Color(0xFF4F46E5);

  /// Vibrant cyan highlight color.
  static const Color accentCyan = Color(0xFF06B6D4);

  /// Light background surface color.
  static const Color surfaceLight = Color(0xFFF8FAFC);

  /// Default background color for cards.
  static const Color cardLight = Colors.white;

  /// High contrast dark text color for readability.
  static const Color textDark = Color(0xFF0F172A);

  /// Muted subtitle and placeholder text color.
  static const Color textMuted = Color(0xFF64748B);

  /// Semantic success state color.
  static const Color successGreen = Color(0xFF10B981);

  /// Semantic warning or alert state color.
  static const Color warningAmber = Color(0xFFF59E0B);

  /// Semantic error state color.
  static const Color errorRed = Color(0xFFEF4444);

  /// Student portal visual accent color (Emerald / Teal).
  static const Color studentAccent = Color(0xFF0D9488);

  /// Teacher portal visual accent color (Royal Indigo).
  static const Color teacherAccent = Color(0xFF4338CA);

  /// Generates the global application [ThemeData] for light mode.
  ///
  /// Configures Material 3 theming, color schemes, card borders,
  /// input decorations, typography, button styles, and smooth page transitions.
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryBlue,
        primary: primaryBlue,
        secondary: secondaryIndigo,
        surface: surfaceLight,
        error: errorRed,
      ),
      scaffoldBackgroundColor: surfaceLight,
      cardTheme: CardThemeData(
        color: cardLight,
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: textDark,
        displayColor: textDark,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: textDark,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textDark,
        ),
        iconTheme: const IconThemeData(color: textDark),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: errorRed),
        ),
        hintStyle: GoogleFonts.inter(color: textMuted, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
          elevation: 0,
        ),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}
