import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

import '../models/user.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final ApiService _api;

  AppUser? _currentUser;
  String? _authToken;
  String? _rajutechieStreamKitToken;
  RajutechieStreamKit? _rajutechieStreamKitClient;
  bool _isLoading = false;

  AuthService({required ApiService api}) : _api = api;

  // ───────────────────────── getters ─────────────────────────

  bool get isLoggedIn => _currentUser != null && _rajutechieStreamKitToken != null;
  bool get isLoading => _isLoading;
  AppUser? get currentUser => _currentUser;
  String? get rajutechieStreamKitToken => _rajutechieStreamKitToken;
  String? get authToken => _authToken;
  RajutechieStreamKit? get rajutechieStreamKitClient => _rajutechieStreamKitClient;

  // ───────────────────────── public ─────────────────────────

  Future<void> login(String username, String password) async {
    _setLoading(true);
    try {
      final data = await _api.login(username, password);
      await _handleAuthResponse(data);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> register(
      String username, String password, String displayName) async {
    _setLoading(true);
    try {
      final data = await _api.register(username, password, displayName);
      await _handleAuthResponse(data);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    _setLoading(true);
    try {
      await _rajutechieStreamKitClient?.disconnect();
      _currentUser = null;
      _authToken = null;
      _rajutechieStreamKitToken = null;
      _rajutechieStreamKitClient = null;
      _api.setAuthToken(null);

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_user');
      await prefs.remove('auth_token');
      await prefs.remove('rajutechie-streamkit_token');

      notifyListeners();
    } finally {
      _setLoading(false);
    }
  }

  /// Called at startup to see if a session can be restored from disk.
  Future<void> tryRestoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('auth_user');
    final authToken = prefs.getString('auth_token');
    final skToken = prefs.getString('rajutechie-streamkit_token');

    if (userJson == null || skToken == null) return;

    try {
      _currentUser =
          AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
      _authToken = authToken;
      _rajutechieStreamKitToken = skToken;
      _api.setAuthToken(authToken);
      await _initRajutechieStreamKit(skToken);
      notifyListeners();
    } catch (_) {
      // Corrupted session -- clear and let the user log in again.
      await prefs.remove('auth_user');
      await prefs.remove('auth_token');
      await prefs.remove('rajutechie-streamkit_token');
    }
  }

  // ───────────────────────── private ─────────────────────────

  Future<void> _handleAuthResponse(Map<String, dynamic> data) async {
    final userMap = data['user'] as Map<String, dynamic>;
    final token = data['token'] as String;

    _currentUser = AppUser.fromJson(userMap);
    _rajutechieStreamKitToken = token;
    // The Spring Boot backend uses the same token for both auth header and
    // RajutechieStreamKit connection in this demo.
    _authToken = token;
    _api.setAuthToken(token);

    await _saveSession();
    await _initRajutechieStreamKit(token);

    notifyListeners();
  }

  Future<void> _initRajutechieStreamKit(String token) async {
    final client = RajutechieStreamKit.instance(
      config: const RajutechieStreamKitConfig(apiKey: 'sk_dev_rajutechie-streamkit_001'),
    );
    await client.connect(token);
    _rajutechieStreamKitClient = client;
  }

  Future<void> _saveSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (_currentUser != null) {
      await prefs.setString(
          'auth_user', jsonEncode(_currentUser!.toJson()));
    }
    if (_authToken != null) {
      await prefs.setString('auth_token', _authToken!);
    }
    if (_rajutechieStreamKitToken != null) {
      await prefs.setString('rajutechie-streamkit_token', _rajutechieStreamKitToken!);
    }
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
