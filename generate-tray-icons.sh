#!/bin/bash
# Generate system tray icons for SSCE Desktop
# Requires: ImageMagick (sudo apt-get install imagemagick)

set -e

SOURCE="redmug_logo_316x316.png"
OUTPUT_DIR="tray-icons"

cd "$(dirname "$0")"

if [ ! -f "$SOURCE" ]; then
    echo "Error: Source image '$SOURCE' not found"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Generating tray icons from $SOURCE..."

# Linux sizes (PNG)
for size in 16 22 24 32 48 64 128; do
    convert "$SOURCE" -resize ${size}x${size} "$OUTPUT_DIR/tray-icon-${size}.png"
    echo "  Created: tray-icon-${size}.png"
done

# Windows ICO (contains multiple sizes)
convert "$SOURCE" \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    \( -clone 0 -resize 256x256 \) \
    -delete 0 \
    "$OUTPUT_DIR/tray-icon.ico"
echo "  Created: tray-icon.ico (multi-size)"

# Copy a default size for Tauri (32x32 works well cross-platform)
cp "$OUTPUT_DIR/tray-icon-32.png" "$OUTPUT_DIR/tray-icon.png"
echo "  Created: tray-icon.png (default 32x32)"

echo ""
echo "Done! Icons saved to $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR/"
