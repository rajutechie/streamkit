import 'package:flutter/material.dart';
import '../models/message.dart';

class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMe;
  final VoidCallback? onLongPress;
  final Function(String emoji)? onReaction;

  const MessageBubble({
    super.key,
    required this.message,
    this.isMe = false,
    this.onLongPress,
    this.onReaction,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: onLongPress,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
          decoration: BoxDecoration(
            color: isMe ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isMe ? 16 : 4),
              bottomRight: Radius.circular(isMe ? 4 : 16),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (message.text != null)
                Text(
                  message.text!,
                  style: TextStyle(
                    color: isMe ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                    fontSize: 15,
                  ),
                ),
              if (message.attachments.isNotEmpty)
                ...message.attachments.map((a) => Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: _buildAttachment(a, theme),
                    )),
              if (message.reactions.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Wrap(
                    spacing: 4,
                    children: message.reactions.entries.map((e) {
                      return GestureDetector(
                        onTap: () => onReaction?.call(e.key),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surface.withAlpha(200),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text('${e.key} ${e.value.length}', style: const TextStyle(fontSize: 12)),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  _formatTime(message.createdAt),
                  style: TextStyle(
                    fontSize: 11,
                    color: (isMe ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface).withAlpha(153),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAttachment(Attachment attachment, ThemeData theme) {
    switch (attachment.type) {
      case 'image':
        return ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.network(
            attachment.url,
            fit: BoxFit.cover,
            width: double.infinity,
            height: 200,
            errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
          ),
        );
      case 'file':
        return Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.outline.withAlpha(100)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.attach_file, size: 18),
              const SizedBox(width: 6),
              Flexible(child: Text(attachment.filename ?? 'File', overflow: TextOverflow.ellipsis)),
            ],
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class MessageList extends StatelessWidget {
  final List<Message> messages;
  final String currentUserId;
  final ScrollController? scrollController;
  final Function(Message)? onMessageLongPress;
  final Function(Message, String emoji)? onReaction;

  const MessageList({
    super.key,
    required this.messages,
    required this.currentUserId,
    this.scrollController,
    this.onMessageLongPress,
    this.onReaction,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: scrollController,
      reverse: true,
      itemCount: messages.length,
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemBuilder: (context, index) {
        final message = messages[index];
        return MessageBubble(
          message: message,
          isMe: message.senderId == currentUserId,
          onLongPress: () => onMessageLongPress?.call(message),
          onReaction: (emoji) => onReaction?.call(message, emoji),
        );
      },
    );
  }
}
