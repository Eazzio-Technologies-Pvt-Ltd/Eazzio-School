import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Service responsible for managing local offline data and cached drafts.
///
/// Handles storing, retrieving, updating, and clearing attendance drafts
/// using [SharedPreferences] to ensure offline capability matches web behavior.
class LocalDatabaseService {
  static const _draftsKey = 'offline_attendance_drafts';

  /// Saves an offline attendance draft record into local storage.
  ///
  /// Takes [courseId], [courseName], [date] formatted as ISO-8601 or YYYY-MM-DD,
  /// and [records] list containing student attendance records.
  /// Returns the newly generated draft unique ID.
  static Future<int> insertAttendanceDraft({
    required int courseId,
    required String courseName,
    required String date,
    required List<Map<String, dynamic>> records,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final drafts = await getPendingAttendanceDrafts();
    final newId = DateTime.now().millisecondsSinceEpoch;

    drafts.insert(0, {
      'id': newId,
      'course_id': courseId,
      'course_name': courseName,
      'date': date,
      'records_json': jsonEncode(records),
      'created_at': DateTime.now().toIso8601String(),
      'status': 'PENDING',
    });

    await prefs.setString(_draftsKey, jsonEncode(drafts));
    return newId;
  }

  /// Retrieves all local attendance drafts that are marked as 'PENDING'.
  ///
  /// Returns an empty list if no drafts exist or if parsing fails.
  static Future<List<Map<String, dynamic>>> getPendingAttendanceDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftsKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((d) => d['status'] == 'PENDING')
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Updates the status of an existing attendance draft identified by [id].
  ///
  /// [status] typically represents states such as 'PENDING', 'SYNCED', or 'FAILED'.
  static Future<void> updateDraftStatus(int id, String status) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftsKey);
    if (raw == null) return;
    try {
      final list = jsonDecode(raw) as List;
      final drafts = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      for (final d in drafts) {
        if (d['id'] == id) {
          d['status'] = status;
          break;
        }
      }
      await prefs.setString(_draftsKey, jsonEncode(drafts));
    } catch (_) {}
  }

  /// Deletes a cached attendance draft identified by its [id].
  static Future<void> deleteDraft(int id) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftsKey);
    if (raw == null) return;
    try {
      final list = jsonDecode(raw) as List;
      final drafts = list
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((d) => d['id'] != id)
          .toList();
      await prefs.setString(_draftsKey, jsonEncode(drafts));
    } catch (_) {}
  }

  /// Clears all local cached data and offline attendance drafts upon user logout.
  static Future<void> clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_draftsKey);
  }
}
