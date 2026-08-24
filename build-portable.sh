#!/usr/bin/env bash

# ==============================================================================
# MDM - Build Standalone Portable Executable (.exe)
# Safely terminates background instances, cleans locks, and builds
# ==============================================================================

set -e

echo ""
echo "🚀 [MDM] Starting Safe Portable Rebuild..."
echo "----------------------------------------------------"

# 1. Force kill any background instances holding release files
echo "🛑 Terminating background processes..."
powershell.exe -NoProfile -Command "Get-Process -Name '7za', 'MDM - Download Manager', 'electron', 'yt-dlp' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; exit 0" 2>/dev/null || true

# 2. Build project bundles
echo "📦 Compiling frontend and electron main bundles..."
npm run build

# 3. Unpack application directory
echo "📂 Unpacking application directory..."
npx electron-builder --dir --win --x64 || true

# 4. Package Portable Executable
echo "⚡ Packaging Portable Executable..."
npx electron-builder --win portable --x64 --prepackaged "release/win-unpacked"

echo ""
echo "✅ [SUCCESS] Portable build completed!"
echo "📍 Output: release/MDM - Download Manager 1.1.2.exe"
echo "----------------------------------------------------"
