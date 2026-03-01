import 'package:flutter/material.dart';

class CallControls extends StatelessWidget {
  final bool isMuted;
  final bool isVideoOff;
  final bool isScreenSharing;
  final bool isSpeakerOn;
  final VoidCallback? onToggleMute;
  final VoidCallback? onToggleVideo;
  final VoidCallback? onToggleScreenShare;
  final VoidCallback? onToggleSpeaker;
  final VoidCallback? onSwitchCamera;
  final VoidCallback? onEndCall;

  const CallControls({
    super.key,
    this.isMuted = false,
    this.isVideoOff = false,
    this.isScreenSharing = false,
    this.isSpeakerOn = true,
    this.onToggleMute,
    this.onToggleVideo,
    this.onToggleScreenShare,
    this.onToggleSpeaker,
    this.onSwitchCamera,
    this.onEndCall,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(30),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _ControlButton(
              icon: isMuted ? Icons.mic_off : Icons.mic,
              label: isMuted ? 'Unmute' : 'Mute',
              isActive: !isMuted,
              onTap: onToggleMute,
            ),
            _ControlButton(
              icon: isVideoOff ? Icons.videocam_off : Icons.videocam,
              label: isVideoOff ? 'Start Video' : 'Stop Video',
              isActive: !isVideoOff,
              onTap: onToggleVideo,
            ),
            _ControlButton(
              icon: Icons.screen_share,
              label: isScreenSharing ? 'Stop Share' : 'Share',
              isActive: isScreenSharing,
              onTap: onToggleScreenShare,
            ),
            _ControlButton(
              icon: Icons.cameraswitch,
              label: 'Flip',
              isActive: true,
              onTap: onSwitchCamera,
            ),
            _ControlButton(
              icon: isSpeakerOn ? Icons.volume_up : Icons.volume_off,
              label: isSpeakerOn ? 'Speaker' : 'Earpiece',
              isActive: isSpeakerOn,
              onTap: onToggleSpeaker,
            ),
            _EndCallButton(onTap: onEndCall),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback? onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.isActive,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isActive
                  ? theme.colorScheme.surfaceContainerHighest
                  : theme.colorScheme.errorContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isActive
                  ? theme.colorScheme.onSurface
                  : theme.colorScheme.onErrorContainer,
              size: 22,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 10, color: theme.colorScheme.onSurface),
          ),
        ],
      ),
    );
  }
}

class _EndCallButton extends StatelessWidget {
  final VoidCallback? onTap;

  const _EndCallButton({this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.call_end, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 4),
          const Text('End', style: TextStyle(fontSize: 10, color: Colors.red)),
        ],
      ),
    );
  }
}
