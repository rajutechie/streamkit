import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../widgets/incoming_call_dialog.dart';
import 'call/start_call_screen.dart';
import 'chat/channel_list_screen.dart';
import 'meeting/meeting_list_screen.dart';
import 'stream/stream_list_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  StreamSubscription<Map<String, dynamic>>? _incomingCallSub;

  final _screens = const [
    ChannelListScreen(),
    StartCallScreen(),
    MeetingListScreen(),
    StreamListScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _listenForIncomingCalls();
  }

  void _listenForIncomingCalls() {
    final auth = context.read<AuthService>();
    final client = auth.rajutechieStreamKitClient;
    if (client == null) return;

    _incomingCallSub = client.call.incomingCalls.listen((data) {
      if (!mounted) return;
      final callId = data['callId'] as String? ?? data['id'] as String? ?? '';
      final callerName =
          data['callerName'] as String? ?? data['caller_name'] as String? ?? 'Unknown';
      final callType =
          data['type'] as String? ?? data['callType'] as String? ?? 'audio';

      showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (_) => IncomingCallDialog(
          callerName: callerName,
          callType: callType,
          onAccept: () {
            Navigator.of(context).pop(true);
            client.call.accept(callId);
          },
          onReject: () {
            Navigator.of(context).pop(false);
            client.call.reject(callId);
          },
        ),
      );
    });
  }

  @override
  void dispose() {
    _incomingCallSub?.cancel();
    super.dispose();
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<AuthService>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('RajutechieStreamKit'),
        actions: [
          if (auth.currentUser != null)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Text(
                  auth.currentUser!.displayName,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withAlpha(153),
                      ),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: _logout,
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.call_outlined),
            activeIcon: Icon(Icons.call),
            label: 'Calls',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.video_camera_front_outlined),
            activeIcon: Icon(Icons.video_camera_front),
            label: 'Meetings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.live_tv_outlined),
            activeIcon: Icon(Icons.live_tv),
            label: 'Streams',
          ),
        ],
      ),
    );
  }
}
