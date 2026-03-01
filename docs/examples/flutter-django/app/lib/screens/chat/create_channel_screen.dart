import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/user.dart';
import '../../services/auth_service.dart';

class CreateChannelScreen extends StatefulWidget {
  const CreateChannelScreen({super.key});

  @override
  State<CreateChannelScreen> createState() => _CreateChannelScreenState();
}

class _CreateChannelScreenState extends State<CreateChannelScreen> {
  final _groupNameController = TextEditingController();
  String _channelType = 'direct'; // 'direct' or 'group'
  final Set<String> _selectedUserIds = {};
  List<AppUser>? _users;
  bool _loadingUsers = true;
  bool _creating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  @override
  void dispose() {
    _groupNameController.dispose();
    super.dispose();
  }

  String get _currentUserId =>
      context.read<AuthService>().currentUser?.id ?? '';

  Future<void> _loadUsers() async {
    try {
      final users = await context.read<AuthService>().api.getUsers();
      if (mounted) {
        setState(() {
          _users = users.where((u) => u.id != _currentUserId).toList();
          _loadingUsers = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingUsers = false;
          _error = 'Failed to load users';
        });
      }
    }
  }

  void _toggleUser(String userId) {
    setState(() {
      if (_channelType == 'direct') {
        _selectedUserIds
          ..clear()
          ..add(userId);
      } else {
        if (_selectedUserIds.contains(userId)) {
          _selectedUserIds.remove(userId);
        } else {
          _selectedUserIds.add(userId);
        }
      }
    });
  }

  Future<void> _create() async {
    if (_selectedUserIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one user')),
      );
      return;
    }

    if (_channelType == 'group' && _selectedUserIds.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Groups need at least 2 other members')),
      );
      return;
    }

    setState(() => _creating = true);

    try {
      await context.read<AuthService>().api.createChannel(
            type: _channelType,
            memberIds: _selectedUserIds.toList(),
            name: _channelType == 'group'
                ? _groupNameController.text.trim()
                : null,
          );

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create channel: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Conversation'),
        actions: [
          TextButton(
            onPressed:
                _creating || _selectedUserIds.isEmpty ? null : _create,
            child: _creating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Create'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Channel type selector
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'direct',
                  label: Text('Direct Message'),
                  icon: Icon(Icons.person),
                ),
                ButtonSegment(
                  value: 'group',
                  label: Text('Group'),
                  icon: Icon(Icons.group),
                ),
              ],
              selected: {_channelType},
              onSelectionChanged: (selection) {
                setState(() {
                  _channelType = selection.first;
                  _selectedUserIds.clear();
                });
              },
            ),
          ),

          // Group name field
          if (_channelType == 'group')
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextFormField(
                controller: _groupNameController,
                decoration: const InputDecoration(
                  labelText: 'Group Name',
                  prefixIcon: Icon(Icons.tag),
                ),
              ),
            ),

          const SizedBox(height: 8),

          // User list
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _channelType == 'direct'
                    ? 'Select a user'
                    : 'Select members',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(120),
                ),
              ),
            ),
          ),

          Expanded(child: _buildUserList(theme)),
        ],
      ),
    );
  }

  Widget _buildUserList(ThemeData theme) {
    if (_loadingUsers) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(_error!),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: () {
                setState(() {
                  _loadingUsers = true;
                  _error = null;
                });
                _loadUsers();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final users = _users ?? [];
    if (users.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
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
                'No other users found',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(120),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Register another account to start chatting.',
                textAlign: TextAlign.center,
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
      itemCount: users.length,
      itemBuilder: (context, index) {
        final user = users[index];
        final selected = _selectedUserIds.contains(user.id);

        return ListTile(
          leading: CircleAvatar(
            backgroundColor: selected
                ? theme.colorScheme.primary
                : theme.colorScheme.surfaceContainerHighest,
            child: selected
                ? const Icon(Icons.check, color: Colors.white, size: 20)
                : Text(
                    user.displayName.isNotEmpty
                        ? user.displayName[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
          title: Text(user.displayName),
          subtitle: Text(
            '@${user.username}',
            style: TextStyle(
              color: theme.colorScheme.onSurface.withAlpha(100),
            ),
          ),
          trailing: _channelType == 'direct'
              ? Radio<String>(
                  value: user.id,
                  groupValue:
                      _selectedUserIds.isNotEmpty ? _selectedUserIds.first : null,
                  onChanged: (_) => _toggleUser(user.id),
                )
              : Checkbox(
                  value: selected,
                  onChanged: (_) => _toggleUser(user.id),
                ),
          onTap: () => _toggleUser(user.id),
        );
      },
    );
  }
}
