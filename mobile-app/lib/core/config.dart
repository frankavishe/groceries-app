// Backend base URL. Android emulators reach the host machine's localhost via
// 10.0.2.2, not 127.0.0.1/localhost — that's the default here. Override for a
// physical device or staging backend with:
//   flutter run --dart-define=API_BASE_URL=http://192.168.1.23:4000/api/v1
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1',
  );

  // Gates the mocked "always succeeds" payment path (POST /orders/:id/stub-pay)
  // described in specs/mobile-app/design.md. Must be forced false in release
  // builds once the real payments engine (M8/M9) lands:
  //   flutter build apk --dart-define=STUB_PAYMENTS=false
  static const bool stubPaymentsEnabled = bool.fromEnvironment(
    'STUB_PAYMENTS',
    defaultValue: true,
  );
}
