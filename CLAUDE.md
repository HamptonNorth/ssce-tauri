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
- Auto-updates (deferred to Beyond 1.4.0)
- Native menus (optional, deferred to Beyond 1.4.0)
- Single-instance support (deferred - plugin causes window control issues)

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

---

## Implementation Plan - v1.2.0 Release

### Phase 1: Core Bug Fixes (High Impact) - COMPLETE
**Goal**: Fix issues that break core functionality

#### ~~1.1 Canvas zoom/position calculation bug~~ (DONE - was already working)

#### ~~1.2 Save/Save As filename not passed to native dialog~~ (DONE)
- Added `suggestedFilename` parameter to `handleSaveAs` and `saveAsNative`
- Filename from unified save dialog now pre-populates native file dialog

#### ~~1.3 JPG extension morphed to PNG in native dialog~~ (DONE)
- Reordered filters based on file extension so matching format is selected by default

#### Additional fixes in Phase 1:
- ~~Fix cancel flow when saving with keepSsce option~~ (DONE)
- ~~Fix JPEG transparency (composite onto white background)~~ (DONE)
- ~~Add saveUndoState after crash recovery load~~ (DONE)

---

### Phase 2: Snapshot & Undo Enhancements - COMPLETE
**Goal**: Improve snapshot workflow and undo functionality

#### ~~2.1 Snapshot reminder after N edits~~ (DONE)
- Added `snapshotReminderEdits` config (default 10, 0 to disable)
- Prompts user to take snapshot after configured number of edits
- Counter resets on manual snapshot

#### ~~2.2 Auto-tick keepSsce when snapshots exist~~ (DONE)
- Save dialog auto-ticks "Also save as .ssce" when snapshots exist

#### ~~2.3 Undo-to-snapshot when undo stack empty~~ (DONE)
- When undo stack exhausted, pressing Undo steps back through snapshots
- Redo steps forward through snapshots
- Can redo back to loaded state after undoing to snapshots
- Tracks `currentSnapshotIndex` and `savedLoadedState` in state

#### ~~2.4 Snapshot keyboard shortcut~~ (DONE)
- Alt+S takes a snapshot
- Shortcut displayed in File menu

---

### Phase 3: Settings & Persistence - COMPLETE
**Goal**: User-friendly configuration

#### ~~3.1 Move directory settings from .env to defaults.json~~ (DONE)
- Added `paths.defaultImageLoad` and `paths.defaultImageSave` to defaults.json
- Rust backend expands `~` in paths before sending to frontend
- Removed `dotenvy` dependency (no longer needed)
- Updated .env to only contain `SHOW_BUILD_TIMESTAMP`
- Users can now edit paths via Settings UI (gear icon)

#### ~~3.2 File Information dialog improvements~~ (DONE)
- Default title from filename when saving .ssce
- Subtitle explains .ssce save when triggered by keepSsce checkbox
- "Auto snapshot step N" title for auto-prompted snapshots

---

### Phase 4: Code Review & Refactor
**Goal**: Review codebase health before release

#### 4.1 Review JavaScript architecture
- Assess module organization and dependencies
- Identify code duplication or overly complex functions
- Check for consistent error handling patterns
- Review state management (state.js) for bloat or tight coupling

#### 4.2 Review Rust backend
- Check command organization in main.rs
- Assess error handling consistency
- Identify any security concerns

#### 4.3 Refactor if needed
- Only refactor if significant issues found
- Keep changes minimal and focused
- Ensure all tests pass after changes

---

### Phase 5: Release v1.2.0
**Goal**: Version bump and release

#### 5.1 Bump version to 1.2.0
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CLAUDE.md` (this file)
- `package.json` (if exists)
- User documentation version references

#### 5.2 GitHub Actions release
- Trigger release workflow
- Test Linux .deb/.AppImage
- Test Windows .msi/.exe

---

## Implementation Plan - v1.4.0 Release

**Goal**: Canvas editing improvements, file association, and support tooling.

---

### Phase 1: Default Starting Canvas Size in Config - COMPLETE
- Added `canvas.defaultWidth` and `canvas.defaultHeight` to `defaults.json`
- CanvasManager reads from config instead of hardcoded 800x600
- Fallback defaults in `config.js`

### Phase 2: Canvas Resize via Drag Handles - COMPLETE
- 8 HTML drag handles (4 corners + 4 edges) on canvas wrapper
- Dragging resizes canvas using existing `resize()` with anchor system
- Preview outline during drag, minimum size enforced (100x100)
- Handles visible when select tool is active
- Undoable via `saveUndoState` before resize
- **Files**: `src/js/utils/canvas-resize-handles.js` (new), `src/css/app.css`

### Phase 3: Fill Tool - COMPLETE
- New tool in "More Tools" dropdown (keyboard shortcut: F)
- Detects largest contiguous transparent rectangle at click point
- Click to preview, Ctrl+click or Enter to confirm fill
- Creates a shape layer (undoable, editable)
- **Files**: `src/js/tools/fill.js` (new), `src/js/utils/rect-detect.js` (new)

### Phase 4: Open with File Argument - COMPLETE
- Rust captures CLI args in `setup()` hook, emits `open-file` event to frontend
- Frontend listens for event, prompts to save unsaved changes, then opens file
- Supports `Exec=ssce-desktop %f` in .desktop file for file association
- Added `Emitter` trait import for Tauri event emission
- **Known limitation**: Single-instance not supported (`tauri-plugin-single-instance` causes window control issues). Opening a file from file manager launches a new app instance if already in tray.

### Phase 5: About Dialog + Gear Dropdown - COMPLETE
- Converted gear icon from single button to dropdown menu
- Dropdown items: "Edit Settings" (existing), "About SSCE Desktop" (new)
- About dialog shows: version, build date, platform, OS, kernel, monitor size, scale factor, WebView version, config paths
- "Copy to Clipboard" button for support
- Rust `get_system_info` command gathers platform/OS/monitor info
- **Files**: `src/js/ui/dialogs/about-dialog.js` (new)

### Phase 6: Documentation & Release - COMPLETE
- Version bump to 1.4.0
- Moved future features to "Beyond 1.4.0" section
- Updated CLAUDE.md with v1.4.0 features

---

## Implementation Plan - v1.3.0 Release - COMPLETE

**Goal**: Enhanced export capabilities, macOS support, precision editing tools, and testing foundation

---

### Phase 1: Testing Foundation (Priority: High) - COMPLETE
**Goal**: Establish testing infrastructure before adding new features

This phase comes first to ensure we can validate all subsequent changes.

#### 1.1 Bun Test Setup for Unit Tests
- Create `bunfig.toml` with test configuration
- Create `tests/unit/` directory structure
- Write initial unit tests for utility functions:
  - `src/js/utils/colours.js` - Color conversion functions
  - `src/js/utils/geometry.js` - Point/rectangle calculations (if exists)
  - `src/js/utils/ssce-format.js` - Serialization helpers (pure functions only)
- **Files**:
  - `bunfig.toml` - Bun configuration
  - `tests/unit/colours.test.js`
  - `tests/unit/ssce-format.test.js`
- **Run**: `bun test`

#### 1.2 Playwright Setup for E2E Tests
- Install Playwright: `bun add -d @playwright/test`
- Create `playwright.config.js` with Tauri app configuration
- Create `tests/e2e/` directory structure
- Write smoke test that:
  - Launches the Tauri app
  - Verifies window opens
  - Checks basic UI elements are present
- **Files**:
  - `playwright.config.js`
  - `tests/e2e/smoke.spec.js`
- **Run**: `bunx playwright test`

#### 1.3 CI Integration
- Add test jobs to GitHub Actions workflow
- Run unit tests on every push
- Run E2E tests on release builds
- **Files**:
  - `.github/workflows/test.yml` (new workflow)
  - Update `.github/workflows/release.yml` to run tests before build

**Testing Checkpoint 1** ✓
- [ ] `bun test` runs successfully with sample unit tests
- [ ] `bunx playwright test` launches app and passes smoke test
- [ ] GitHub Actions runs tests on push

---

### Phase 2: Print Positioning (Priority: Low complexity, quick win) - COMPLETE
**Goal**: Add image positioning options to print output

#### 2.1 Update Configuration Schema
- Add `imagePosition` to print settings in `defaults.json`
- Options: `"top"`, `"center"` (default), `"bottom"`
- **Files**:
  - `src/config/defaults.json`

#### 2.2 Update Print Dialog UI
- Add position selector (radio buttons or dropdown) to print dialog
- Wire up to state/config
- **Files**:
  - `src/js/ui/dialogs/image-dialogs.js` (or relevant dialog file)
  - `src/css/app.css` (if styling needed)

#### 2.3 Update Print Generation
- Modify `generatePrintContent()` in export.js to accept position parameter
- Adjust CSS flexbox alignment based on position:
  ```css
  /* top */    justify-content: flex-start;
  /* center */ justify-content: center;
  /* bottom */ justify-content: flex-end;
  ```
- Ensure footer positioning works correctly with all options
- **Files**:
  - `src/js/utils/export.js`

#### 2.4 Write Tests for Print Positioning
- Unit test for `generatePrintContent()` with different positions
- E2E test: Open print dialog → change position → verify preview
- **Files**:
  - `tests/unit/export.test.js`
  - `tests/e2e/print.spec.js`

**Testing Checkpoint 2** ✓
- [ ] Print dialog shows position options
- [ ] HTML output correctly positions image at top/center/bottom
- [ ] Footer remains at bottom regardless of image position
- [ ] Unit tests pass for export functions
- [ ] Settings persist after restart

---

### Phase 3: macOS Platform Build (Priority: Expand platform reach) - COMPLETE
**Goal**: Add macOS to supported platforms via GitHub Actions

#### 3.1 Update GitHub Actions Workflow
- Add `build-macos` job to release.yml
- Use `macos-latest` runner
- Install Rust toolchain and Tauri CLI
- Build command: `cargo tauri build`
- Upload `.dmg` and `.app` artifacts
- **Files**:
  - `.github/workflows/release.yml`

#### 3.2 macOS-Specific Configuration (if needed)
- Review `tauri.conf.json` for macOS bundle settings
- Ensure `icon.icns` is properly configured (already present)
- Test system tray behavior on macOS (menu bar conventions)
- **Files**:
  - `src-tauri/tauri.conf.json` (review, likely no changes)

#### 3.3 Code Signing Research (Documentation)
- Document Apple Developer Program requirements
- Document code signing and notarization process
- Create issue/task for future signing implementation
- **Files**:
  - `docs/macos-signing.md` (new documentation)

#### 3.4 Test macOS Build
- Trigger workflow manually
- Download and test `.dmg` on macOS (if available)
- Document any platform-specific issues
- **Files**:
  - `HISTORY.md` (update with macOS notes)

**Testing Checkpoint 3** ✓
- [ ] GitHub Actions successfully builds macOS artifacts
- [ ] `.dmg` file is created and uploaded to release
- [ ] App launches on macOS (if testable)
- [ ] System tray works on macOS (if testable)
- [ ] File dialogs work on macOS (if testable)

---

### Phase 4: Bulk Export & Backup (Priority: High user value) - COMPLETE
**Goal**: Export .ssce files to PNG/JPEG with backup/archive capabilities

This feature serves dual purposes:
1. **Data portability** - Users aren't locked into the .ssce format
2. **Backup system** - Monthly archives with standard image formats

#### 4.1 Design Bulk Export Dialog
- UI mockup with date filtering and ZIP support:
  ```
  ┌─ Bulk Export / Backup ────────────────────────────────┐
  │                                                       │
  │  Source folder:  [~/ssce-library       ] [Browse]     │
  │  Found: 847 .ssce files                               │
  │                                                       │
  │  ┌─ Filter by date ─────────────────────────────────┐ │
  │  │ ○ All files                                      │ │
  │  │ ○ This month (January 2026)           → 23 files │ │
  │  │ ○ Last month (December 2025)          → 45 files │ │
  │  │ ○ Custom range: [2025-10-01] to [2025-12-31]     │ │
  │  │ ○ Select months to include:                      │ │
  │  │     ☑ 2025-12  ☑ 2025-11  ☐ 2025-10  ☐ 2025-09  │ │
  │  └──────────────────────────────────────────────────┘ │
  │                                                       │
  │  Format:  ○ PNG  ○ JPEG  ● Auto                       │
  │                                                       │
  │  ☑ Include snapshots as separate files                │
  │                                                       │
  │  Output:                                              │
  │    ○ Export to folder                                 │
  │    ● Export to ZIP archive                            │
  │                                                       │
  │  ZIP filename: [ssce-backup-2025-12.zip    ] [Browse] │
  │                                                       │
  │  ☐ Organize by month in ZIP (creates subfolders)      │
  │                                                       │
  │                    [Cancel]  [Export 45 files]        │
  └───────────────────────────────────────────────────────┘
  ```
- **Key features**:
  - Date-based filtering using `YYYY-MM-DD` in filenames
  - Month selector with file counts per month
  - ZIP archive option for portable backups
  - Auto-suggested ZIP filename based on date selection
  - Optional subfolder organization by month within ZIP
- **Files**:
  - `src/js/ui/dialogs/bulk-export-dialog.js` (new)
  - `src/css/app.css` (dialog styling)

#### 4.2 Implement Rust Backend Commands
- Add `zip` crate to Cargo.toml for archive creation
- `list_ssce_files(directory: String) -> Vec<SsceFileInfo>`
  - Returns file path, parsed date, file size
  - Parses `YYYY-MM-DD` from filenames for filtering
- `get_monthly_summary(directory: String) -> Vec<MonthSummary>`
  - Returns: `[{ month: "2025-12", count: 45 }, ...]`
- `bulk_export(options: BulkExportOptions) -> BulkExportResult`
  - Options: files, format, output_dir, include_snapshots, create_zip, organize_by_month
  - Returns: `{ success: number, failed: Vec<{file, error}>, output_path }`
- `create_zip_archive(files: Vec<String>, output_path: String, organize_by_month: bool) -> Result`
- **Files**:
  - `src-tauri/Cargo.toml` - Add `zip` crate
  - `src-tauri/src/main.rs` - Add new commands
  - `src-tauri/capabilities/default.json` - Add permissions if needed

#### 4.3 Implement Frontend Export Logic
- Load each .ssce file using existing `loadSsce()` function
- Render to offscreen canvas (reuse existing rendering code)
- Convert to PNG/JPEG data URL based on format selection
- For ZIP output: collect all files, call Rust ZIP command
- Handle snapshots: export each as `filename_snapshot_N.png`
- Progress reporting via callback (update progress bar)
- **Files**:
  - `src/js/utils/bulk-export.js` (new)
  - `src/js/file-operations.js` (add menu item handler)

#### 4.4 Date Filtering Logic
- Parse `YYYY-MM-DD` pattern from filenames using regex
- Group files by month for month selector
- Filter functions:
  - `filterByMonth(files, yearMonth)` - e.g., "2025-12"
  - `filterByDateRange(files, startDate, endDate)`
  - `filterBySelectedMonths(files, months[])`
- Update file count display when filter changes
- **Files**:
  - `src/js/utils/bulk-export.js`

#### 4.5 Add Menu Item
- Add "Bulk Export / Backup..." to File menu
- Keyboard shortcut: Ctrl+Shift+E
- **Files**:
  - `src/js/ui/menus/file-menu.js` (or equivalent)
  - `src/js/ui/keyboard-shortcuts.js` (if exists)

#### 4.6 Determine Optimal Format Automatically
- If source image has transparency → PNG
- If source image is photo/no transparency → JPEG
- Add "Auto" option to format selector (default)
- **Files**:
  - `src/js/utils/bulk-export.js`

#### 4.7 Write Tests for Bulk Export
- Unit tests:
  - Date parsing from filenames
  - Month grouping logic
  - Format detection (transparency check)
  - Filter functions
- E2E tests:
  - Open dialog → select folder → verify file counts
  - Date filter changes → file count updates
  - Export to folder → verify output files
  - Export to ZIP → verify archive contents
- **Files**:
  - `tests/unit/bulk-export.test.js`
  - `tests/e2e/bulk-export.spec.js`
  - `tests/fixtures/` - Sample .ssce files with various dates

**Testing Checkpoint 4** ✓
- [ ] Bulk export dialog opens and shows folder contents
- [ ] Can select source folder and see .ssce file count
- [ ] Date filtering works (this month, last month, custom range)
- [ ] Month selector shows correct counts per month
- [ ] Export to PNG works correctly
- [ ] Export to JPEG works correctly (no transparency artifacts)
- [ ] Export to ZIP creates valid archive
- [ ] "Organize by month" creates subfolders in ZIP
- [ ] "Include snapshots" creates separate files for each snapshot
- [ ] Auto-suggested ZIP filename matches date selection
- [ ] Progress bar updates during export
- [ ] Error handling works (reports failed files)
- [ ] Auto format detection works
- [ ] All tests pass

**Estimated effort**: 4-5 days

---

### Phase 5: Smart Guides (Priority: Major feature) - COMPLETE
**Goal**: Automatic alignment guides when dragging objects

#### 5.1 Design Smart Guides System
- Alignment types to detect:
  - **Edge alignment**: Left, right, top, bottom edges match other objects
  - **Center alignment**: Horizontal/vertical centers match
  - **Canvas alignment**: Object aligns with canvas center
- Visual feedback:
  - Dashed line (1px, semi-transparent blue or magenta)
  - Line extends across canvas at alignment point
  - Optional: Small label showing alignment type
- Snap behavior:
  - Snap threshold: 5-8 pixels (configurable)
  - Smooth snap (object jumps to aligned position)
  - Hold modifier key (Ctrl?) to temporarily disable snapping
- **Files**:
  - Design document (mental model, no file needed)

#### 5.2 Create Smart Guides Module
- `src/js/utils/smart-guides.js`:
  ```javascript
  // Core functions
  findAlignmentCandidates(layers, excludeId) → Array<AlignmentPoint>
  detectAlignments(draggingBounds, candidates, threshold) → Array<Alignment>
  calculateSnappedPosition(originalPos, alignments) → {x, y}
  
  // Rendering
  drawGuideLines(ctx, alignments, canvasSize)
  clearGuideLines(ctx)
  ```
- **Files**:
  - `src/js/utils/smart-guides.js` (new)

#### 5.3 Integrate with Select Tool
- Modify `handleMouseMove()` in select tool during drag:
  1. Get current drag position
  2. Calculate dragged object bounds
  3. Find alignments with other layers
  4. Apply snap if within threshold
  5. Store active alignments for rendering
- Modify `handleMouseUp()` to clear guides
- **Files**:
  - `src/js/tools/select.js`

#### 5.4 Integrate with Canvas Rendering
- Add guide line rendering layer (drawn after objects, before handles)
- Guide lines should be drawn in screen space (not affected by zoom)
- Use composition to avoid affecting object rendering
- **Files**:
  - `src/js/canvas.js`

#### 5.5 Add Configuration Options
- Add to `defaults.json`:
  ```json
  "smartGuides": {
    "enabled": true,
    "snapThreshold": 6,
    "showCenterGuides": true,
    "showEdgeGuides": true,
    "guideColor": "#ff00ff"
  }
  ```
- Add toggle to Settings UI or View menu
- **Files**:
  - `src/config/defaults.json`
  - `src/js/ui/menus/view-menu.js` (or settings)

#### 5.6 Performance Optimization
- Cache alignment candidates (recalculate only when layers change)
- Limit candidates to visible/nearby objects for large documents
- Use requestAnimationFrame for smooth guide rendering
- **Files**:
  - `src/js/utils/smart-guides.js`

#### 5.7 Write Tests for Smart Guides
- Unit tests:
  - `findAlignmentCandidates()` returns correct points
  - `detectAlignments()` finds alignments within threshold
  - `calculateSnappedPosition()` returns correct snap position
- E2E tests:
  - Drag object near another → guide appears
  - Release → object snaps to aligned position
  - Disable guides → no snapping occurs
- **Files**:
  - `tests/unit/smart-guides.test.js`
  - `tests/e2e/smart-guides.spec.js`

**Testing Checkpoint 5** ✓
- [ ] Dragging object shows guide lines when near alignment
- [ ] Object snaps to aligned position when released
- [ ] Edge alignment works (left, right, top, bottom)
- [ ] Center alignment works (horizontal, vertical)
- [ ] Canvas center alignment works
- [ ] Guides disappear after drag ends
- [ ] Performance acceptable with 20+ objects
- [ ] Can disable guides via settings
- [ ] Holding Ctrl disables snap temporarily
- [ ] All tests pass

---

### Phase 6: Release v1.3.0
**Goal**: Version bump, documentation, and release

#### 6.1 Version Bump
- Update version to 1.3.0 in:
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
  - `CLAUDE.md`
- **Files**:
  - Listed above

#### 6.2 Update Documentation
- Update CLAUDE.md with v1.3.0 features marked as complete
- Update HISTORY.md with release notes
- Review README if exists
- **Files**:
  - `CLAUDE.md`
  - `HISTORY.md`

#### 6.3 Final Testing
- Full regression test on Linux
- Full regression test on Windows
- Full regression test on macOS (if available)
- Run complete test suite: `bun test && bunx playwright test`
- **Checklist**:
  - [ ] All v1.2.0 features still work
  - [ ] Print positioning works
  - [ ] Bulk export works
  - [ ] Smart guides work
  - [ ] macOS build works

#### 6.4 Create Release
- Tag release: `git tag v1.3.0`
- Push tag to trigger GitHub Actions
- Verify all platform builds complete
- Download and smoke test each artifact
- Publish release with release notes

**Release Checkpoint** ✓
- [ ] All tests pass
- [ ] Version numbers updated
- [ ] Documentation updated
- [ ] GitHub release created
- [ ] Linux artifacts work (.deb, .AppImage)
- [ ] Windows artifacts work (.exe, .msi)
- [ ] macOS artifacts work (.dmg)

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

## Beyond 1.4.0 (Future Consideration)

### Auto-Updates (v2.0.0)
- Implement `tauri-plugin-updater` for seamless update delivery via GitHub Releases
- Generate signing keypair, configure update manifest
- Check frequency: once per week on startup

### Flatpak Distribution
- Create Flatpak manifest for Linux distribution
- Configure sandbox permissions (file access, clipboard, tray)

### Browser Extension for Screenshot Series
- Chrome/Firefox extension for streamlined screenshot capture workflow
- Communication protocol between extension and desktop app
- Session management, viewport/region capture modes
- Significant scope expansion - evaluate feasibility separately

### Native Menus (Optional)
- Replace HTML dropdown menus with native OS menus

### Single-Instance Support
- Fix `tauri-plugin-single-instance` (currently causes window controls to stop working)
- Enable passing file paths to existing running instance from file manager

## Resources

- [Tauri v2 Docs](https://v2.tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SSCE Original Project](../ssce/)

---

*Version: 1.4.0*
*Last Updated: February 2026*
