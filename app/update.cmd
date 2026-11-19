@echo off
rem WonderBoy update. Downloaded and run by the update command in README.md.
rem Installs the latest WonderBoy release over the current one. Settings and launchers are kept.
rem Deletes itself when done.
setlocal
set "SETUP=%TEMP%\WonderBoy-Setup.exe"
set "WONDERBOY=%LOCALAPPDATA%\Programs\wonderboy\WonderBoy.exe"

echo Downloading the latest WonderBoy...
curl.exe -fsSL -o "%SETUP%" https://github.com/JosiahHands/wonderboy/releases/latest/download/WonderBoy-Setup.exe
if errorlevel 1 (
  echo Download failed. Check the internet connection and try again.
  goto end
)

echo Updating...
taskkill /im WonderBoy.exe /f >nul 2>&1
start "" /wait "%SETUP%" /S
del "%SETUP%" >nul 2>&1
if not exist "%WONDERBOY%" (
  echo Update failed.
  goto end
)
echo WonderBoy is up to date.

:end
endlocal
(goto) 2>nul & del "%~f0"
