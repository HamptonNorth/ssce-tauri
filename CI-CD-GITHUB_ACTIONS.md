# CI/CD with GitHub Actions

This document describes how to release SSCE Desktop using GitHub Actions for automated multi-platform builds.

## Overview

When you create a release on GitHub, the workflow automatically:

1. Builds the application on Linux, Windows, and macOS
2. Creates installers for each platform
3. Attaches all installers to the release as downloadable assets

## Release Process

### Step 1: Update Version Number

Before releasing, update the version in `src-tauri/tauri.conf.json`:

```json
{
  "version": "1.0.0"
}
```

Commit and push this change:

```bash
git add src-tauri/tauri.conf.json
git commit -m "Bump version to 1.0.0"
git push origin main
```

### Step 2: Create a Release on GitHub

1. Go to https://github.com/HamptonNorth/ssce-tauri/releases
2. Click **"Create a new release"**
3. Click **"Choose a tag"**
4. Type the version with `v` prefix (e.g., `v1.0.0`)
5. Click **"Create new tag: v1.0.0 on publish"**
6. Enter release title (e.g., `SSCE Desktop v1.0.0`)
7. Optionally add release notes describing changes
8. Click **"Publish release"**

### Step 3: Monitor the Build

1. Go to https://github.com/HamptonNorth/ssce-tauri/actions
2. Click on the running "Build and Release" workflow
3. Watch the progress of each platform build (~10-15 minutes total)

### Step 4: Verify Release Assets

Once complete, go back to the release page. You should see these downloadable files:

| Platform | Files |
|----------|-------|
| **Linux** | `.deb`, `.rpm`, `.AppImage` |
| **Windows** | `.exe` (installer), `.msi` |
| **macOS Intel** | `.dmg` |
| **macOS Apple Silicon** | `.dmg` |

## Troubleshooting

### Build Failed

1. Go to Actions → click the failed run
2. Click on the failed job (e.g., "build-linux")
3. Expand the failed step to see error details
4. Fix the issue, commit, and push
5. Delete the release AND tag (see below), then create again

### Deleting a Release and Tag

If you need to re-release the same version:

**Delete the release:**
1. Go to Releases → click on the release
2. Click **Delete** (trash icon)

**Delete the tag:**
```bash
git push origin --delete v1.0.0
```

Or via GitHub web:
1. Go to https://github.com/HamptonNorth/ssce-tauri/tags
2. Click three dots next to the tag → **Delete tag**

Then create the release again from Step 2.

### Workflow Uses Old Code

GitHub Actions uses the workflow file from the **tag**, not from main. If you've updated the workflow:

1. Delete both the release AND the tag
2. Push any workflow fixes to main
3. Create a fresh release

## Workflow File Location

The workflow is defined in:

```
.github/workflows/release.yml
```

## Build Outputs by Platform

### Linux (ubuntu-22.04)
- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/rpm/*.rpm`
- `src-tauri/target/release/bundle/appimage/*.AppImage`

### Windows (windows-latest)
- `src-tauri/target/release/bundle/nsis/*.exe`
- `src-tauri/target/release/bundle/msi/*.msi`

### macOS Intel (macos-latest, x86_64)
- `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg`

### macOS Apple Silicon (macos-latest, aarch64)
- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg`

## Manual Workflow Trigger

For testing, you can trigger the workflow manually without creating a release:

1. Go to Actions → "Build and Release"
2. Click **"Run workflow"** dropdown
3. Select branch (main)
4. Click **"Run workflow"**

Note: Manual runs build artifacts but don't upload to a release.

## Version Numbering

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes

Examples:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.1.0` → `2.0.0` (breaking change)

## Checklist for Releases

- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] Commit and push version change
- [ ] Create release on GitHub with matching `v` tag
- [ ] Wait for all builds to complete (~10-15 min)
- [ ] Verify all 6+ assets attached to release
- [ ] Test at least one installer manually
