// WonderBoy frontend: the Electron main process.
// Started by the "Fill in with WonderBoy" right-click menu item with the folder's path,
// or from the Start menu (then it asks for a folder). Opens the "Are you sure?" window.

import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import * as fs from "fs";
import * as path from "path";
import { checkFolder, runWonderBoy } from "./backend";

// ---------------------------------------------------------------- Folder

// The folder passed on the command line, if it is a real folder.
function folderFromCommandLine(): string | null {
  const args = process.argv.slice(app.isPackaged ? 1 : 2); // dev runs as: electron . <folder>
  const arg = args.find((a) => !a.startsWith("-"));
  if (!arg) return null;

  // A path ending in a backslash (like a drive, "C:\") arrives as: C:\" (Windows reads \" as a
  // literal quote), sometimes with a trailing space. Remove them.
  const folder = path.resolve(arg.replace(/["\s]+$/, ""));
  return fs.existsSync(folder) && fs.statSync(folder).isDirectory() ? folder : null;
}

async function pickFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ title: "Choose the folder to fill in", properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------- App

app.whenReady().then(async () => {
  const folder = folderFromCommandLine() ?? (await pickFolder());
  if (!folder) {
    app.quit();
    return;
  }

  // Messages from the window (see preload.ts).
  ipcMain.handle("start-info", () => ({ folder, folderName: path.basename(folder) || folder, version: app.getVersion() }));

  ipcMain.handle("check", () => {
    try {
      const { excelFile, pairs, wordFiles } = checkFolder(folder);
      const emptyCount = pairs.filter((p) => p.replace === "").length;
      return { ok: true, excelFile, pairCount: pairs.length, emptyCount, wordFiles };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  });

  ipcMain.handle("run", async () => {
    try {
      return { ok: true, report: await runWonderBoy(folder) };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  });

  ipcMain.on("open-folder", () => shell.openPath(folder));
  ipcMain.on("quit", () => app.quit());

  const window = new BrowserWindow({
    width: 560,
    height: 600,
    minWidth: 440,
    minHeight: 480,
    title: `WonderBoy v${app.getVersion()}`,
    icon: path.join(__dirname, "..", "icon.ico"),
    show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  window.removeMenu();
  window.once("ready-to-show", () => window.show());
  window.loadFile(path.join(__dirname, "..", "index.html"));
});

app.on("window-all-closed", () => app.quit());
