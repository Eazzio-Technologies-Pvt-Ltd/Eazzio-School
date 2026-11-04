import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_database_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_user.dart';

/// Authentication Repository for Eazzio School.
///
/// WHAT IT DOES:
/// Manages user authentication endpoints, handles JWT token persistence,
/// parses user profile models, and orchestrates user session storage.
///
/// HOW IT WORKS:
/// - Sends login credentials to `/auth/login` via [ApiClient].
/// - On successful authentication, caches the returned JWT token and user profile
///   into [SecureStorageService].
/// - Provides session retrieval methods to restore persisted user states on boot.
class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  AuthRepository({
    required ApiClient apiClient,
    required SecureStorageService storageService,
  })  : _apiClient = apiClient,
        _storageService = storageService;

  /// Authenticates a student, teacher, or admin against the school API.
  ///
  /// Parameters:
  /// - [loginId]: Can be an email address, student ID, or employee ID.
  /// - [password]: User account password.
  /// - [role]: Expected [UserRole] (student or teacher/staff).
  ///
  /// Returns a [LoginResponse] containing success status, auth token, and profile info.
  Future<LoginResponse> login({
    required String loginId,
    required String password,
    required UserRole role,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/auth/login',
        data: {
          'email':
              loginId, // backend uses 'email' field to accept email, studentId or employeeId
          'password': password,
          'role': role.toServerString(),
        },
      );

      final loginRes = LoginResponse.fromJson(response.data);
      if (loginRes.success && loginRes.token != null && loginRes.user != null) {
        await _storageService.saveToken(loginRes.token!);
        await _storageService.saveUserData(loginRes.user!.toJson());
      }
      return loginRes;
    } on DioException catch (e) {
      final errorMsg = _apiClient.parseErrorMessage(e);
      return LoginResponse(success: false, error: errorMsg);
    } catch (e) {
      return LoginResponse(success: false, error: e.toString());
    }
  }

  /// Retrieves the cached [AuthUser] profile from encrypted storage if present.
  Future<AuthUser?> getSavedUser() async {
    final data = await _storageService.getUserData();
    if (data != null) {
      return AuthUser.fromJson(data);
    }
    return null;
  }

  /// Retrieves the cached JWT bearer token from secure storage.
  Future<String?> getSavedToken() async {
    return await _storageService.getToken();
  }

  /// Clears stored user profile, bearer token, and local SQLite cache to cleanly terminate the session.
  Future<void> logout() async {
    await _storageService.clearAuth();
    try {
      await LocalDatabaseService.clearUserData();
    } catch (_) {}
  }
}
