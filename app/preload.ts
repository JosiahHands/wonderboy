// WonderBoy frontend: the bridge between the window and the main process.
// The window can only do these things.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("wonderboy", {
  startInfo: () => ipcRenderer.invoke("start-info"),
  check: () => ipcRenderer.invoke("check"),
  run: () => ipcRenderer.invoke("run"),
  openFolder: () => ipcRenderer.send("open-folder"),
  quit: () => ipcRenderer.send("quit"),
});
