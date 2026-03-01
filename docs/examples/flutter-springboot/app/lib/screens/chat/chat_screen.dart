import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

import '../../services/auth_service.dart';
import '../../widgets/message_bubble.dart';
import '../../widgets/message_input.dart';

class ChatScreen extends StatefulWidget {
  final String channelId;
  final String channelName;

  const ChatScreen({
    super.key,
    required this.channelId,
    required this.channelName,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<Message> _messages = [];
  StreamSubscription<Message>? _messagesSub;
  StreamSubscription<Map<String, dynamic>>? _typingSub;
  bool _isLoading = true;
  String? _typingUser;
  Timer? _typingTimer;
  RajutechieStreamKit? _client;

  @override
  void initState() {
    super.initState();
    _client = context.read<AuthService>().rajutechieStreamKitClient;
    _loadMessages();
    _subscribeToEvents();
  }

  Future<void> _loadMessages() async {
    try {
      final result =
          await _client?.chat.getMessages(widget.channelId, limit: 50);
      final list = result?['messages'] as List<dynamic>? ?? [];
      final messages = list
          .map((m) => Message.fromJson(m as Map<String, dynamic>))
          .toList();
      // Most recent first for reversed ListView.
      messages.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      if (mounted) {
        setState(() {
          _messages.addAll(messages);
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _subscribeToEvents() {
    if (_client == null) return;

    _messagesSub = _client!.chat.messagesStream(widget.channelId).listen((msg) {
      if (mounted) {
        setState(() => _messages.insert(0, msg));
      }
    });

    // Typing indicator via raw WebSocket event
    _typingSub = _client!.chat
        .messagesStream(widget.channelId)
        .where((m) => false) // We'll use the ws event below instead
        .map((m) => m.toJson())
        .listen((_) {});

    // Listen for typing events on the ws directly if available
    // For this demo we use a simple timer reset approach
  }

  @override
  void dispose() {
    _messagesSub?.cancel();
    _typingSub?.cancel();
    _typingTimer?.cancel();
    super.dispose();
  }

  void _sendMessage(String text) {
    if (text.trim().isEmpty || _client == null) return;

    _client!.chat.sendMessage(widget.channelId, text: text.trim());
  }

  void _onTyping() {
    _client?.chat.startTyping(widget.channelId);
  }

  void _addReaction(Message message, String emoji) {
    _client?.chat.addReaction(widget.channelId, message.id, emoji);
  }

  void _showReactionPicker(Message message) {
    final emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: emojis.map((emoji) {
              return GestureDetector(
                onTap: () {
                  _addReaction(message, emoji);
                  Navigator.of(ctx).pop();
                },
                child: Text(emoji, style: const TextStyle(fontSize: 28)),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final currentUserId = auth.currentUser?.id ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.channelName,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            if (_typingUser != null)
              Text(
                '$_typingUser is typing...',
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.chat_outlined,
                              size: 48,
                              color: Colors.white.withAlpha(60),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No messages yet',
                              style: TextStyle(
                                color: Colors.white.withAlpha(140),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Send the first message!',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.white.withAlpha(100),
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final message = _messages[index];
                          final isMine = message.senderId == currentUserId;

                          // Show sender name for received messages when different
                          // from the previous message sender
                          bool showSender = false;
                          if (!isMine) {
                            if (index == _messages.length - 1) {
                              showSender = true;
                            } else {
                              final prev = _messages[index + 1];
                              showSender =
                                  prev.senderId != message.senderId;
                            }
                          }

                          return GestureDetector(
                            onLongPress: () => _showReactionPicker(message),
                            child: MessageBubble(
                              message: message,
                              isMine: isMine,
                              showSenderName: showSender,
                            ),
                          );
                        },
                      ),
          ),
          if (_typingUser != null)
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 4),
              child: Row(
                children: [
                  Text(
                    '$_typingUser is typing',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withAlpha(100),
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  const SizedBox(width: 4),
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 1.5,
                      color: Colors.white.withAlpha(100),
                    ),
                  ),
                ],
              ),
            ),
          MessageInput(
            onSend: _sendMessage,
            onTyping: _onTyping,
          ),
        ],
      ),
    );
  }
}
