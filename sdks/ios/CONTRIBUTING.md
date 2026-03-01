# Contributing to RajutechieStreamKit

Thank you for your interest in contributing to RajutechieStreamKit! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (iOS/macOS version, Xcode version, SDK version)
- Code samples or screenshots if applicable

### Suggesting Enhancements

We welcome feature requests! Please create an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Use cases and examples
- Any potential implementation ideas

### Pull Requests

1. **Fork the repository** and create your branch from `main`

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
   - Write clear, concise commit messages
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

```bash
swift test
```

4. **Run SwiftFormat** (if available)

```bash
swift package plugin --allow-writing-to-package-directory swiftformat .
```

5. **Commit your changes**

```bash
git commit -m "Add feature: your feature description"
```

6. **Push to your fork**

```bash
git push origin feature/your-feature-name
```

7. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all CI checks pass

## Code Style Guidelines

- Use Swift's standard naming conventions
- Follow Swift API Design Guidelines
- Use meaningful variable and function names
- Add documentation comments to public APIs
- Keep functions focused and concise
- Prefer Swift Concurrency (async/await) over completion handlers

### Example of well-documented code:

```swift
/// Sends a message to a specific channel.
///
/// - Parameters:
///   - channelId: The unique identifier of the channel
///   - message: The message content to send
/// - Returns: The sent message with server-assigned metadata
/// - Throws: `RajutechieStreamKitError` if the request fails
public func send(to channelId: String, message: SendMessageInput) async throws -> Message {
    let result: Message = try await http.post("/channels/\(channelId)/messages", body: message)
    return result
}
```

## Development Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/RajutechieStreamKit.git
cd RajutechieStreamKit
```

2. Open in Xcode

```bash
open Package.swift
```

3. Build the project

```bash
swift build
```

4. Run tests

```bash
swift test
```

## Project Structure

```
RajutechieStreamKit/
├── Sources/
│   └── RajutechieStreamKit/
│       ├── StreamKit.swift          # Main SDK entry point
│       ├── HTTPClient.swift         # HTTP networking
│       ├── WebSocketClient.swift    # WebSocket client
│       └── Modules/
│           ├── ChatModule.swift     # Chat functionality
│           ├── CallModule.swift     # Call functionality
│           ├── MeetingModule.swift  # Meeting functionality
│           └── StreamModule.swift   # Streaming functionality
├── Tests/
│   └── RajutechieStreamKitTests/
│       └── ... test files
├── Package.swift
└── README.md
```

## Testing

- Write unit tests for new functionality
- Ensure existing tests still pass
- Aim for good test coverage
- Use meaningful test names

Example test:

```swift
import Testing
@testable import RajutechieStreamKit

@Suite("Chat Module Tests")
struct ChatModuleTests {
    
    @Test("Sending a text message")
    func sendTextMessage() async throws {
        // Arrange
        let sdk = setupTestSDK()
        
        // Act
        let message = try await sdk.chat.send(
            to: "channel-123",
            message: .text("Hello")
        )
        
        // Assert
        #expect(message.content.text == "Hello")
    }
}
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

- `feat: Add support for message reactions`
- `fix: Resolve connection timeout issue`
- `docs: Update README with new examples`
- `test: Add tests for call module`
- `refactor: Simplify HTTPClient error handling`
- `perf: Optimize WebSocket reconnection logic`

## Code Review Process

1. All submissions require review
2. Maintainers will review your PR and may request changes
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release

## Community

- Be respectful and constructive
- Help others when possible
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

## Questions?

If you have questions, feel free to:

- Open a discussion on GitHub
- Reach out to the maintainers
- Check existing issues and discussions

Thank you for contributing to RajutechieStreamKit! 🎉
