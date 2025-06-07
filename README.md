# 🎬 Titleflix

> Transform your Netflix browsing experience with meaningful tab titles and better bookmarks!

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chromewebstore.google.com/detail/titleflix)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Author](https://img.shields.io/badge/Author-Dogu%20Yilmaz-blue)](https://doguyilmaz.com)

## ✨ What is Titleflix?

Titleflix is a Chrome extension that automatically changes Netflix tab titles to include the actual content you're watching. No more generic "Netflix" tabs - now your bookmarks will show exactly what movie or episode you were watching!

### 🎯 The Problem
When you bookmark Netflix pages, they all show up as "Netflix" in your bookmarks bar, making it impossible to know what you were watching.

### 💡 The Solution
Titleflix automatically detects what you're watching and updates the tab title to something meaningful like:
- `Devil May Cry: E1 Inferno - Netflix`
- `Cyberpunk: Edgerunners: E1 Let You Down - Netflix`
- `Love, Death & Robots: Close Encounters of the Mini Kind - Netflix`

## 🚀 Features

- **🎭 Smart Content Detection**: Automatically identifies movies, TV shows, and episodes
- **📝 Meaningful Tab Titles**: Shows actual content names instead of generic "Netflix"
- **🔖 Better Bookmarks**: Makes Netflix bookmarks actually useful
- **🎨 Dynamic Icons**: Dark/light theme support with adaptive icons
- **⚙️ Easy Controls**: Simple on/off toggle with theme preferences
- **🛡️ Privacy-Focused**: Only runs on Netflix domains, no data collection ([Privacy Policy](PRIVACY_POLICY.md))
- **⚡ Lightweight**: Minimal performance impact
- **🌐 Universal**: Works on all Netflix regions and languages

## 📸 Screenshots

### Before Titleflix
```
🔖 Netflix
🔖 Netflix  
🔖 Netflix (What were these?! 😤)
```

### After Titleflix
```
🔖 Devil May Cry: E1 Inferno - Netflix
🔖 Cyberpunk: Edgerunners: E1 Let You Down - Netflix  
🔖 Kuroko's Basketball: E26 It is the Best Present - Netflix (Much better! 🎉)
```

## 🛠️ Installation

### Option 1: Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/titleflix)
2. Click "Add to Chrome"
3. Enjoy better Netflix bookmarks!

### Option 2: Development Installation
1. Download or clone this repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the extension:
   ```bash
   bun run build
   ```
4. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 🎮 How to Use

1. **Install the extension** (see above)
2. **Navigate to Netflix** - The extension only works on Netflix domains
3. **Browse or watch content** - Tab titles will automatically update
4. **Bookmark away!** - Your bookmarks now have meaningful names

### Extension Settings
Click the Titleflix icon in your Chrome toolbar to access:
- **Enable/Disable toggle** (only works on Netflix)
- **Theme selection** (Auto, Light, Dark)
- **Current status** display

## 🎨 Theme Support

Titleflix adapts to your preferences:
- **Auto**: Matches your system's dark/light mode
- **Light**: Uses light icons for light themes
- **Dark**: Uses dark icons for dark themes

Icons automatically switch when you change themes!

## 🧑‍💻 Development

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- TypeScript knowledge

### Setup
```bash
# Clone the repository
git clone https://github.com/doguyilmaz/titleflix.git
cd titleflix

# Install dependencies
bun install

# Start development
bun run dev
```

### Scripts
- `bun run build` - Build the extension
- `bun run dev` - Watch mode for development
- `bun run package` - Create zip file for Chrome Web Store
- `bun run clean` - Clean build files
- `bun run lint` - Type check

### Project Structure
```
titleflix/
├── src/
│   ├── content.ts      # Main content script
│   ├── background.ts   # Service worker
│   ├── popup.ts        # Popup functionality
│   └── popup.html      # Popup interface
├── icons/              # Extension icons
├── dist/               # Built extension
└── manifest.json       # Extension manifest
```

## 🔧 Technical Details

- **Manifest Version**: V3 (latest Chrome extension standard)
- **Permissions**: `activeTab`, `storage` (minimal permissions)
- **Host Permissions**: `*://*.netflix.com/*` (Netflix only)
- **Architecture**: Content script + Service worker + Popup
- **Languages**: TypeScript, HTML, CSS

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Ideas for Contributions
- Support for other streaming platforms
- Additional title formatting options
- Internationalization
- Performance improvements

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please [open an issue](https://github.com/doguyilmaz/titleflix/issues) with:
- Clear description of the issue/feature
- Steps to reproduce (for bugs)
- Screenshots if applicable
- Your Chrome and extension version

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Privacy

Titleflix is built with privacy as a core principle. We don't collect any data - see our [Privacy Policy](PRIVACY_POLICY.md) for complete details.

## 🙏 Acknowledgments

- Thanks to the Chrome Extensions community for documentation and examples
- Netflix for providing a great streaming platform to enhance
- All users who provide feedback and suggestions

## 👨‍💻 Author

**Dogu Yilmaz**
- Website: [doguyilmaz.com](https://doguyilmaz.com)
- GitHub: [@doguyilmaz](https://github.com/doguyilmaz)
- Email: hello@doguyilmaz.com

## ⭐ Show Your Support

If Titleflix makes your Netflix experience better, please:
- ⭐ Star this repository
- 📝 Leave a review on the Chrome Web Store
- 🐦 Share with friends who love Netflix
- 💝 Consider supporting the project

---

<div align="center">
  <strong>Made with ❤️ for Netflix enthusiasts</strong>
  <br>
  <sub>Titleflix - Because every bookmark deserves a meaningful name!</sub>
</div>
