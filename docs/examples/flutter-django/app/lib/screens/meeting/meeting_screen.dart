import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

import '../../services/api_service.dart';
import '../../services/auth_service.dart';

/// Active meeting room screen.
///
/// Shows the participant grid, mute/video/hand-raise controls, and handles
/// leave/end actions.
class MeetingScreen extends StatefulWidget {
  final Map<String, dynamic> meeting;

  const MeetingScreen({super.key, required this.meeting});

  @override
  State<MeetingScreen> createState() => _MeetingScreenState();
}

class _MeetingScreenState extends State<MeetingScreen> {
  late final RajutechieStreamKitClient _client;
  late final String _meetingId;
  bool _audioMuted = false;
  bool _videoOff = false;
  bool _handRaised = false;
  bool _leaving = false;

  List<Map<String, dynamic>> get _participants {
    final raw = widget.meeting['participants'];
    if (raw is List) return raw.cast<Map<String, dynamic>>();
    return [];
  }

  @override
  void initState() {
    super.initState();
    _meetingId = widget.meeting['id'] as String;
    _client = context.read<AuthService>().rajutechieStreamKitClient!;
  }

  Future<void> _leave() async {
    setState(() => _leaving = true);
    final api = context.read<AuthService>().apiService;
    try {
      await api.leaveMeeting(_meetingId);
    } catch (_) {}
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _endForAll() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('End Meeting'),
        content: const Text('End the meeting for all participants?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('End for All'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _leaving = true);
    final api = context.read<AuthService>().apiService;
    try {
      await api.endMeeting(_meetingId);
    } catch (_) {}
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.meeting['title'] as String? ?? 'Meeting';
    final participantCount = widget.meeting['participant_count'] ?? _participants.length;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.grey.shade900,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16)),
            Text(
              '$participantCount participant${participantCount == 1 ? '' : 's'}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'end') _endForAll();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'end', child: Text('End for All')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Participant Grid ──────────────────────────────────────
          Expanded(
            child: _participants.isEmpty
                ? const Center(
                    child: Text('Waiting for participants…',
                        style: TextStyle(color: Colors.white54)),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(8),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 4 / 3,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: _participants.length,
                    itemBuilder: (_, i) => _ParticipantTile(participant: _participants[i]),
                  ),
          ),
          // ── Controls ─────────────────────────────────────────────
          _ControlBar(
            audioMuted: _audioMuted,
            videoOff: _videoOff,
            handRaised: _handRaised,
            leaving: _leaving,
            onToggleAudio: () => setState(() => _audioMuted = !_audioMuted),
            onToggleVideo: () => setState(() => _videoOff = !_videoOff),
            onToggleHand: () => setState(() => _handRaised = !_handRaised),
            onLeave: _leave,
          ),
        ],
      ),
    );
  }
}

class _ParticipantTile extends StatelessWidget {
  final Map<String, dynamic> participant;

  const _ParticipantTile({required this.participant});

  @override
  Widget build(BuildContext context) {
    final name = participant['display_name'] as String? ?? participant['userId'] as String? ?? '?';
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade900,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Colors.indigo,
            child: Text(name[0].toUpperCase(), style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(height: 8),
          Text(name, style: const TextStyle(color: Colors.white), overflow: TextOverflow.ellipsis),
          if (participant['role'] == 'host')
            const Text('Host', style: TextStyle(color: Colors.amber, fontSize: 11)),
        ],
      ),
    );
  }
}

class _ControlBar extends StatelessWidget {
  final bool audioMuted;
  final bool videoOff;
  final bool handRaised;
  final bool leaving;
  final VoidCallback onToggleAudio;
  final VoidCallback onToggleVideo;
  final VoidCallback onToggleHand;
  final VoidCallback onLeave;

  const _ControlBar({
    required this.audioMuted,
    required this.videoOff,
    required this.handRaised,
    required this.leaving,
    required this.onToggleAudio,
    required this.onToggleVideo,
    required this.onToggleHand,
    required this.onLeave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.grey.shade900,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _ControlButton(
            icon: audioMuted ? Icons.mic_off : Icons.mic,
            label: audioMuted ? 'Unmute' : 'Mute',
            active: !audioMuted,
            onTap: onToggleAudio,
          ),
          _ControlButton(
            icon: videoOff ? Icons.videocam_off : Icons.videocam,
            label: videoOff ? 'Start Video' : 'Stop Video',
            active: !videoOff,
            onTap: onToggleVideo,
          ),
          _ControlButton(
            icon: Icons.pan_tool,
            label: handRaised ? 'Lower Hand' : 'Raise Hand',
            active: handRaised,
            color: Colors.amber,
            onTap: onToggleHand,
          ),
          _ControlButton(
            icon: Icons.call_end,
            label: 'Leave',
            active: false,
            color: Colors.red,
            onTap: leaving ? null : onLeave,
          ),
        ],
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final Color? color;
  final VoidCallback? onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.active,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? (active ? Colors.white : Colors.white54);
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            backgroundColor: color != null
                ? color!.withAlpha(51)
                : active
                    ? Colors.grey.shade700
                    : Colors.grey.shade800,
            radius: 26,
            child: Icon(icon, color: c, size: 24),
          ),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: c, fontSize: 11)),
        ],
      ),
    );
  }
}
