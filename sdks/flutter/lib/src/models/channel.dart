class Channel {
  final String id;
  final String type;
  final String? name;
  final String? description;
  final String? avatarUrl;
  final String? createdBy;
  final Map<String, dynamic> metadata;
  final Map<String, dynamic> settings;
  final bool isFrozen;
  final int memberCount;
  final DateTime? lastMessageAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  Channel({
    required this.id,
    required this.type,
    this.name,
    this.description,
    this.avatarUrl,
    this.createdBy,
    this.metadata = const {},
    this.settings = const {},
    this.isFrozen = false,
    this.memberCount = 0,
    this.lastMessageAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['id'] as String,
      type: json['type'] as String,
      name: json['name'] as String?,
      description: json['description'] as String?,
      avatarUrl: json['avatar_url'] as String? ?? json['avatarUrl'] as String?,
      createdBy: json['created_by'] as String? ?? json['createdBy'] as String?,
      metadata: (json['metadata'] as Map<String, dynamic>?) ?? {},
      settings: (json['settings'] as Map<String, dynamic>?) ?? {},
      isFrozen: json['is_frozen'] as bool? ?? json['isFrozen'] as bool? ?? false,
      memberCount: json['member_count'] as int? ?? json['memberCount'] as int? ?? 0,
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.parse(json['last_message_at'] as String)
          : json['lastMessageAt'] != null
              ? DateTime.parse(json['lastMessageAt'] as String)
              : null,
      createdAt: DateTime.parse(json['created_at'] as String? ?? json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String? ?? json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    if (name != null) 'name': name,
    if (description != null) 'description': description,
    if (avatarUrl != null) 'avatarUrl': avatarUrl,
    if (createdBy != null) 'createdBy': createdBy,
    'metadata': metadata,
    'settings': settings,
    'isFrozen': isFrozen,
    'memberCount': memberCount,
    if (lastMessageAt != null) 'lastMessageAt': lastMessageAt!.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}

class ChannelMember {
  final String userId;
  final String role;
  final bool isMuted;
  final bool isBanned;
  final int unreadCount;
  final DateTime joinedAt;

  ChannelMember({
    required this.userId,
    this.role = 'member',
    this.isMuted = false,
    this.isBanned = false,
    this.unreadCount = 0,
    required this.joinedAt,
  });

  factory ChannelMember.fromJson(Map<String, dynamic> json) {
    return ChannelMember(
      userId: json['user_id'] as String? ?? json['userId'] as String,
      role: json['role'] as String? ?? 'member',
      isMuted: json['is_muted'] as bool? ?? json['isMuted'] as bool? ?? false,
      isBanned: json['is_banned'] as bool? ?? json['isBanned'] as bool? ?? false,
      unreadCount: json['unread_count'] as int? ?? json['unreadCount'] as int? ?? 0,
      joinedAt: DateTime.parse(json['joined_at'] as String? ?? json['joinedAt'] as String),
    );
  }
}
