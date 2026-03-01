import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/channel_tile.dart';

class ChannelListScreen extends StatefulWidget {
  const ChannelListScreen({super.key});

  @override
  State<ChannelListScreen> createState() => _ChannelListScreenState();
}

class _ChannelListScreenState extends State<ChannelListScreen> {
  late Future<List<Map<String, dynamic>>> _channelsFuture;

  @override
  void initState() {
    super.initState();
    _channelsFuture = _loadChannels();
  }

  Future<List<Map<String, dynamic>>> _loadChannels() {
    return context.read<ApiService>().getChannels();
  }

  void _refresh() {
    setState(() {
      _channelsFuture = _loadChannels();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final currentUserId = auth.currentUser?.id;

    return RefreshIndicator(
      onRefresh: () async {
        final channels = _loadChannels();
        setState(() => _channelsFuture = channels);
        await channels;
      },
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _channelsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return _ErrorState(
              message: snapshot.error.toString(),
              onRetry: _refresh,
            );
          }

          final channels = snapshot.data ?? [];

          if (channels.isEmpty) {
            return _EmptyState(onCreateChannel: () async {
              final result =
                  await Navigator.of(context).pushNamed('/chat/create');
              if (result == true) _refresh();
            });
          }

          // Separate into DMs and groups
          final dms = channels
              .where((c) => c['type'] == 'dm' || c['type'] == 'direct')
              .toList();
          final groups = channels
              .where((c) => c['type'] != 'dm' && c['type'] != 'direct')
              .toList();

          return Scaffold(
            body: ListView(
              padding: const EdgeInsets.only(top: 8),
              children: [
                if (dms.isNotEmpty) ...[
                  _SectionHeader(title: 'Direct Messages', count: dms.length),
                  ...dms.map((channel) => ChannelTile(
                        channel: channel,
                        currentUserId: currentUserId,
                        onTap: () => _openChannel(channel),
                      )),
                ],
                if (groups.isNotEmpty) ...[
                  _SectionHeader(title: 'Groups', count: groups.length),
                  ...groups.map((channel) => ChannelTile(
                        channel: channel,
                        currentUserId: currentUserId,
                        onTap: () => _openChannel(channel),
                      )),
                ],
              ],
            ),
            floatingActionButton: FloatingActionButton(
              onPressed: () async {
                final result =
                    await Navigator.of(context).pushNamed('/chat/create');
                if (result == true) _refresh();
              },
              child: const Icon(Icons.edit_outlined),
            ),
          );
        },
      ),
    );
  }

  void _openChannel(Map<String, dynamic> channel) {
    final channelId = channel['id'] as String;
    final channelName =
        channel['name'] as String? ?? channel['type'] as String? ?? 'Chat';
    Navigator.of(context).pushNamed('/chat', arguments: {
      'channelId': channelId,
      'channelName': channelName,
    });
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;

  const _SectionHeader({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.white.withAlpha(100),
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(20),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 11,
                color: Colors.white.withAlpha(100),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onCreateChannel;

  const _EmptyState({required this.onCreateChannel});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: Colors.white.withAlpha(60),
            ),
            const SizedBox(height: 16),
            const Text(
              'No conversations yet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a new chat to get going.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withAlpha(140),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onCreateChannel,
              icon: const Icon(Icons.add),
              label: const Text('New Conversation'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
