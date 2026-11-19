// WonderBoy frontend: the bridge between the window and the main process.
// The window can only do these three things.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("wonderboy", {
  startInfo: () => ipcRenderer.invoke("start-info"),
  run: (settings: unknown) => ipcRenderer.invoke("run", settings),
  quit: () => ipcRenderer.send("quit"),
});
