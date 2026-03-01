import '../transport/http_client.dart';
import '../transport/websocket_client.dart';

class MeetingModule {
  final RajutechieStreamKitHttpClient http;
  final RajutechieStreamKitWebSocketClient ws;

  MeetingModule({required this.http, required this.ws});

  Future<Map<String, dynamic>> schedule({
    required String title,
    String? description,
    DateTime? scheduledAt,
    int durationMins = 60,
    String? password,
    Map<String, dynamic>? settings,
  }) async {
    return http.post('/meetings', body: {
      'title': title,
      if (description != null) 'description': description,
      if (scheduledAt != null) 'scheduledAt': scheduledAt.toIso8601String(),
      'durationMins': durationMins,
      if (password != null) 'password': password,
      if (settings != null) 'settings': settings,
    });
  }

  Future<Map<String, dynamic>> get(String meetingId) async =>
      http.get('/meetings/$meetingId');

  Future<Map<String, dynamic>> update(String meetingId, {String? title, String? description, Map<String, dynamic>? settings}) async {
    return http.patch('/meetings/$meetingId', body: {
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (settings != null) 'settings': settings,
    });
  }

  Future<void> cancel(String meetingId) async =>
      http.delete('/meetings/$meetingId');

  Future<Map<String, dynamic>> join(String meetingId, {String? password}) async {
    return http.post('/meetings/$meetingId/join', body: {
      if (password != null) 'password': password,
    });
  }

  Future<Map<String, dynamic>> joinByCode(String code) async =>
      http.get('/meetings/join/$code');

  Future<void> leave(String meetingId) async =>
      http.post('/meetings/$meetingId/leave');

  Future<void> end(String meetingId) async =>
      http.post('/meetings/$meetingId/end');

  Future<void> muteParticipant(String meetingId, String userId) async =>
      http.post('/meetings/$meetingId/participants/$userId/mute');

  Future<void> removeParticipant(String meetingId, String userId) async =>
      http.post('/meetings/$meetingId/participants/$userId/remove');

  Future<void> muteAll(String meetingId) async =>
      http.post('/meetings/$meetingId/mute-all');

  Future<Map<String, dynamic>> createPoll(String meetingId, {required String question, required List<String> options, bool isAnonymous = false}) async {
    return http.post('/meetings/$meetingId/polls', body: {
      'question': question,
      'options': options,
      'isAnonymous': isAnonymous,
    });
  }

  Future<Map<String, dynamic>> votePoll(String meetingId, String pollId, String optionId) async {
    return http.post('/meetings/$meetingId/polls/$pollId/vote', body: {
      'optionId': optionId,
    });
  }

  Future<Map<String, dynamic>> createBreakoutRooms(String meetingId, List<Map<String, dynamic>> rooms) async {
    return http.post('/meetings/$meetingId/breakout-rooms', body: {
      'rooms': rooms,
    });
  }

  void raiseHand(String meetingId) =>
      ws.send('hand.raise', {'meetingId': meetingId});

  void lowerHand(String meetingId) =>
      ws.send('hand.lower', {'meetingId': meetingId});

  Future<void> startScreenShare(String meetingId) async =>
      http.post('/meetings/$meetingId/screen-share/start');

  Future<void> stopScreenShare(String meetingId) async =>
      http.post('/meetings/$meetingId/screen-share/stop');

  void sendSignal(String meetingId, Map<String, dynamic> signal) =>
      ws.send('meeting.signal', {'meetingId': meetingId, ...signal});

  Stream<Map<String, dynamic>> get participantEvents =>
      ws.on('meeting.participant.joined');

  Stream<Map<String, dynamic>> get participantLeftEvents =>
      ws.on('meeting.participant.left');

  Stream<Map<String, dynamic>> get pollEvents =>
      ws.on('meeting.poll.created');

  Stream<Map<String, dynamic>> get pollResultEvents =>
      ws.on('meeting.poll.result');

  Stream<Map<String, dynamic>> get handEvents =>
      ws.on('meeting.hand.raised');
}
