import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';
import 'theme.dart';

class RajutechieStreamKitApp extends StatefulWidget {
  const RajutechieStreamKitApp({super.key});

  @override
  State<RajutechieStreamKitApp> createState() => _RajutechieStreamKitAppState();
}

class _RajutechieStreamKitAppState extends State<RajutechieStreamKitApp> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final authService = context.read<AuthService>();
    await authService.tryRestoreSession();
    setState(() => _initialized = true);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RajutechieStreamKit Demo',
      debugShowCheckedModeBanner: false,
      theme: darkTheme,
      home: _buildHome(),
    );
  }

  Widget _buildHome() {
    if (!_initialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Consumer<AuthService>(
      builder: (context, auth, _) {
        if (auth.isAuthenticated) {
          return const HomeScreen();
        }
        return const LoginScreen();
      },
    );
  }
}
