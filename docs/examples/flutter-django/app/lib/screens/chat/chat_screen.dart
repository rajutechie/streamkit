import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

import '../../services/auth_service.dart';
import '../../widgets/message_bubble.dart' as app;
import '../../widgets/message_input.dart';

class ChatScreen extends StatefulWidget {
  final Map<String, dynamic> channel;

  const ChatScreen({super.key, required this.channel});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollController = ScrollController();
  final List<Message> _messages = [];
  StreamSubscription<Message>? _messageSub;
  bool _loading = true;
  String? _error;
  bool _someoneTyping = false;
  StreamSubscription<Map<String, dynamic>>? _typingSub;

  String get _channelId => widget.channel['id'] as String;
  String get _channelName => widget.channel['name'] as String? ?? 'Chat';

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeToMessages();
    _subscribeToTyping();
  }

  @override
  void dispose() {
    _messageSub?.cancel();
    _typingSub?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  RajutechieStreamKit? get _client => context.read<AuthService>().rajutechieStreamKitClient;
  String get _currentUserId => context.read<AuthService>().currentUser?.id ?? '';

  Future<void> _loadMessages() async {
    final client = _client;
    if (client == null) {
      setState(() {
        _loading = false;
        _error = 'RajutechieStreamKit not connected';
      });
      return;
    }

    try {
      final result = await client.chat.getMessages(_channelId, limit: 50);
      final messagesList = result['messages'] as List<dynamic>? ?? [];
      final messages = messagesList
          .map((m) => Message.fromJson(m as Map<String, dynamic>))
          .toList();

      if (mounted) {
        setState(() {
          _messages
            ..clear()
            ..addAll(messages);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Failed to load messages';
        });
      }
    }
  }

  void _subscribeToMessages() {
    final client = _client;
    if (client == null) return;

    _messageSub = client.chat.messagesStream(_channelId).listen((message) {
      if (!mounted) return;
      setState(() {
        // Insert at beginning since list is reversed.
        _messages.insert(0, message);
      });
    });
  }

  void _subscribeToTyping() {
    final client = _client;
    if (client == null) return;

    _typingSub = client._ws
        .on('typing.start')
        .where((data) => data['channelId'] == _channelId)
        .where((data) => data['userId'] != _currentUserId)
        .listen((_) {
      if (!mounted) return;
      setState(() => _someoneTyping = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _someoneTyping = false);
      });
    });
  }

  Future<void> _sendMessage(String text) async {
    final client = _client;
    if (client == null || text.trim().isEmpty) return;

    try {
      await client.chat.sendMessage(_channelId, text: text.trim());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to send message'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  void _onTypingChanged(bool isTyping) {
    final client = _client;
    if (client == null) return;
    if (isTyping) {
      client.chat.startTyping(_channelId);
    } else {
      client.chat.stopTyping(_channelId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_channelName, style: const TextStyle(fontSize: 17)),
            if (widget.channel['member_count'] != null)
              Text(
                '${widget.channel['member_count']} members',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(120),
                ),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(child: _buildMessageList(theme)),
          if (_someoneTyping)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Someone is typing...',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          MessageInput(
            onSend: _sendMessage,
            onTypingChanged: _onTypingChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildMessageList(ThemeData theme) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(_error!, style: theme.textTheme.bodyLarge),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: () {
                setState(() {
                  _loading = true;
                  _error = null;
                });
                _loadMessages();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.chat_outlined,
                size: 56,
                color: theme.colorScheme.onSurface.withAlpha(60),
              ),
              const SizedBox(height: 16),
              Text(
                'No messages yet',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(120),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Send the first message!',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(80),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      reverse: true,
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        final isMe = message.senderId == _currentUserId;
        final showSenderName = !isMe &&
            widget.channel['type'] == 'group' &&
            (index == _messages.length - 1 ||
                _messages[index + 1].senderId != message.senderId);

        return app.MessageBubbleWidget(
          message: message,
          isMe: isMe,
          showSenderName: showSenderName,
          senderName: _resolveSenderName(message.senderId),
        );
      },
    );
  }

  String _resolveSenderName(String senderId) {
    final memberNames =
        widget.channel['member_names'] as List<dynamic>? ?? [];
    final memberIds = widget.channel['member_ids'] as List<dynamic>? ?? [];
    final index = memberIds.indexOf(senderId);
    if (index >= 0 && index < memberNames.length) {
      return memberNames[index] as String;
    }
    return senderId;
  }
}
