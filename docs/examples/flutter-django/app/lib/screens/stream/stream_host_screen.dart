import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';

enum _HostState { idle, live }

class StreamHostScreen extends StatefulWidget {
  const StreamHostScreen({super.key});

  @override
  State<StreamHostScreen> createState() => _StreamHostScreenState();
}

class _StreamHostScreenState extends State<StreamHostScreen> {
  _HostState _state = _HostState.idle;
  final _titleController = TextEditingController();
  bool _starting = false;
  bool _isMuted = false;
  bool _isCameraOff = false;
  int _viewerCount = 0;
  Duration _duration = Duration.zero;
  Timer? _durationTimer;
  String? _streamId;

  @override
  void dispose() {
    _titleController.dispose();
    _durationTimer?.cancel();
    super.dispose();
  }

  Future<void> _goLive() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a stream title')),
      );
      return;
    }

    setState(() => _starting = true);

    try {
      final api = context.read<AuthService>().api;
      final result = await api.createStream(title);
      final streamId = result['id'] as String? ?? result['stream_id'] as String? ?? '';
      await api.startStream(streamId);

      if (mounted) {
        _streamId = streamId;
        setState(() {
          _state = _HostState.live;
          _starting = false;
        });
        _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted) {
            setState(() => _duration += const Duration(seconds: 1));
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _starting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start stream: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  Future<void> _stopStream() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('End Stream'),
        content: const Text('Are you sure you want to end this live stream?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            child: const Text('End Stream'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      if (_streamId != null) {
        final api = context.read<AuthService>().api;
        await api.stopStream(_streamId!);
      }
    } catch (_) {}

    _durationTimer?.cancel();
    if (mounted) {
      Navigator.of(context).pop(true);
    }
  }

  String _formatDuration(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(_state == _HostState.idle ? 'Start Stream' : 'Live'),
        actions: [
          if (_state == _HostState.live) ...[
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'LIVE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
            ),
          ],
        ],
      ),
      body: _state == _HostState.idle
          ? _buildIdleView(theme)
          : _buildLiveView(theme),
    );
  }

  Widget _buildIdleView(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'Stream Title',
              hintText: 'Enter a title for your stream',
              prefixIcon: Icon(Icons.title),
            ),
            textInputAction: TextInputAction.done,
          ),
          const SizedBox(height: 24),

          // Camera preview placeholder
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A23),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF2A2A35)),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.videocam_outlined,
                      size: 64,
                      color: theme.colorScheme.onSurface.withAlpha(60),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Camera Preview',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withAlpha(100),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your camera will appear here',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withAlpha(60),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          FilledButton.icon(
            onPressed: _starting ? null : _goLive,
            icon: _starting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.live_tv),
            label: Text(_starting ? 'Starting...' : 'Go Live'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveView(ThemeData theme) {
    return Column(
      children: [
        // Camera preview area
        Expanded(
          child: Container(
            width: double.infinity,
            color: const Color(0xFF0A0A0F),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isCameraOff ? Icons.videocam_off : Icons.videocam,
                        size: 64,
                        color: theme.colorScheme.onSurface.withAlpha(60),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _isCameraOff ? 'Camera Off' : 'Camera Preview',
                        style: TextStyle(
                          color: theme.colorScheme.onSurface.withAlpha(80),
                        ),
                      ),
                    ],
                  ),
                ),
                // Top bar with info
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'LIVE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.visibility, size: 14, color: Colors.white),
                            const SizedBox(width: 4),
                            Text(
                              '$_viewerCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          _formatDuration(_duration),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        // Controls
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          color: const Color(0xFF14141B),
          child: SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ControlButton(
                  icon: _isMuted ? Icons.mic_off : Icons.mic,
                  label: _isMuted ? 'Unmute' : 'Mute',
                  isActive: !_isMuted,
                  onPressed: () => setState(() => _isMuted = !_isMuted),
                ),
                _ControlButton(
                  icon: _isCameraOff ? Icons.videocam_off : Icons.videocam,
                  label: _isCameraOff ? 'Camera On' : 'Camera Off',
                  isActive: !_isCameraOff,
                  onPressed: () => setState(() => _isCameraOff = !_isCameraOff),
                ),
                _ControlButton(
                  icon: Icons.stop_circle,
                  label: 'End Stream',
                  isDestructive: true,
                  onPressed: _stopStream,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isDestructive;
  final VoidCallback onPressed;

  const _ControlButton({
    required this.icon,
    required this.label,
    this.isActive = true,
    this.isDestructive = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDestructive
        ? Colors.redAccent
        : isActive
            ? const Color(0xFF2A2A35)
            : Colors.white.withAlpha(20);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.filled(
          onPressed: onPressed,
          icon: Icon(icon),
          style: IconButton.styleFrom(
            backgroundColor: bgColor,
            foregroundColor: Colors.white,
            fixedSize: const Size(56, 56),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Colors.white.withAlpha(140),
          ),
        ),
      ],
    );
  }
}
