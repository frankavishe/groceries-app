import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Persists the JWT via flutter_secure_storage rather than Hive/SharedPreferences
// since it's a credential (specs/mobile-app/requirements.md Req 2,
// design.md "State Management & Persistence").
class SecureStorage {
  static const _tokenKey = 'access_token';
  static const _userKey = 'current_user';

  final FlutterSecureStorage _storage;

  SecureStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  Future<void> writeToken(String token) => _storage.write(key: _tokenKey, value: token);

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> writeUserJson(String json) => _storage.write(key: _userKey, value: json);

  Future<String?> readUserJson() => _storage.read(key: _userKey);

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }
}
