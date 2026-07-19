const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("koharuAdmin", {
  getApiBase: () => ipcRenderer.invoke("get-api-base"),
  updateBadge: (count) => ipcRenderer.invoke("update-badge", count),
  notify: (sender, preview) =>
    ipcRenderer.invoke("notify", sender, preview),
});