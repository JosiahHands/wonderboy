# WonderBoy

WonderBoy fills in a folder of Word templates using the values typed into `00 WonderBoy.xlsx`. The full spec is in [instructions/instructions.md](instructions/instructions.md).

## Build the installer

You need [Node.js](https://nodejs.org) and [Git for Windows](https://git-scm.com/download/win), which provides Git Bash. Run the command from the project folder.

**Bash (Git Bash):**
```bash
./tools/build.sh
```

**PowerShell:**
```powershell
& "$env:ProgramFiles\Git\bin\bash.exe" tools/build.sh
```

The installer is created at `app/release/WonderBoy-Setup-<version>.exe`.

The first build downloads Electron and the installer tools, so it takes a few minutes.

## Install

Run `WonderBoy-Setup-<version>.exe`.
- It installs WonderBoy for the current user in `%LOCALAPPDATA%\Programs\wonderboy\WonderBoy.exe`, without admin rights, and adds a WonderBoy shortcut to the Start menu.
- The installer is not code-signed, so Windows may show "Windows protected your PC". Click **More info**, then **Run anyway**.

## Set up the launcher (one time)

Copy `Program.cmd` into the master folder with the Word templates and `00 WonderBoy.xlsx`. From then on it gets copied into every case folder along with the templates. Double-clicking it opens WonderBoy for the folder it is in.

To copy it, run this in PowerShell, replacing the folder path with your master folder:
```powershell
Copy-Item "$env:LOCALAPPDATA\Programs\wonderboy\Program.cmd" "C:\path\to\master folder"
```

The source is [app/Program.cmd](app/Program.cmd). If WonderBoy isn't installed, the launcher says so and doesn't open anything.

## Development

| What | Command |
|---|---|
| Install all packages | `npm run setup` |
| Type-check everything | `npm run typecheck` |
| Run the backend tests | `npm test` |
| Make a sample case folder | `npx tsx tools/sampleCase.ts "C:\temp\Smith, John (Estate)"` |
| Run the app on a folder | `npm start --prefix app -- "C:\temp\Smith, John (Estate)"` |

`npm start` will not open a window from VS Code's built-in terminal, because VS Code sets `ELECTRON_RUN_AS_NODE`. Clear it first:
```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE
```

## Layout

- `app/`: all the app's source code. It is its own package, with its own `package.json`.
  - `backend.ts`: reads the Excel file and fills in the Word files.
  - `main.ts`, `preload.ts`, `renderer.ts` and `index.html`: the window.
- `tools/`: development tools.
  - `build.sh` builds the installer.
  - `testBackend.ts` holds the backend tests.
  - `sampleCase.ts` makes a fake case folder.
- `instructions/`: the original request and the spec.
