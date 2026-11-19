#!/usr/bin/env bash
# WonderBoy updater for Git Bash. Run this one line:
#   curl -fsSL https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.sh | bash
# It runs the PowerShell updater (update.ps1), which does the actual work.

set -euo pipefail
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
  "irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.ps1 | iex"
