# SSCE Desktop (Tauri) Development History

## Session Overview
This document chronicles the development sessions for SSCE Desktop, the Tauri-wrapped version of SSCE (Simple Screen Capture Editor).

---

## 1. Initial Project Setup

### Context:
Migration of SSCE from Bun-based web application to Tauri desktop application.

### Implementation Summary:
- Created Tauri v2 project structure
- Copied frontend assets from SSCE (src/ directory)
- Configured tauri.conf.json for desktop application
- Set up Rust backend with basic file operations

**Files Created:**
- `src-tauri/` - Tauri backend directory
- `src-tauri/src/main.rs` - Rust entry point with initial commands
- `src-tauri/Cargo.toml` - Rust dependencies
- `src-tauri/tauri.conf.json` - Tauri configuration
- `CLAUDE.md` - Project documentation
- `MIGRATION_TO_TAURI.md` - Migration guide
- `CHEAT_SHEET.md` - Command reference

---

## 2. File Operations Commands

### Implementation Summary:
Added Tauri commands for file system operations:

- `browse_directory` - List files/directories with filtering (all, ssce, images)
- `load_image` - Load image file as base64 data URL
- `save_image` - Save base64 image data to file
- `load_ssce` - Load .ssce JSON file
- `save_ssce` - Save .ssce JSON file
- `file_exists` - Check if file exists
- `get_home_dir` - Get user's home directory
- `get_downloads_dir` - Get user's downloads directory

**Files Modified:**
- `src-tauri/src/main.rs` - Added all file operation commands
- `src-tauri/Cargo.toml` - Added dependencies (base64, dirs, serde_json)

---

## 3. Tauri Bridge Module

### Implementation Summary:
Created JavaScript bridge module to abstract Tauri API calls from the frontend.

**Files Created:**
- `src/js/tauri-bridge.js` - Bridge module for Tauri commands

---

## 4. GitHub Actions CI/CD

### Implementation Summary:
Added multi-platform build workflow for automated releases.

**Files Created:**
- `.github/workflows/release.yml` - Build workflow for Linux, Windows, macOS
- `docs/CI_CD.md` - CI/CD documentation

---

## 5. Application Icons

### Implementation Summary:
Added platform-specific icon files for application branding.

**Files Created:**
- `src-tauri/icons/` - Icon files for all platforms (PNG, ICO, ICNS)

---

## 6. Configuration Architecture Refactoring

### User Prompt:
> "Review the code and output all possible .env settings... create a .env and .env.sample files"
> "During the course of the original ssce project there was a task to move relevant settings from env to config.js... redo this separation"

### Implementation Summary:

**Problem:** Configuration was not properly separated between environment settings and UI defaults.

**Solution:** Implemented proper separation following SSCE patterns:

1. **Created `.env` and `.env.sample`** for environment-specific settings:
   - `DEFAULT_PATH_IMAGE_LOAD` - Default directory for Open dialog
   - `DEFAULT_PATH_IMAGE_SAVE` - Default directory for Save dialog

2. **Created `src/config/defaults.js`** for UI configuration:
   - Tool defaults (colours, line styles, sizes)
   - Colour palette (6 swatches)
   - Line width presets (xs, sm, md, lg, xl)
   - Text size presets
   - Arrowhead styles
   - Symbols and Steps characters
   - Canvas settings (background, transparency grid)
   - Resize limits
   - Auto-save settings
   - User defaults (initials)

3. **Added Tauri commands** to serve configuration:
   - `get_defaults_config` - Reads and parses defaults.js, returns JSON
   - `get_env_config` - Reads .env file, returns expanded paths

4. **Updated frontend `config.js`**:
   - Uses Tauri invoke to load config in desktop mode
   - Falls back to fetch API for browser development
   - Added `getEnvConfig()`, `getDefaultImageLoadPath()`, `getDefaultImageSavePath()`

**Rust Implementation Details:**
- Added `dotenvy` crate for .env parsing
- Implemented `parse_js_config()` to extract JS object from `export default { ... }`
- Implemented `convert_js_to_json()` to convert JS object notation to valid JSON
- Home directory expansion (~/) in environment paths

**Files Created:**
- `.env` - Environment configuration (git-ignored)
- `.env.sample` - Environment configuration template
- `src/config/defaults.js` - UI configuration defaults

**Files Modified:**
- `src-tauri/src/main.rs` - Added get_defaults_config, get_env_config commands
- `src-tauri/Cargo.toml` - Added dotenvy dependency
- `src/js/utils/config.js` - Updated to use Tauri commands
- `.gitignore` - Added .env
- `CLAUDE.md` - Added Configuration Architecture section, updated project structure

---

---

## 7. Production Build Fixes and Bun Migration Cleanup

### User Prompt:
> "App now shows smaller default canvas, file dropdown fails. App inoperable."
> "Still showing version 1.0.0 and no git hash"
> "Are there other redundant/incorrect Bun/JS file handling left within the project?"

### Problems Identified:
1. **Config not loading in production** - `@tauri-apps/api/core` dynamic import fails without bundler
2. **Bun HTTP endpoints still referenced** - colours.js, autosave.js using `/api/*` endpoints
3. **showSaveAsDialog export missing** - function never existed, causing JS error
4. **Git hash not showing** - compile-time embedding not working
5. **Version hardcoded** - HTML showed v1.0.0

### Implementation Summary:

**Tauri API Access Fix:**
- Added `withGlobalTauri: true` to tauri.conf.json
- Changed config.js to use `window.__TAURI__.core.invoke` instead of dynamic import
- This is required for vanilla JS without a bundler (Vite, etc.)

**Bun Migration - colours.js:**
- Removed HTTP fetch to `/api/config`
- Now uses `getDefaults()` and `getEnvConfig()` from config.js
- Builds config object from already-loaded configuration

**Bun Migration - autosave.js:**
- Disabled autosave system in Tauri builds (`if (!tauriBridge.isTauri())`)
- Documented required Tauri commands in CLAUDE.md for future implementation

**JS Export Fix:**
- Removed non-existent `showSaveAsDialog` from dialogs/index.js
- Updated app.js to use `handleSaveAs` for PNG export

**Version/Git Hash:**
- Updated index.html version element with id for dynamic update
- config.js updates footer with git hash when loaded
- build.rs embeds git hash at compile time

**Production Path Fix (Cross-Platform):**
- Use Tauri `resource_dir()` for cross-platform config loading (Windows/macOS/Linux)
- Added Linux-specific `/usr/lib/` fallback with `#[cfg(target_os = "linux")]`
- defaults.json bundled as Tauri resource

**Other Fixes:**
- Enabled `devtools` feature in Cargo.toml for release builds
- Set `authors` in Cargo.toml to fix dpkg maintainer warning
- Reordered app.js init to load config before colours

**Files Modified:**
- `src-tauri/tauri.conf.json` - withGlobalTauri, resources bundle
- `src-tauri/Cargo.toml` - devtools feature, authors field
- `src-tauri/build.rs` - git hash with rerun-if-changed
- `src-tauri/src/main.rs` - cross-platform config path handling
- `src/js/utils/config.js` - global Tauri API, debug logging
- `src/js/utils/colours.js` - removed HTTP dependency
- `src/js/app.js` - init order, disable autosave in Tauri
- `src/js/ui/dialogs/index.js` - removed bad export
- `src/index.html` - version element with id

---

## 8. Build Timestamp, Loading Spinner, and System Tray

### Session Date: January 2026

### Implementation Summary:

**Build Timestamp (replacing Git Hash):**
The git hash approach had issues with incremental builds not triggering rebuilds. Replaced with build timestamp for easier identification of production builds.

- `build-and-install.sh` generates `build-time.txt` before building
- Removed git hash logic from `build.rs`
- `main.rs` reads `build-time.txt` from multiple locations (dev, bundled, Linux production)
- Improved `.env` loading with priority order: user config > dev > bundled > fallback
- Renamed `SHOW_GIT_HASH` to `SHOW_BUILD_TIMESTAMP` in `.env`
- Footer displays "Built: YYYY-MM-DD HH:MM:SS" format

**Loading Spinner:**
Visual feedback during file operations (open/save).

- Created `src/js/utils/spinner.js` with `showSpinner()`, `hideSpinner()`, `withSpinner()` utilities
- Added CSS overlay and spinner animation to `src/css/app.css`
- Added `#loading-overlay` element to `src/index.html`
- Integrated into `file-operations.js` for load, save, save-as, and save-as-ssce flows
- Canvas clears immediately on load for better perceived responsiveness
- Refactored image loading to use Promise-based approach

**System Tray:**
App runs in system tray for quick access throughout the day.

- Enabled `tray-icon` feature in Tauri dependencies
- Created tray setup in `main.rs` with context menu (Show SSCE, Quit)
- Left-click tray icon restores window
- Closing window minimizes to tray instead of exiting (via `on_window_event`)
- "Quit" menu item actually exits the application
- Generated tray icons using ImageMagick from source logo
- Added `tray-icon.png` (32x32) and `tray-icon.ico` (multi-size) to `src-tauri/icons/`

**Files Created:**
- `src/js/utils/spinner.js` - Spinner utility module
- `src/config/build-time.txt` - Build timestamp (generated at build time)
- `src-tauri/icons/tray-icon.png` - Linux tray icon
- `src-tauri/icons/tray-icon.ico` - Windows tray icon

**Files Modified:**
- `build-and-install.sh` - Generate build timestamp
- `src-tauri/build.rs` - Simplified (removed git hash logic)
- `src-tauri/Cargo.toml` - Added `tray-icon` feature
- `src-tauri/src/main.rs` - Build timestamp loading, system tray setup, close-to-tray
- `src/js/utils/config.js` - Renamed to `updateWindowTitleWithBuildTime()`
- `src/js/app.js` - Updated function call
- `src/js/file-operations.js` - Spinner integration, Promise-based image loading
- `src/css/app.css` - Spinner and overlay styles
- `src/index.html` - Loading overlay element
- `.env.sample` - Renamed setting to `SHOW_BUILD_TIMESTAMP`

---

## 9. Application Icon Replacement

### Session Date: January 2026

### User Prompt:
> "Use redmug-starter-icon-rh.svg and redmug-starter-icon-rh.png... Produce the icons needed for the ssce-tauri app"
> "Replace all icons used in ssce-tauri with this new icon set"

### Implementation Summary:

**Icon Generation:**
Replaced all application icons with new red mug design (#d01212) from `redmug-starter-icon-rh.png` source.

**Icons Updated:**
- Desktop app icons: 32x32, 64x64, 128x128, 128x128@2x, icon.png
- Windows: icon.ico (multi-size: 16-256px)
- Windows Store: Square30x30 through Square310x310Logo.png, StoreLogo.png
- Tray: tray-icon.png (32x32), tray-icon.ico (16+32)
- Android: All mipmap densities (mdpi through xxxhdpi) - ic_launcher, ic_launcher_round, ic_launcher_foreground
- iOS: All AppIcon sizes (20x20 through 512@2x)
- Web: favicon.svg, logo.svg

**Critical Fix - PNG32 Format:**
Initial icon generation caused build failures and dock icon flickering. Root cause: ImageMagick optimized PNGs to palette format instead of true RGBA.

**Solution:** Use `PNG32:` output prefix with ImageMagick to force 8-bit RGBA format:
```bash
convert source.png -resize 32x32 PNG32:output.png
```

**Symptoms of incorrect format:**
- Build error: "icon is not RGBA"
- Misleading error: "Can't detect any appindicator library"
- Dock icon flickering/animation on Ubuntu/GNOME

**Left-handed variant:**
Created flipped versions (`*-lh.png`, `*-lh.svg`) by applying 180° x-axis flip for alternative icon orientation.

**Note:** macOS icon.icns not updated (requires macOS-specific tools like `iconutil`).

**Files Modified:**
- `src-tauri/icons/` - All PNG, ICO files
- `src-tauri/icons/android/` - All mipmap directories
- `src-tauri/icons/ios/` - All AppIcon files
- `src/favicon.svg` - Web favicon
- `src/images/logo.svg` - Application logo

**Files Created (in project root, not committed):**
- `redmug-starter-icon-rh.png` - Source icon (512x512)
- `redmug-starter-icon-rh.svg` - Source SVG
- `redmug-starter-icon-lh.png` - Flipped variant
- `redmug-starter-icon-lh.svg` - Flipped SVG

**External Files Created:**
- `~/icons/tray-icon2/` - Icon set with all sizes and documentation
- `~/icons/tray-icon2/icon-usage.md` - Usage summary

---

## 10. v1.2.0 Phases 1-3: Bug Fixes, Snapshots, and Configuration

### Session Date: January 2026

### Implementation Summary:

**Phase 1: Core Bug Fixes**

Save/Save As improvements:
- Added `suggestedFilename` parameter to pass filename to native dialog
- Reordered JPEG/PNG filters based on file extension
- Fixed cancel flow when saving with keepSsce option (returns boolean)
- Fixed JPEG transparency by compositing onto white background before export
- Added `saveUndoState()` after crash recovery to enable undo

**Phase 2: Snapshot & Undo Enhancements**

Snapshot reminder system:
- Added `snapshotReminderEdits` config (default 10, 0 to disable)
- Prompts user to take snapshot after N edits
- Counter resets on manual snapshot or when reminder dismissed

Undo-to-snapshot navigation:
- When undo stack empty, Undo steps backwards through snapshots
- Redo steps forward through snapshots
- Saves loaded state before first snapshot restore for redo back
- Added `currentSnapshotIndex` and `savedLoadedState` to state
- Updated `updateUndoRedoButtons()` to consider snapshot availability

Additional snapshot improvements:
- Alt+S keyboard shortcut for Take Snapshot
- Auto-tick keepSsce checkbox when snapshots exist
- File Information dialog defaults title from filename
- Subtitle explains .ssce save when triggered by keepSsce
- "Auto snapshot step N" title for auto-prompted snapshots

**Phase 3: Settings & Persistence**

Moved file paths from .env to defaults.json:
- Added `paths.defaultImageLoad` and `paths.defaultImageSave` to defaults.json
- Rust `expand_paths_in_config()` expands `~` to home directory
- Removed `dotenvy` dependency from Cargo.toml
- Updated .env to only contain `SHOW_BUILD_TIMESTAMP`
- Users can now configure paths via Settings UI (gear icon)

**Files Created:**
- None

**Files Modified:**
- `src/config/defaults.json` - Added paths section
- `src-tauri/src/main.rs` - Path expansion, simplified get_env_config
- `src-tauri/Cargo.toml` - Removed dotenvy dependency
- `src/js/file-operations.js` - Undo-to-snapshot, suggestedFilename, cancel flow
- `src/js/state.js` - Added currentSnapshotIndex, savedLoadedState
- `src/js/app.js` - Snapshot reminder, handleSnapshot improvements
- `src/js/keyboard.js` - Alt+S shortcut
- `src/js/utils/config.js` - Read paths from defaults
- `src/js/utils/colours.js` - Read paths from defaults
- `src/js/canvas.js` - JPEG white background compositing
- `src/js/ui/dialogs/ssce-dialogs.js` - Subtitle support
- `src/index.html` - Alt+S hint, subtitle element
- `.env` - Removed path settings
- `.env.sample` - Removed path settings
- `CLAUDE.md` - Updated config architecture, marked phases complete

---

## 11. v1.2.0: Library Search, SQLite Migration, and Polish

### Session Date: January 2026

### Implementation Summary:

**SQLite Library Database:**
Migrated recent files from localStorage to SQLite with FTS5 full-text search.

- Added `rusqlite` crate with bundled SQLite
- Created `library.db` in user config directory
- Tables: `files` (metadata), `files_fts` (FTS5 virtual table)
- Triggers keep FTS index in sync automatically
- New Tauri commands: `db_upsert_file`, `db_get_recent_files`, `db_search_files`, `db_remove_file`, `db_update_last_opened`, `db_rebuild_from_library`

**Search Library Dialog:**
New dialog for searching .ssce files across the library.

- Full-text search by filename, title, summary, keywords
- Date range filtering (From/To dates)
- Locale-aware date parsing (auto-detects UK dd/mm/yyyy vs US mm/dd/yyyy)
- Dynamic placeholder examples based on browser locale
- Thumbnail grid results display

**Recent Files Updates:**
- Converted to async database queries
- "Clear" button replaced with "Rebuild from Library" for reindexing
- Loading state during data fetch

**Canvas Background Toggle:**
Better contrast when editing dark screenshots.

- Right-click on background area toggles light/dark mode
- Auto-detection: shows toast tip when dark image loaded on dark background
- Samples canvas edge pixels to calculate luminance
- Tip shown once per session (not annoying)

**Code Review & Documentation:**
Pre-release code quality pass.

- Removed deprecated functions from `recent-files.js`
- Added comprehensive comments to `main.rs` for JS developers
- Enhanced module headers in key JS files
- Updated USER_DOCUMENTATION.md with new features

**Files Created:**
- `src/js/ui/dialogs/search-library-dialog.js` - Search dialog
- `src/js/utils/canvas-background.js` - Background toggle

**Files Modified:**
- `src-tauri/Cargo.toml` - Added rusqlite dependency
- `src-tauri/src/main.rs` - Database commands, extensive comments
- `src/js/utils/recent-files.js` - SQLite backend, removed deprecated code
- `src/js/ui/dialogs/recent-files-dialog.js` - Async queries, rebuild button
- `src/js/file-operations.js` - Contrast check on image load
- `src/js/app.js` - Init search dialog, background toggle
- `src/css/app.css` - Light/dark background styles
- `src/index.html` - Search library dialog markup
- `src/USER_DOCUMENTATION.md` - New sections for library & search

---

## Project Statistics

**Rust Backend:**
- `main.rs`: ~950 lines (with comments)
- 22 Tauri commands implemented
- SQLite database with FTS5 search
- System tray with context menu

**JavaScript Frontend:**
- Vanilla JS, ES6 modules (no bundler)
- `tauri-bridge.js`: Bridge module for Tauri API
- `recent-files.js`: SQLite-backed library management
- `search-library-dialog.js`: Full-text search UI
- `canvas-background.js`: Contrast detection and toggle

**Configuration:**
- `.env`: 1 environment variable (SHOW_BUILD_TIMESTAMP for development)
- `defaults.json`: ~100 lines of UI configuration including file paths (JSON format)
- `library.db`: SQLite database for file library (user config directory)

**Documentation:**
- `CLAUDE.md`: Project overview and guidance
- `HISTORY.md`: Development history (this file)
- `USER_DOCUMENTATION.md`: End-user guide
- `README.md`: Project overview
- `MIGRATION_TO_TAURI.md`: Migration guide
- `CHEAT_SHEET.md`: Command reference

---

*Version: 1.2.0*
*Last Updated: January 2026*
