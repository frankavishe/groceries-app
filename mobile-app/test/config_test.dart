import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/config.dart';

void main() {
  group('AppConfig.resolveImageUrl', () {
    test('rewrites a local-disk-fallback URL to this app\'s own API origin', () {
      // Simulates what LocalDiskUploadAdapter embeds when the backend itself
      // resolves as "localhost" — never reachable from an emulator/device.
      const backendSelfUrl =
          'http://localhost:4000/uploads/products/abc/def.png';

      final resolved = AppConfig.resolveImageUrl(backendSelfUrl);

      expect(
        resolved,
        '${Uri.parse(AppConfig.apiBaseUrl).origin}/uploads/products/abc/def.png',
      );
    });

    test('is idempotent (safe to re-resolve an already-resolved URL)', () {
      const once = 'http://localhost:4000/uploads/products/abc/def.png';
      final resolved = AppConfig.resolveImageUrl(once);
      final resolvedAgain = AppConfig.resolveImageUrl(resolved);

      expect(resolvedAgain, resolved);
    });

    test('leaves a real S3 URL untouched', () {
      const s3Url = 'https://my-bucket.s3.amazonaws.com/products/abc/def.png';

      expect(AppConfig.resolveImageUrl(s3Url), s3Url);
    });

    test('passes null through', () {
      expect(AppConfig.resolveImageUrl(null), isNull);
    });
  });
}
