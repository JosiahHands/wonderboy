<img src="app/icon.png" width="96" alt="WonderBoy logo">

# WonderBoy

WonderBoy fills in Word files from an Excel list. Put one `.xlsx` file and your `.docx` files in a folder:
- In the `.xlsx`, column A is the text to find (for example `(APPLICANT)`) and column B is what replaces it (for example `John Smith, Jr.`). Start at row 1, one pair per row.
- Right-click the folder and choose **Fill in with WonderBoy**. On Windows 11 it's under **Show more options**.
- Click **Yes**. Every `.docx` directly in that folder is filled in. Subfolders are not touched.

These commands work in both Git Bash and PowerShell.

## Install

```bash
curl.exe -fsSL https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/install.cmd -o wonderboy-install.cmd; ./wonderboy-install.cmd
```

## Update

```bash
curl.exe -fsSL https://raw.githubusercontent.com/JosiahHands/wonderboy/master/app/update.cmd -o wonderboy-update.cmd; ./wonderboy-update.cmd
```
