import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/app.dart';
import 'package:mobile_app/core/api_client.dart';
import 'package:mobile_app/core/secure_storage.dart';
import 'package:mobile_app/data/auth_repository.dart';
import 'package:mobile_app/models/user.dart';
import 'package:mobile_app/providers/auth_provider.dart';

// Real AuthRepository.restoreSession() hits flutter_secure_storage's
// platform channel, which isn't wired up under flutter_test — override with
// a version that just reports "no session" instead of mocking that channel.
class _NoSessionAuthRepository extends AuthRepository {
  _NoSessionAuthRepository()
    : super(
        apiClient: ApiClient(secureStorage: SecureStorage()),
        secureStorage: SecureStorage(),
      );

  @override
  Future<AppUser?> restoreSession() async => null;
}

void main() {
  testWidgets('App boots to the login screen when signed out', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(
            (ref) => AuthController(_NoSessionAuthRepository()),
          ),
        ],
        child: const GroceriesApp(),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.text('Log in'), findsWidgets);
  });
}
