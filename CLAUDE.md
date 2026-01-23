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

Configuration is split between two files:

### `.env` - Environment Settings
User/machine-specific settings that vary between installations:
- `DEFAULT_PATH_IMAGE_LOAD` - Default directory for Open dialog
- `DEFAULT_PATH_IMAGE_SAVE` - Default directory for Save dialog

### `src/config/defaults.json` - UI Configuration
Application defaults for tools and UI (same across all installations):
- **Tool defaults** - colours, line styles, sizes for each tool
- **Colour palette** - the 6 swatch colours
- **Presets** - line widths, text sizes, arrowhead styles
- **Symbols/Steps** - emoji characters for annotation tools
- **Canvas settings** - background colour, transparency grid
- **Resize limits** - warning/error thresholds
- **Auto-save settings** - timing and temp directory

The frontend loads `defaults.json` via Tauri command and falls back to hardcoded values in `src/js/utils/config.js` if loading fails. User preferences in localStorage override defaults.

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
- Git hash version tracking in footer
- Autosave and crash recovery
- Settings editor (JSON text editor for defaults.json)

### Not Yet Implemented (Tauri-specific)
- Native clipboard integration
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
- Native file dialogs
- Native clipboard
- System tray (optional)
- Auto-updates (optional)

### Phase 3: Polish
- Application icons
- Installer improvements
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

### Future Enhancements
- Native clipboard integration

## Debugging

### Frontend
- Use browser DevTools: Right-click > Inspect
- Console logging: `console.log()`
- Network tab shows asset loading

### Backend
- Rust println! macros appear in terminal
- Use `RUST_BACKTRACE=1 cargo tauri dev` for stack traces

## Common Issues

1. **Build fails with "icon not RGBA"**: Icons must have alpha channel
2. **WebKitGTK errors**: Install required system packages
3. **Hot reload not working**: Press Ctrl+R or F5 to force refresh

## Resources

- [Tauri v2 Docs](https://v2.tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SSCE Original Project](../ssce/)

---

*Version: 1.0.2*
*Last Updated: January 2026*
