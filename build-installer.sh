#!/usr/bin/env bash

# ==============================================================================
# MDM - Build Windows Setup Installer (.exe)
#
# Strategy to avoid EBUSY on Windows:
#  1. Pre-clean win-unpacked using robocopy mirror (Node script, Windows-safe)
#  2. electron-builder --dir with electronDist=node_modules/electron/dist
#     (emptyDir is patched out in ElectronFramework.js — no EBUSY)
#  3. stage_win_unpacked.js renames electron.exe -> product name
#  4. electron-builder --prepackaged builds the NSIS installer
# ==============================================================================

set -e

echo ""
echo "🚀 [MDM] Starting Safe Setup Installer Rebuild..."
echo "----------------------------------------------------"

# 1. Kill any background instances holding release files
echo "🛑 Terminating background processes..."
powershell.exe -NoProfile -Command "
  Get-Process -Name 'MDM - Download Manager','electron','7za','yt-dlp' \
    -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  exit 0
" 2>/dev/null || true
sleep 1

# 2. Pre-clean stale win-unpacked (robocopy mirror empties, then rmdir)
echo "🧹 Cleaning stale win-unpacked..."
node scripts/clean_win_unpacked.js

# 3. Build project bundles
echo "📦 Compiling frontend and electron main bundles..."
npm run build

# 4. Generate NSIS branded assets
echo "🎨 Generating NSIS dark/green branded assets..."
python scripts/generate_nsis_assets.py

# 5. Stage win-unpacked (electronDist copies local Electron dist, no download needed)
echo "📂 Staging application directory..."
npx electron-builder --dir --win --x64

# 6. Rename electron.exe -> "MDM - Download Manager.exe", copy extra resources
echo "⚙️  Finalizing win-unpacked..."
node scripts/stage_win_unpacked.js

# 7. Build NSIS installer from staged directory
echo "⚡ Building NSIS installer..."
npx electron-builder --win nsis --x64 --prepackaged "release/win-unpacked"

VERSION=$(node -p "require('./package.json').version")
echo ""
echo "✅ [SUCCESS] Setup Installer build completed!"
echo "📍 Output: release/MDM - Download Manager Setup ${VERSION}.exe"
echo "----------------------------------------------------"
