# WonderBoy updater. Run this one line in PowerShell:
#   irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.ps1 | iex
#
# Installs the latest WonderBoy release from GitHub, unless it is already installed.
# Installs for this user, with no admin rights needed: %LOCALAPPDATA%\Programs\wonderboy
# Settings and the Program.cmd launchers in your folders are not touched.

& {
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue" # much faster downloads in Windows PowerShell 5.1
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  $repo = "JosiahHands/wonderboy"
  $installDir = Join-Path $env:LOCALAPPDATA "Programs\wonderboy"
  $exe = Join-Path $installDir "WonderBoy.exe"

  $latest = (Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -UseBasicParsing).tag_name.TrimStart("v")

  if (Test-Path $exe) {
    $current = (Get-Item $exe).VersionInfo.FileVersion
    if ([version]$current -ge [version]$latest) {
      Write-Host "WonderBoy $current is already the latest version."
      return
    }
    Write-Host "Updating WonderBoy $current to $latest..."
  } else {
    Write-Host "Installing WonderBoy $latest..."
  }

  $setupFile = Join-Path $env:TEMP "WonderBoy-Setup.exe"
  Invoke-WebRequest -Uri "https://github.com/$repo/releases/download/v$latest/WonderBoy-Setup.exe" -OutFile $setupFile -UseBasicParsing

  Get-Process WonderBoy -ErrorAction SilentlyContinue | Stop-Process -Force # close an open copy first
  Start-Process -FilePath $setupFile -ArgumentList "/S" -Wait
  Remove-Item $setupFile -ErrorAction SilentlyContinue

  if (-not (Test-Path $exe)) { throw "Install failed: WonderBoy.exe was not found in $installDir" }
  Write-Host "WonderBoy $((Get-Item $exe).VersionInfo.FileVersion) is installed in $installDir"
}
