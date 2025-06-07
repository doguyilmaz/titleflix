# 🎬 Titleflix

A Chrome extension that changes Netflix tab titles to include the content you're watching, making bookmarks more useful!

## Features

- 🎭 **Smart Title Detection**: Automatically detects what you're watching on Netflix
- 📝 **Meaningful Titles**: Changes generic "Netflix" titles to include movie/show names
- 🔖 **Better Bookmarks**: Makes your Netflix bookmarks actually useful
- 🛡️ **Safe & Secure**: Only runs on Netflix domains
- ⚡ **Fast & Lightweight**: Built with TypeScript and modern web standards

## Installation

### Development Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the extension:
   ```bash
   bun run build
   ```

### Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. The extension is now installed!

## Usage

Once installed, the extension automatically works on Netflix:

- **🏠 Browse pages**: "🏠 Netflix - Browse"
- **🔍 Search pages**: "🔍 Search: your query"
- **🎬 Title pages**: "🎬 Movie/Show Name"
- **▶️ Watching**: "▶️ Currently Playing Title"

## Development

- **Build**: `bun run build`
- **Watch mode**: `bun run dev`
- **Clean**: `bun run clean`

## Technology

- TypeScript
- Chrome Manifest V3
- Bun for package management and building
