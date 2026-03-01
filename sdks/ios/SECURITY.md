# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of RajutechieStreamKit seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue
- Discuss the vulnerability in public forums
- Exploit the vulnerability

### Please DO:

1. **Email us directly** at security@rajutechie-streamkit.io with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if available)

2. **Wait for our response** before disclosing the vulnerability publicly
   - We will acknowledge receipt within 48 hours
   - We will provide a detailed response within 7 days
   - We will keep you informed of our progress

3. **Give us reasonable time** to address the issue before public disclosure
   - We aim to release fixes within 30 days for critical issues
   - We will coordinate disclosure timing with you

## Security Best Practices

When using RajutechieStreamKit:

### API Keys and Tokens

- **Never commit** API keys or user tokens to version control
- Store sensitive credentials in environment variables or secure key storage
- Rotate tokens regularly
- Use different API keys for development and production

```swift
// ❌ Don't do this
let config = RajutechieStreamKitConfig(apiKey: "hardcoded-api-key")

// ✅ Do this
let config = RajutechieStreamKitConfig(
    apiKey: ProcessInfo.processInfo.environment["STREAMKIT_API_KEY"] ?? ""
)
```

### Secure Communication

- Always use HTTPS and WSS (WebSocket Secure) endpoints
- The SDK enforces secure connections by default
- Verify SSL certificates in production

### Token Management

- Implement token refresh logic in your app
- Clear tokens when users log out
- Use secure storage (Keychain on iOS/macOS) for tokens

```swift
// Disconnect and clear token on logout
await RajutechieStreamKit.shared.disconnect()
```

### Input Validation

- Validate and sanitize user inputs before sending
- Be cautious with message content that may contain scripts
- Implement rate limiting for API calls

### Error Handling

- Don't expose sensitive information in error messages to end users
- Log security-relevant errors securely
- Monitor for suspicious patterns

## Data Privacy

- RajutechieStreamKit processes data as specified in your API configuration
- Review the privacy policy of your RajutechieStreamKit backend
- Implement proper user consent for data collection
- Follow GDPR, CCPA, and other applicable regulations

## Regular Updates

- Keep RajutechieStreamKit updated to the latest version
- Subscribe to release notifications
- Review CHANGELOG.md for security-related updates

## Security Acknowledgments

We appreciate the security research community's efforts to improve the safety of our SDK. Researchers who responsibly disclose vulnerabilities will be acknowledged (with permission) in our security advisories.

## Contact

For security concerns: security@rajutechie-streamkit.io
For general support: support@rajutechie-streamkit.io

---

Last updated: March 1, 2026
