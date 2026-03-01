# Publishing Guide for RajutechieStreamKit

This guide walks you through publishing your SDK to GitHub and making it available to developers.

## Prerequisites

- [ ] Git repository initialized
- [ ] All code committed
- [ ] Tests passing (`swift test`)
- [ ] Documentation complete
- [ ] GitHub account ready

## Step-by-Step Publishing Process

### 1. Prepare Your Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial release v1.0.0"
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `RajutechieStreamKit`
3. Description: "A modern Swift SDK for real-time communication and streaming"
4. Choose Public (for open source) or Private
5. **Don't** initialize with README (you already have one)
6. Click "Create repository"

### 3. Push to GitHub

```bash
# Add GitHub as remote (replace with your GitHub username)
git remote add origin https://github.com/yourusername/RajutechieStreamKit.git

# Push to main branch
git branch -M main
git push -u origin main
```

### 4. Create Release Tags

```bash
# Create a version tag
git tag -a 1.0.0 -m "Release version 1.0.0"

# Push the tag
git push origin 1.0.0
```

### 5. Create GitHub Release

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Click "Choose a tag" → Select `1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Description (copy from CHANGELOG.md):

```markdown
## 🎉 Initial Release

RajutechieStreamKit v1.0.0 is now available!

### Features

- 💬 **Chat Module** - Real-time messaging with channels, reactions, and typing indicators
- 📞 **Call Module** - Video/audio calling with screen sharing and recording
- 👥 **Meeting Module** - Virtual meetings with polls and breakout rooms
- 📺 **Stream Module** - Live streaming with HLS support

### Installation

#### Swift Package Manager

Add to your `Package.swift`:

\`\`\`swift
dependencies: [
    .package(url: "https://github.com/yourusername/RajutechieStreamKit", from: "1.0.0")
]
\`\`\`

Or in Xcode:
1. File → Add Package Dependencies
2. Enter: `https://github.com/yourusername/RajutechieStreamKit`
3. Select version 1.0.0

### Requirements

- iOS 15.0+ / macOS 13.0+
- Swift 5.9+
- Xcode 15.0+

### Documentation

See [README.md](https://github.com/yourusername/RajutechieStreamKit/blob/main/README.md) for complete documentation.
```

6. Click "Publish release"

### 6. Verify Swift Package

Test that others can add your package:

```bash
# Create a test project
mkdir TestProject
cd TestProject
swift package init --type executable

# Try adding your package to Package.swift
```

Add this to Package.swift:
```swift
dependencies: [
    .package(url: "https://github.com/yourusername/RajutechieStreamKit", from: "1.0.0")
]
```

Then run:
```bash
swift package resolve
swift build
```

### 7. Submit to Swift Package Index (Optional)

1. Go to https://swiftpackageindex.com/add-a-package
2. Enter your GitHub repository URL
3. The index will validate and list your package automatically

### 8. Enable GitHub Features

#### Enable Discussions
1. Go to Settings → General → Features
2. Check "Discussions"
3. Use for Q&A and community support

#### Set up Branch Protection
1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - Require pull request reviews
   - Require status checks to pass
   - Require linear history

#### Add Topics
1. Go to your repository homepage
2. Click the gear icon next to "About"
3. Add topics:
   - `swift`
   - `swift-package`
   - `ios`
   - `macos`
   - `real-time`
   - `chat`
   - `video-call`
   - `streaming`

### 9. Promote Your SDK

#### Update Repository Description
Add to the "About" section:
- Description: "A modern Swift SDK for real-time communication and streaming"
- Website: Your documentation URL
- Topics: (as listed above)

#### Social Media
- Announce on Twitter/X
- Post on Reddit (r/swift, r/iOSProgramming)
- Share on LinkedIn
- Write a blog post

#### Community
- Share in Swift forums
- Post on dev.to or Medium
- Submit to iOS Dev Weekly newsletter

### 10. CocoaPods Publishing (Optional)

If you created the `.podspec`:

```bash
# Register with CocoaPods Trunk (first time only)
pod trunk register your-email@example.com 'Your Name'

# Validate the podspec
pod spec lint RajutechieStreamKit.podspec

# Publish to CocoaPods
pod trunk push RajutechieStreamKit.podspec
```

## Post-Release Checklist

- [ ] GitHub repository created and pushed
- [ ] Version 1.0.0 tagged
- [ ] GitHub Release published
- [ ] Package resolution tested
- [ ] README.md displays correctly on GitHub
- [ ] CI/CD workflows running (if set up)
- [ ] Swift Package Index submission (optional)
- [ ] CocoaPods publication (optional)
- [ ] Social media announcements
- [ ] Documentation site live (if applicable)

## Future Releases

For subsequent releases:

```bash
# Make your changes and commit
git add .
git commit -m "Add new feature"

# Update version in:
# - Package.swift (if versioned there)
# - RajutechieStreamKit.podspec (if using CocoaPods)
# - CHANGELOG.md

# Create new tag
git tag -a 1.1.0 -m "Release version 1.1.0"

# Push changes and tag
git push origin main
git push origin 1.1.0

# Create GitHub Release for 1.1.0
```

## Versioning Strategy

Follow Semantic Versioning (semver):

- **MAJOR** (x.0.0): Breaking API changes
  - Example: Renaming public methods, removing features
  
- **MINOR** (1.x.0): New features, backwards compatible
  - Example: Adding new modules, new methods
  
- **PATCH** (1.0.x): Bug fixes, backwards compatible
  - Example: Fixing crashes, correcting behavior

## Support and Maintenance

- Monitor GitHub Issues daily
- Respond to pull requests within 1 week
- Update dependencies regularly
- Keep CI/CD green
- Update documentation as needed

## Questions?

If you encounter issues during publishing:
1. Check GitHub's documentation: https://docs.github.com
2. Review Swift Package Manager guide: https://swift.org/package-manager/
3. Open an issue in this repository

---

Good luck with your SDK launch! 🚀
