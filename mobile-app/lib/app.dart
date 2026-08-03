import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_shell.dart';

class GroceriesApp extends StatelessWidget {
  const GroceriesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Groceries',
      theme: ThemeData(colorSchemeSeed: Colors.green, useMaterial3: true),
      home: const AuthGate(),
    );
  }
}

// Req 2: JWT persisted via flutter_secure_storage means a returning user
// skips straight to the catalog instead of the login screen.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    switch (auth.status) {
      case AuthStatus.unknown:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case AuthStatus.authenticated:
        return const HomeShell();
      case AuthStatus.unauthenticated:
        return const LoginScreen();
    }
  }
}
