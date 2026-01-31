# SSCE Desktop v1.3.0 Implementation Plan

**Goal**: Enhanced export capabilities, macOS support, precision editing tools, and testing foundation

**Estimated Duration**: 3-4 weeks

**Features**:
| # | Feature | Effort | Priority |
|---|---------|--------|----------|
| 1 | Testing Foundation (Bun + Playwright) | 4-5 days | High |
| 2 | Print Positioning (top/center/bottom) | 1 day | Low |
| 3 | macOS Platform Build | 1-2 days | Medium |
| 4 | Bulk Export & Backup | 4-5 days | High |
| 5 | Smart Guides | 5-7 days | High |
| 6 | Release | 1 day | - |

---

## Phase 1: Testing Foundation

**Goal**: Establish testing infrastructure before adding new features

This phase comes first to ensure we can validate all subsequent changes.

### 1.1 Bun Test Setup for Unit Tests

- Create `bunfig.toml` with test configuration
- Create `tests/unit/` directory structure
- Write initial unit tests for utility functions:
  - `src/js/utils/colours.js` - Color conversion functions
  - `src/js/utils/geometry.js` - Point/rectangle calculations (if exists)
  - `src/js/utils/ssce-format.js` - Serialization helpers (pure functions only)

**Files**:
- `bunfig.toml` - Bun configuration
- `tests/unit/colours.test.js`
- `tests/unit/ssce-format.test.js`

**Run**: `bun test`

### 1.2 Playwright Setup for E2E Tests

- Install Playwright: `bun add -d @playwright/test`
- Create `playwright.config.js` with Tauri app configuration
- Create `tests/e2e/` directory structure
- Write smoke test that:
  - Launches the Tauri app
  - Verifies window opens
  - Checks basic UI elements are present

**Files**:
- `playwright.config.js`
- `tests/e2e/smoke.spec.js`

**Run**: `bunx playwright test`

### 1.3 CI Integration

- Add test jobs to GitHub Actions workflow
- Run unit tests on every push
- Run E2E tests on release builds

**Files**:
- `.github/workflows/test.yml` (new workflow)
- Update `.github/workflows/release.yml` to run tests before build

### Testing Checkpoint 1

- [ ] `bun test` runs successfully with sample unit tests
- [ ] `bunx playwright test` launches app and passes smoke test
- [ ] GitHub Actions runs tests on push

---

## Phase 2: Print Positioning

**Goal**: Add image positioning options to print output

### 2.1 Update Configuration Schema

- Add `imagePosition` to print settings in `defaults.json`
- Options: `"top"`, `"center"` (default), `"bottom"`

**Files**:
- `src/config/defaults.json`

### 2.2 Update Print Dialog UI

- Add position selector (radio buttons or dropdown) to print dialog
- Wire up to state/config

**Files**:
- `src/js/ui/dialogs/image-dialogs.js` (or relevant dialog file)
- `src/css/app.css` (if styling needed)

### 2.3 Update Print Generation

- Modify `generatePrintContent()` in export.js to accept position parameter
- Adjust CSS flexbox alignment based on position:
  ```css
  /* top */    justify-content: flex-start;
  /* center */ justify-content: center;
  /* bottom */ justify-content: flex-end;
  ```
- Ensure footer positioning works correctly with all options

**Files**:
- `src/js/utils/export.js`

### 2.4 Write Tests for Print Positioning

- Unit test for `generatePrintContent()` with different positions
- E2E test: Open print dialog → change position → verify preview

**Files**:
- `tests/unit/export.test.js`
- `tests/e2e/print.spec.js`

### Testing Checkpoint 2

- [ ] Print dialog shows position options
- [ ] HTML output correctly positions image at top/center/bottom
- [ ] Footer remains at bottom regardless of image position
- [ ] Unit tests pass for export functions
- [ ] Settings persist after restart

---

## Phase 3: macOS Platform Build

**Goal**: Add macOS to supported platforms via GitHub Actions

### 3.1 Update GitHub Actions Workflow

- Add `build-macos` job to release.yml
- Use `macos-latest` runner
- Install Rust toolchain and Tauri CLI
- Build command: `cargo tauri build`
- Upload `.dmg` and `.app` artifacts

**Files**:
- `.github/workflows/release.yml`

### 3.2 macOS-Specific Configuration (if needed)

- Review `tauri.conf.json` for macOS bundle settings
- Ensure `icon.icns` is properly configured (already present)
- Test system tray behavior on macOS (menu bar conventions)

**Files**:
- `src-tauri/tauri.conf.json` (review, likely no changes)

### 3.3 Code Signing Research (Documentation)

- Document Apple Developer Program requirements
- Document code signing and notarization process
- Create issue/task for future signing implementation

**Files**:
- `docs/macos-signing.md` (new documentation)

### 3.4 Test macOS Build

- Trigger workflow manually
- Download and test `.dmg` on macOS (if available)
- Document any platform-specific issues

**Files**:
- `HISTORY.md` (update with macOS notes)

### Testing Checkpoint 3

- [ ] GitHub Actions successfully builds macOS artifacts
- [ ] `.dmg` file is created and uploaded to release
- [ ] App launches on macOS (if testable)
- [ ] System tray works on macOS (if testable)
- [ ] File dialogs work on macOS (if testable)

---

## Phase 4: Bulk Export & Backup

**Goal**: Export .ssce files to PNG/JPEG with backup/archive capabilities

This feature serves dual purposes:
1. **Data portability** - Users aren't locked into the .ssce format
2. **Backup system** - Monthly archives with standard image formats

### 4.1 Design Bulk Export Dialog

UI mockup with date filtering and ZIP support:

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

**Key features**:
- Date-based filtering using `YYYY-MM-DD` in filenames
- Month selector with file counts per month
- ZIP archive option for portable backups
- Auto-suggested ZIP filename based on date selection
- Optional subfolder organization by month within ZIP

**Files**:
- `src/js/ui/dialogs/bulk-export-dialog.js` (new)
- `src/css/app.css` (dialog styling)

### 4.2 Implement Rust Backend Commands

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

**Files**:
- `src-tauri/Cargo.toml` - Add `zip` crate
- `src-tauri/src/main.rs` - Add new commands
- `src-tauri/capabilities/default.json` - Add permissions if needed

### 4.3 Implement Frontend Export Logic

- Load each .ssce file using existing `loadSsce()` function
- Render to offscreen canvas (reuse existing rendering code)
- Convert to PNG/JPEG data URL based on format selection
- For ZIP output: collect all files, call Rust ZIP command
- Handle snapshots: export each as `filename_snapshot_N.png`
- Progress reporting via callback (update progress bar)

**Files**:
- `src/js/utils/bulk-export.js` (new)
- `src/js/file-operations.js` (add menu item handler)

### 4.4 Date Filtering Logic

- Parse `YYYY-MM-DD` pattern from filenames using regex
- Group files by month for month selector
- Filter functions:
  - `filterByMonth(files, yearMonth)` - e.g., "2025-12"
  - `filterByDateRange(files, startDate, endDate)`
  - `filterBySelectedMonths(files, months[])`
- Update file count display when filter changes

**Files**:
- `src/js/utils/bulk-export.js`

### 4.5 Add Menu Item

- Add "Bulk Export / Backup..." to File menu
- Keyboard shortcut: Ctrl+Shift+E

**Files**:
- `src/js/ui/menus/file-menu.js` (or equivalent)
- `src/js/ui/keyboard-shortcuts.js` (if exists)

### 4.6 Determine Optimal Format Automatically

- If source image has transparency → PNG
- If source image is photo/no transparency → JPEG
- Add "Auto" option to format selector (default)

**Files**:
- `src/js/utils/bulk-export.js`

### 4.7 Write Tests for Bulk Export

**Unit tests**:
- Date parsing from filenames
- Month grouping logic
- Format detection (transparency check)
- Filter functions

**E2E tests**:
- Open dialog → select folder → verify file counts
- Date filter changes → file count updates
- Export to folder → verify output files
- Export to ZIP → verify archive contents

**Files**:
- `tests/unit/bulk-export.test.js`
- `tests/e2e/bulk-export.spec.js`
- `tests/fixtures/` - Sample .ssce files with various dates

### Testing Checkpoint 4

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

---

## Phase 5: Smart Guides

**Goal**: Automatic alignment guides when dragging objects

### 5.1 Design Smart Guides System

**Alignment types to detect**:
- **Edge alignment**: Left, right, top, bottom edges match other objects
- **Center alignment**: Horizontal/vertical centers match
- **Canvas alignment**: Object aligns with canvas center

**Visual feedback**:
- Dashed line (1px, semi-transparent blue or magenta)
- Line extends across canvas at alignment point
- Optional: Small label showing alignment type

**Snap behavior**:
- Snap threshold: 5-8 pixels (configurable)
- Smooth snap (object jumps to aligned position)
- Hold modifier key (Ctrl?) to temporarily disable snapping

### 5.2 Create Smart Guides Module

`src/js/utils/smart-guides.js`:

```javascript
// Core functions
findAlignmentCandidates(layers, excludeId) → Array<AlignmentPoint>
detectAlignments(draggingBounds, candidates, threshold) → Array<Alignment>
calculateSnappedPosition(originalPos, alignments) → {x, y}

// Rendering
drawGuideLines(ctx, alignments, canvasSize)
clearGuideLines(ctx)
```

**Files**:
- `src/js/utils/smart-guides.js` (new)

### 5.3 Integrate with Select Tool

- Modify `handleMouseMove()` in select tool during drag:
  1. Get current drag position
  2. Calculate dragged object bounds
  3. Find alignments with other layers
  4. Apply snap if within threshold
  5. Store active alignments for rendering
- Modify `handleMouseUp()` to clear guides

**Files**:
- `src/js/tools/select.js`

### 5.4 Integrate with Canvas Rendering

- Add guide line rendering layer (drawn after objects, before handles)
- Guide lines should be drawn in screen space (not affected by zoom)
- Use composition to avoid affecting object rendering

**Files**:
- `src/js/canvas.js`

### 5.5 Add Configuration Options

Add to `defaults.json`:

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

**Files**:
- `src/config/defaults.json`
- `src/js/ui/menus/view-menu.js` (or settings)

### 5.6 Performance Optimization

- Cache alignment candidates (recalculate only when layers change)
- Limit candidates to visible/nearby objects for large documents
- Use requestAnimationFrame for smooth guide rendering

**Files**:
- `src/js/utils/smart-guides.js`

### 5.7 Write Tests for Smart Guides

**Unit tests**:
- `findAlignmentCandidates()` returns correct points
- `detectAlignments()` finds alignments within threshold
- `calculateSnappedPosition()` returns correct snap position

**E2E tests**:
- Drag object near another → guide appears
- Release → object snaps to aligned position
- Disable guides → no snapping occurs

**Files**:
- `tests/unit/smart-guides.test.js`
- `tests/e2e/smart-guides.spec.js`

### Testing Checkpoint 5

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

## Phase 6: Release v1.3.0

**Goal**: Version bump, documentation, and release

### 6.1 Version Bump

Update version to 1.3.0 in:
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CLAUDE.md`

### 6.2 Update Documentation

- Update CLAUDE.md with v1.3.0 features marked as complete
- Update HISTORY.md with release notes
- Review README if exists

**Files**:
- `CLAUDE.md`
- `HISTORY.md`

### 6.3 Final Testing

- Full regression test on Linux
- Full regression test on Windows
- Full regression test on macOS (if available)
- Run complete test suite: `bun test && bunx playwright test`

**Checklist**:
- [ ] All v1.2.0 features still work
- [ ] Print positioning works
- [ ] Bulk export works
- [ ] Smart guides work
- [ ] macOS build works

### 6.4 Create Release

- Tag release: `git tag v1.3.0`
- Push tag to trigger GitHub Actions
- Verify all platform builds complete
- Download and smoke test each artifact
- Publish release with release notes

### Release Checkpoint

- [ ] All tests pass
- [ ] Version numbers updated
- [ ] Documentation updated
- [ ] GitHub release created
- [ ] Linux artifacts work (.deb, .AppImage)
- [ ] Windows artifacts work (.exe, .msi)
- [ ] macOS artifacts work (.dmg)

---

## Quick Reference: All New Files

| File | Phase | Purpose |
|------|-------|---------|
| `bunfig.toml` | 1 | Bun test configuration |
| `playwright.config.js` | 1 | Playwright E2E configuration |
| `tests/unit/colours.test.js` | 1 | Unit tests for colour utilities |
| `tests/unit/ssce-format.test.js` | 1 | Unit tests for .ssce format |
| `tests/e2e/smoke.spec.js` | 1 | E2E smoke test |
| `.github/workflows/test.yml` | 1 | CI test workflow |
| `tests/unit/export.test.js` | 2 | Unit tests for print/export |
| `tests/e2e/print.spec.js` | 2 | E2E print dialog tests |
| `docs/macos-signing.md` | 3 | macOS signing documentation |
| `src/js/ui/dialogs/bulk-export-dialog.js` | 4 | Bulk export dialog UI |
| `src/js/utils/bulk-export.js` | 4 | Bulk export logic |
| `tests/unit/bulk-export.test.js` | 4 | Unit tests for bulk export |
| `tests/e2e/bulk-export.spec.js` | 4 | E2E bulk export tests |
| `tests/fixtures/*.ssce` | 4 | Test fixture files |
| `src/js/utils/smart-guides.js` | 5 | Smart guides module |
| `tests/unit/smart-guides.test.js` | 5 | Unit tests for smart guides |
| `tests/e2e/smart-guides.spec.js` | 5 | E2E smart guides tests |

---

## Quick Reference: Modified Files

| File | Phases | Changes |
|------|--------|---------|
| `src/config/defaults.json` | 2, 5 | Add print position, smart guides config |
| `src/js/utils/export.js` | 2 | Add position parameter to print |
| `src/js/ui/dialogs/image-dialogs.js` | 2 | Add position UI to print dialog |
| `.github/workflows/release.yml` | 1, 3 | Add tests, add macOS build |
| `src-tauri/Cargo.toml` | 4, 6 | Add zip crate, version bump |
| `src-tauri/src/main.rs` | 4 | Add bulk export commands |
| `src-tauri/tauri.conf.json` | 6 | Version bump |
| `src/js/file-operations.js` | 4 | Add bulk export menu handler |
| `src/js/tools/select.js` | 5 | Integrate smart guides |
| `src/js/canvas.js` | 5 | Add guide rendering |
| `src/css/app.css` | 2, 4 | Dialog styling |
| `CLAUDE.md` | 6 | Mark features complete |
| `HISTORY.md` | 3, 6 | Release notes |

---

## Backup Workflow Example

User's monthly routine:
1. Open Bulk Export / Backup (File menu or Ctrl+Shift+E)
2. Select source folder (ssce library)
3. Select "Last month" filter
4. Format: Auto
5. Include snapshots: Yes
6. Output: Export to ZIP archive
7. ZIP filename auto-suggests: `ssce-backup-2025-12.zip`
8. Click Export

**Result**: Complete, portable backup containing:
- Standard image files (PNG/JPEG) for every .ssce
- Separate files for each snapshot
- Organized by month in subfolders (optional)

This mitigates user concerns about proprietary .ssce format lock-in.

---

*Plan Version: 1.0*
*Created: January 2026*
*Target Release: v1.3.0*
