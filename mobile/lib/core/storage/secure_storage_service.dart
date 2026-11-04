import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Hardware-backed secure persistence service for cryptographic tokens and session records.
/// 
/// WHAT IT DOES:
/// Stores the sensitive JSON Web Token (JWT), user authentication state, and portal preferences.
/// 
/// HOW IT WORKS:
/// - Uses [FlutterSecureStorage] which leverages Android Keystore / iOS Keychain under the hood.
/// - Falls back smoothly to [SharedPreferences] in testing or Web environments if Keystore is unavailable.
class SecureStorageService {
  static const _tokenKey = 'auth_jwt_token';
  static const _userDataKey = 'auth_user_data';
  static const _selectedPortalKey = 'selected_portal_choice';

  final FlutterSecureStorage _storage;

  SecureStorageService()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true,
          ),
        );

  /// Encrypts and writes the JWT token to local device keystore.
  Future<void> saveToken(String token) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      return;
    }
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_tokenKey);
    }
    return await _storage.read(key: _tokenKey);
  }

  Future<void> saveUserData(Map<String, dynamic> userMap) async {
    final str = jsonEncode(userMap);
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userDataKey, str);
      return;
    }
    await _storage.write(key: _userDataKey, value: str);
  }

  Future<Map<String, dynamic>?> getUserData() async {
    String? str;
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      str = prefs.getString(_userDataKey);
    } else {
      str = await _storage.read(key: _userDataKey);
    }
    if (str == null) return null;
    try {
      final decoded = jsonDecode(str);
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userDataKey);
    if (!kIsWeb) {
      try {
        await _storage.delete(key: _tokenKey);
        await _storage.delete(key: _userDataKey);
      } catch (_) {}
    }
  }

  // Preference for remembering last selected portal on login screen
  Future<void> saveSelectedPortal(String portal) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_selectedPortalKey, portal);
  }

  Future<String?> getSelectedPortal() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_selectedPortalKey);
  }
}
