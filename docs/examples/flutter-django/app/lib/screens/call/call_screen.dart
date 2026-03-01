import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

import '../../services/auth_service.dart';
import '../../widgets/call_controls_bar.dart';
import '../../widgets/video_tile.dart';

enum _CallState { ringing, active, ended }

class CallScreen extends StatefulWidget {
  final String callId;
  final String callType;
  final String calleeName;

  const CallScreen({
    super.key,
    required this.callId,
    required this.callType,
    required this.calleeName,
  });

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with SingleTickerProviderStateMixin {
  _CallState _state = _CallState.ringing;
  bool _isMuted = false;
  bool _isVideoOff = false;
  Duration _duration = Duration.zero;
  Timer? _durationTimer;
  RajutechieStreamKit? _client;
  StreamSubscription<Map<String, dynamic>>? _callEventSub;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _client = context.read<AuthService>().rajutechieStreamKitClient;
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _joinCall();
  }

  Future<void> _joinCall() async {
    if (_client == null) return;

    try {
      _callEventSub = _client!.call.callEvents(widget.callId).listen((event) {
        if (!mounted) return;
        final type = event['type'] as String? ?? '';
        if (type == 'call.accepted' || type == 'call.joined') {
          _onCallActive();
        } else if (type == 'call.ended' || type == 'call.rejected') {
          _onCallEnded();
        }
      });

      await _client!.call.join(widget.callId);
      _onCallActive();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to join call: $e')),
        );
        _onCallEnded();
      }
    }
  }

  void _onCallActive() {
    if (_state == _CallState.active) return;
    setState(() => _state = _CallState.active);
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _duration += const Duration(seconds: 1));
      }
    });
  }

  void _onCallEnded() {
    _durationTimer?.cancel();
    if (mounted) {
      setState(() => _state = _CallState.ended);
    }
  }

  void _toggleMute() {
    setState(() => _isMuted = !_isMuted);
    _client?.call.toggleMute(widget.callId, muted: _isMuted);
  }

  void _toggleVideo() {
    setState(() => _isVideoOff = !_isVideoOff);
    _client?.call.toggleVideo(widget.callId, videoOff: _isVideoOff);
  }

  void _toggleScreenShare() {
    _client?.call.toggleScreenShare(widget.callId);
  }

  Future<void> _endCall() async {
    try {
      await _client?.call.leave(widget.callId);
    } catch (_) {}
    _onCallEnded();
  }

  Future<void> _cancelCall() async {
    try {
      await _client?.call.reject(widget.callId);
    } catch (_) {}
    if (mounted) Navigator.of(context).pop();
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
  void dispose() {
    _durationTimer?.cancel();
    _callEventSub?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: switch (_state) {
          _CallState.ringing => _buildRingingView(theme),
          _CallState.active => _buildActiveView(theme),
          _CallState.ended => _buildEndedView(theme),
        },
      ),
    );
  }

  Widget _buildRingingView(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = 1.0 + (_pulseController.value * 0.15);
              return Transform.scale(
                scale: scale,
                child: CircleAvatar(
                  radius: 60,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    widget.calleeName.isNotEmpty
                        ? widget.calleeName[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 32),
          Text(
            widget.calleeName,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Calling...',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withAlpha(140),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            widget.callType == 'video' ? 'Video Call' : 'Audio Call',
            style: TextStyle(
              fontSize: 14,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 48),
          FilledButton.icon(
            onPressed: _cancelCall,
            icon: const Icon(Icons.call_end),
            label: const Text('Cancel'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              minimumSize: const Size(160, 50),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveView(ThemeData theme) {
    final currentUser = context.read<AuthService>().currentUser;
    final myName = currentUser?.displayName ?? 'You';

    return Stack(
      children: [
        // Video grid
        Positioned.fill(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 100),
            child: widget.callType == 'video'
                ? Column(
                    children: [
                      Expanded(
                        child: VideoTile(
                          name: widget.calleeName,
                          isMuted: false,
                          isSpeaking: true,
                        ),
                      ),
                    ],
                  )
                : Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 56,
                          backgroundColor: theme.colorScheme.primaryContainer,
                          child: Text(
                            widget.calleeName.isNotEmpty
                                ? widget.calleeName[0].toUpperCase()
                                : '?',
                            style: TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onPrimaryContainer,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          widget.calleeName,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ),
        // Local video PIP (for video calls)
        if (widget.callType == 'video')
          Positioned(
            top: 16,
            right: 16,
            child: SizedBox(
              width: 120,
              height: 160,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: VideoTile(
                  name: myName,
                  isMuted: _isMuted,
                  isSpeaking: false,
                ),
              ),
            ),
          ),
        // Duration display
        Positioned(
          top: 16,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _formatDuration(_duration),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
        // Call controls bar
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: CallControlsBar(
            isMuted: _isMuted,
            isVideoOff: _isVideoOff,
            onToggleMute: _toggleMute,
            onToggleVideo: _toggleVideo,
            onToggleScreenShare: _toggleScreenShare,
            onEndCall: _endCall,
          ),
        ),
      ],
    );
  }

  Widget _buildEndedView(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.call_end_rounded,
            size: 64,
            color: Colors.white.withAlpha(100),
          ),
          const SizedBox(height: 24),
          const Text(
            'Call Ended',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _formatDuration(_duration),
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withAlpha(140),
            ),
          ),
          const SizedBox(height: 40),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Back'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(160, 50),
            ),
          ),
        ],
      ),
    );
  }
}
