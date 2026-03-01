import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_service.dart';
import '../../services/auth_service.dart';

/// Screen for scheduling a new meeting.
class CreateMeetingScreen extends StatefulWidget {
  const CreateMeetingScreen({super.key});

  @override
  State<CreateMeetingScreen> createState() => _CreateMeetingScreenState();
}

class _CreateMeetingScreenState extends State<CreateMeetingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  int _durationMins = 60;
  bool _hasPassword = false;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final api = context.read<AuthService>().apiService;
    try {
      final meeting = await api.createMeeting(
        title: _titleCtrl.text.trim(),
        durationMins: _durationMins,
        password: _hasPassword ? _passwordCtrl.text : null,
      );
      if (mounted) Navigator.of(context).pop(meeting);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Meeting')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                labelText: 'Meeting title',
                prefixIcon: Icon(Icons.title),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Title is required' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<int>(
              value: _durationMins,
              decoration: const InputDecoration(
                labelText: 'Duration',
                prefixIcon: Icon(Icons.timer),
              ),
              items: const [
                DropdownMenuItem(value: 30, child: Text('30 minutes')),
                DropdownMenuItem(value: 60, child: Text('1 hour')),
                DropdownMenuItem(value: 90, child: Text('1.5 hours')),
                DropdownMenuItem(value: 120, child: Text('2 hours')),
              ],
              onChanged: (v) => setState(() => _durationMins = v ?? 60),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Require password'),
              value: _hasPassword,
              onChanged: (v) => setState(() => _hasPassword = v),
            ),
            if (_hasPassword) ...[
              const SizedBox(height: 8),
              TextFormField(
                controller: _passwordCtrl,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  prefixIcon: Icon(Icons.lock),
                ),
                obscureText: true,
                validator: (v) {
                  if (_hasPassword && (v == null || v.isEmpty)) return 'Enter a password';
                  return null;
                },
              ),
            ],
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Schedule Meeting'),
            ),
          ],
        ),
      ),
    );
  }
}
