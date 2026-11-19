@echo off
rem WonderBoy update. Downloaded and run by the update command in README.md.
rem Runs update.ps1 from GitHub, then deletes this file.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.ps1 | iex"
(goto) 2>nul & del "%~f0"
