import '../transport/http_client.dart';
import '../transport/websocket_client.dart';

class StreamModule {
  final RajutechieStreamKitHttpClient http;
  final RajutechieStreamKitWebSocketClient ws;

  StreamModule({required this.http, required this.ws});

  Future<Map<String, dynamic>> create({
    required String title,
    String? description,
    String visibility = 'public',
    Map<String, dynamic>? settings,
  }) async {
    return http.post('/streams', body: {
      'title': title,
      if (description != null) 'description': description,
      'visibility': visibility,
      if (settings != null) 'settings': settings,
    });
  }

  Future<Map<String, dynamic>> get(String streamId) async =>
      http.get('/streams/$streamId');

  Future<Map<String, dynamic>> start(String streamId) async =>
      http.post('/streams/$streamId/start');

  Future<Map<String, dynamic>> stop(String streamId) async =>
      http.post('/streams/$streamId/stop');

  Future<Map<String, dynamic>> getViewers(String streamId) async =>
      http.get('/streams/$streamId/viewers');

  Future<Map<String, dynamic>> moderate(String streamId, {required String type, String? targetUserId}) async {
    return http.post('/streams/$streamId/moderate', body: {
      'type': type,
      if (targetUserId != null) 'targetUserId': targetUserId,
    });
  }

  Stream<Map<String, dynamic>> get streamStarted => ws.on('stream.started');
  Stream<Map<String, dynamic>> get streamEnded => ws.on('stream.ended');
  Stream<Map<String, dynamic>> get viewerCount => ws.on('stream.viewer.count');
}
