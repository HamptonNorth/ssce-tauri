#!/bin/bash
# Build and install SSCE Desktop
# Builds the latest version and installs the .deb package

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/src-tauri"

# Capture build time BEFORE building - this gets bundled into the app
BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
echo "$BUILD_TIME" > "$SCRIPT_DIR/src/config/build-time.txt"

echo "=========================================="
echo "Building SSCE Desktop"
echo "Build timestamp: $BUILD_TIME"
echo "=========================================="

cargo tauri build --bundles deb

# Find the latest .deb file
DEB_FILE=$(ls -t "$SCRIPT_DIR/src-tauri/target/release/bundle/deb/"*.deb 2>/dev/null | head -1)

if [ -z "$DEB_FILE" ]; then
    echo "Error: No .deb file found after build"
    exit 1
fi

echo "Installing: $DEB_FILE"
sudo dpkg -i "$DEB_FILE"

echo "=========================================="
echo "Done! SSCE Desktop has been updated."
echo "Build timestamp: $BUILD_TIME"
echo "=========================================="
