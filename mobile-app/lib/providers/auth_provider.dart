import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../models/user.dart';
import 'core_providers.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AppUser? user;

  const AuthState({required this.status, this.user});

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(AppUser user)
    : this(status: AuthStatus.authenticated, user: user);
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    secureStorage: ref.watch(secureStorageProvider),
  ),
);

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
      (ref) => AuthController(ref.watch(authRepositoryProvider)),
    );

class AuthController extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthController(this._repository) : super(const AuthState.unknown()) {
    _restore();
  }

  Future<void> _restore() async {
    final user = await _repository.restoreSession();
    state = user != null
        ? AuthState.authenticated(user)
        : const AuthState.unauthenticated();
  }

  Future<void> register({
    required String fullName,
    required String phoneNumber,
    required String password,
  }) {
    return _repository.register(
      fullName: fullName,
      phoneNumber: phoneNumber,
      password: password,
    );
  }

  Future<void> verifyOtp({required String phoneNumber, required String code}) {
    return _repository.verifyOtp(phoneNumber: phoneNumber, code: code);
  }

  Future<void> login({
    required String phoneNumber,
    required String password,
  }) async {
    final user = await _repository.login(
      phoneNumber: phoneNumber,
      password: password,
    );
    state = AuthState.authenticated(user);
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState.unauthenticated();
  }
}
