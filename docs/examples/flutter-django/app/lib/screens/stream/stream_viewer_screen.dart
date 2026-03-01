import 'package:flutter/material.dart';

import '../../widgets/stream_player.dart';

class StreamViewerScreen extends StatefulWidget {
  final Map<String, dynamic> streamData;

  const StreamViewerScreen({super.key, required this.streamData});

  @override
  State<StreamViewerScreen> createState() => _StreamViewerScreenState();
}

class _StreamViewerScreenState extends State<StreamViewerScreen> {
  late int _viewerCount;
  late bool _isLive;

  @override
  void initState() {
    super.initState();
    _viewerCount = widget.streamData['viewer_count'] as int? ??
        widget.streamData['viewerCount'] as int? ??
        0;
    _isLive = widget.streamData['status'] == 'live' ||
        widget.streamData['is_live'] == true;
  }

  String get _title =>
      widget.streamData['title'] as String? ?? 'Untitled Stream';

  String get _hostName =>
      widget.streamData['host_name'] as String? ??
      widget.streamData['hostName'] as String? ??
      'Unknown';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      body: Column(
        children: [
          // Stream player
          StreamPlayer(
            isLive: _isLive,
            viewerCount: _viewerCount,
          ),

          // Host info bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFF2A2A35)),
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    _hostName.isNotEmpty ? _hostName[0].toUpperCase() : '?',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _hostName,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isLive ? 'Streaming now' : 'Stream ended',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: _isLive
                              ? Colors.redAccent
                              : theme.colorScheme.onSurface.withAlpha(100),
                        ),
                      ),
                    ],
                  ),
                ),
                if (_isLive)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.visibility,
                        size: 16,
                        color: theme.colorScheme.onSurface.withAlpha(120),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$_viewerCount',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withAlpha(120),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),

          // Chat placeholder
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.chat_outlined,
                    size: 48,
                    color: theme.colorScheme.onSurface.withAlpha(40),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Live Chat',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withAlpha(100),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Chat messages will appear here',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withAlpha(60),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
