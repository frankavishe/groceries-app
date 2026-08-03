import 'dart:convert';

import '../core/api_client.dart';
import '../core/secure_storage.dart';
import '../models/user.dart';

class AuthRepository {
  final ApiClient apiClient;
  final SecureStorage secureStorage;

  AuthRepository({required this.apiClient, required this.secureStorage});

  // Req 1: POST /auth/register. Backend returns {id, full_name, phone_number,
  // message} — no session yet, the account is unverified until Req 4's OTP step.
  Future<void> register({
    required String fullName,
    required String phoneNumber,
    required String password,
  }) {
    return apiClient.post(
      '/auth/register',
      body: {
        'full_name': fullName,
        'phone_number': phoneNumber,
        'password': password,
      },
    );
  }

  // Req 1: POST /auth/verify-otp.
  Future<void> verifyOtp({
    required String phoneNumber,
    required String code,
  }) {
    return apiClient.post(
      '/auth/verify-otp',
      body: {'phone_number': phoneNumber, 'code': code},
    );
  }

  // Req 2: POST /auth/login, persists the JWT + user via secure storage.
  Future<AppUser> login({
    required String phoneNumber,
    required String password,
  }) async {
    final response = await apiClient.post(
      '/auth/login',
      body: {'phone_number': phoneNumber, 'password': password},
    ) as Map<String, dynamic>;

    final token = response['access_token'] as String;
    final user = AppUser.fromJson(response['user'] as Map<String, dynamic>);

    await secureStorage.writeToken(token);
    await secureStorage.writeUserJson(jsonEncode(user.toJson()));

    return user;
  }

  Future<AppUser?> restoreSession() async {
    final token = await secureStorage.readToken();
    final userJson = await secureStorage.readUserJson();
    if (token == null || userJson == null) return null;
    return AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
  }

  Future<void> logout() => secureStorage.clear();
}
