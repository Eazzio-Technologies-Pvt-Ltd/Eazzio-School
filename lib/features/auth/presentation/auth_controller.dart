import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../data/auth_repository.dart';
import '../models/auth_user.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storageService: storage);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthRepository(apiClient: client, storageService: storage);
});

/// High-level authentication state lifecycle:
/// - [initial]: App just launched, checking persisted token.
/// - [authenticated]: Valid JWT active, user payload loaded.
/// - [unauthenticated]: Logged out or session expired.
/// - [loading]: Login request in flight.
enum AuthStatus { initial, authenticated, unauthenticated, loading }

/// Immutable state container holding session information and the active portal selection.
class AuthState {
  final AuthStatus status;
  final AuthUser? user;
  final String? errorMessage;
  /// Portal mode selected on login screen ([UserRole.student] or [UserRole.teacher]).
  final UserRole selectedPortal;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
    this.selectedPortal = UserRole.student,
  });

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? errorMessage,
    UserRole? selectedPortal,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
      selectedPortal: selectedPortal ?? this.selectedPortal,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  final SecureStorageService _storage;

  AuthNotifier(this._repo, this._storage, ApiClient apiClient)
      : super(const AuthState()) {
    apiClient.onUnauthorized = handleSessionExpired;
    checkSession();
  }

  Future<void> checkSession() async {
    final user = await _repo.getSavedUser();
    final token = await _repo.getSavedToken();
    final savedPortalStr = await _storage.getSelectedPortal();
    final initialPortal =
        savedPortalStr == 'teacher' ? UserRole.teacher : UserRole.student;

    if (user != null && token != null) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        selectedPortal:
            user.role == UserRole.teacher ? UserRole.teacher : UserRole.student,
      );
    } else {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        selectedPortal: initialPortal,
      );
    }
  }

  void selectPortal(UserRole role) {
    if (role == UserRole.student || role == UserRole.teacher) {
      _storage.saveSelectedPortal(role.name);
      state = state.copyWith(selectedPortal: role, errorMessage: null);
    }
  }

  Future<bool> login(
      {required String loginId, required String password}) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    final res = await _repo.login(
      loginId: loginId,
      password: password,
      role: state.selectedPortal,
    );

    if (res.success && res.user != null) {
      // Validate that authenticated user role matches intended role access
      if (state.selectedPortal == UserRole.student &&
          res.user!.role != UserRole.student) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'Invalid login credentials or incorrect portal selected.',
        );
        await _repo.logout();
        return false;
      }

      if (state.selectedPortal == UserRole.teacher &&
          res.user!.role != UserRole.teacher &&
          res.user!.role != UserRole.admin &&
          res.user!.role != UserRole.principal) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: 'Invalid login credentials or incorrect portal selected.',
        );
        await _repo.logout();
        return false;
      }

      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: res.user,
        errorMessage: null,
      );
      return true;
    } else {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: res.error ?? 'Invalid email or password.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = state.copyWith(
      status: AuthStatus.unauthenticated,
      user: null,
      errorMessage: null,
    );
  }

  Future<void> handleSessionExpired() async {
    if (state.status == AuthStatus.unauthenticated && state.user == null) {
      return;
    }
    await _repo.logout();
    state = state.copyWith(
      status: AuthStatus.unauthenticated,
      user: null,
      errorMessage: 'Your session has expired. Please log in again.',
    );
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  final storage = ref.watch(secureStorageProvider);
  final client = ref.watch(apiClientProvider);
  return AuthNotifier(repo, storage, client);
});
