#!/usr/bin/env bash
# WonderBoy installer for Git Bash. Run this one line:
#   curl -fsSL https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/install.sh | bash
# It runs the PowerShell installer (install.ps1), which does the actual work.

set -euo pipefail
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
  "irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/install.ps1 | iex"
