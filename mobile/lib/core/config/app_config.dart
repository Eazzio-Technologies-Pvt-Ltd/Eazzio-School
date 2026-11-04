
/// Global configuration constants and endpoints for the Eazzio School mobile application.
/// 
/// WHAT IT DOES:
/// Centralizes environment variables, API endpoints, and base URLs so that any changes
/// to backend infrastructure (local dev, staging, or production Render) are controlled here.
/// 
/// HOW IT WORKS:
/// - Reads `API_BASE_URL` from compile-time arguments (--dart-define=API_BASE_URL=...).
/// - If none provided, defaults to the production Render cloud backend.
/// - Calculates uploads URL dynamically for serving notice attachments, photos, etc.
class AppConfig {
  /// Default base API endpoint pointing to the production cloud server.
  static String get defaultBaseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }
    return 'https://eazzio-school.onrender.com/api';
  }

  /// Active base URL currently used by [ApiClient] to make HTTP requests.
  static String baseUrl = defaultBaseUrl;

  /// Updates the active base URL dynamically during runtime (e.g. testing different environments).
  static void setBaseUrl(String url) {
    if (url.endsWith('/')) {
      baseUrl = url.substring(0, url.length - 1);
    } else {
      baseUrl = url;
    }
  }

  /// Derived base URL for static file uploads (e.g., student photos, notice attachments).
  /// Strips `/api` so that files stored under `/uploads/filename.pdf` resolve properly.
  static String get uploadsBaseUrl {
    final uri = Uri.tryParse(baseUrl);
    if (uri != null && uri.hasPort) {
      return '${uri.scheme}://${uri.host}:${uri.port}';
    } else if (uri != null) {
      return '${uri.scheme}://${uri.host}';
    }
    return 'https://eazzio-school.onrender.com';
  }

  /// Application branding name shown in system bars and headers.
  static const String appName = 'Eazzio-School';

  /// Semantic version string matching pubspec.yaml.
  static const String appVersion = '1.0.0';
}
