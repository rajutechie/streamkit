# Changelog

All notable changes to RajutechieStreamKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Enhanced error handling with custom error types
- Offline message queue
- Push notification support
- File upload/download for chat attachments

## [1.0.0] - 2026-03-01

### Added
- Initial release of RajutechieStreamKit
- Chat Module
  - Channel creation (group and direct)
  - Send/receive messages in real-time
  - Message editing and deletion
  - Emoji reactions
  - Typing indicators
  - Message history with pagination
- Call Module
  - Start video/audio calls
  - Accept/reject incoming calls
  - Toggle audio and video
  - Switch camera
  - Screen sharing
  - Call recording
  - Real-time call statistics
  - Incoming calls async stream
- Meeting Module
  - Schedule meetings
  - Join meetings by ID or code
  - Participant management (mute, remove)
  - Raise/lower hand
  - Create and vote on polls
  - Breakout rooms
  - Real-time participant and poll observation
- Stream Module
  - Create live streams
  - Start/stop streaming
  - HLS playback URL generation
  - Viewer count tracking
- Core Features
  - Configurable API and WebSocket endpoints
  - Regional server support
  - Actor-based concurrency for thread safety
  - Connection state management
  - Automatic token management

### Technical Details
- Minimum iOS 15.0 / macOS 13.0
- Built with Swift 5.9
- Swift Concurrency (async/await, actors)
- Modern Swift API design

[Unreleased]: https://github.com/yourusername/RajutechieStreamKit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/RajutechieStreamKit/releases/tag/v1.0.0
