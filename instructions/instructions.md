# WonderBoy — Instructions

Refined from `instructionsEmail.pdf`.

## Goal
A Windows program that fills in a folder of Word templates using values typed into an Excel sheet. Each placeholder in the templates (an **Object**, such as `(APPLICANT)`) is replaced with its value (its **Info**, such as `John Smith, Jr.`).

## How the user works
1. **One time:** he installs WonderBoy on his computer.
2. He keeps a master folder that holds the Word templates (`01 ap.docx`, `03 receipt for ap.docx`, … `41 bill.docx`), `00 WonderBoy.xlsx` and the `Program` launcher (see [Install and launcher](#install-and-launcher)).
3. For a new case, he copies the whole master folder to a case folder, such as `Smith, John (Estate)`.
4. He opens `00 WonderBoy.xlsx` in the case folder, fills in the INFO column and saves it.
5. He double-clicks `Program` in the case folder.
6. The program asks **"Are you ready?"** with **Yes** and **No** buttons.
   - **No:** the program closes and nothing changes.
   - **Yes:** every Object in every Word file in that folder is replaced with its Info.
7. The program shows a short report, and he opens, finalizes and prints the documents.

## The Excel file: `00 WonderBoy.xlsx`
| Row | A | B |
|---|---|---|
| 1 | Program.exe | |
| 2 | | |
| 3 | OBJECTS | INFO |
| 4 | | |
| 5 | (APPLICANT) | John Smith, Jr. |
| 6 | (Ap address) | 123 N Avondale, Amarillo, TX 79106 |
| … | … | … |
| 15 | (DECEDENT) | John Smith |

- The program reads the first sheet.
- It finds the header row by looking for `OBJECTS` in column A and `INFO` in column B. The header does not have to be on row 3.
- Every row below the header with text in column A is an Object, and column B of that row is its Info.
- Blank rows are skipped.
- If the Info cell is empty, that Object is left alone in the documents so the missing value is easy to spot. The report lists it.
- Cell A1 (`Program.exe`) is only a label and reminder. The program is launched from the folder, not from Excel.

## Install and launcher
- **Installed once:** `WonderBoy.exe` is installed to `%LOCALAPPDATA%\Programs\WonderBoy\`. That location doesn't need admin rights.
- **The launcher:** each folder holds a small launcher file called `Program.cmd`. Its single line starts `WonderBoy.exe` and passes it the launcher's own folder:
  ```
  @start "" "%LOCALAPPDATA%\Programs\WonderBoy\WonderBoy.exe" "%~dp0"
  ```
- **Why not a regular Windows shortcut (`.lnk`):** a shortcut stores fixed paths, so a copied shortcut can't tell the program which folder it was opened from. The `.cmd` launcher always passes its current folder, so it keeps working after being copied.
- **Setup:** the launcher is put in the master folder once, and from then on it is copied along with the templates.
- **Fallback:** if `WonderBoy.exe` is started without a folder (for example, from the Start menu), it asks him to pick the case folder.
- A console window may flash for a moment when the launcher runs. That is expected.

## The program: `WonderBoy.exe`
- **Folder:** it works on the folder the launcher passes to it.
- **Files it reads:**
  - `00 WonderBoy.xlsx` from that folder.
  - Every `.docx` file in that folder. It does not look in subfolders.
  - It skips Word's temporary lock files (`~$*.docx`).
- **Where it replaces text:** the document body, tables, headers, footers, footnotes and text boxes.
- **Split text:** Word sometimes stores one word in several internal pieces (runs). Replacement must still work when an Object is split this way, and the replaced text keeps the formatting of the Object's first character.
- **Files are changed in place.** The master folder keeps the original templates, so the program makes no backups.
- **Running it twice is harmless.** Objects that were already replaced are no longer in the documents, so there is nothing left to replace.

## Settings (remembered)
The "Are you ready?" window also shows the matching settings. Each setting starts at the value used last time.

| Setting | Meaning | First-run default |
|---|---|---|
| Match case | On: `(APPLICANT)` does not match `(Applicant)`. | Off |
| Include parentheses | On: match the Object exactly as typed, e.g. `(APPLICANT)`. Off: match the text inside the parentheses, e.g. `APPLICANT`. | On |

Settings are saved to `%APPDATA%\WonderBoy\settings.json`. They are stored per user rather than per folder, so they carry over to every new case folder.

## Report (shown after Yes)
- Each document changed, with how many replacements were made in it.
- Objects that were not found in any document.
- Objects skipped because their Info was empty.
- Errors, with the file name and a plain reason. For example: "`14 order.docx` is open in Word. Close it and run again."

## Errors to handle
- **`00 WonderBoy.xlsx` is missing**, or its OBJECTS/INFO header can't be found: show a message and stop.
- **No `.docx` files are in the folder:** show a message and stop.
- **A Word file is open or locked:** skip it, report it and continue with the other files.
- **Unsaved changes in Excel:** the program reads the saved file. The "Are you ready?" window reminds him to save WonderBoy first.

## Out of scope
- Old `.doc` files. Only `.docx` files are handled, and `.doc` files are ignored.
- File names. Templates keep their names, and only their contents change.

## Tech
- TypeScript, and the result must be a Windows `.exe` that is installed once.
- The source code goes in `app/`, and any helper tools go in `tools/`.
- The code should be clear and simple.
