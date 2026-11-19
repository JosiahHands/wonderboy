// WonderBoy frontend: the Electron main process.
// Gets the case folder (from Program.cmd, or by asking), then opens the "Are you ready?" window.

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { loadSettings, saveSettings, runWonderBoy, formatReport, Settings } from "./backend";

// ---------------------------------------------------------------- Case folder

// The folder passed on the command line by Program.cmd, if it is a real folder.
function folderFromCommandLine(): string | null {
  const args = process.argv.slice(app.isPackaged ? 1 : 2); // dev runs as: electron . <folder>
  const arg = args.find((a) => !a.startsWith("-"));
  if (!arg) return null;

  // Program.cmd passes "%~dp0", which ends in a backslash. Windows reads \" as a literal quote,
  // so the folder arrives as: C:\Case\" (with a stray quote and space). Remove them.
  const folder = path.resolve(arg.replace(/["\s]+$/, ""));
  return fs.existsSync(folder) && fs.statSync(folder).isDirectory() ? folder : null;
}

async function pickFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ title: "Choose the case folder", properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
}

// ---------------------------------------------------------------- App

app.whenReady().then(async () => {
  const folder = folderFromCommandLine() ?? (await pickFolder());
  if (!folder) {
    app.quit();
    return;
  }

  // Messages from the window (see preload.ts).
  ipcMain.handle("start-info", () => ({ folder, folderName: path.basename(folder), settings: loadSettings() }));
  ipcMain.handle("run", async (_event, settings: Settings) => {
    try {
      saveSettings(settings);
      return { ok: true, report: formatReport(await runWonderBoy(folder, settings)) };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  });
  ipcMain.on("quit", () => app.quit());

  const window = new BrowserWindow({
    width: 520,
    height: 500,
    minWidth: 420,
    minHeight: 420,
    title: "WonderBoy",
    show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  window.removeMenu();
  window.once("ready-to-show", () => window.show());
  window.loadFile(path.join(__dirname, "..", "index.html"));
});

app.on("window-all-closed", () => app.quit());
