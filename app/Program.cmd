@echo off
rem WonderBoy launcher.
rem Keep this file in the master folder with the Word templates, so it is copied into every case folder.
rem Double-click it to open WonderBoy for the folder this file is in.

set "WONDERBOY=%LOCALAPPDATA%\Programs\wonderboy\WonderBoy.exe"

if not exist "%WONDERBOY%" (
  echo WonderBoy is not installed on this computer.
  echo Run the WonderBoy installer first, then try again.
  echo.
  pause
  exit /b 1
)

rem "%~dp0." is this file's folder. The trailing dot stops Windows from reading \" as a quote.
start "" "%WONDERBOY%" "%~dp0."
