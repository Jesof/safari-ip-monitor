# 🔒 Safari IP Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS%2011.5%2B-blue.svg)](https://www.apple.com/macos/)
[![Swift](https://img.shields.io/badge/Swift-5.0-orange.svg)](https://swift.org)
[![GitHub release](https://img.shields.io/github/v/release/Jesof/safari-ip-monitor)](https://github.com/Jesof/safari-ip-monitor/releases)

A Safari extension for macOS that monitors network connections, displays security information, and checks IPv6 support for visited websites.

<img src="Safari IP Monitor Extension/Resources/images/icon-128.png" alt="Safari IP Monitor Icon" width="128" height="128">

## ✨ Features

- **Real-time Network Monitoring** - Tracks all network requests from web pages
- **Security Status** - Shows HTTPS/HTTP connection status with visual indicators
- **IPv6 Support Detection** - Checks and displays IPv6 availability for domains
- **DNS Resolution** - Resolves domain IP addresses (IPv4 and IPv6) via DNS-over-HTTPS
- **Privacy-Focused** - Local domains (.local, .home, .lan, .lab, .internal) are never sent to external DNS services
- **Background Operation** - Host app runs invisibly, only Safari extension is visible
- **Multilingual** - Supports Russian and English localization

## 🖼️ Screenshots

The extension displays:
- Domain names with request counts
- Connection security (🔒 HTTPS or ⚠️ HTTP)
- Resolved IP addresses (IPv4 and IPv6)
- Special marking for the main domain
- Privacy notice for local domains

## 🚀 Installation

### Requirements
- macOS 11.5 or later
- Xcode 15.0 or later
- Apple Developer account (for code signing)

### Build from Source

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Jesof/safari-ip-monitor.git
   cd safari-ip-monitor
   ```

2. **Open in Xcode:**
   ```bash
   open "Safari IP Monitor.xcodeproj"
   ```

3. **Configure Code Signing:**
   - Select the project in Xcode navigator
   - Go to "Signing & Capabilities" tab
   - Set your Development Team for both targets:
     - Safari IP Monitor
     - Safari IP Monitor Extension

4. **Build and Run:**
   - Press `Cmd+B` to build
   - Press `Cmd+R` to run
   - The app will launch and automatically close (this is by design)
   - The extension will be registered with Safari

5. **Enable in Safari:**
   - Open Safari → Settings → Extensions
   - Enable "Safari IP Monitor"
   - Grant necessary permissions

## 🔧 Configuration

### Privacy Settings

The extension automatically protects privacy for local domains:
- `.local` - mDNS/Bonjour domains
- `.home` - Home network domains
- `.lan` - Local area network domains
- `.lab` - Lab/testing environment domains
- `.internal` - Internal corporate domains
- Private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Link-local addresses (169.254.0.0/16, fe80::/10)

These domains are **never** sent to external DNS-over-HTTPS services.

### DNS Resolution

- Toggle DNS resolution on/off in the extension popup
- Uses Google DNS-over-HTTPS (dns.google) for public domains
- Results are cached for 5 minutes to reduce queries

## 🏗️ Project Structure

```
Safari IP Monitor/
├── Safari IP Monitor/              # Host application
│   ├── AppDelegate.swift           # App lifecycle (auto-close)
│   ├── ViewController.swift        # Main window (minimal UI)
│   └── Assets.xcassets/           # App icons and resources
├── Safari IP Monitor Extension/    # Safari Web Extension
│   ├── SafariWebExtensionHandler.swift  # Native messaging bridge
│   └── Resources/
│       ├── manifest.json          # Extension manifest
│       ├── background.js          # Service worker (network monitoring)
│       ├── content.js             # Content script (WebRTC IP detection)
│       ├── popup.html/js/css      # Extension popup UI
│       └── _locales/              # Localization files
└── Safari IP Monitor.xcodeproj/   # Xcode project
```

## 🛠️ Development

### Key Technologies

- **Swift** - Native macOS application
- **JavaScript** - Web extension logic
- **WebRequest API** - Network monitoring
- **WebRTC** - Public IP detection
- **DNS-over-HTTPS** - Secure DNS resolution

### Extension Architecture

1. **Background Service Worker** (`background.js`)
   - Monitors `webRequest.onBeforeRequest` events
   - Tracks domains and connection security
   - Manages DNS resolution and caching
   - Filters local domains for privacy

2. **Content Script** (`content.js`)
   - Detects user's public IP via WebRTC STUN
   - Runs on all pages
   - Communicates with background worker

3. **Popup UI** (`popup.js`)
   - Displays collected data in a table
   - Shows statistics and security status
   - Allows toggling DNS resolution

## 🔒 Security & Privacy

- **No telemetry** - No data is sent to any servers except DNS-over-HTTPS for public domains
- **Local processing** - All data stays on your device
- **Code signing** - Application is properly signed with Apple Developer certificate
- **Sandboxed** - Runs in macOS App Sandbox with minimal permissions
- **Private domains protected** - Local network information never leaves your machine

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Safari on macOS may not expose all `webRequest` events (e.g., font requests might not be visible in some cases)
- DNS-over-HTTPS queries are limited to Google DNS (future versions may support other providers)

## 📋 TODO

- [ ] Add support for multiple DNS-over-HTTPS providers
- [ ] Implement export functionality for collected data
- [ ] Add filtering by domain/protocol in popup
- [ ] Dark mode support for popup UI
- [ ] Statistics and charts

## 👤 Author

**Jesof**
- GitHub: [@Jesof](https://github.com/Jesof)

## ⭐ Show your support

Give a ⭐️ if this project helped you!

---

**Note:** This extension requires an Apple Developer certificate to run. If you don't have one, you can sign up for the [Apple Developer Program](https://developer.apple.com/programs/).
