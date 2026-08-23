@echo off
echo.
echo ====================================================
echo  [MDM] Starting Safe Setup Installer Rebuild...
echo ====================================================

echo Terminating background processes...
powershell -NoProfile -Command "Get-Process -Name 'electron', 'MDM - Download Manager', '7za', 'yt-dlp' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; exit 0"

echo Compiling frontend and electron main bundles...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed with error code %ERRORLEVEL%!
    exit /b %ERRORLEVEL%
)

echo Generating NSIS branded assets...
python scripts/generate_nsis_assets.py

echo Unpacking application directory...
call npx electron-builder --dir --win --x64

echo Packaging Windows Setup Installer with Custom NSIS Branding...
call npx electron-builder --win nsis --x64 --prepackaged "release\win-unpacked"
if %ERRORLEVEL% NEQ 0 (
    echo Packaging failed with error code %ERRORLEVEL%!
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo  [SUCCESS] Setup Installer build completed!
echo  Output: release\MDM - Download Manager Setup 1.1.0.exe
echo ====================================================
echo.
