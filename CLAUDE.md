# CLAUDE.md - SSCE Desktop (Tauri)

## Project Overview

SSCE Desktop is a Tauri-wrapped version of SSCE (Simple Screen Capture Editor). It packages the existing vanilla JS + HTML5 Canvas web application as a native desktop application.

**Tech Stack:**
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5 Canvas API, Tailwind CSS
- **Desktop Runtime**: Tauri v2 (Rust-based, uses system WebView)
- **Backend**: Rust (minimal - primarily for file operations)
- **Platforms**: Linux (primary), Windows

**Key Documentation:**
- **CLAUDE.md** (this file): Project overview and development guidance
- **MIGRATION_TO_TAURI.md**: Steps to recreate this project from SSCE
- **CHEAT_SHEET.md**: Common Tauri/Rust commands

## Developer Note: Limited Rust Experience

The maintainer has **limited Rust experience**. When making changes to Rust code:
- Provide clear explanations of Rust concepts
- Suggest simple, idiomatic solutions over clever ones
- Include error handling patterns
- Explain ownership/borrowing when relevant

## Project Structure

```
ssce-tauri/
├── src/                      # Web content (SSCE frontend)
│   ├── index.html            # Main application
│   ├── config/
│   │   └── defaults.json     # UI configuration (bundled with app)
│   ├── js/                   # JavaScript modules
│   │   ├── app.js            # Coordinator
│   │   ├── state.js          # State management
│   │   ├── canvas.js         # Canvas rendering
│   │   ├── layers.js         # Layer management
│   │   ├── tauri-bridge.js   # Tauri API abstraction
│   │   ├── tools/            # Drawing tools
│   │   ├── ui/               # UI modules
│   │   └── utils/            # Utilities (config.js, colours.js, etc.)
│   └── css/                  # Stylesheets
├── src-tauri/                # Tauri/Rust backend
│   ├── Cargo.toml            # Rust dependencies
│   ├── tauri.conf.json       # Tauri configuration (withGlobalTauri: true)
│   ├── build.rs              # Build script (git hash embedding)
│   ├── capabilities/         # Security permissions
│   ├── icons/                # Application icons
│   └── src/
│       └── main.rs           # Rust entry point + commands
├── .env                      # Environment config (paths) - not in git
├── .env.sample               # Environment config template
├── build-and-install.sh      # Build script for local installation
├── CLAUDE.md                 # This file
├── HISTORY.md                # Development history
├── MIGRATION_TO_TAURI.md     # Migration guide
└── CHEAT_SHEET.md            # Command reference
```

## Configuration Architecture

All user-configurable settings are now in `defaults.json`:

### `src/config/defaults.json` - Application Configuration
All application settings (bundled with app, editable via Settings UI):
- **File paths** - default directories for Open/Save dialogs (supports `~` expansion)
- **Tool defaults** - colours, line styles, sizes for each tool
- **Colour palette** - the 6 swatch colours
- **Presets** - line widths, text sizes, arrowhead styles
- **Symbols/Steps** - emoji characters for annotation tools
- **Canvas settings** - background colour, transparency grid
- **Resize limits** - warning/error thresholds
- **Auto-save settings** - timing, temp directory, snapshot reminder threshold
- **User settings** - initials for annotations
- **Print settings** - paper size, margins

User customizations are saved to `~/.config/ssce-desktop/defaults.json` (Linux) or AppData (Windows) via the Settings UI, and take priority over bundled defaults.

### `.env` - Development Settings (optional)
Only used for development/build settings:
- `SHOW_BUILD_TIMESTAMP` - Show build time in window title (for dev testing)

The frontend loads `defaults.json` via Tauri command (with `~` paths expanded by Rust) and falls back to hardcoded values in `src/js/utils/config.js` if loading fails. User preferences in localStorage override defaults for tool-specific settings.

## Current Status

### Working Features
- All SSCE drawing tools (arrow, line, text, shapes, etc.)
- Canvas rendering and layer management
- Undo/redo
- Keyboard shortcuts
- UI (toolbar, dialogs, property cards)
- Native file dialogs (open, save)
- File system access via Rust commands
- Configuration loading (defaults.json, .env)
- Build timestamp tracking in footer
- Autosave and crash recovery
- Settings editor (JSON text editor for defaults.json)
- Native clipboard integration (copy/paste images)
- Loading spinner overlay for file operations
- System tray with minimize-on-close

### Not Yet Implemented (Tauri-specific)
- Auto-updates (deferred)
- Native menus (optional)

## Architecture

### Frontend (src/)
The frontend is unchanged from SSCE. It's a vanilla JS application that:
- Uses HTML5 Canvas for rendering
- Manages layers and annotations
- Handles user input (mouse, keyboard)

### Backend (src-tauri/)
The Tauri backend is minimal:
- `main.rs`: Application entry point
- Future: Rust commands for file I/O

### Communication
Frontend calls Rust commands via the global Tauri API:
```javascript
// JavaScript (frontend) - requires withGlobalTauri: true in tauri.conf.json
const invoke = window.__TAURI__.core.invoke;
const result = await invoke('save_image', { path, data });
```

```rust
// Rust (backend)
#[tauri::command]
fn save_image(path: String, data: String) -> Result<(), String> {
    // Implementation
}
```

**Note:** Dynamic imports (`import('@tauri-apps/api/core')`) don't work without a bundler. Use `window.__TAURI__.core.invoke` instead.

## Development Workflow

### Prerequisites
- Rust toolchain (rustup)
- Tauri CLI: `cargo install tauri-cli --version "^2"`
- Linux: `libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev`

### Commands
```bash
cd src-tauri
cargo tauri dev      # Run in development mode
cargo tauri build    # Build for production
```

### Making Changes

**Frontend changes** (src/):
- Edit files directly
- Hot reload in dev mode (Ctrl+R to refresh)
- No build step required

**Backend changes** (src-tauri/):
- Edit Rust files
- Tauri dev server auto-rebuilds
- Check `cargo check` for errors

## Key Differences from Browser SSCE

| Aspect | Browser SSCE | Tauri Desktop |
|--------|--------------|---------------|
| File I/O | HTTP to Bun server | Rust commands (TBD) |
| Runtime | Browser + Bun | WebKitGTK (Linux) |
| Distribution | Run `bun server.js` | Standalone binary |
| Size | N/A | ~13MB |

## Future Development

### Phase 1: File Operations
Replace HTTP endpoints with Tauri commands:
- `browse_directory` - List files
- `load_image` - Load image file
- `save_image` - Save image file
- `file_exists` - Check file existence

### Phase 2: Native Integration
- ~~Native file dialogs~~ (DONE)
- ~~Native clipboard~~ (DONE)
- ~~System tray~~ (DONE)
- Auto-updates (deferred - planned for GitHub Releases)

### Phase 3: Polish
- ~~Loading spinner for file operations~~ (DONE)
- ~~Build timestamp in footer~~ (DONE)
- Platform-specific tweaks

## Work Outstanding

### Configs
- ~~Add a Tauri command to serve `src/config/defaults.js` to the frontend~~ (DONE - `get_defaults_config`)
- ~~Add a Tauri command to read `.env` settings and expose to frontend~~ (DONE - `get_env_config`)

### Autosave System
~~The autosave/crash recovery system still uses HTTP endpoints from the original Bun server~~ (DONE)

Implemented Tauri commands:
- `save_autosave(data, filename, directory)` - Write temp .ssce file
- `delete_autosave(path)` - Delete temp file  
- `list_autosave_files(directory)` - List .ssce files in temp directory
- Uses existing `load_ssce` command for loading recovery files

Temp files are stored in `~/.ssce-temp/` with format `autosave_{sessionId}_{filename}.ssce`

### Settings UI
~~Add settings UI to edit defaults.json values~~ (DONE)

Implemented as a JSON text editor accessible via gear icon in top-right toolbar:
- `save_defaults_config(data)` - Save config to user directory
- `get_user_config_path()` - Get path where user config is saved
- User config saved to `~/.config/ssce-desktop/defaults.json` (Linux) or AppData (Windows)
- User config takes priority over bundled defaults
- "Reset to Defaults" button deletes user config to restore bundled defaults

### Native Clipboard
~~Native clipboard integration~~ (DONE)

Uses `tauri-plugin-clipboard-manager` for native clipboard access:
- `writeImageToClipboard(base64Data)` - Copy image to system clipboard
- `readImageFromClipboard()` - Read image from system clipboard as data URL
- Falls back to browser Clipboard API if Tauri clipboard unavailable
- Capabilities: `clipboard-manager:allow-read-image`, `clipboard-manager:allow-write-image`

### System Tray
~~System tray support~~ (DONE)

App runs in system tray for quick access throughout the day:
- Closing window minimizes to tray instead of exiting
- Left-click tray icon restores window
- Right-click shows context menu (Show SSCE, Quit)
- "Quit" menu item exits the application
- Tray icons in `src-tauri/icons/tray-icon.png` and `tray-icon.ico`

### Loading Spinner
~~Loading spinner for file operations~~ (DONE)

Visual feedback during file open/save:
- `src/js/utils/spinner.js` - showSpinner/hideSpinner utilities
- CSS overlay with spinner animation in `src/css/app.css`
- Integrated into load, save, save-as, and save-as-ssce flows

### Future Enhancements
- Native menus (optional)

---

## Implementation Plan - v1.2.0 Release

### Phase 1: Core Bug Fixes (High Impact)
**Goal**: Fix issues that break core functionality

#### 1.1 Canvas zoom/position calculation bug
- **Issue**: When image loaded at <100% zoom, tool clicks register at wrong position (as if 100% zoom)
- **Impact**: Makes cropping and drawing on zoomed images unusable
- **Files**: Likely `src/js/canvas.js`, tool files in `src/js/tools/`
- **Test**: Load large image → zoom to 40% → use text tool → verify click position matches cursor

#### 1.2 Save/Save As filename not passed to native dialog  
- **Issue**: Filename from SSCE UI not pre-populating native file dialog
- **Files**: `src/js/file-operations.js`, `src-tauri/src/main.rs`
- **Test**: Open image → Save As → verify filename field pre-populated

#### 1.3 JPG extension morphed to PNG in native dialog
- **Issue**: Selecting .jpg save changes to .png in dialog
- **Files**: `src-tauri/src/main.rs` (save dialog filters)
- **Test**: Save As → select JPG → verify filename keeps .jpg extension

---

### Phase 2: Missing Spinners
**Goal**: Consistent loading feedback across all file operations

#### 2.1 Add spinner to Recover (load .ssce file)
- **Files**: `src/js/file-operations.js` or recovery dialog handler
- **Test**: Trigger crash recovery → verify spinner shows during load

#### 2.2 Add spinner to Save Snapshot
- **Files**: `src/js/file-operations.js` or snapshot handler
- **Test**: Save snapshot → verify spinner shows during save

---

### Phase 3: Settings & Persistence
**Goal**: User-friendly configuration

#### 3.1 Move directory settings from .env to config with native picker
- **Current**: `DEFAULT_PATH_IMAGE_LOAD` and `DEFAULT_PATH_IMAGE_SAVE` in `.env`
- **Target**: Add to Settings UI with native directory picker buttons
- **Files**: 
  - `src-tauri/src/main.rs` - Add `pick_directory` Tauri command
  - `src/js/utils/config.js` - Add directory settings
  - Settings UI - Add Browse buttons for Open/Save directories
- **Test**: Open Settings → click Browse for Open directory → select folder → verify persisted

#### 3.2 Verify initials persist in .ssce saves and snapshots
- **Issue**: Check if initials setting is being written to config and persisting
- **Files**: `src/js/utils/config.js`, save handlers
- **Test**: Set initials → save .ssce → close app → reopen → verify initials restored

---

### Phase 4: Auto-Updates
**Goal**: Seamless update delivery via GitHub Releases

#### 4.1 Implement tauri-plugin-updater
- Generate signing keypair
- Configure update manifest for GitHub Releases
- Check frequency: Once per week on startup
- User prompt: "Update available. Install on next restart?"
- **Files**: 
  - `src-tauri/Cargo.toml` - Add updater plugin
  - `src-tauri/tauri.conf.json` - Updater config
  - `src-tauri/src/main.rs` - Update check logic
  - Frontend - Update notification UI
- **Test**: Build older version → publish new release → verify update prompt appears

---

### Phase 5: Flatpak Distribution
**Goal**: Linux distribution via Flatpak

#### 5.1 Create Flatpak manifest
- Create `flatpak/org.ssce.desktop.yml` manifest
- Configure sandbox permissions (file access, clipboard, tray)
- Build and test locally
- **Test**: Install via Flatpak → verify all features work (file dialogs, clipboard, tray)

---

### Phase 6: Release v1.2.0
**Goal**: Version bump and release

#### 6.1 Bump version to 1.2.0
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CLAUDE.md` (this file)
- `package.json` (if exists)
- User documentation version references

#### 6.2 GitHub Actions release
- Trigger release workflow
- Test Linux .deb/.AppImage
- Test Windows .msi/.exe
- Test Flatpak (if added to CI)

---

### Testing Checklist (between phases)

After each phase, manually verify:
- [ ] App starts without errors
- [ ] Open image works
- [ ] Save/Save As works (PNG and JPG)
- [ ] Drawing tools work at various zoom levels
- [ ] Clipboard copy/paste works
- [ ] System tray works
- [ ] Settings persist after restart
- [ ] Crash recovery works

## Debugging

### Frontend
- Use browser DevTools: Right-click > Inspect
- Console logging: `console.log()`
- Network tab shows asset loading

### Backend
- Rust println! macros appear in terminal
- Use `RUST_BACKTRACE=1 cargo tauri dev` for stack traces

## Common Issues

1. **Build fails with "icon not RGBA"**: Icons must have alpha channel. Use ImageMagick with `PNG32:` prefix to force 8-bit RGBA format (e.g., `convert source.png -resize 32x32 PNG32:output.png`)
2. **WebKitGTK errors**: Install required system packages
3. **Hot reload not working**: Press Ctrl+R or F5 to force refresh
4. **Dock icon flickering/animating**: Caused by malformed PNG icons without proper RGBA format. Regenerate icons with PNG32 format

## Icon Generation

When regenerating application icons, use ImageMagick with the `PNG32:` output prefix to ensure proper 8-bit RGBA format required by Tauri:

```bash
# Example: Generate all standard sizes from a 512x512 source
SOURCE="source-icon.png"
convert $SOURCE -resize 32x32 PNG32:src-tauri/icons/32x32.png
convert $SOURCE -resize 64x64 PNG32:src-tauri/icons/64x64.png
convert $SOURCE -resize 128x128 PNG32:src-tauri/icons/128x128.png
convert $SOURCE -resize 256x256 PNG32:src-tauri/icons/128x128@2x.png
convert $SOURCE -resize 512x512 PNG32:src-tauri/icons/icon.png

# Tray icons
convert $SOURCE -resize 32x32 PNG32:src-tauri/icons/tray-icon.png

# Windows ICO (multi-size)
convert $SOURCE -resize 16x16 PNG32:/tmp/icon-16.png
convert $SOURCE -resize 32x32 PNG32:/tmp/icon-32.png
convert /tmp/icon-16.png /tmp/icon-32.png src-tauri/icons/tray-icon.ico
```

**Important**: Without `PNG32:`, ImageMagick may optimize PNGs to palette format, causing:
- Tauri build failures with "icon is not RGBA" error
- Misleading "Can't detect any appindicator library" errors
- Dock icon flickering on Ubuntu/GNOME

## Resources

- [Tauri v2 Docs](https://v2.tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SSCE Original Project](../ssce/)

---

*Version: 1.0.4*
*Last Updated: January 2026*
