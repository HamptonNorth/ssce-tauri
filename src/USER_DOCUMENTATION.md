# SSCE Desktop - User Guide

**Version:** 1.2.0  
**Last Updated:** January 2026

A simple, powerful screen capture editor for annotating screenshots and images. Add arrows, text, highlights, and more with an intuitive interface.

---

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [The Interface](#the-interface)
4. [Annotation Tools](#annotation-tools)
5. [Working with Layers](#working-with-layers)
6. [Auto-Save and Recovery](#auto-save-and-recovery)
7. [Saving Your Work](#saving-your-work)
8. [Library & Search](#library--search)
9. [Bulk Export & Backup](#bulk-export--backup)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Tips & Tricks](#tips--tricks)
12. [Troubleshooting](#troubleshooting)
13. [Appendix: Technical Details](#appendix-technical-details)

---

## Installation

### Windows 11

1. Download `SSCE-Desktop_x.x.x_x64-setup.exe` from the releases page
2. Double-click the installer
3. If Windows Defender shows a warning, click "More info" then "Run anyway"
4. Follow the installation wizard
5. Launch SSCE Desktop from the Start menu or desktop shortcut

**To uninstall:** Settings > Apps > SSCE Desktop > Uninstall

### Linux

**Debian/Ubuntu (.deb):**
```
sudo dpkg -i ssce-desktop_x.x.x_amd64.deb
```

**Fedora/RHEL (.rpm):**
```
sudo rpm -i ssce-desktop-x.x.x.x86_64.rpm
```

**AppImage (any distribution):**
1. Download the `.AppImage` file
2. Right-click > Properties > Permissions > "Allow executing as program"
3. Double-click to run

**To uninstall:** Use your system's package manager or delete the AppImage file

---

## Getting Started

### Opening an Image

**Method 1: File Menu**
1. Click **File > Open** (or press Ctrl+O)
2. Navigate to your image in the file browser
3. Select the file and click "Open"

**Method 2: Drag and Drop**
- Simply drag an image file from your file manager and drop it onto SSCE Desktop

**Method 3: Paste from Clipboard**
1. Copy an image in another application (screenshot tool, web browser, etc.)
2. In SSCE Desktop, press Ctrl+V
3. Choose "Replace" to open as new image, or "Combine" to add to existing

### Supported Image Formats

- **Open:** PNG, JPG, JPEG, GIF, WebP, BMP
- **Save:** PNG, JPG
- **Project files:** .ssce (preserves layers for later editing)

---

## The Interface

```
┌─────────────────────────────────────────────────────────────┐
│  File   [Tools]   [Colours]   [Line Style]   [Text Size]    │  Toolbar
├─────────────────────────────────────────────────────────────┤
│  [Tool Settings Panel - appears when tool selected]         │  Property Card
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    Your Image Canvas                        │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  • filename.png                    800 × 600      Undo Redo │  Status Bar
└─────────────────────────────────────────────────────────────┘
```

### Status Bar Indicators

- **Dot (•) before filename:** You have unsaved changes
- **Dimensions:** Current canvas size in pixels
- **Undo/Redo buttons:** Click to undo or redo actions

### Property Cards

When you select a drawing tool, a settings panel slides down showing options for that tool:

| Tool | Available Settings |
|------|-------------------|
| Arrow | Colour, line style, line width |
| Line | Colour, line style, line width |
| Text | Colour, size |
| Steps | Colour, size |
| Symbols | Symbol picker, size |
| Rectangle | Border colour, fill colour, line style, border width, corner style |
| Highlight | Colour |

---

## Annotation Tools

### Select Tool (V)

Use to select, move, and edit existing annotations.

**Basic Selection:**
- Click any annotation to select it (shows blue outline)
- Drag to move the selected item
- Press Delete to remove it

**Selecting Multiple Items:**
- Hold Ctrl and click each item
- All selected items move together when dragged
- Press Delete to remove all selected items

**Right-Click Menu:**
- Right-click any selected item for quick actions:
  - Bring to Front / Send to Back
  - Flatten Selected (merge multiple items)
  - Delete

### Arrow Tool (A)

Draw arrows to point out features in your image.

**How to Draw:**
1. Click and hold where you want the arrow to start
2. Drag to where you want the arrowhead
3. Release the mouse button

**Tip:** Hold Shift while drawing to snap to perfectly horizontal or vertical.

### Line Tool (L)

Draw straight lines without arrowheads.

**How to Draw:**
1. Click and hold at the starting point
2. Drag to the end point
3. Release the mouse button

### Rectangle Tool (R)

Draw rectangles to frame or highlight areas.

**How to Draw:**
1. Click and hold at one corner
2. Drag to the opposite corner
3. Release the mouse button

**Options in Property Card:**
- Border colour and fill colour
- Line style: solid, dashed, or dotted
- Corner style: square or rounded

### Text Tool (T)

Add text labels and annotations.

**How to Add Text:**
1. Click where you want the text
2. Type your text (press Enter for new lines)
3. Click outside the text area or press Escape when done

### Steps Tool (N)

Add numbered circles for step-by-step instructions.

**How to Use:**
1. Click to place step 1
2. Click again to place step 2, and so on
3. Numbers auto-increment

**Right-click** on the canvas to change the next step number.

### Symbols Tool (Y)

Add emoji symbols for visual indicators.

**How to Use:**
1. Select a symbol from the property card grid
2. Click on the canvas to place it

### Highlight Tool (H)

Draw semi-transparent rectangles to highlight areas.

**How to Use:**
1. Click and drag to draw a highlight rectangle
2. The highlight is semi-transparent (30% opacity)

**Tip:** Yellow is the classic highlighter colour, but any colour works.

### Combine Tool (C)

Merge two images together side-by-side or stacked.

**How to Use:**
1. Open your first image
2. Click Combine tool (or paste a second image)
3. Choose position: Above, Below, Left, or Right
4. Click "Apply" when positioned correctly

### Fade Edges Tool (F)

Fade edges to transparent for seamless embedding in documents.

**How to Use:**
1. Click the edge buttons to select which edges to fade
2. Drag the handles to adjust fade width
3. Press Ctrl+Enter to apply, or Escape to cancel

### Borders Tool

Add borders around your entire image.

**How to Use:**
1. Select Borders from the More Tools menu
2. Adjust width, colour, and corner radius
3. Click Apply

---

## Working with Layers

Every annotation you add creates a new layer. This means:

- **Your original image is never modified** - annotations sit on top
- **You can undo any change** - full history available
- **You can rearrange order** - put text in front of arrows, etc.
- **You can edit individual items** - move, resize, or delete

### Changing Layer Order

If an annotation is hidden behind another:
1. Select the item you want to move
2. Right-click and choose:
   - **Bring to Front** - move to very top
   - **Bring Forward** - move up one level
   - **Send Backward** - move down one level
   - **Send to Back** - move to very bottom

### Flattening Layers

**Flatten All** (File menu): Merges everything into a single image. Use before final export.

**Flatten Selected** (right-click menu): Merges only selected items. Useful for grouping related annotations together.

---

## Auto-Save and Recovery

SSCE Desktop automatically saves your work in the background to protect against crashes and unexpected closures.

### How Auto-Save Works

- After 30 seconds of inactivity, SSCE automatically saves your current session
- Auto-save files are stored in a temporary location (`~/.ssce-temp/` on Linux, `%APPDATA%\.ssce-temp\` on Windows)
- The auto-save is updated each time you stop working for 30 seconds
- Auto-save files are deleted when you save normally or close the app cleanly

### Crash Recovery

If SSCE closes unexpectedly (crash, power loss, etc.):

1. On next launch, SSCE will detect the recovery file
2. A dialog will appear offering to recover your work
3. Choose **Recover** to restore your session, or **Discard** to start fresh

**Note:** After recovery, you can undo back to the recovered state, but the full edit history from before the crash is not preserved.

### Snapshots for Extra Protection

For important work, use **Snapshots** to create recovery points you control:

- Snapshots are saved inside your .ssce project file
- You can view and restore any snapshot later
- Snapshots persist even after closing and reopening the file

**Snapshot Reminder:** After approximately 20 edits, SSCE will prompt you to take a snapshot. You can:
- **Take Snapshot** - Create a recovery point now
- **Remind Later** - Ask again after more edits
- **Don't Remind** - Disable reminders for this session

**What counts as an edit:**
- Adding any annotation (arrow, text, shape, etc.)
- Moving or resizing an existing annotation
- Deleting an annotation
- Combining images

**Tip:** You can adjust or disable the snapshot reminder by changing `snapshotReminderEdits` in the settings (set to 0 to disable).

### Creating a Snapshot Manually

1. Click **File > Add Snapshot** (or use the snapshot button)
2. Enter a title and optional description
3. Click **Save**

### Viewing and Restoring Snapshots

1. Click **File > View Snapshots**
2. Browse through your saved snapshots
3. Click **Restore** to return to that point

---

## Saving Your Work

### Quick Save (Ctrl+S)

Saves to the current file, overwriting it.

### Save As (Ctrl+Shift+S)

Opens a save dialog where you can:
- Choose a new filename
- Select a different folder
- Choose format (PNG or JPG)

### Saving as .ssce (Project File)

The .ssce format preserves all your layers, so you can:
- Close the file and come back later
- Continue editing with all annotations still separate
- Make changes without starting over

**To save as .ssce:**
1. Click File > Save As
2. Choose "SSCE Files" in the format dropdown
3. Enter a filename and click Save

### Saving for Sharing

For sharing with others, save as PNG or JPG:
- **PNG** - Best quality, supports transparency
- **JPG** - Smaller file size, good for photos

---

## Library & Search

SSCE Desktop maintains a library of your .ssce files, making it easy to find and reopen previous work.

### Recent Files

Access your recently opened files via **File > Recent Files** or press **Ctrl+R**.

The Recent Files dialog shows:
- Thumbnail preview of each file
- Filename and title
- Last modified date
- Snapshot count (shown as a badge)

Click any file to open it immediately.

**Rebuild from Library:** If your recent files list is incomplete (e.g., after migrating from another computer), click the "Rebuild from Library" button to scan your library folder and re-index all .ssce files.

### Search Library

For larger collections, use **File > Search Library** or press **Ctrl+Shift+F** to search across all your .ssce files.

**Search options:**
- **Text search** - Matches filename, title, summary, and keywords
- **Date range** - Filter by modification date (From/To)

The search uses full-text indexing, so partial matches work (typing "scr" finds "screenshot").

**Date format:** Enter dates in your local format (e.g., 15/1/2026 for UK, 1/15/2026 for US). The placeholder shows an example in your locale.

### Library Location

By default, .ssce files are saved to your library folder organised by year-month (e.g., `2026-01/`).

Configure the library path in **Settings** (gear icon in toolbar) under `paths.libraryPath`.

---

## Bulk Export & Backup

SSCE Desktop can batch-export your .ssce files to standard image formats, or back them up as a ZIP archive. Open via **File > Bulk Export / Backup** or press **Ctrl+Shift+E**.

The dialog has two modes, selectable at the top:

### Mode 1: Export as Images (PNG/JPEG)

Converts .ssce files to standard image formats for sharing or archiving outside SSCE.

**How to use:**
1. Select **Export as images (PNG/JPEG)** mode
2. Browse to your source folder containing .ssce files
3. Use the date filter to narrow down which files to export:
   - **All files** - exports everything
   - **This month / Last month** - quick filters with file counts shown
   - **Custom range** - pick start and end dates
   - **Select months** - tick individual months from a list
4. Choose the image format:
   - **PNG** - lossless, supports transparency
   - **JPEG** - smaller files, no transparency
   - **Auto** - PNG if the image has transparency, JPEG otherwise
5. Optionally tick **Include snapshots as separate files** to export each snapshot as its own image
6. Choose output type:
   - **Export to folder** - saves individual image files to a folder
   - **Export to ZIP archive** - bundles all images into a single ZIP
7. For ZIP output, the filename is auto-suggested with a timestamp (e.g. `ssce-backup-2026-01-2026-01-31-14-30.zip`). The full output path is shown below the filename field.
8. Optionally tick **Organize by month** to create subfolders (e.g. `2026-01/`) within the ZIP or output folder
9. Click **Export**

A progress bar shows file-by-file status during export.

### Mode 2: Backup .ssce Files to ZIP

Bundles your raw .ssce project files into a ZIP archive for portable backup. No rendering or conversion is performed - the original files are copied directly.

**How to use:**
1. Select **Backup .ssce files to ZIP** mode
2. Browse to your source folder
3. Use the date filter to select which files to include
4. Enter a ZIP filename (auto-suggested with timestamp) or click Browse to choose a save location
5. Optionally tick **Organize by month** for subfolder structure within the ZIP
6. Click **Backup**

The ZIP is saved to the source folder by default. The full output path is displayed below the filename field.

### Tips

- The ZIP filename includes a timestamp so you can run backups repeatedly without overwriting previous ones
- Use monthly backups (filter by "Last month") as part of a regular archiving workflow
- The output path is always shown so you know exactly where the file will be written

---

## Keyboard Shortcuts

### File Operations

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New canvas |
| Ctrl+O | Open file |
| Ctrl+S | Save |
| Ctrl+Shift+S | Save As |
| Ctrl+R | Recent Files |
| Ctrl+Shift+F | Search Library |
| Alt+S | Take Snapshot |
| Ctrl+Shift+E | Bulk Export / Backup |
| Ctrl+C | Copy to clipboard |
| Ctrl+V | Paste from clipboard |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+P | Print |


### Tool Selection

| Key | Tool |
|-----|------|
| V | Select |
| A | Arrow |
| L | Line |
| R | Rectangle |
| T | Text |
| N | Steps (numbers) |
| Y | Symbols |
| H | Highlight |
| C | Combine |
| F | Fade Edges |
| Escape | Deselect tool |

### Editing

| Shortcut | Action |
|----------|--------|
| Delete | Delete selected |
| Arrow keys | Move selected 10px |
| Ctrl+Arrow | Move selected 1px |
| Ctrl+Click | Add to selection |
| Shift+Drag | Snap to horizontal/vertical |

### Quick Reference Card

```
FILE                TOOLS              EDITING
────────────────────────────────────────────────
Ctrl+N  New         V  Select          Del    Delete
Ctrl+O  Open        A  Arrow           ←→↑↓   Move 10px
Ctrl+S  Save        L  Line            Ctrl+← Move 1px
Ctrl+Z  Undo        R  Rectangle       Ctrl+Click Multi-select
Ctrl+Y  Redo        T  Text            Shift+Drag Snap axis
Ctrl+C  Copy        N  Steps
Ctrl+V  Paste       Y  Symbols
Ctrl+P  Print       H  Highlight
```

---

## Tips & Tricks

### 1. Draw Straight Lines

Hold **Shift** while drawing arrows or lines to snap them perfectly horizontal or vertical.

### 2. Group Related Annotations

If you've added an arrow and text label together:
1. Select both (Ctrl+click each)
2. Right-click > Flatten Selected
3. Now they move as one unit

### 3. Match Colours from Your Image

1. Click the colour palette
2. Click the rainbow swatch to open the colour picker
3. Click "Pick from Image"
4. Click any pixel in your image to sample its colour

### 4. Quick Layer Reordering

Text hidden behind an arrow? Select the text and press **Ctrl+]** to bring it to front instantly.

### 5. Keyboard-Driven Workflow

For speed, learn the tool shortcuts:
1. Press **A** for Arrow
2. Draw your arrow
3. Press **T** for Text
4. Click and type
5. Press **V** to Select
6. Press **Ctrl+S** to Save

### 6. Create Before/After Comparisons

1. Open your "before" image
2. Paste your "after" image (Ctrl+V)
3. Choose "Combine" > "Right"
4. Both images appear side-by-side
5. Add arrows pointing to differences

### 7. Use Undo Freely

SSCE has unlimited undo. Don't be afraid to experiment - you can always press Ctrl+Z to go back.

### 8. Save Early, Save Often

Press Ctrl+S regularly to save your work. The dot (•) in the status bar reminds you when you have unsaved changes.

### 9. Toggle Background for Dark Images

When editing dark screenshots (terminal, dark mode apps), the default dark background can make edges hard to see.

**Right-click on the background area** (outside the canvas) to toggle between light and dark backgrounds for better contrast.

SSCE will also show a helpful tip when it detects you've loaded a dark image.

---

## Troubleshooting

### Image Won't Open

**Possible causes:**
- File format not supported (try PNG, JPG, or GIF)
- File is corrupted
- File permissions prevent access

**Try:** Drag and drop the image directly onto SSCE Desktop instead of using File > Open.

### Can't Select an Annotation

1. Make sure you're using the Select tool (press V)
2. Click directly on the annotation, not empty space
3. For arrows and lines, try clicking the line itself or the drag points

### Annotations Disappeared After Closing

If you closed without saving, annotations are lost. Always save your work:
- Use Ctrl+S to save regularly
- Save as .ssce to preserve layers for later editing

### Application Won't Start (Windows)

1. Try running as Administrator
2. Check if antivirus is blocking the application
3. Reinstall the application

### Application Won't Start (Linux)

For AppImage:
1. Make sure execute permission is set: `chmod +x SSCE-Desktop.AppImage`
2. Check if required libraries are installed (see Appendix)

---

## Frequently Asked Questions

**Can I edit images saved as PNG later?**

Once you save as PNG (or JPG), annotations become permanent pixels. To keep editing later, save as .ssce format which preserves layers.

**What's the difference between Save and Save As?**

- **Save** overwrites the current file
- **Save As** lets you choose a new filename and location

**Can I open SSCE files in other applications?**

No, .ssce files are specific to SSCE Desktop. Export as PNG or JPG to share with others.

**Is there a size limit for images?**

SSCE works best with images under 4000x4000 pixels. Larger images may be slow to edit.

**Can I use SSCE for batch editing?**

SSCE edits one image at a time, but you can batch-export your .ssce files to PNG/JPEG or back them up as a ZIP using **File > Bulk Export / Backup** (Ctrl+Shift+E).

---

## Getting Help

- **Bug Reports:** https://github.com/HamptonNorth/ssce-tauri/issues
- **Feature Requests:** Open an issue with [Feature Request] in the title

---

## Appendix: Technical Details

*This section is for advanced users and system administrators.*

### System Requirements

**Windows:**
- Windows 10 version 1803 or later
- Windows 11 (any version)
- 64-bit processor
- WebView2 runtime (included in Windows 11, auto-installed on Windows 10)

**Linux:**
- 64-bit processor
- WebKitGTK 4.1 or later
- GTK 3.24 or later

**Linux Dependencies (if not using AppImage):**

Ubuntu/Debian:
```
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0
```

Fedora:
```
sudo dnf install webkit2gtk4.1 gtk3
```

### File Locations

**Windows:**
- Application: `C:\Program Files\SSCE Desktop\`
- User data: `%APPDATA%\SSCE Desktop\`

**Linux:**
- Application: `/usr/bin/ssce-desktop` or AppImage location
- User data: `~/.config/ssce-desktop/`

### Command Line Usage

SSCE Desktop can be launched from the command line:

```
ssce-desktop                    # Open with empty canvas
ssce-desktop /path/to/image.png # Open specific image
```

### Building from Source

See the project README at https://github.com/HamptonNorth/ssce-tauri for build instructions.

---

**Version History:**
- v1.3.0 (Jan 2026): Bulk export & backup, print positioning, testing foundation, macOS build
- v1.2.0 (Jan 2026): Library search with SQLite/FTS5, canvas background toggle, locale-aware dates
- v1.0.0 (Jan 2026): Initial Tauri desktop release with native file dialogs

**License:** MIT

