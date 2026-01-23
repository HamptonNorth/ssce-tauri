System tray icon specs:**

| Platform | Format | Sizes | Notes |
|----------|--------|-------|-------|
| **Linux** | PNG | 22x22, 24x24 (primary) | Some DEs use 16x16 or 32x32 |
| **Windows** | ICO | 16x16, 32x32 | ICO can contain multiple sizes |

**Recommendations:**

1. **Create a simple, recognizable icon** - System tray icons are tiny, so avoid detail. A simple silhouette or bold shape works best.

2. **Provide multiple sizes** in a single asset set:
   - 16x16
   - 22x22 (Linux standard)
   - 24x24
   - 32x32

3. **Use PNG for Linux**, ICO for Windows (Tauri handles this)

4. **Consider monochrome/symbolic** - Many Linux DEs (GNOME, KDE) prefer monochrome symbolic icons that adapt to light/dark themes. Format: `icon-symbolic.svg` or white-on-transparent PNG.

**For Tauri specifically:**

Tauri's tray plugin accepts a path to an icon. You'd typically provide:
- `icons/tray-icon.png` (32x32 PNG works for both platforms)
- Or platform-specific icons if needed
