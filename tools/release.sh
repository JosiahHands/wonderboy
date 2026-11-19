#!/usr/bin/env bash
# Builds the installer and publishes it as a GitHub release.
# The one-command install always downloads the latest release.
# Before each new release, raise "version" in app/package.json.

set -euo pipefail
cd "$(dirname "$0")/.."

bash tools/build.sh

version=$(node -p "require('./app/package.json').version")
echo "== Publishing release v$version"
gh release create "v$version" "app/release/WonderBoy-Setup.exe" \
  --title "WonderBoy $version" \
  --notes "Install from PowerShell:

\`\`\`powershell
irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/install.ps1 | iex
\`\`\`

Update an existing install from PowerShell:

\`\`\`powershell
irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.ps1 | iex
\`\`\`"
