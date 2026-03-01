class Attachment {
  final String type;
  final String url;
  final String? thumbnailUrl;
  final String? filename;
  final int? size;
  final String? mimeType;
  final int? duration;

  Attachment({
    required this.type,
    required this.url,
    this.thumbnailUrl,
    this.filename,
    this.size,
    this.mimeType,
    this.duration,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      type: json['type'] as String,
      url: json['url'] as String,
      thumbnailUrl: json['thumbnail_url'] as String?,
      filename: json['filename'] as String?,
      size: json['size'] as int?,
      mimeType: json['mime_type'] as String?,
      duration: json['duration'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'url': url,
    if (thumbnailUrl != null) 'thumbnail_url': thumbnailUrl,
    if (filename != null) 'filename': filename,
    if (size != null) 'size': size,
    if (mimeType != null) 'mime_type': mimeType,
    if (duration != null) 'duration': duration,
  };
}

class Message {
  final String id;
  final String channelId;
  final String senderId;
  final String type;
  final String? text;
  final List<Attachment> attachments;
  final String? replyTo;
  final String? threadId;
  final Map<String, List<String>> reactions;
  final bool isEdited;
  final bool isDeleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  Message({
    required this.id,
    required this.channelId,
    required this.senderId,
    required this.type,
    this.text,
    this.attachments = const [],
    this.replyTo,
    this.threadId,
    this.reactions = const {},
    this.isEdited = false,
    this.isDeleted = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      channelId: json['channel_id'] as String? ?? json['channelId'] as String,
      senderId: json['sender_id'] as String? ?? json['senderId'] as String,
      type: json['type'] as String? ?? 'text',
      text: json['text'] as String? ?? (json['content'] as Map<String, dynamic>?)?['text'] as String?,
      attachments: ((json['attachments'] ?? (json['content'] as Map<String, dynamic>?)?['attachments']) as List<dynamic>?)
              ?.map((a) => Attachment.fromJson(a as Map<String, dynamic>))
              .toList() ??
          [],
      replyTo: json['reply_to'] as String?,
      threadId: json['thread_id'] as String?,
      reactions: (json['reactions'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, (v as List<dynamic>).map((e) => e as String).toList()),
          ) ??
          {},
      isEdited: json['is_edited'] as bool? ?? false,
      isDeleted: json['is_deleted'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String? ?? json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String? ?? json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'channelId': channelId,
    'senderId': senderId,
    'type': type,
    if (text != null) 'text': text,
    'attachments': attachments.map((a) => a.toJson()).toList(),
    if (replyTo != null) 'replyTo': replyTo,
    if (threadId != null) 'threadId': threadId,
    'reactions': reactions,
    'isEdited': isEdited,
    'isDeleted': isDeleted,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}
