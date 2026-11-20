@echo off
rem WonderBoy install. Downloaded and run by the install command in README.md.
rem Installs the latest WonderBoy release, which adds "Fill in with WonderBoy" to the
rem right-click menu of every folder. Deletes itself when done.
setlocal
set "SETUP=%TEMP%\WonderBoy-Setup.exe"
set "WONDERBOY=%LOCALAPPDATA%\Programs\wonderboy\WonderBoy.exe"

echo Downloading WonderBoy...
curl.exe -fsSL -o "%SETUP%" https://github.com/JosiahHands/wonderboy/releases/latest/download/WonderBoy-Setup.exe
if errorlevel 1 (
  echo Download failed. Check the internet connection and try again.
  goto end
)

echo Installing...
taskkill /im WonderBoy.exe /f >nul 2>&1
start "" /wait "%SETUP%" /S
del "%SETUP%" >nul 2>&1
if not exist "%WONDERBOY%" (
  echo Install failed.
  goto end
)
echo WonderBoy is installed.
echo To use it: right-click a folder (Windows 11: Show more options) and choose "Fill in with WonderBoy".

:end
endlocal
(goto) 2>nul & del "%~f0"
