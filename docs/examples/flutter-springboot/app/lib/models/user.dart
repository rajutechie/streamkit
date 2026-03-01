class AppUser {
  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final bool online;
  final String? createdAt;
  final String? lastSeenAt;

  AppUser({
    required this.id,
    required this.username,
    required this.displayName,
    this.avatarUrl,
    this.online = false,
    this.createdAt,
    this.lastSeenAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName:
            json['displayName'] as String? ?? json['username'] as String,
        avatarUrl: json['avatarUrl'] as String?,
        online: json['online'] as bool? ?? false,
        createdAt: json['createdAt'] as String?,
        lastSeenAt: json['lastSeenAt'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'displayName': displayName,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        'online': online,
        if (createdAt != null) 'createdAt': createdAt,
        if (lastSeenAt != null) 'lastSeenAt': lastSeenAt,
      };
}
