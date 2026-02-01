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
- **Fill** - Fill transparent rectangular areas with selected colour (preview before confirm)
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
- **Snapshots** - Capture annotated states with notes for versioning (Alt+S)
- **Snapshot reminder** - Prompts to take snapshot after configurable number of edits
- **Undo to snapshots** - When undo stack empty, Undo/Redo navigate through snapshots
- **View Snapshots** - Browse, restore, or delete saved snapshots
- **Export Snapshot Viewer** - Generate shareable HTML with all snapshots

### Library & Search (v1.2.0)
- **Recent Files** - Quick access to recently opened .ssce files with thumbnails (Ctrl+R)
- **Search Library** - Full-text search across all .ssce files (Ctrl+Shift+F)
- **FTS5 indexing** - Search by filename, title, summary, keywords with prefix matching
- **Date filtering** - Find files modified within a date range
- **Locale-aware dates** - Auto-detects UK (dd/mm) vs US (mm/dd) date format
- **Rebuild from Library** - Re-index all files if library is incomplete
- **SQLite database** - Persistent library stored in user config directory

### Bulk Export & Backup
- **Export as images** - Batch convert .ssce files to PNG/JPEG with date filtering, auto format detection, optional snapshot export, output to folder or ZIP archive
- **Backup .ssce files** - Bundle raw .ssce files into a ZIP archive for portable backup
- **Date filtering** - Filter by all files, this month, last month, custom date range, or selected months
- **ZIP archives** - Timestamped filenames, optional organize-by-month subfolders
- **Progress tracking** - Progress bar with file-by-file status during export/backup
- **Keyboard shortcut** - Ctrl+Shift+E opens the Bulk Export / Backup dialog

### Image Operations
- **Native file dialogs** - OS-native open/save dialogs
- **Combine images** - Paste or drop a second image and position it
- **Canvas resize** - Expand or shrink via drag handles (8 handles: corners + edges) or anchor point dialog
- **Undo/Redo** - Full history via layer system
- **Drag and drop** - Drop images directly onto the canvas
- **Print** - A4 output with portrait/landscape selection

### Desktop Integration
- **System tray** - App minimizes to tray when closed, click to restore
- **Single instance** - Opening a file reuses the running instance instead of launching a new one
- **Open with file** - Supports file association (`ssce-desktop /path/to/file.png`)
- **About dialog** - System info with copy to clipboard (via gear dropdown menu)
- **Loading spinner** - Visual feedback during file operations
- **Native clipboard** - Copy/paste images to system clipboard
- **Canvas background toggle** - Right-click background to switch light/dark for better contrast with dark images

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

All settings are configured via the Settings UI (gear icon in toolbar) or by editing `defaults.json`.

### Application Settings (defaults.json)

All settings are in `src/config/defaults.json`, which is bundled with the application:
- **File paths** - Default directories for Open/Save dialogs (supports `~` for home)
- **Tool defaults** - Colours, line styles, sizes for each tool
- **Colour palette** - The 6 swatch colours
- **Symbols/Steps** - Emoji characters for annotation tools
- **Auto-save** - Timing, temp directory, snapshot reminder threshold

User customizations are saved to `~/.config/ssce-desktop/defaults.json` (Linux) or AppData (Windows) and take priority over bundled defaults. Click "Reset to Defaults" in Settings to restore original values.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **File Operations** | |
| Ctrl+O | Open image |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+R | Recent Files |
| Ctrl+Shift+F | Search Library |
| Ctrl+V | Paste from clipboard |
| Ctrl+C | Copy to clipboard |
| Ctrl+P | Print |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Alt+S | Take Snapshot |
| Ctrl+Shift+E | Bulk Export / Backup |
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
| F | Fill tool |
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

## Testing

### Prerequisites

```bash
bun install
```

### Unit Tests

Run all unit tests (colours, ssce-format, etc.):

```bash
bun test
```

### E2E Tests (Playwright)

Playwright auto-starts a static file server, so no separate dev server is needed:

```bash
bunx playwright test
```

Install browsers on first run:

```bash
bunx playwright install
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
| **File Operations** | |
| `browse_directory` | List files in a directory with filtering |
| `load_image` | Load image file as base64 data URL |
| `save_image` | Save base64 image data to file |
| `load_ssce` | Load .ssce JSON file |
| `save_ssce` | Save .ssce JSON file |
| `file_exists` | Check if a file exists |
| `get_home_dir` | Get user's home directory |
| `get_downloads_dir` | Get user's downloads directory |
| **Library Database** | |
| `db_upsert_file` | Add or update file in library |
| `db_get_recent_files` | Get recently opened files |
| `db_search_files` | Full-text search with date filtering |
| `db_remove_file` | Remove file from library |
| `db_update_last_opened` | Update last opened timestamp |
| `db_rebuild_from_library` | Scan folder and re-index all .ssce files |
| **Configuration** | |
| `get_defaults_config` | Load UI configuration from defaults.json |
| `get_env_config` | Load build timestamp info |
| `save_defaults_config` | Save user config to config directory |
| `get_user_config_path` | Get path to user config file |
| `get_cli_file_arg` | Get file path from CLI argument (if any) |
| `get_system_info` | Get platform, OS, and version info |
| **Autosave** | |
| `save_autosave` | Save autosave data to temp file |
| `delete_autosave` | Delete autosave temp file |
| `list_autosave_files` | List autosave files in temp directory |
| **Bulk Export & Backup** | |
| `list_ssce_files` | Scan directory for .ssce files with parsed dates |
| `get_monthly_summary` | Group .ssce file counts by month |
| `save_exported_image` | Write base64 image data to file |
| `zip_create` | Create a new ZIP archive, returns archive ID |
| `zip_add_file` | Add base64-encoded data as a ZIP entry |
| `zip_add_path` | Add a file from disk directly to a ZIP entry |
| `zip_finalize` | Close and finalize a ZIP archive |

## Build Notes

### Build Timestamp in Footer

The application displays the build timestamp in the footer for easy identification of which version is running. The timestamp is generated by `build-and-install.sh` and stored in `src/config/build-time.txt`.

To build and install locally:

```bash
./build-and-install.sh
```

This script builds a .deb package and installs it via dpkg.

### System Tray Behavior

- Closing the window minimizes the app to system tray (does not exit)
- Left-click tray icon to restore window
- Right-click tray icon for context menu (Show SSCE, Quit)
- Select "Quit" from tray menu to fully exit the application

## Licence

MIT

## Credits

Based on [SSCE (Simple Screen Capture Editor)](https://github.com/HamptonNorth/ssce) - the web-based version running on Bun.
