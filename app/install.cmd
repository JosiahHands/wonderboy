@echo off
rem WonderBoy install. Downloaded and run by the install command in README.md.
rem Installs the latest WonderBoy release, then asks where to put the Program.cmd launcher.
rem Deletes itself when done.
setlocal
set "SETUP=%TEMP%\WonderBoy-Setup.exe"
set "WONDERBOY=%LOCALAPPDATA%\Programs\wonderboy\WonderBoy.exe"
rem VS Code terminals set this, and it stops WonderBoy from opening windows.
set ELECTRON_RUN_AS_NODE=

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

echo Choose your master templates folder in the window that opens.
start "" /wait "%WONDERBOY%" --setup
echo Done.

:end
endlocal
(goto) 2>nul & del "%~f0"
