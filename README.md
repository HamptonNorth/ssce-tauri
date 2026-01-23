# SSCE Desktop - Simple Screen Capture Editor

A lightweight screen capture editor built as a native desktop application using Tauri. This is the desktop version of SSCE, providing the same powerful annotation tools with native file dialogs and no server required.

## What's Different from Web SSCE?

| Aspect | Web SSCE | SSCE Desktop |
|--------|----------|--------------|
| Runtime | Browser + Bun server | Native app (WebKitGTK/WebView) |
| File dialogs | Custom HTML dialog | Native OS dialogs |
| File I/O | HTTP API to server | Direct filesystem via Rust |
| Distribution | Run `bun server.js` | Standalone binary (~13MB) |
| Dependencies | Bun installed | None (self-contained) |

## Features

### Annotation Tools
- **Arrows & Lines** - Click and drag to draw with customizable colors and styles (solid, dashed, dotted)
- **Rectangles** - Draw rectangles with borders and fills, square or rounded corners, corner resize handles
- **Text** - Click to place text with size options (XS, SM, MD, LG)
- **Steps** - Numbered circled digits for tutorials
- **Symbols** - Insert emoji symbols with size scaling
- **Highlight** - Semi-transparent overlays for emphasis
- **Fade Edges** - Fade edges to transparent for seamless document embedding
- **Borders** - Add borders with customizable width, colour, and corner radius
- **Selection** - Move, resize, and edit existing annotations

### Property Cards
Each tool displays a slide-down settings panel with tool-specific options:
- **Arrow/Line** - Colour, line style, line width
- **Text/Steps** - Colour, size
- **Symbols** - Symbol grid selector, size
- **Rectangle** - Border/fill colour, line style, border width, corner style
- **Highlight** - Colour
- **Borders** - H/V width, colour (with transparent option), corner radius

### Layer Management
- **Multi-select** - Ctrl+click to select multiple layers
- **Layer ordering** - Send to front/back via right-click context menu
- **Flatten selected** - Merge multiple layers into single image
- **Visual feedback** - Blue bounding boxes show selected layers

### .ssce File Format (Non-Destructive Editing)
- **Save as .ssce** - Projects with layers preserved for later editing
- **Export as PNG/JPG** - Flatten and export when sharing
- **Edit File Info** - Add title, summary, initials, and dates
- **Snapshots** - Capture annotated states with notes for versioning
- **View Snapshots** - Browse, restore, or delete saved snapshots
- **Export Snapshot Viewer** - Generate shareable HTML with all snapshots

### Image Operations
- **Native file dialogs** - OS-native open/save dialogs
- **Combine images** - Paste or drop a second image and position it
- **Canvas resize** - Expand or shrink the canvas with anchor point selection
- **Undo/Redo** - Full history via layer system
- **Drag and drop** - Drop images directly onto the canvas
- **Print** - A4 output with portrait/landscape selection

## Requirements

### Build Requirements
- [Rust](https://rustup.rs/) toolchain
- Tauri CLI: `cargo install tauri-cli --version "^2"`

### Linux System Libraries
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel javascriptcoregtk4.1-devel libsoup3-devel
```

### Windows
No additional system libraries required.

## Installation

```bash
# Clone the repository
git clone https://github.com/HamptonNorth/ssce-tauri.git
cd ssce-tauri

# Build and run in development mode
cd src-tauri
cargo tauri dev

# Build for production
cargo tauri build
```

Production builds are output to `src-tauri/target/release/bundle/`.

## Configuration

### Environment Settings (.env)

Copy `.env.sample` to `.env` and edit to set default directories:

```bash
# Default directories for file dialogs
DEFAULT_PATH_IMAGE_LOAD=~/Pictures/screenshots
DEFAULT_PATH_IMAGE_SAVE=~/Pictures/edited
```

If not specified, defaults to user's home directory. The app also remembers the last-used directory during each session.

### UI Defaults (defaults.json)

Tool defaults (colours, symbols, line widths) are configured in `src/config/defaults.json`. This file is bundled with the application and loaded via Tauri command.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **File Operations** | |
| Ctrl+O | Open image |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+V | Paste from clipboard |
| Ctrl+C | Copy to clipboard |
| Ctrl+P | Print |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| **Tool Selection** | |
| V | Select tool |
| A | Arrow tool |
| L | Line tool |
| R | Rectangle tool |
| T | Text tool |
| N | Steps tool |
| Y | Symbols tool |
| H | Highlight tool |
| C | Combine tool |
| F | Fade Edges tool |
| Escape | Deselect tool |
| **Layer Operations** | |
| Ctrl+Click | Add/remove layer from selection |
| Delete | Delete selected layer(s) |
| Right-click | Show context menu |
| **Movement** | |
| Arrow keys | Move selected 10px |
| Ctrl+Arrow | Move selected 1px |
| Shift (while drawing) | Snap to horizontal/vertical |

## Project Structure

```
ssce-tauri/
├── src/                      # Frontend (vanilla JS + HTML5 Canvas)
│   ├── index.html            # Main application
│   ├── config/
│   │   └── defaults.json     # UI configuration (bundled with app)
│   ├── js/
│   │   ├── app.js            # Application coordinator
│   │   ├── tauri-bridge.js   # Tauri API abstraction
│   │   ├── file-operations.js # File open/save via native dialogs
│   │   ├── canvas.js         # Canvas rendering
│   │   ├── layers.js         # Layer management
│   │   ├── tools/            # Drawing tools
│   │   ├── ui/               # UI components
│   │   └── utils/            # Utilities (config.js, colours.js)
│   └── css/                  # Stylesheets
├── src-tauri/                # Tauri/Rust backend
│   ├── Cargo.toml            # Rust dependencies
│   ├── tauri.conf.json       # Tauri configuration
│   ├── build.rs              # Build script (git hash)
│   ├── capabilities/         # Security permissions
│   └── src/
│       └── main.rs           # Rust commands for file I/O
├── .env.sample               # Environment config template
├── build-and-install.sh      # Build script for local installation
├── CLAUDE.md                 # Development guidance
├── HISTORY.md                # Development history
├── MIGRATION_TO_TAURI.md     # Migration notes from web version
└── CHEAT_SHEET.md            # Common Tauri commands
```

## Development

### Frontend Changes
- Edit files in `src/` directly
- Hot reload in dev mode (Ctrl+R to refresh WebView)
- No build step required for JavaScript

### Backend Changes
- Edit Rust files in `src-tauri/src/`
- Tauri dev server auto-rebuilds on save
- Use `cargo check` to verify before running

### Debugging
- **Frontend**: Right-click > Inspect to open DevTools
- **Backend**: `println!` macros output to terminal
- **Stack traces**: `RUST_BACKTRACE=1 cargo tauri dev`

## Tauri Commands (Rust Backend)

The Rust backend provides these commands callable from JavaScript:

| Command | Purpose |
|---------|---------|
| `browse_directory` | List files in a directory with filtering |
| `load_image` | Load image file as base64 data URL |
| `save_image` | Save base64 image data to file |
| `load_ssce` | Load .ssce JSON file |
| `save_ssce` | Save .ssce JSON file |
| `file_exists` | Check if a file exists |
| `get_home_dir` | Get user's home directory |
| `get_downloads_dir` | Get user's downloads directory |
| `get_defaults_config` | Load UI configuration from defaults.json |
| `get_env_config` | Load environment settings (.env paths, git hash) |

## Licence

MIT

## Credits

Based on [SSCE (Simple Screen Capture Editor)](https://github.com/HamptonNorth/ssce) - the web-based version running on Bun.
