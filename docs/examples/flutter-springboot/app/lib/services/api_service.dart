import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/user.dart';

class ApiService {
  late final String _baseUrl;
  String? _authToken;

  ApiService() {
    // Use 10.0.2.2 on Android emulator, localhost otherwise.
    if (!kIsWeb && Platform.isAndroid) {
      _baseUrl = 'http://10.0.2.2:8080/api';
    } else {
      _baseUrl = 'http://localhost:8080/api';
    }
  }

  void setAuthToken(String? token) {
    _authToken = token;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  // ───────────────────────── helpers ─────────────────────────

  Future<Map<String, dynamic>> _get(String path) async {
    final response = await http.get(
      Uri.parse('$_baseUrl$path'),
      headers: _headers,
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> _post(String path,
      {Map<String, dynamic>? body}) async {
    final response = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      final message = json['message'] as String? ?? 'Request failed';
      throw ApiException(response.statusCode, message);
    }
    final success = json['success'] as bool? ?? false;
    if (!success) {
      throw ApiException(
          response.statusCode, json['message'] as String? ?? 'Request failed');
    }
    return json;
  }

  // ───────────────────────── auth ─────────────────────────

  /// Returns `{user: Map, token: String}`.
  Future<Map<String, dynamic>> login(String username, String password) async {
    final json = await _post('/auth/login', body: {
      'username': username,
      'password': password,
    });
    return json['data'] as Map<String, dynamic>;
  }

  /// Returns `{user: Map, token: String}`.
  Future<Map<String, dynamic>> register(
      String username, String password, String displayName) async {
    final json = await _post('/auth/register', body: {
      'username': username,
      'password': password,
      'displayName': displayName,
    });
    return json['data'] as Map<String, dynamic>;
  }

  Future<List<AppUser>> getUsers() async {
    final json = await _get('/auth/users');
    final list = json['data'] as List<dynamic>;
    return list
        .map((e) => AppUser.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ───────────────────────── channels ─────────────────────────

  Future<Map<String, dynamic>> createChannel({
    required String type,
    required List<String> members,
    String? name,
  }) async {
    final json = await _post('/channels', body: {
      'type': type,
      'members': members,
      if (name != null) 'name': name,
    });
    return json['data'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getChannels() async {
    final json = await _get('/channels');
    final list = json['data'] as List<dynamic>;
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  // ───────────────────────── calls ─────────────────────────

  Future<Map<String, dynamic>> createCall({
    required String type,
    required List<String> participants,
  }) async {
    final json = await _post('/calls', body: {
      'type': type,
      'participants': participants,
    });
    return json['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getCall(String id) async {
    final json = await _get('/calls/$id');
    return json['data'] as Map<String, dynamic>;
  }

  // ───────────────────────── streams ─────────────────────────

  Future<Map<String, dynamic>> createStream({
    required String title,
    String? description,
    String visibility = 'public',
  }) async {
    final json = await _post('/streams', body: {
      'title': title,
      if (description != null) 'description': description,
      'visibility': visibility,
    });
    return json['data'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getStreams() async {
    final json = await _get('/streams');
    final list = json['data'] as List<dynamic>;
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>> startStream(String id) async {
    final json = await _post('/streams/$id/start');
    return json['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> stopStream(String id) async {
    final json = await _post('/streams/$id/stop');
    return json['data'] as Map<String, dynamic>;
  }

  // --------------------------------------------------------------------------
  // Meetings
  // --------------------------------------------------------------------------

  Future<Map<String, dynamic>> createMeeting({
    required String title,
    String? scheduledAt,
    String? password,
    int durationMins = 60,
  }) async {
    final json = await _post('/meetings', body: {
      'title': title,
      'durationMins': durationMins,
      if (scheduledAt != null) 'scheduledAt': scheduledAt,
      if (password != null && password.isNotEmpty) 'password': password,
    });
    return json['data'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getMeetings() async {
    final json = await _get('/meetings');
    final list = json['data'] as List<dynamic>;
    return list.map((e) => e as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>> getMeeting(String id) async {
    final json = await _get('/meetings/$id');
    return json['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> joinMeeting(String id, {String? password}) async {
    final json = await _post('/meetings/$id/join', body: {
      if (password != null && password.isNotEmpty) 'password': password,
    });
    return json['data'] as Map<String, dynamic>;
  }

  Future<void> leaveMeeting(String id) async {
    await _post('/meetings/$id/leave');
  }

  Future<Map<String, dynamic>> endMeeting(String id) async {
    final json = await _post('/meetings/$id/end');
    return json['data'] as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}
