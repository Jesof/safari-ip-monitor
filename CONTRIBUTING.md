# Contributing to Safari IP Monitor

Thank you for your interest in contributing to Safari IP Monitor! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- macOS 11.5 or later
- Xcode 15.0 or later
- Apple Developer account (free or paid)

### Setting Up Development Environment

1. **Fork and clone the repository:**
   ```bash
   git clone git@github.com:YOUR_USERNAME/safari-ip-monitor.git
   cd safari-ip-monitor
   ```

2. **Open in Xcode:**
   ```bash
   open "Safari IP Monitor.xcodeproj"
   ```

3. **Configure Your Development Team:**
   
   ⚠️ **Important:** You must set your own Apple Developer Team ID before building.
   
   - In Xcode, select the project in the navigator
   - Select both targets: "Safari IP Monitor" and "Safari IP Monitor Extension"
   - In "Signing & Capabilities" tab, select your Team from the dropdown
   - Xcode will automatically update `DEVELOPMENT_TEAM` in the project file

4. **Build and test:**
   ```bash
   # Build
   xcodebuild -project "Safari IP Monitor.xcodeproj" -scheme "Safari IP Monitor" -configuration Debug build
   
   # Or use Xcode
   # Press Cmd+B to build
   # Press Cmd+R to run
   ```

## 📝 Code Style

### Swift
- Follow [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- Use 4 spaces for indentation
- Add comments for complex logic

### JavaScript
- Use modern ES6+ syntax
- Prefer `const` and `let` over `var`
- Use meaningful variable names
- Add JSDoc comments for functions

### Git Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests

Example:
```
Add IPv6 support detection feature

- Implement DNS AAAA record lookup
- Add UI indicator for IPv6 availability
- Update tests for new functionality

Closes #123
```

## 🔒 Security & Privacy

When contributing, please ensure:

1. **No sensitive data in commits:**
   - Do not commit personal Apple Developer Team IDs
   - Do not commit certificates or provisioning profiles
   - Do not commit API keys or tokens

2. **Privacy protection:**
   - Local domains must never be sent to external services
   - User data should remain on device
   - Follow Apple's privacy guidelines

3. **Code signing:**
   - Never commit signed binaries (`build/` directory is gitignored)
   - Each developer signs with their own certificate

## 🧪 Testing

Before submitting a PR:

1. Test on a clean Safari installation
2. Verify extension loads and functions correctly
3. Check for console errors in Safari Web Inspector
4. Test with both IPv4 and IPv6 domains
5. Verify local domain privacy protection

## 📋 Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clear, concise code
   - Add comments where necessary
   - Update documentation if needed

3. **Test thoroughly:**
   - Build succeeds without errors
   - Extension functions as expected
   - No regressions in existing features

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add your descriptive commit message"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request:**
   - Provide a clear description of changes
   - Link related issues
   - Add screenshots if UI changes
   - Request review from maintainers

## 🐛 Reporting Bugs

When reporting bugs, please include:

- macOS version
- Safari version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Console logs (from Safari Web Inspector)

## 💡 Feature Requests

We welcome feature requests! Please:

- Check if the feature already exists
- Explain the use case
- Describe the expected behavior
- Consider implementation complexity

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

Feel free to open an issue with your question or reach out to the maintainers.

---

Thank you for contributing to Safari IP Monitor! 🎉
