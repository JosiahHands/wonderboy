# WonderBoy

Fills in a folder of Word templates with the values typed into `00 WonderBoy.xlsx`.

These commands work in both Git Bash and PowerShell.

## Install

```bash
curl.exe -fsSL https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/install.cmd -o wonderboy-install.cmd; ./wonderboy-install.cmd
```

This installs WonderBoy and asks for your master templates folder, the one with `00 WonderBoy.xlsx`. It puts `Program.cmd` there. To fill in a case folder, double-click `Program.cmd` inside it.

## Update

```bash
curl.exe -fsSL https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.cmd -o wonderboy-update.cmd; ./wonderboy-update.cmd
```
