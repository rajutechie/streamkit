import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';

class StartCallScreen extends StatefulWidget {
  const StartCallScreen({super.key});

  @override
  State<StartCallScreen> createState() => _StartCallScreenState();
}

class _StartCallScreenState extends State<StartCallScreen> {
  List<AppUser> _users = [];
  bool _loading = true;
  String? _error;
  String? _selectedUserId;
  String _callType = 'audio';
  bool _starting = false;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = context.read<ApiService>();
      final auth = context.read<AuthService>();
      final users = await api.getUsers();
      if (mounted) {
        setState(() {
          _users = users.where((u) => u.id != auth.currentUser?.id).toList();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Failed to load users: $e';
        });
      }
    }
  }

  Future<void> _startCall() async {
    if (_selectedUserId == null) return;

    setState(() => _starting = true);

    try {
      final api = context.read<ApiService>();
      final result = await api.createCall(
        type: _callType,
        participants: [_selectedUserId!],
      );

      if (mounted) {
        final callId = result['id'] as String? ?? result['callId'] as String? ?? '';
        final selectedUser = _users.firstWhere((u) => u.id == _selectedUserId);
        Navigator.of(context).pushNamed('/call', arguments: {
          'callId': callId,
          'callType': _callType,
          'calleeName': selectedUser.displayName,
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start call: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Call type selector
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'audio',
                  label: Text('Audio'),
                  icon: Icon(Icons.phone),
                ),
                ButtonSegment(
                  value: 'video',
                  label: Text('Video'),
                  icon: Icon(Icons.videocam),
                ),
              ],
              selected: {_callType},
              onSelectionChanged: (selection) {
                setState(() => _callType = selection.first);
              },
            ),
          ),

          // Section label
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Select a user to call',
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(140),
              ),
            ),
          ),

          // User list
          Expanded(
            child: _buildUserList(theme),
          ),

          const SizedBox(height: 16),

          // Start call button
          FilledButton.icon(
            onPressed: _selectedUserId == null || _starting ? null : _startCall,
            icon: _starting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(_callType == 'video' ? Icons.videocam : Icons.call),
            label: Text(_starting ? 'Starting...' : 'Start Call'),
          ),
        ],
      ),
    );
  }

  Widget _buildUserList(ThemeData theme) {
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
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: theme.colorScheme.onSurface.withAlpha(140)),
            ),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: _loadUsers,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_users.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.person_off_outlined,
              size: 56,
              color: theme.colorScheme.onSurface.withAlpha(60),
            ),
            const SizedBox(height: 16),
            Text(
              'No users available',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(120),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Register another account to make calls.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(80),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: _users.length,
      itemBuilder: (context, index) {
        final user = _users[index];
        return RadioListTile<String>(
          value: user.id,
          groupValue: _selectedUserId,
          onChanged: (value) => setState(() => _selectedUserId = value),
          title: Text(user.displayName),
          subtitle: Text(
            '@${user.username}',
            style: TextStyle(color: theme.colorScheme.onSurface.withAlpha(100)),
          ),
          secondary: CircleAvatar(
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Text(
              user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : '?',
              style: TextStyle(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
      },
    );
  }
}
