import 'package:flutter/material.dart';

class CallControlsBar extends StatelessWidget {
  final bool isMuted;
  final bool isVideoOff;
  final VoidCallback onToggleMute;
  final VoidCallback onToggleVideo;
  final VoidCallback onToggleScreenShare;
  final VoidCallback onEndCall;

  const CallControlsBar({
    super.key,
    required this.isMuted,
    required this.isVideoOff,
    required this.onToggleMute,
    required this.onToggleVideo,
    required this.onToggleScreenShare,
    required this.onEndCall,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF14141B),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _CallControlButton(
                icon: isMuted ? Icons.mic_off : Icons.mic,
                label: isMuted ? 'Unmute' : 'Mute',
                isActive: !isMuted,
                onPressed: onToggleMute,
              ),
              _CallControlButton(
                icon: isVideoOff ? Icons.videocam_off : Icons.videocam,
                label: isVideoOff ? 'Camera On' : 'Camera Off',
                isActive: !isVideoOff,
                onPressed: onToggleVideo,
              ),
              _CallControlButton(
                icon: Icons.screen_share,
                label: 'Share',
                isActive: true,
                onPressed: onToggleScreenShare,
              ),
              _CallControlButton(
                icon: Icons.call_end,
                label: 'End',
                isDestructive: true,
                onPressed: onEndCall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CallControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isDestructive;
  final VoidCallback onPressed;

  const _CallControlButton({
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
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            onPressed: onPressed,
            icon: Icon(icon),
            color: Colors.white,
            iconSize: 24,
          ),
        ),
        const SizedBox(height: 6),
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
