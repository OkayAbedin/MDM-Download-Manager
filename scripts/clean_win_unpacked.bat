@echo off
:: clean_win_unpacked.bat - Force-clears release\win-unpacked using robocopy mirror trick
:: Called from build-installer.sh to avoid Git Bash path mangling of robocopy flags

setlocal

set "WIN_UNPACKED=%~dp0release\win-unpacked"
set "WIN_UNPACKED_TMP=%~dp0release\win-unpacked.tmp"
set "EMPTY_TMP=%~dp0release\_empty_clean"

:: Clean win-unpacked
if exist "%WIN_UNPACKED%" (
  md "%EMPTY_TMP%" 2>nul
  robocopy "%EMPTY_TMP%" "%WIN_UNPACKED%" /mir /nfl /ndl /njh /njs /nc /ns /np >nul 2>&1
  rd /s /q "%EMPTY_TMP%" 2>nul
  rd /s /q "%WIN_UNPACKED%" 2>nul
)

:: Clean win-unpacked.tmp
if exist "%WIN_UNPACKED_TMP%" (
  rd /s /q "%WIN_UNPACKED_TMP%" 2>nul
)

echo Cleaned win-unpacked successfully.
exit /b 0
