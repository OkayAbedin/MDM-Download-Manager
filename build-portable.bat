@echo off
echo.
echo ====================================================
echo  [MDM] Starting Safe Portable Rebuild...
echo ====================================================

echo Terminating background processes...
powershell -NoProfile -Command "Get-Process -Name 'electron', 'MDM - Download Manager', '7za', 'yt-dlp' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; exit 0"

echo Compiling frontend and electron main bundles...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed with error code %ERRORLEVEL%!
    exit /b %ERRORLEVEL%
)

echo Unpacking application directory...
call npx electron-builder --dir --win --x64

echo Packaging Portable Executable...
call npx electron-builder --win portable --x64 --prepackaged "release\win-unpacked"
if %ERRORLEVEL% NEQ 0 (
    echo Packaging failed with error code %ERRORLEVEL%!
    exit /b %ERRORLEVEL%
)

echo.
echo ====================================================
echo  [SUCCESS] Portable build completed!
echo  Output: release\MDM - Download Manager 1.1.2.exe
echo ====================================================
echo.
