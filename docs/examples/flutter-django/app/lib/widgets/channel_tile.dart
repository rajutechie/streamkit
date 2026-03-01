import 'package:flutter/material.dart';

class ChannelTile extends StatelessWidget {
  final String name;
  final String? lastMessage;
  final DateTime? lastMessageTime;
  final int unreadCount;
  final bool isOnline;
  final bool isGroup;
  final VoidCallback onTap;

  const ChannelTile({super.key, required this.name, this.lastMessage, this.lastMessageTime, this.unreadCount = 0, this.isOnline = false, this.isGroup = false, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: Stack(
        children: [
          CircleAvatar(
            backgroundColor: theme.colorScheme.primaryContainer,
            child: isGroup ? const Icon(Icons.group) : Text(name.isNotEmpty ? name[0].toUpperCase() : '?'),
          ),
          if (!isGroup && isOnline)
            Positioned(right: 0, bottom: 0, child: Container(width: 12, height: 12, decoration: BoxDecoration(color: Colors.green, shape: BoxShape.circle, border: Border.all(color: theme.scaffoldBackgroundColor, width: 2)))),
        ],
      ),
      title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: lastMessage != null ? Text(lastMessage!, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)) : null,
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (lastMessageTime != null) Text(_formatTime(lastMessageTime!), style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
          if (unreadCount > 0) Container(margin: const EdgeInsets.only(top: 4), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: theme.colorScheme.primary, borderRadius: BorderRadius.circular(10)), child: Text('$unreadCount', style: const TextStyle(fontSize: 11, color: Colors.white))),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    if (dt.day == now.day && dt.month == now.month && dt.year == now.year) {
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return '${dt.day}/${dt.month}';
  }
}
