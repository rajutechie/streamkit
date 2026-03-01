import 'package:flutter/material.dart';

import 'online_indicator.dart';

class UserAvatar extends StatelessWidget {
  final String name;
  final double radius;
  final bool isOnline;

  const UserAvatar({
    super.key,
    required this.name,
    this.radius = 20,
    this.isOnline = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    final avatar = CircleAvatar(
      radius: radius,
      backgroundColor: theme.colorScheme.primaryContainer,
      child: Text(
        initial,
        style: TextStyle(
          fontSize: radius * 0.8,
          fontWeight: FontWeight.w600,
          color: theme.colorScheme.onPrimaryContainer,
        ),
      ),
    );

    if (!isOnline) return avatar;

    return Stack(
      children: [
        avatar,
        Positioned(
          right: 0,
          bottom: 0,
          child: OnlineIndicator(isOnline: isOnline),
        ),
      ],
    );
  }
}
