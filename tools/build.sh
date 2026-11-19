#!/usr/bin/env bash
# Builds the WonderBoy installer: app/release/WonderBoy-Setup.exe
# Works from any folder. See README.md for the command to run it from bash or PowerShell.

set -euo pipefail
cd "$(dirname "$0")/../app"

# VS Code sets this, and it stops Electron from working as an app.
unset ELECTRON_RUN_AS_NODE

echo "== Installing packages"
npm install

echo "== Compiling TypeScript"
npx tsc

echo "== Building the installer"
rm -rf release
npx electron-builder --win --publish never

echo
echo "Done. Installer:"
ls release/*.exe
