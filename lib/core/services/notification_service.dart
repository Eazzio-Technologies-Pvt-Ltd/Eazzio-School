import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static const String _lastSeenNoticeKey = 'last_seen_notice_id';

  static Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _notificationsPlugin.initialize(initSettings);

    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidImpl?.requestNotificationsPermission();

    _initialized = true;
  }

  /// Returns true if the latest notice has not yet been seen by the student
  static Future<bool> hasUnreadNotices(List<int> noticeIds) async {
    if (noticeIds.isEmpty) return false;
    final prefs = await SharedPreferences.getInstance();
    final lastSeenId = prefs.getInt(_lastSeenNoticeKey) ?? 0;
    // If the maximum notice ID is greater than what user has marked seen
    final maxId = noticeIds.reduce((curr, next) => curr > next ? curr : next);
    return maxId > lastSeenId;
  }

  /// Marks all current notice IDs as seen
  static Future<void> markNoticesAsSeen(List<int> noticeIds) async {
    if (noticeIds.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final maxId = noticeIds.reduce((curr, next) => curr > next ? curr : next);
    await prefs.setInt(_lastSeenNoticeKey, maxId);
  }

  /// Triggers a native system tray push notification if a new notice arrives
  static Future<void> showNotificationIfNew({
    required int id,
    required String title,
    required String body,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final lastSeenId = prefs.getInt(_lastSeenNoticeKey) ?? 0;

    if (id > lastSeenId) {
      await showPushNotification(
        id: id,
        title: title,
        body: body,
      );
    }
  }

  static Future<void> showPushNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'eazzio_school_notices',
      'School Notices',
      channelDescription: 'Announcements and circulars from school',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const notificationDetails =
        NotificationDetails(android: androidDetails);

    await _notificationsPlugin.show(
      id,
      title,
      body,
      notificationDetails,
    );
  }
}
