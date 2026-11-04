import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config/app_config.dart';
import 'core/config/app_router.dart';
import 'core/services/notification_service.dart';
import 'core/theme/app_theme.dart';

/// Entry point of the Eazzio-School mobile application.
///
/// Ensures Flutter engine bindings are initialized, configures local/remote
/// push notification handlers, and wraps the app in a Riverpod [ProviderScope].
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.initialize();
  runApp(
    const ProviderScope(
      child: EazzioSchoolApp(),
    ),
  );
}

/// Root application widget that configures GoRouter and the global Material theme.
class EazzioSchoolApp extends ConsumerWidget {
  /// Creates the root [EazzioSchoolApp] widget instance.
  const EazzioSchoolApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
