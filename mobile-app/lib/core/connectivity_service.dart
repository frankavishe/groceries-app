import 'package:connectivity_plus/connectivity_plus.dart';

// Req 7-8: only checkout/payment require connectivity; browsing and cart
// manipulation must keep working offline. This is a thin wrapper so
// providers/widgets don't depend on connectivity_plus directly.
class ConnectivityService {
  final Connectivity _connectivity;

  ConnectivityService({Connectivity? connectivity})
    : _connectivity = connectivity ?? Connectivity();

  Future<bool> isOnline() async {
    final results = await _connectivity.checkConnectivity();
    return !results.contains(ConnectivityResult.none);
  }

  Stream<bool> get onStatusChange => _connectivity.onConnectivityChanged.map(
    (results) => !results.contains(ConnectivityResult.none),
  );
}
