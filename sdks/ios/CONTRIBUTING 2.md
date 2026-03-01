# Contributing to RajutechieStreamKit

Thank you for your interest in contributing to RajutechieStreamKit! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Swift version, platform (iOS/macOS), and SDK version
6. Code samples or screenshots if applicable

### Suggesting Enhancements

We love new ideas! To suggest an enhancement:

1. Check if the enhancement has already been suggested
2. Create an issue with a clear description of the feature
3. Explain why this enhancement would be useful
4. Provide examples of how it would work

### Pull Requests

1. **Fork the repository** and create your branch from `main`
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Write clear, concise code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Ensure tests pass**
   ```bash
   swift test
   ```

4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
   
   Follow these commit message guidelines:
   - Use the present tense ("Add feature" not "Added feature")
   - Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
   - Limit the first line to 72 characters
   - Reference issues and pull requests after the first line

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure CI checks pass

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

## Code Style

- Follow [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- Use 4 spaces for indentation (no tabs)
- Maximum line length: 120 characters
- Use meaningful variable and function names
- Add documentation comments for public APIs

Example:
```swift
/// Sends a message to the specified channel.
///
/// - Parameters:
///   - channelId: The unique identifier of the channel
///   - message: The message input containing text and optional attachments
/// - Returns: The sent message with server-generated metadata
/// - Throws: `RajutechieStreamKitError` if the request fails
public func send(to channelId: String, message: SendMessageInput) async throws -> Message {
    // Implementation
}
```

## Testing Guidelines

- Write tests for all new features
- Ensure existing tests pass
- Aim for high code coverage
- Use descriptive test names

Example:
```swift
@Test("Sending a text message creates a valid message")
func sendTextMessage() async throws {
    // Arrange
    let input = SendMessageInput.text("Hello, world!")
    
    // Act
    // Test implementation
    
    // Assert
    #expect(/* condition */)
}
```

## Documentation

- Update README.md for user-facing changes
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)
- Add DocC documentation comments for public APIs
- Include code examples in documentation

## Review Process

1. All submissions require review
2. We may suggest changes or improvements
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release

## Release Process

1. Version numbers follow [Semantic Versioning](https://semver.org/)
   - MAJOR version for incompatible API changes
   - MINOR version for backwards-compatible functionality
   - PATCH version for backwards-compatible bug fixes

2. Releases are tagged and published to GitHub
3. CHANGELOG.md is updated with release notes

## Questions?

Feel free to:
- Open an issue for questions
- Reach out to maintainers
- Join our community discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to RajutechieStreamKit! 🎉
