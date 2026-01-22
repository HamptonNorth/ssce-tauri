# SSCE-Tauri Cheat Sheet

Quick reference for Tauri and Rust commands.

## Development Commands

### Run Development Mode
```bash
cd src-tauri
cargo tauri dev
```
- Opens app with hot reload
- Frontend changes: Press F5 or Ctrl+R to refresh
- Backend changes: Auto-rebuilds on save

### Build for Production
```bash
cd src-tauri
cargo tauri build
```
Outputs to `src-tauri/target/release/bundle/`:
- Linux: `.deb`, `.rpm`, `.AppImage`
- Windows: `.msi`, `.exe`
- macOS: `.dmg`, `.app`

### Check Code Without Building
```bash
cd src-tauri
cargo check          # Fast syntax/type check
cargo clippy         # Linting with suggestions
```

## Debugging

### Enable Rust Backtraces
```bash
RUST_BACKTRACE=1 cargo tauri dev
```

### Open DevTools
- In running app: Right-click > Inspect
- Or press F12 (if enabled)

### View Rust Logs
```rust
// In main.rs
println!("Debug: {:?}", some_value);
```
Output appears in terminal running `cargo tauri dev`.

## Building for Different Platforms

### Linux (current platform)
```bash
cargo tauri build
# Creates: target/release/bundle/deb/*.deb
#          target/release/bundle/rpm/*.rpm
```

### Windows (cross-compile - requires setup)
```bash
# Install Windows target
rustup target add x86_64-pc-windows-msvc

# Build (requires Windows SDK or cross-compilation tools)
cargo tauri build --target x86_64-pc-windows-msvc
```

**Note:** Cross-compiling to Windows from Linux is complex. Recommended approach:
- Use GitHub Actions with Windows runner
- Or build natively on Windows

### Windows ARM64
```bash
rustup target add aarch64-pc-windows-msvc
cargo tauri build --target aarch64-pc-windows-msvc
```

### macOS (cross-compile - requires setup)
```bash
# Install macOS target
rustup target add x86_64-apple-darwin    # Intel
rustup target add aarch64-apple-darwin   # Apple Silicon

# Build (requires macOS SDK)
cargo tauri build --target x86_64-apple-darwin
```

**Note:** Cross-compiling to macOS from Linux requires:
- macOS SDK (osxcross)
- Code signing for distribution

### CI/CD Approach (Recommended)
Use GitHub Actions to build on native platforms:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: tauri-apps/tauri-action@v0
        with:
          tagName: v__VERSION__
          releaseName: 'SSCE Desktop v__VERSION__'
```

## Rust Basics

### Add a Tauri Command
```rust
// In main.rs
#[tauri::command]
fn my_command(arg: String) -> Result<String, String> {
    Ok(format!("Received: {}", arg))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![my_command])
        .run(tauri::generate_context!())
        .expect("error");
}
```

### Call from JavaScript
```javascript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('my_command', { arg: 'hello' });
```

### Add a Dependency
```bash
cd src-tauri
cargo add serde_json      # Add new crate
cargo add tokio --features full  # With features
```

Or edit `Cargo.toml` manually:
```toml
[dependencies]
serde_json = "1.0"
```

## Common Tasks

### Update Tauri
```bash
cargo install tauri-cli --version "^2" --force
cd src-tauri
cargo update
```

### Clean Build
```bash
cd src-tauri
cargo clean              # Remove target/
cargo tauri build        # Fresh build
```

### Check Binary Size
```bash
ls -lh src-tauri/target/release/ssce-desktop
```

### Run Release Binary Directly
```bash
./src-tauri/target/release/ssce-desktop
```

## Configuration Reference

### tauri.conf.json Key Settings
```json
{
  "productName": "SSCE Desktop",    // App name
  "version": "0.1.0",               // App version
  "identifier": "com.ssce.desktop", // Unique ID
  "build": {
    "frontendDist": "../src"        // Web content path
  },
  "app": {
    "windows": [{
      "title": "SSCE Desktop",
      "width": 1200,
      "height": 800
    }]
  }
}
```

### Enable DevTools in Production
```json
{
  "app": {
    "windows": [{
      "devtools": true
    }]
  }
}
```

## Troubleshooting

### "linker not found"
```bash
sudo apt install build-essential
```

### "webkit2gtk not found"
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

### "icon not RGBA"
Icons must have alpha channel. Convert with:
```bash
convert input.png -define png:color-type=6 output.png
```

### Slow builds
```bash
# Use mold linker (faster)
sudo apt install mold
RUSTFLAGS="-C link-arg=-fuse-ld=mold" cargo tauri build
```

## Resources

- [Tauri v2 Docs](https://v2.tauri.app/)
- [Tauri GitHub](https://github.com/tauri-apps/tauri)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Cargo Book](https://doc.rust-lang.org/cargo/)


To view the progress of your GitHub Actions, you have several options ranging from the standard web interface to the command line.

### 1. The GitHub Web Interface (Most Common)

This is the most direct way to see real-time progress, including which jobs are running and which steps are currently executing.

* **Navigate to the "Actions" Tab:** In your repository, click the **Actions** tab at the top.
* **Select a Workflow Run:** You will see a list of recent workflow runs. Click on the specific run (usually the one at the top with a yellow spinning icon) to see its details.
* **The Visualization Graph:** Once inside a run, GitHub displays a live graph showing the dependencies between jobs.
* **Yellow/Spinning:** Job is in progress.
* **Green Check:** Job succeeded.
* **Red X:** Job failed.


* **Live Logs:** Click on a specific **Job** in the left sidebar or on the graph to open the log viewer. Here, you can watch the output of each command in real-time as it executes on the runner.

---

### 2. GitHub CLI (`gh`)

If you prefer staying in the terminal, the GitHub CLI provides a powerful way to monitor runs without opening a browser.

* **List Recent Runs:**
```bash
gh run list

```


* **Watch a Run in Real-Time:**
To see the live progress of a specific run (or the most recent one), use the `--watch` flag:
```bash
gh run view --watch

```


This provides an interactive TUI (Terminal User Interface) that updates as the jobs complete.

---

### 3. Pull Request Status

If your Action was triggered by a Pull Request (PR), you don't need to leave the PR page:

* Scroll down to the **"Checks"** section near the merge button.
* You will see a list of running actions. Click **Details** next to any check to jump directly to the live logs for that specific job.

---

### 4. Advanced Monitoring (API & External)

For enterprise-level monitoring or automation:

* **GitHub API:** Use the `GET /repos/{owner}/{repo}/actions/runs/{run_id}` endpoint to programmatically check the `status` (e.g., `queued`, `in_progress`, `completed`).
* **VS Code Extension:** The official **GitHub Actions for VS Code** extension adds a panel to your editor sidebar where you can monitor and even trigger workflows directly.
* **Mobile App:** The GitHub mobile app sends push notifications for failures and allows you to view basic run progress and logs on the go.

> **Pro Tip:** If a job seems "stuck" without output, check the **"Set up job"** step in the logs. Often, the delay is simply the runner provisioning the virtual machine or downloading large Docker images.

**Would you like me to show you how to enable "Debug Logging" to see more detailed progress within your scripts?**
