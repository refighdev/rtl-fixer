const { contextBridge, ipcRenderer } = require("electron");
const { marked } = require("marked");

marked.setOptions({
  breaks: true,
  gfm: true,
});

contextBridge.exposeInMainWorld("electronAPI", {
  copyToClipboard: (text) => ipcRenderer.invoke("copy-to-clipboard", text),
  readClipboard: () => ipcRenderer.invoke("read-clipboard"),
  renderMarkdown: (md) => marked.parse(md),
});
