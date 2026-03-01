import 'dart:convert';
import 'package:http/http.dart' as http;

class RajutechieStreamKitHttpClient {
  final String baseUrl;
  final String apiKey;
  String? _token;

  RajutechieStreamKitHttpClient({required this.baseUrl, required this.apiKey});

  void setToken(String? token) => _token = token;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? params}) async {
    var uri = Uri.parse('$baseUrl$path');
    if (params != null && params.isNotEmpty) {
      uri = uri.replace(queryParameters: params);
    }
    final response = await http.get(uri, headers: _headers);
    _checkResponse(response);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    _checkResponse(response);
    if (response.body.isEmpty) return {};
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> patch(String path, {Object? body}) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    _checkResponse(response);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<void> delete(String path) async {
    final response = await http.delete(Uri.parse('$baseUrl$path'), headers: _headers);
    _checkResponse(response);
  }

  void _checkResponse(http.Response response) {
    if (response.statusCode >= 400) {
      throw RajutechieStreamKitApiException(response.statusCode, response.body);
    }
  }
}

class RajutechieStreamKitApiException implements Exception {
  final int statusCode;
  final String body;
  RajutechieStreamKitApiException(this.statusCode, this.body);

  @override
  String toString() => 'RajutechieStreamKitApiException($statusCode): $body';
}
