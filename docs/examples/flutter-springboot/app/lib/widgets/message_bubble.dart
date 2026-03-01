import 'package:flutter/material.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMine;
  final bool showSenderName;
  final Map<String, int>? reactions;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMine,
    this.showSenderName = false,
    this.reactions,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final alignment = isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final bgColor = isMine
        ? theme.colorScheme.primary
        : theme.colorScheme.surfaceContainerHighest;
    final textColor = isMine
        ? theme.colorScheme.onPrimary
        : theme.colorScheme.onSurface;

    final borderRadius = BorderRadius.only(
      topLeft: const Radius.circular(16),
      topRight: const Radius.circular(16),
      bottomLeft: isMine ? const Radius.circular(16) : const Radius.circular(4),
      bottomRight: isMine ? const Radius.circular(4) : const Radius.circular(16),
    );

    final effectiveReactions = reactions ?? _parseReactions();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Column(
        crossAxisAlignment: alignment,
        children: [
          if (showSenderName && !isMine)
            Padding(
              padding: const EdgeInsets.only(left: 12, bottom: 2),
              child: Text(
                message.senderName ?? message.senderId,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          Align(
            alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.75,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: borderRadius,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.text,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTimestamp(message.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: isMine
                          ? theme.colorScheme.onPrimary.withAlpha(153)
                          : theme.colorScheme.onSurface.withAlpha(100),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (effectiveReactions.isNotEmpty)
            Padding(
              padding: EdgeInsets.only(
                left: isMine ? 0 : 8,
                right: isMine ? 8 : 0,
                top: 2,
              ),
              child: Wrap(
                spacing: 4,
                children: effectiveReactions.entries.map((entry) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: theme.colorScheme.outline.withAlpha(40),
                      ),
                    ),
                    child: Text(
                      '${entry.key} ${entry.value}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Map<String, int> _parseReactions() {
    final raw = message.toJson()['reactions'];
    if (raw == null) return {};
    if (raw is Map) {
      return raw.map((k, v) => MapEntry(k.toString(), v is int ? v : 1));
    }
    return {};
  }

  String _formatTimestamp(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
