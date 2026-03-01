import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';
import '../../widgets/channel_tile.dart';
import 'chat_screen.dart';
import 'create_channel_screen.dart';

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
    _loadChannels();
  }

  void _loadChannels() {
    final api = context.read<AuthService>().api;
    _channelsFuture = api.getChannels();
  }

  Future<void> _refresh() async {
    setState(_loadChannels);
  }

  void _openChannel(Map<String, dynamic> channel) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatScreen(channel: channel),
      ),
    );
  }

  void _openCreateChannel() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const CreateChannelScreen()),
    );
    if (created == true) {
      _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currentUserId = context.read<AuthService>().currentUser?.id;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _channelsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline,
                        size: 48,
                        color: theme.colorScheme.error),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load channels',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      snapshot.error.toString(),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withAlpha(153),
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.tonal(
                      onPressed: _refresh,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final channels = snapshot.data ?? [];
          if (channels.isEmpty) {
            return _buildEmptyState(theme);
          }

          final dms = channels
              .where((c) => c['type'] == 'direct')
              .toList();
          final groups = channels
              .where((c) => c['type'] == 'group')
              .toList();

          return Stack(
            children: [
              ListView(
                padding: const EdgeInsets.only(bottom: 80),
                children: [
                  if (dms.isNotEmpty) ...[
                    _buildSectionHeader(theme, 'Direct Messages', dms.length),
                    ...dms.map((ch) => ChannelTile(
                          channel: ch,
                          currentUserId: currentUserId ?? '',
                          onTap: () => _openChannel(ch),
                        )),
                  ],
                  if (groups.isNotEmpty) ...[
                    _buildSectionHeader(theme, 'Groups', groups.length),
                    ...groups.map((ch) => ChannelTile(
                          channel: ch,
                          currentUserId: currentUserId ?? '',
                          onTap: () => _openChannel(ch),
                        )),
                  ],
                ],
              ),
              Positioned(
                bottom: 16,
                right: 16,
                child: FloatingActionButton(
                  onPressed: _openCreateChannel,
                  child: const Icon(Icons.edit_outlined),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title, int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Row(
        children: [
          Text(
            title.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurface.withAlpha(120),
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withAlpha(30),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: theme.colorScheme.onSurface.withAlpha(60),
            ),
            const SizedBox(height: 20),
            Text(
              'No conversations yet',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(153),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a new conversation by tapping the button below.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(100),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _openCreateChannel,
              icon: const Icon(Icons.add),
              label: const Text('New Conversation'),
            ),
          ],
        ),
      ),
    );
  }
}
