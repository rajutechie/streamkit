import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/chat/channel_list_screen.dart';
import 'screens/chat/chat_screen.dart';
import 'screens/chat/create_channel_screen.dart';
import 'screens/call/call_screen.dart';
import 'screens/call/start_call_screen.dart';
import 'screens/stream/stream_list_screen.dart';
import 'screens/stream/stream_host_screen.dart';
import 'screens/stream/stream_viewer_screen.dart';
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
    final auth = context.read<AuthService>();
    await auth.tryRestoreSession();
    if (mounted) {
      setState(() => _initialized = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RajutechieStreamKit',
      debugShowCheckedModeBanner: false,
      theme: darkTheme,
      home: _initialized ? const _AuthGate() : const _SplashScreen(),
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/login':
            return MaterialPageRoute(builder: (_) => const LoginScreen());
          case '/home':
            return MaterialPageRoute(builder: (_) => const HomeScreen());
          case '/chat':
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (_) => ChatScreen(
                channelId: args['channelId'] as String,
                channelName: args['channelName'] as String,
              ),
            );
          case '/chat/create':
            return MaterialPageRoute(
                builder: (_) => const CreateChannelScreen());
          case '/call':
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (_) => CallScreen(
                callId: args['callId'] as String,
                callType: args['callType'] as String,
                calleeName: args['calleeName'] as String? ?? 'Unknown',
              ),
            );
          case '/call/start':
            return MaterialPageRoute(
                builder: (_) => const StartCallScreen());
          case '/stream':
            return MaterialPageRoute(
                builder: (_) => const StreamListScreen());
          case '/stream/host':
            return MaterialPageRoute(
                builder: (_) => const StreamHostScreen());
          case '/stream/view':
            final args = settings.arguments as Map<String, dynamic>;
            return MaterialPageRoute(
              builder: (_) => StreamViewerScreen(
                streamData: args,
              ),
            );
          default:
            return MaterialPageRoute(builder: (_) => const _AuthGate());
        }
      },
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (auth.isLoggedIn) {
      return const HomeScreen();
    }
    return const LoginScreen();
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.stream, size: 64, color: Color(0xFF6366F1)),
            SizedBox(height: 16),
            Text(
              'RajutechieStreamKit',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
