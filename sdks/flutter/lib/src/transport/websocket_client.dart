import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class RajutechieStreamKitWebSocketClient {
  final String url;
  WebSocketChannel? _channel;
  final _handlers = <String, List<Function(Map<String, dynamic>)>>{};
  StreamSubscription? _subscription;
  bool _connected = false;

  RajutechieStreamKitWebSocketClient({required this.url});

  bool get isConnected => _connected;

  Future<void> connect(String token) async {
    final uri = Uri.parse('$url?token=$token');
    _channel = WebSocketChannel.connect(uri);
    _connected = true;

    _subscription = _channel!.stream.listen(
      (data) {
        final json = jsonDecode(data as String) as Map<String, dynamic>;
        final type = json['type'] as String?;
        if (type != null && _handlers.containsKey(type)) {
          for (final handler in _handlers[type]!) {
            handler(json);
          }
        }
      },
      onDone: () => _connected = false,
      onError: (_) => _connected = false,
    );
  }

  void disconnect() {
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
    _connected = false;
  }

  void send(String type, Map<String, dynamic> data) {
    if (!_connected || _channel == null) return;

    final message = {
      'type': type,
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'timestamp': DateTime.now().toIso8601String(),
      'data': data,
    };

    _channel!.sink.add(jsonEncode(message));
  }

  Stream<Map<String, dynamic>> on(String event) {
    final controller = StreamController<Map<String, dynamic>>.broadcast();
    final handler = (Map<String, dynamic> data) => controller.add(data);
    _handlers.putIfAbsent(event, () => []).add(handler);
    return controller.stream;
  }
}
