import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../core/api_client.dart';
import '../core/connectivity_service.dart';
import '../core/secure_storage.dart';

// Both boxes are opened in main() before runApp and injected via
// ProviderScope overrides — Hive.openBox is async, so it can't happen inside
// a synchronous Provider body.
final catalogCacheBoxProvider = Provider<Box<String>>(
  (ref) => throw UnimplementedError('overridden in main.dart'),
);

final cartBoxProvider = Provider<Box<String>>(
  (ref) => throw UnimplementedError('overridden in main.dart'),
);

final secureStorageProvider = Provider<SecureStorage>((ref) => SecureStorage());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(secureStorage: ref.watch(secureStorageProvider)),
);

final connectivityServiceProvider = Provider<ConnectivityService>(
  (ref) => ConnectivityService(),
);

// Req 7: live online/offline signal consumed by the catalog banner and to
// disable checkout.
final isOnlineProvider = StreamProvider<bool>((ref) async* {
  final service = ref.watch(connectivityServiceProvider);
  yield await service.isOnline();
  yield* service.onStatusChange;
});
