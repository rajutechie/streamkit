import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import 'create_meeting_screen.dart';
import 'meeting_screen.dart';

/// Lists all meetings the authenticated user is part of.
class MeetingListScreen extends StatefulWidget {
  const MeetingListScreen({super.key});

  @override
  State<MeetingListScreen> createState() => _MeetingListScreenState();
}

class _MeetingListScreenState extends State<MeetingListScreen> {
  List<Map<String, dynamic>> _meetings = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMeetings();
  }

  Future<void> _loadMeetings() async {
    final api = context.read<AuthService>().apiService;
    try {
      final data = await api.getMeetings();
      if (mounted) setState(() { _meetings = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _joinMeeting(Map<String, dynamic> meeting) async {
    final hasPassword = meeting['has_password'] == true;
    String? password;

    if (hasPassword) {
      password = await _promptPassword();
      if (password == null) return;
    }

    final api = context.read<AuthService>().apiService;
    try {
      final joined = await api.joinMeeting(meeting['id'] as String, password: password);
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => MeetingScreen(meeting: joined)),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to join: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<String?> _promptPassword() async {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Meeting Password'),
        content: TextField(
          controller: ctrl,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Password'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text),
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Error: $_error'))
              : _meetings.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _loadMeetings,
                      child: ListView.builder(
                        itemCount: _meetings.length,
                        itemBuilder: (_, i) => _MeetingTile(
                          meeting: _meetings[i],
                          onJoin: () => _joinMeeting(_meetings[i]),
                        ),
                      ),
                    ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.of(context).push<Map<String, dynamic>>(
            MaterialPageRoute(builder: (_) => const CreateMeetingScreen()),
          );
          if (created != null) {
            setState(() => _meetings.insert(0, created));
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('New Meeting'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.video_camera_front_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('No meetings yet', style: TextStyle(fontSize: 18)),
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed: () async {
              final created = await Navigator.of(context).push<Map<String, dynamic>>(
                MaterialPageRoute(builder: (_) => const CreateMeetingScreen()),
              );
              if (created != null) setState(() => _meetings.insert(0, created));
            },
            child: const Text('Schedule a meeting'),
          ),
        ],
      ),
    );
  }
}

class _MeetingTile extends StatelessWidget {
  final Map<String, dynamic> meeting;
  final VoidCallback onJoin;

  const _MeetingTile({required this.meeting, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    final status = meeting['status'] as String? ?? 'scheduled';
    final isActive = status == 'active';
    final isEnded = status == 'ended';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isActive
              ? Colors.green.shade700
              : isEnded
                  ? Colors.grey.shade700
                  : Colors.indigo.shade700,
          child: Icon(
            isActive ? Icons.fiber_manual_record : Icons.video_camera_front,
            color: Colors.white,
            size: 20,
          ),
        ),
        title: Text(meeting['title'] as String? ?? 'Meeting'),
        subtitle: Text(
          '${meeting['duration_mins'] ?? 60} min · ${_statusLabel(status)}'
          '${meeting['has_password'] == true ? ' · 🔒' : ''}',
        ),
        trailing: isEnded
            ? const Chip(label: Text('Ended'))
            : FilledButton.tonal(
                onPressed: onJoin,
                child: Text(isActive ? 'Join Now' : 'Join'),
              ),
      ),
    );
  }

  String _statusLabel(String status) {
    return switch (status) {
      'active' => 'Live',
      'ended' => 'Ended',
      _ => 'Scheduled',
    };
  }
}
