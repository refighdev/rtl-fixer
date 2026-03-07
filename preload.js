const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  copyToClipboard: (text) => ipcRenderer.invoke("copy-to-clipboard", text),
  readClipboard: () => ipcRenderer.invoke("read-clipboard"),
  renderMarkdown: (text) => ipcRenderer.invoke("render-markdown", text),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
