# Changelog

All notable changes to RajutechieStreamKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Push notification support
- Offline message queue
- Message encryption
- Video call recording playback
- Advanced analytics

## [1.0.0] - 2026-03-01

### Added
- Initial release of RajutechieStreamKit
- **Chat Module**
  - Create group and direct message channels
  - Send and receive real-time messages
  - Message editing and deletion
  - Emoji reactions
  - Typing indicators
  - Message attachments support
  - Paginated message history
- **Call Module**
  - Video and audio calls
  - Accept and reject calls
  - Audio/video toggle controls
  - Camera switching
  - Screen sharing
  - Call recording
  - Real-time call statistics
  - AsyncStream for incoming calls
- **Meeting Module**
  - Schedule meetings with configurable duration
  - Join meetings by ID or code
  - Participant management (mute, remove)
  - Hand raising feature
  - Real-time polls with voting
  - Breakout rooms
  - AsyncStream for participant events
  - AsyncStream for poll updates
- **Stream Module**
  - Create live streams
  - Start and stop streaming
  - HLS stream URLs
  - Viewer count tracking
- **Core Features**
  - Swift Concurrency (async/await) throughout
  - Actor-based thread safety
  - Region selection (US East, US West, EU West, AP Southeast)
  - Custom API and WebSocket endpoints
  - Comprehensive error handling
  - WebSocket-based real-time events
  - HTTP client with automatic token management
- **Platform Support**
  - iOS 15.0+
  - macOS 13.0+
- **Testing**
  - Unit tests for all public APIs
  - Configuration tests
  - Model tests
  - Error handling tests

### Technical Details
- Built with Swift 5.9
- Uses Swift Package Manager
- Leverages Swift Concurrency and Actors
- RESTful API integration
- WebSocket for real-time communication

[Unreleased]: https://github.com/yourusername/RajutechieStreamKit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/RajutechieStreamKit/releases/tag/v1.0.0
