// Backend base URL. Android emulators reach the host machine's localhost via
// 10.0.2.2, not 127.0.0.1/localhost — that's the default here. Override for a
// physical device or staging backend with:
//   flutter run --dart-define=API_BASE_URL=http://192.168.1.23:4000/api/v1
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1',
  );

  // backend/src/uploads' local-disk fallback (used whenever no S3 credentials
  // are configured — the normal case in dev) bakes the backend process's own
  // idea of its reachable address (PUBLIC_BASE_URL, default `localhost`)
  // directly into `image_url`. That's almost never the address *this app*
  // can reach it at (10.0.2.2 for an emulator, a LAN IP for a real device) —
  // unlike a real S3 URL, which is globally reachable as returned. Local-disk
  // URLs always contain "/uploads/" right after the origin (see
  // LocalDiskUploadAdapter/upload.provider.ts); detect that shape and
  // substitute this app's own known-reachable API origin instead of trusting
  // the one the backend embedded. Real S3 URLs (different host, no
  // "/uploads/" segment) pass through unchanged.
  static String? resolveImageUrl(String? url) {
    if (url == null) return null;
    const marker = '/uploads/';
    final index = url.indexOf(marker);
    if (index == -1) return url;
    final apiOrigin = Uri.parse(apiBaseUrl).origin;
    return '$apiOrigin${url.substring(index)}';
  }
}
