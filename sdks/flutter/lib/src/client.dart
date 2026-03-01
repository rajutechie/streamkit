import 'dart:async';
import 'modules/chat_module.dart';
import 'modules/call_module.dart';
import 'modules/meeting_module.dart';
import 'modules/stream_module.dart';
import 'transport/http_client.dart';
import 'transport/websocket_client.dart';

enum Region { usEast1, usWest2, euWest1, apSoutheast1 }

class RajutechieStreamKitConfig {
  final String apiKey;
  final Region region;
  final String apiUrl;
  final String wsUrl;

  const RajutechieStreamKitConfig({
    required this.apiKey,
    this.region = Region.usEast1,
    this.apiUrl = 'https://api.rajutechie-streamkit.io/v1',
    this.wsUrl = 'wss://ws.rajutechie-streamkit.io',
  });
}

enum ConnectionState { connecting, connected, disconnected, reconnecting }

class RajutechieStreamKit {
  static final Map<String, RajutechieStreamKit> _instances = {};

  final RajutechieStreamKitConfig _config;
  late final RajutechieStreamKitHttpClient _http;
  late final RajutechieStreamKitWebSocketClient _ws;

  final _connectionStateController = StreamController<ConnectionState>.broadcast();
  ConnectionState _connectionState = ConnectionState.disconnected;

  ChatModule? _chat;
  CallModule? _call;
  MeetingModule? _meeting;
  StreamModule? _stream;

  RajutechieStreamKit._internal(this._config) {
    _http = RajutechieStreamKitHttpClient(baseUrl: _config.apiUrl, apiKey: _config.apiKey);
    _ws = RajutechieStreamKitWebSocketClient(url: _config.wsUrl);
  }

  factory RajutechieStreamKit.instance({required RajutechieStreamKitConfig config}) {
    return _instances.putIfAbsent(config.apiKey, () => RajutechieStreamKit._internal(config));
  }

  ChatModule get chat => _chat ??= ChatModule(http: _http, ws: _ws);
  CallModule get call => _call ??= CallModule(http: _http, ws: _ws);
  MeetingModule get meeting => _meeting ??= MeetingModule(http: _http, ws: _ws);
  StreamModule get stream => _stream ??= StreamModule(http: _http, ws: _ws);

  Stream<ConnectionState> get connectionState => _connectionStateController.stream;
  bool get isConnected => _connectionState == ConnectionState.connected;

  Future<void> connect(String userToken) async {
    _setConnectionState(ConnectionState.connecting);
    _http.setToken(userToken);
    await _ws.connect(userToken);
    _setConnectionState(ConnectionState.connected);
  }

  Future<void> disconnect() async {
    _ws.disconnect();
    _http.setToken(null);
    _setConnectionState(ConnectionState.disconnected);
  }

  void _setConnectionState(ConnectionState state) {
    _connectionState = state;
    _connectionStateController.add(state);
  }

  void dispose() {
    _connectionStateController.close();
    _ws.disconnect();
    _instances.remove(_config.apiKey);
  }
}
