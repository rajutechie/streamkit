import '../transport/http_client.dart';
import '../transport/websocket_client.dart';
import '../models/message.dart';

class ChatModule {
  final RajutechieStreamKitHttpClient http;
  final RajutechieStreamKitWebSocketClient ws;

  ChatModule({required this.http, required this.ws});

  Future<Map<String, dynamic>> createChannel({
    required String type,
    String? name,
    List<String>? members,
  }) async {
    return http.post('/channels', body: {
      'type': type,
      if (name != null) 'name': name,
      if (members != null) 'members': members,
    });
  }

  Future<Map<String, dynamic>> getChannel(String channelId) async {
    return http.get('/channels/$channelId');
  }

  Future<Map<String, dynamic>> sendMessage(String channelId, {String? text, List<Map<String, dynamic>>? attachments}) async {
    return http.post('/channels/$channelId/messages', body: {
      if (text != null) 'text': text,
      if (attachments != null) 'attachments': attachments,
    });
  }

  Future<Map<String, dynamic>> getMessages(String channelId, {int limit = 25, String? after}) async {
    final params = <String, String>{'limit': '$limit'};
    if (after != null) params['after'] = after;
    return http.get('/channels/$channelId/messages', params: params);
  }

  Stream<Message> messagesStream(String channelId) {
    return ws.on('message.new').map((data) => Message.fromJson(data)).where((msg) => msg.channelId == channelId);
  }

  Future<void> editMessage(String channelId, String messageId, String text) async {
    await http.patch('/channels/$channelId/messages/$messageId', body: {'text': text});
  }

  Future<void> deleteMessage(String channelId, String messageId) async {
    await http.delete('/channels/$channelId/messages/$messageId');
  }

  Future<void> addReaction(String channelId, String messageId, String emoji) async {
    await http.post('/channels/$channelId/messages/$messageId/reactions', body: {'emoji': emoji});
  }

  void startTyping(String channelId) => ws.send('typing.start', {'channelId': channelId});
  void stopTyping(String channelId) => ws.send('typing.stop', {'channelId': channelId});
}
