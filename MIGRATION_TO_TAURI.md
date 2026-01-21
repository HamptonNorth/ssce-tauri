# SSCE Migration to Tauri

Guide for migrating SSCE (Simple Screen Capture Editor) from a Bun/browser app to a Tauri desktop application.

## Prerequisites

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Choose option 1 (default)
source ~/.cargo/env
rustc --version  # Verify: 1.92.0 or later
```

### 2. Install Tauri CLI

```bash
cargo install tauri-cli --version "^2"
```

### 3. Install System Dependencies (Linux)

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev \
    libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

## Project Structure

```
ssce-tauri/
├── src/                      # Web content (from ssce/public/)
│   ├── index.html
│   ├── js/
│   ├── css/
│   └── ...
├── src-tauri/                # Tauri/Rust backend
│   ├── Cargo.toml            # Rust dependencies
│   ├── tauri.conf.json       # Tauri configuration
│   ├── capabilities/         # Security permissions
│   ├── icons/                # App icons (PNG, RGBA)
│   └── src/
│       └── main.rs           # Rust entry point
└── README.md
```

## Migration Steps

### Step 1: Create Project Directory

```bash
mkdir ssce-tauri
cd ssce-tauri
mkdir -p src src-tauri/src src-tauri/icons src-tauri/capabilities
```

### Step 2: Copy Web Content

```bash
cp -r /path/to/ssce/public/* src/
```

### Step 3: Create Tauri Configuration

**src-tauri/tauri.conf.json:**
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "SSCE Desktop",
  "version": "0.1.0",
  "identifier": "com.ssce.desktop",
  "build": {
    "frontendDist": "../src"
  },
  "app": {
    "windows": [
      {
        "title": "SSCE Desktop",
        "width": 1200,
        "height": 800,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png"
    ]
  }
}
```

### Step 4: Create Cargo.toml

**src-tauri/Cargo.toml:**
```toml
[package]
name = "ssce-desktop"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

### Step 5: Create Rust Entry Point

**src-tauri/src/main.rs:**
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**src-tauri/build.rs:**
```rust
fn main() {
    tauri_build::build()
}
```

### Step 6: Create Capabilities

**src-tauri/capabilities/default.json:**
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "identifier": "default",
  "description": "Default capabilities for SSCE",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open"
  ]
}
```

### Step 7: Create Icons

Icons must be PNG format with RGBA color space:
- `icons/32x32.png` - 32x32 pixels
- `icons/128x128.png` - 128x128 pixels  
- `icons/128x128@2x.png` - 256x256 pixels

### Step 8: Build and Run

```bash
cd src-tauri
cargo tauri dev      # Development mode with hot reload
cargo tauri build    # Production build
```

## File Operations Migration

SSCE's HTTP-based file operations need to be converted to Tauri commands:

### Current (HTTP)
```javascript
// ssce/server.js endpoints
GET /api/browse?dir=path
GET /api/load?path=file
POST /api/save
```

### Target (Tauri Commands)
```rust
// src-tauri/src/main.rs
#[tauri::command]
fn browse_directory(dir: String) -> Result<Vec<FileInfo>, String> {
    // Implementation
}

#[tauri::command]
fn load_image(path: String) -> Result<String, String> {
    // Return base64 encoded image
}

#[tauri::command]
fn save_image(path: String, data: String) -> Result<(), String> {
    // Save base64 data to file
}
```

```javascript
// Client-side
import { invoke } from '@tauri-apps/api/core';
const files = await invoke('browse_directory', { dir: '/path' });
```

## Differences from Browser Version

| Feature | Browser (Bun) | Tauri Desktop |
|---------|---------------|---------------|
| File access | HTTP endpoints | Native filesystem |
| Dialogs | Browser dialogs | Native OS dialogs |
| Clipboard | Clipboard API | Native clipboard |
| App size | N/A (browser) | ~13MB binary |
| Dependencies | Bun runtime | None (standalone) |

## Known Issues

1. **AppImage bundling** may fail on some systems - use .deb or .rpm instead
2. **Icons must be RGBA** - RGB-only PNGs cause build errors
3. **WebKitGTK version** - Requires 4.1 series on Linux

## Resources

- [Tauri v2 Documentation](https://v2.tauri.app/)
- [Tauri Commands Guide](https://v2.tauri.app/develop/calling-rust/)
- [Tauri Plugins](https://v2.tauri.app/plugin/)
