import { contextBridge, ipcRenderer } from "electron";

const api = {
  copyToClipboard: (text: string) =>
    ipcRenderer.invoke("copy-to-clipboard", text),
  readClipboard: () => ipcRenderer.invoke("read-clipboard") as Promise<string>,
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  saveFile: (content: string, defaultName: string) =>
    ipcRenderer.invoke("save-file", { content, defaultName }) as Promise<boolean>,
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
