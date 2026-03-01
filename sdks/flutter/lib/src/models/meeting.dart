class Meeting {
  final String id;
  final String title;
  final String? description;
  final String hostId;
  final String meetingCode;
  final String status;
  final Map<String, dynamic> settings;
  final List<MeetingParticipant> participants;
  final DateTime? scheduledAt;
  final int durationMins;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final DateTime createdAt;

  Meeting({
    required this.id,
    required this.title,
    this.description,
    required this.hostId,
    required this.meetingCode,
    this.status = 'scheduled',
    this.settings = const {},
    this.participants = const [],
    this.scheduledAt,
    this.durationMins = 60,
    this.startedAt,
    this.endedAt,
    required this.createdAt,
  });

  factory Meeting.fromJson(Map<String, dynamic> json) {
    return Meeting(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      hostId: json['host_id'] as String? ?? json['hostId'] as String,
      meetingCode: json['meeting_code'] as String? ?? json['meetingCode'] as String,
      status: json['status'] as String? ?? 'scheduled',
      settings: (json['settings'] as Map<String, dynamic>?) ?? {},
      participants: (json['participants'] as List<dynamic>?)
              ?.map((p) => MeetingParticipant.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      scheduledAt: json['scheduled_at'] != null
          ? DateTime.parse(json['scheduled_at'] as String)
          : json['scheduledAt'] != null
              ? DateTime.parse(json['scheduledAt'] as String)
              : null,
      durationMins: json['duration_mins'] as int? ?? json['durationMins'] as int? ?? 60,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : json['startedAt'] != null
              ? DateTime.parse(json['startedAt'] as String)
              : null,
      endedAt: json['ended_at'] != null
          ? DateTime.parse(json['ended_at'] as String)
          : json['endedAt'] != null
              ? DateTime.parse(json['endedAt'] as String)
              : null,
      createdAt: DateTime.parse(json['created_at'] as String? ?? json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    if (description != null) 'description': description,
    'hostId': hostId,
    'meetingCode': meetingCode,
    'status': status,
    'settings': settings,
    'participants': participants.map((p) => p.toJson()).toList(),
    if (scheduledAt != null) 'scheduledAt': scheduledAt!.toIso8601String(),
    'durationMins': durationMins,
    if (startedAt != null) 'startedAt': startedAt!.toIso8601String(),
    if (endedAt != null) 'endedAt': endedAt!.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
  };
}

class MeetingParticipant {
  final String userId;
  final String role;
  final String status;
  final bool isMuted;
  final bool hasVideo;
  final bool handRaised;
  final String? breakoutRoom;
  final DateTime? joinedAt;
  final DateTime? leftAt;

  MeetingParticipant({
    required this.userId,
    this.role = 'attendee',
    this.status = 'invited',
    this.isMuted = false,
    this.hasVideo = false,
    this.handRaised = false,
    this.breakoutRoom,
    this.joinedAt,
    this.leftAt,
  });

  factory MeetingParticipant.fromJson(Map<String, dynamic> json) {
    return MeetingParticipant(
      userId: json['user_id'] as String? ?? json['userId'] as String,
      role: json['role'] as String? ?? 'attendee',
      status: json['status'] as String? ?? 'invited',
      isMuted: json['is_muted'] as bool? ?? json['isMuted'] as bool? ?? false,
      hasVideo: json['has_video'] as bool? ?? json['hasVideo'] as bool? ?? false,
      handRaised: json['hand_raised'] as bool? ?? json['handRaised'] as bool? ?? false,
      breakoutRoom: json['breakout_room'] as String? ?? json['breakoutRoom'] as String?,
      joinedAt: json['joined_at'] != null ? DateTime.parse(json['joined_at'] as String) : null,
      leftAt: json['left_at'] != null ? DateTime.parse(json['left_at'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'role': role,
    'status': status,
    'isMuted': isMuted,
    'hasVideo': hasVideo,
    'handRaised': handRaised,
    if (breakoutRoom != null) 'breakoutRoom': breakoutRoom,
    if (joinedAt != null) 'joinedAt': joinedAt!.toIso8601String(),
    if (leftAt != null) 'leftAt': leftAt!.toIso8601String(),
  };
}

class MeetingPoll {
  final String id;
  final String question;
  final List<PollOption> options;
  final bool isAnonymous;
  final bool isActive;
  final Map<String, int> results;

  MeetingPoll({
    required this.id,
    required this.question,
    required this.options,
    this.isAnonymous = false,
    this.isActive = false,
    this.results = const {},
  });

  factory MeetingPoll.fromJson(Map<String, dynamic> json) {
    return MeetingPoll(
      id: json['id'] as String,
      question: json['question'] as String,
      options: (json['options'] as List<dynamic>)
          .map((o) => PollOption.fromJson(o as Map<String, dynamic>))
          .toList(),
      isAnonymous: json['is_anonymous'] as bool? ?? json['isAnonymous'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? json['isActive'] as bool? ?? false,
      results: (json['results'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v as int),
          ) ??
          {},
    );
  }
}

class PollOption {
  final String id;
  final String text;

  PollOption({required this.id, required this.text});

  factory PollOption.fromJson(Map<String, dynamic> json) {
    return PollOption(
      id: json['id'] as String,
      text: json['text'] as String,
    );
  }
}
