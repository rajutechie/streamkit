import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/user.dart';

/// HTTP client for the Django backend.
///
/// The default base URL targets the Android emulator loopback address.
/// Change to `http://localhost:8000/api` for the iOS simulator, or to
/// your machine's IP when testing on a physical device.
class ApiService {
  static const String _defaultBaseUrl = 'http://10.0.2.2:8000/api';

  final String baseUrl;
  String? _token;

  ApiService({this.baseUrl = _defaultBaseUrl});

  /// Set the bearer token used for authenticated requests.
  void setToken(String? token) => _token = token;

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<dynamic> _get(String path) async {
    final response = await http.get(
      Uri.parse('$baseUrl/$path'),
      headers: _headers,
    );
    return _handleResponse(response);
  }

  Future<dynamic> _post(String path, {Map<String, dynamic>? body}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/$path'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty ? jsonDecode(response.body) : null;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final errorMessage = body is Map ? (body['error'] ?? body['detail'] ?? 'Request failed') : 'Request failed';
    throw ApiException(
      statusCode: response.statusCode,
      message: errorMessage.toString(),
    );
  }

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------

  /// Login and return `{user, token}`.
  Future<Map<String, dynamic>> login(String username, String password) async {
    final result = await _post('auth/login', body: {
      'username': username,
      'password': password,
    });
    return result as Map<String, dynamic>;
  }

  /// Register a new user and return `{user, token}`.
  Future<Map<String, dynamic>> register(
    String username,
    String password,
    String displayName,
  ) async {
    final result = await _post('auth/register', body: {
      'username': username,
      'password': password,
      'display_name': displayName,
    });
    return result as Map<String, dynamic>;
  }

  // --------------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------------

  /// Retrieve the list of all registered users.
  Future<List<AppUser>> getUsers() async {
    final result = await _get('users') as List<dynamic>;
    return result
        .map((u) => AppUser.fromJson(u as Map<String, dynamic>))
        .toList();
  }

  // --------------------------------------------------------------------------
  // Channels
  // --------------------------------------------------------------------------

  /// Create a direct or group channel.
  Future<Map<String, dynamic>> createChannel({
    required String type,
    required List<String> memberIds,
    String? name,
  }) async {
    final result = await _post('channels/create', body: {
      'type': type,
      'member_ids': memberIds,
      if (name != null && name.isNotEmpty) 'name': name,
    });
    return result as Map<String, dynamic>;
  }

  /// List channels for the authenticated user.
  Future<List<Map<String, dynamic>>> getChannels() async {
    final result = await _get('channels') as List<dynamic>;
    return result.cast<Map<String, dynamic>>();
  }

  // --------------------------------------------------------------------------
  // Calls
  // --------------------------------------------------------------------------

  /// Initiate a call.
  Future<Map<String, dynamic>> createCall({
    required String type,
    required List<String> participantIds,
  }) async {
    final result = await _post('calls', body: {
      'type': type,
      'participant_ids': participantIds,
    });
    return result as Map<String, dynamic>;
  }

  /// Get call details by ID.
  Future<Map<String, dynamic>> getCall(String id) async {
    final result = await _get('calls/$id');
    return result as Map<String, dynamic>;
  }

  // --------------------------------------------------------------------------
  // Streams
  // --------------------------------------------------------------------------

  /// Create a new live stream.
  Future<Map<String, dynamic>> createStream(String title) async {
    final result = await _post('streams/create', body: {'title': title});
    return result as Map<String, dynamic>;
  }

  /// List streams.
  Future<List<Map<String, dynamic>>> getStreams() async {
    final result = await _get('streams') as List<dynamic>;
    return result.cast<Map<String, dynamic>>();
  }

  /// Start (go live on) a stream.
  Future<Map<String, dynamic>> startStream(String id) async {
    final result = await _post('streams/$id/start');
    return result as Map<String, dynamic>;
  }

  /// Stop a live stream.
  Future<Map<String, dynamic>> stopStream(String id) async {
    final result = await _post('streams/$id/stop');
    return result as Map<String, dynamic>;
  }

  // --------------------------------------------------------------------------
  // Meetings
  // --------------------------------------------------------------------------

  /// Schedule a new meeting.
  Future<Map<String, dynamic>> createMeeting({
    required String title,
    String? scheduledAt,
    String? password,
    int durationMins = 60,
  }) async {
    final result = await _post('meetings/create', body: {
      'title': title,
      'duration_mins': durationMins,
      if (scheduledAt != null) 'scheduled_at': scheduledAt,
      if (password != null && password.isNotEmpty) 'password': password,
    });
    return result as Map<String, dynamic>;
  }

  /// List meetings for the authenticated user.
  Future<List<Map<String, dynamic>>> getMeetings() async {
    final result = await _get('meetings') as List<dynamic>;
    return result.cast<Map<String, dynamic>>();
  }

  /// Get a meeting by ID.
  Future<Map<String, dynamic>> getMeeting(String id) async {
    final result = await _get('meetings/$id');
    return result as Map<String, dynamic>;
  }

  /// Join a meeting.
  Future<Map<String, dynamic>> joinMeeting(String id, {String? password}) async {
    final result = await _post('meetings/$id/join', body: {
      if (password != null && password.isNotEmpty) 'password': password,
    });
    return result as Map<String, dynamic>;
  }

  /// Leave a meeting.
  Future<void> leaveMeeting(String id) async {
    await _post('meetings/$id/leave');
  }

  /// End a meeting (host only).
  Future<Map<String, dynamic>> endMeeting(String id) async {
    final result = await _post('meetings/$id/end');
    return result as Map<String, dynamic>;
  }
}

/// Exception thrown by [ApiService] when the server returns an error.
class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'ApiException($statusCode): $message';
}
