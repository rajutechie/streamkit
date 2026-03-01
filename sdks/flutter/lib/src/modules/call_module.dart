import '../transport/http_client.dart';
import '../transport/websocket_client.dart';

class CallModule {
  final RajutechieStreamKitHttpClient http;
  final RajutechieStreamKitWebSocketClient ws;

  CallModule({required this.http, required this.ws});

  Future<Map<String, dynamic>> start({required String type, required List<String> participants}) async {
    return http.post('/calls', body: {'type': type, 'participants': participants});
  }

  Future<Map<String, dynamic>> get(String callId) async => http.get('/calls/$callId');
  Future<void> accept(String callId) async => http.post('/calls/$callId/accept');
  Future<void> reject(String callId) async => http.post('/calls/$callId/reject');
  Future<void> end(String callId) async => http.post('/calls/$callId/end');
  Future<void> startRecording(String callId) async => http.post('/calls/$callId/recording/start');
  Future<void> stopRecording(String callId) async => http.post('/calls/$callId/recording/stop');

  void toggleAudio(String callId, bool enabled) => ws.send('call.signal', {'callId': callId, 'action': 'toggle_audio', 'enabled': enabled});
  void toggleVideo(String callId, bool enabled) => ws.send('call.signal', {'callId': callId, 'action': 'toggle_video', 'enabled': enabled});
  void switchCamera(String callId) => ws.send('call.signal', {'callId': callId, 'action': 'switch_camera'});

  Future<void> startScreenShare(String callId) async =>
      http.post('/calls/$callId/screen-share/start');

  Future<void> stopScreenShare(String callId) async =>
      http.post('/calls/$callId/screen-share/stop');

  Future<Map<String, dynamic>> getStats(String callId) async =>
      http.get('/calls/$callId/stats');

  Stream<Map<String, dynamic>> get incomingCalls => ws.on('call.incoming');

  /// All call lifecycle events (accepted, ended, participant joined/left).
  Stream<Map<String, dynamic>> get callEvents => ws.on('call.event');
}
