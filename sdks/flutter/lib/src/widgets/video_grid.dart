import 'package:flutter/material.dart';

class VideoParticipant {
  final String userId;
  final String displayName;
  final bool hasVideo;
  final bool hasAudio;
  final bool isSpeaking;
  final Widget? videoWidget;

  VideoParticipant({
    required this.userId,
    required this.displayName,
    this.hasVideo = true,
    this.hasAudio = true,
    this.isSpeaking = false,
    this.videoWidget,
  });
}

class VideoGrid extends StatelessWidget {
  final List<VideoParticipant> participants;
  final String? localUserId;
  final int maxColumns;

  const VideoGrid({
    super.key,
    required this.participants,
    this.localUserId,
    this.maxColumns = 2,
  });

  @override
  Widget build(BuildContext context) {
    if (participants.isEmpty) {
      return const Center(child: Text('No participants'));
    }

    if (participants.length == 1) {
      return _buildTile(context, participants[0], isFullScreen: true);
    }

    final columns = participants.length <= maxColumns ? participants.length : maxColumns;
    final rows = (participants.length / columns).ceil();

    return Column(
      children: List.generate(rows, (row) {
        final start = row * columns;
        final end = (start + columns).clamp(0, participants.length);
        final rowParticipants = participants.sublist(start, end);

        return Expanded(
          child: Row(
            children: rowParticipants.map((p) {
              return Expanded(child: _buildTile(context, p));
            }).toList(),
          ),
        );
      }),
    );
  }

  Widget _buildTile(BuildContext context, VideoParticipant participant, {bool isFullScreen = false}) {
    final theme = Theme.of(context);
    final isLocal = participant.userId == localUserId;

    return Container(
      margin: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(8),
        border: participant.isSpeaking
            ? Border.all(color: theme.colorScheme.primary, width: 2)
            : null,
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (participant.hasVideo && participant.videoWidget != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: participant.videoWidget!,
            )
          else
            Center(
              child: CircleAvatar(
                radius: isFullScreen ? 48 : 32,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  participant.displayName.isNotEmpty ? participant.displayName[0].toUpperCase() : '?',
                  style: TextStyle(
                    fontSize: isFullScreen ? 36 : 24,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ),
          Positioned(
            bottom: 8,
            left: 8,
            right: 8,
            child: Row(
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isLocal ? '${participant.displayName} (You)' : participant.displayName,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                if (!participant.hasAudio)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.red.withAlpha(180),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.mic_off, color: Colors.white, size: 14),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
