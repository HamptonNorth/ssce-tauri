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

**Production Path Fix:**
- Added explicit `/usr/lib/SSCE Desktop/config/defaults.json` path in main.rs
- defaults.json bundled as Tauri resource

**Other Fixes:**
- Enabled `devtools` feature in Cargo.toml for release builds
- Set `authors` in Cargo.toml to fix dpkg maintainer warning
- Reordered app.js init to load config before colours

**Files Modified:**
- `src-tauri/tauri.conf.json` - withGlobalTauri, resources bundle
- `src-tauri/Cargo.toml` - devtools feature, authors field
- `src-tauri/build.rs` - git hash with rerun-if-changed
- `src-tauri/src/main.rs` - Linux production config path
- `src/js/utils/config.js` - global Tauri API, debug logging
- `src/js/utils/colours.js` - removed HTTP dependency
- `src/js/app.js` - init order, disable autosave in Tauri
- `src/js/ui/dialogs/index.js` - removed bad export
- `src/index.html` - version element with id

---

## Project Statistics

**Rust Backend:**
- `main.rs`: ~290 lines
- 10 Tauri commands implemented

**JavaScript Frontend:**
- Vanilla JS, ES6 modules (no bundler)
- `tauri-bridge.js`: Bridge module for Tauri API
- `config.js`: Configuration loading via Tauri commands
- `colours.js`: Colour utilities (no HTTP dependencies)

**Configuration:**
- `.env`: 2 environment variables (paths)
- `defaults.json`: ~80 lines of UI configuration (JSON format)

**Documentation:**
- `CLAUDE.md`: Project overview and guidance
- `HISTORY.md`: Development history (this file)
- `README.md`: User-facing documentation
- `MIGRATION_TO_TAURI.md`: Migration guide
- `CHEAT_SHEET.md`: Command reference

---

*Version: 1.0.1*
*Last Updated: January 2026*
