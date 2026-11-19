#!/usr/bin/env bash
# Builds the WonderBoy installer locally: app/release/WonderBoy-Setup.exe
# Only needed for testing. Releases are built by GitHub (.github/workflows/release.yml).
# Git Bash:   ./tools/build.sh
# PowerShell: & "$env:ProgramFiles\Git\bin\bash.exe" tools/build.sh

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
