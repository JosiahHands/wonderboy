# WonderBoy installer. Started by install.cmd (see the install command in README.md).
#
# 1. Installs the latest WonderBoy release from GitHub (by running update.ps1).
# 2. Offers to copy the Program.cmd launcher into your master templates folder.

& {
  $ErrorActionPreference = "Stop"
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  Invoke-RestMethod "https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.ps1" -UseBasicParsing | Invoke-Expression

  $installDir = Join-Path $env:LOCALAPPDATA "Programs\wonderboy"
  if (-not (Test-Path (Join-Path $installDir "WonderBoy.exe"))) { return } # update.ps1 already reported the problem

  # Put the launcher in the master templates folder, so it gets copied into every case folder.
  Add-Type -AssemblyName System.Windows.Forms
  $picker = New-Object System.Windows.Forms.FolderBrowserDialog
  $picker.Description = "Choose your master templates folder (the one with 00 WonderBoy.xlsx). Program.cmd will be copied there. Click Cancel to skip."
  $owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true } # keeps the picker in front
  if ($picker.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
    Copy-Item (Join-Path $installDir "Program.cmd") $picker.SelectedPath -Force
    Write-Host "Program.cmd copied to $($picker.SelectedPath)"
  } else {
    Write-Host "Skipped the launcher. Program.cmd is in $installDir - copy it into your master folder."
  }
  $owner.Dispose()

  Write-Host "Done."
}
