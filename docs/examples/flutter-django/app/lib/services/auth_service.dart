import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

import '../models/user.dart';
import 'api_service.dart';

/// Manages authentication state, persists the session to shared preferences,
/// and initializes the RajutechieStreamKit client upon successful authentication.
class AuthService extends ChangeNotifier {
  static const _keyUser = 'auth_user';
  static const _keyToken = 'auth_token';

  final ApiService api = ApiService();

  AppUser? _currentUser;
  String? _token;
  bool _loading = false;
  String? _error;

  RajutechieStreamKit? _rajutechieStreamKitClient;

  // ---------------------------------------------------------------------------
  // Public getters
  // ---------------------------------------------------------------------------

  AppUser? get currentUser => _currentUser;
  String? get token => _token;
  bool get isAuthenticated => _currentUser != null && _token != null;
  bool get isLoading => _loading;
  String? get error => _error;
  RajutechieStreamKit? get rajutechieStreamKitClient => _rajutechieStreamKitClient;

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  Future<bool> login(String username, String password) async {
    _setLoading(true);
    _error = null;
    try {
      final result = await api.login(username, password);
      await _handleAuthResponse(result);
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection failed. Is the server running?';
      notifyListeners();
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------

  Future<bool> register(
    String username,
    String password,
    String displayName,
  ) async {
    _setLoading(true);
    _error = null;
    try {
      final result = await api.register(username, password, displayName);
      await _handleAuthResponse(result);
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection failed. Is the server running?';
      notifyListeners();
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  Future<void> logout() async {
    _rajutechieStreamKitClient?.disconnect();
    _rajutechieStreamKitClient?.dispose();
    _rajutechieStreamKitClient = null;
    _currentUser = null;
    _token = null;
    api.setToken(null);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUser);
    await prefs.remove(_keyToken);

    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Session restoration
  // ---------------------------------------------------------------------------

  Future<void> tryRestoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_keyUser);
    final token = prefs.getString(_keyToken);

    if (userJson != null && token != null) {
      _currentUser =
          AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
      _token = token;
      api.setToken(token);
      await _initRajutechieStreamKit(token);
      notifyListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  Future<void> _handleAuthResponse(Map<String, dynamic> result) async {
    final userMap = result['user'] as Map<String, dynamic>;
    final token = result['token'] as String;

    _currentUser = AppUser.fromJson(userMap);
    _token = token;
    api.setToken(token);

    // Persist to shared preferences.
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUser, jsonEncode(userMap));
    await prefs.setString(_keyToken, token);

    await _initRajutechieStreamKit(token);
    notifyListeners();
  }

  Future<void> _initRajutechieStreamKit(String token) async {
    try {
      final client = RajutechieStreamKit.instance(
        config: const RajutechieStreamKitConfig(apiKey: 'sk_dev_rajutechie-streamkit_001'),
      );
      await client.connect(token);
      _rajutechieStreamKitClient = client;
    } catch (e) {
      debugPrint('RajutechieStreamKit initialization failed: $e');
    }
  }

  void _setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }
}
