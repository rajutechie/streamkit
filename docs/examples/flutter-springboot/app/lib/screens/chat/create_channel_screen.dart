import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../models/user.dart';
import 'package:provider/provider.dart';

class CreateChannelScreen extends StatefulWidget {
  const CreateChannelScreen({super.key});
  @override
  State<CreateChannelScreen> createState() => _CreateChannelScreenState();
}

class _CreateChannelScreenState extends State<CreateChannelScreen> {
  bool _isGroup = false;
  final _nameController = TextEditingController();
  List<AppUser> _users = [];
  final Set<String> _selectedUserIds = {};
  bool _loading = true;
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    try {
      final auth = context.read<AuthService>();
      final api = ApiService(baseUrl: 'http://10.0.2.2:8080/api', token: auth.token);
      final users = await api.getUsers();
      setState(() { _users = users.where((u) => u.id != auth.currentUser?.id).toList(); _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _createChannel() async {
    if (_selectedUserIds.isEmpty) return;
    setState(() => _creating = true);
    try {
      final auth = context.read<AuthService>();
      final api = ApiService(baseUrl: 'http://10.0.2.2:8080/api', token: auth.token);
      final type = _isGroup ? 'group' : 'direct';
      final name = _isGroup ? _nameController.text.trim() : null;
      await api.createChannel(type, _selectedUserIds.toList(), name);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Conversation'),
        actions: [
          TextButton(
            onPressed: _selectedUserIds.isEmpty || _creating ? null : _createChannel,
            child: _creating ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Create'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Direct Message')),
                ButtonSegment(value: true, label: Text('Group Chat')),
              ],
              selected: {_isGroup},
              onSelectionChanged: (v) => setState(() { _isGroup = v.first; _selectedUserIds.clear(); }),
            ),
          ),
          if (_isGroup)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Group Name', hintText: 'Enter group name')),
            ),
          const Padding(padding: EdgeInsets.all(16), child: Align(alignment: Alignment.centerLeft, child: Text('Select Users', style: TextStyle(fontWeight: FontWeight.bold)))),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _users.isEmpty
                    ? const Center(child: Text('No users available'))
                    : ListView.builder(
                        itemCount: _users.length,
                        itemBuilder: (ctx, i) {
                          final user = _users[i];
                          final selected = _selectedUserIds.contains(user.id);
                          return CheckboxListTile(
                            value: selected,
                            onChanged: (v) {
                              setState(() {
                                if (!_isGroup) _selectedUserIds.clear();
                                if (v == true) _selectedUserIds.add(user.id);
                                else _selectedUserIds.remove(user.id);
                              });
                            },
                            title: Text(user.displayName),
                            subtitle: Text('@${user.username}'),
                            secondary: CircleAvatar(child: Text(user.displayName[0].toUpperCase())),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() { _nameController.dispose(); super.dispose(); }
}
