const { app, BrowserWindow, ipcMain, clipboard } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: "RTL Fixer",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0f0f0f",
    autoHideMenuBar: true,
  });

  win.loadFile("renderer/index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.handle("copy-to-clipboard", (_, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle("read-clipboard", () => {
  return clipboard.readText();
});
