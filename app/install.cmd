@echo off
rem WonderBoy install. Downloaded and run by the install command in README.md.
rem Runs install.ps1 from GitHub, then deletes this file.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/install.ps1 | iex"
(goto) 2>nul & del "%~f0"
