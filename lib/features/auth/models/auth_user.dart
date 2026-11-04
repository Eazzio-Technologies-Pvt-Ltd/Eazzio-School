/// Enumeration representing the possible user roles within the school system.
enum UserRole {
  /// Student account accessing the student portal.
  student,

  /// Teacher account accessing the teacher portal and class management.
  teacher,

  /// School principal with administrative oversight.
  principal,

  /// System administrator with global control.
  admin,

  /// Accountant handling school fees and finances.
  accountant,

  /// Unrecognized or unauthenticated role.
  unknown;

  /// Parses a string representation of a role into a [UserRole] enum.
  ///
  /// Returns [UserRole.unknown] if [role] is null or unrecognized.
  static UserRole fromString(String? role) {
    if (role == null) return UserRole.unknown;
    switch (role.toUpperCase()) {
      case 'STUDENT':
        return UserRole.student;
      case 'TEACHER':
        return UserRole.teacher;
      case 'PRINCIPAL':
        return UserRole.principal;
      case 'ADMIN':
        return UserRole.admin;
      case 'ACCOUNTANT':
        return UserRole.accountant;
      default:
        return UserRole.unknown;
    }
  }

  /// Converts the enum to the string identifier expected by backend APIs.
  String toServerString() {
    switch (this) {
      case UserRole.student:
        return 'student';
      case UserRole.teacher:
        return 'teacher';
      case UserRole.principal:
        return 'principal';
      case UserRole.admin:
        return 'admin';
      case UserRole.accountant:
        return 'accountant';
      case UserRole.unknown:
        return '';
    }
  }
}

/// Represents an authenticated user in the application session.
class AuthUser {
  /// Unique identifier of the user.
  final int userId;

  /// Full display name of the user.
  final String name;

  /// Login username or email identifier.
  final String loginId;

  /// Assigned role of the user (e.g. student, teacher).
  final UserRole role;

  /// Identifier of the school tenant to which the user belongs.
  final int schoolId;

  /// Creates an [AuthUser] instance with the provided credentials and metadata.
  AuthUser({
    required this.userId,
    required this.name,
    required this.loginId,
    required this.role,
    required this.schoolId,
  });

  /// Factory constructor to deserialize an [AuthUser] from a JSON map.
  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      userId: json['userId'] is int
          ? json['userId']
          : int.tryParse(json['userId'].toString()) ?? 0,
      name: json['name'] ?? '',
      loginId: json['loginId'] ?? '',
      role: UserRole.fromString(json['role']),
      schoolId: json['schoolId'] is int
          ? json['schoolId']
          : int.tryParse(json['schoolId'].toString()) ?? 0,
    );
  }

  /// Serializes the [AuthUser] instance into a JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'name': name,
      'loginId': loginId,
      'role': role.name.toUpperCase(),
      'schoolId': schoolId,
    };
  }
}

/// Represents the response payload returned after a login attempt.
class LoginResponse {
  /// Indicates whether the login request succeeded.
  final bool success;

  /// JWT authentication token issued upon successful login.
  final String? token;

  /// Authenticated user profile data, present when [success] is true.
  final AuthUser? user;

  /// Error message describing the reason for failure, if any.
  final String? error;

  /// Creates a [LoginResponse] object.
  LoginResponse({
    required this.success,
    this.token,
    this.user,
    this.error,
  });

  /// Factory constructor to parse a [LoginResponse] from backend API response JSON.
  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final success = json['success'] == true;
    if (success && json['data'] != null) {
      final data = json['data'];
      return LoginResponse(
        success: true,
        token: data['token'],
        user: data['user'] != null ? AuthUser.fromJson(data['user']) : null,
      );
    }
    return LoginResponse(
      success: false,
      error: json['error'] ?? 'Login failed',
    );
  }
}
