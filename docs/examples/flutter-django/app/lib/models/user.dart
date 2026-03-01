class AppUser {
  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;

  AppUser({
    required this.id,
    required this.username,
    required this.displayName,
    this.avatarUrl,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName:
            json['display_name'] as String? ?? json['username'] as String,
        avatarUrl: json['avatar_url'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'display_name': displayName,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
      };
}
