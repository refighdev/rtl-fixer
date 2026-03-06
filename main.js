const { app, BrowserWindow, ipcMain, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");

const stateFile = path.join(app.getPath("userData"), "window-state.json");

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch {
    return { width: 1200, height: 800 };
  }
}

function saveWindowState(win) {
  const maximized = win.isMaximized();
  const bounds = maximized ? (loadWindowState().bounds || win.getBounds()) : win.getBounds();
  fs.writeFileSync(stateFile, JSON.stringify({ bounds, maximized }));
}

let marked;
async function getMarked() {
  if (!marked) {
    const mod = await import("marked");
    marked = mod.marked;
    marked.setOptions({ breaks: true, gfm: true });
  }
  return marked;
}

function createWindow() {
  const saved = loadWindowState();
  const opts = {
    width: saved.bounds?.width || 1200,
    height: saved.bounds?.height || 800,
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
  };
  if (saved.bounds?.x != null && saved.bounds?.y != null) {
    opts.x = saved.bounds.x;
    opts.y = saved.bounds.y;
  }

  const win = new BrowserWindow(opts);
  if (saved.maximized) win.maximize();

  let saveTimer;
  const debouncedSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(win), 300);
  };
  win.on("resize", debouncedSave);
  win.on("move", debouncedSave);
  win.on("close", () => saveWindowState(win));

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

ipcMain.handle("render-markdown", async (_, text) => {
  const m = await getMarked();
  return m.parse(text);
});
