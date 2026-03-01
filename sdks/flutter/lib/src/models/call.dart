class Call {
  final String id;
  final String type;
  final String status;
  final String initiatedBy;
  final String? channelId;
  final String? recordingUrl;
  final String recordingStatus;
  final List<CallParticipant> participants;
  final DateTime startedAt;
  final DateTime? answeredAt;
  final DateTime? endedAt;
  final String? endReason;

  Call({
    required this.id,
    required this.type,
    required this.status,
    required this.initiatedBy,
    this.channelId,
    this.recordingUrl,
    this.recordingStatus = 'none',
    this.participants = const [],
    required this.startedAt,
    this.answeredAt,
    this.endedAt,
    this.endReason,
  });

  factory Call.fromJson(Map<String, dynamic> json) {
    return Call(
      id: json['id'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      initiatedBy: json['initiated_by'] as String? ?? json['initiatedBy'] as String,
      channelId: json['channel_id'] as String? ?? json['channelId'] as String?,
      recordingUrl: json['recording_url'] as String? ?? json['recordingUrl'] as String?,
      recordingStatus: json['recording_status'] as String? ?? json['recordingStatus'] as String? ?? 'none',
      participants: (json['participants'] as List<dynamic>?)
              ?.map((p) => CallParticipant.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      startedAt: DateTime.parse(json['started_at'] as String? ?? json['startedAt'] as String),
      answeredAt: json['answered_at'] != null
          ? DateTime.parse(json['answered_at'] as String)
          : json['answeredAt'] != null
              ? DateTime.parse(json['answeredAt'] as String)
              : null,
      endedAt: json['ended_at'] != null
          ? DateTime.parse(json['ended_at'] as String)
          : json['endedAt'] != null
              ? DateTime.parse(json['endedAt'] as String)
              : null,
      endReason: json['end_reason'] as String? ?? json['endReason'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'status': status,
    'initiatedBy': initiatedBy,
    if (channelId != null) 'channelId': channelId,
    if (recordingUrl != null) 'recordingUrl': recordingUrl,
    'recordingStatus': recordingStatus,
    'participants': participants.map((p) => p.toJson()).toList(),
    'startedAt': startedAt.toIso8601String(),
    if (answeredAt != null) 'answeredAt': answeredAt!.toIso8601String(),
    if (endedAt != null) 'endedAt': endedAt!.toIso8601String(),
    if (endReason != null) 'endReason': endReason,
  };
}

class CallParticipant {
  final String id;
  final String userId;
  final String role;
  final String status;
  final bool hasAudio;
  final bool hasVideo;
  final bool hasScreen;
  final DateTime? joinedAt;
  final DateTime? leftAt;

  CallParticipant({
    required this.id,
    required this.userId,
    this.role = 'participant',
    this.status = 'invited',
    this.hasAudio = true,
    this.hasVideo = false,
    this.hasScreen = false,
    this.joinedAt,
    this.leftAt,
  });

  factory CallParticipant.fromJson(Map<String, dynamic> json) {
    return CallParticipant(
      id: json['id'] as String,
      userId: json['user_id'] as String? ?? json['userId'] as String,
      role: json['role'] as String? ?? 'participant',
      status: json['status'] as String? ?? 'invited',
      hasAudio: json['has_audio'] as bool? ?? json['hasAudio'] as bool? ?? true,
      hasVideo: json['has_video'] as bool? ?? json['hasVideo'] as bool? ?? false,
      hasScreen: json['has_screen'] as bool? ?? json['hasScreen'] as bool? ?? false,
      joinedAt: json['joined_at'] != null ? DateTime.parse(json['joined_at'] as String) : null,
      leftAt: json['left_at'] != null ? DateTime.parse(json['left_at'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'role': role,
    'status': status,
    'hasAudio': hasAudio,
    'hasVideo': hasVideo,
    'hasScreen': hasScreen,
    if (joinedAt != null) 'joinedAt': joinedAt!.toIso8601String(),
    if (leftAt != null) 'leftAt': leftAt!.toIso8601String(),
  };
}
