import { app, BrowserWindow, ipcMain, clipboard, shell, dialog } from "electron";
import path from "path";
import fs from "fs";

const stateFile = path.join(app.getPath("userData"), "window-state.json");

function loadWindowState(): {
  bounds?: { width: number; height: number; x?: number; y?: number };
  maximized?: boolean;
} {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch {
    return { bounds: { width: 1200, height: 800 } };
  }
}

function saveWindowState(win: BrowserWindow): void {
  const maximized = win.isMaximized();
  const bounds = maximized
    ? loadWindowState().bounds || win.getBounds()
    : win.getBounds();
  fs.writeFileSync(stateFile, JSON.stringify({ bounds, maximized }));
}

function createWindow(): void {
  const saved = loadWindowState();
  const opts: Electron.BrowserWindowConstructorOptions = {
    width: saved.bounds?.width || 1200,
    height: saved.bounds?.height || 800,
    minWidth: 800,
    minHeight: 500,
    title: "RTL Fixer",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0a0a0f",
    autoHideMenuBar: true,
  };
  if (saved.bounds?.x != null && saved.bounds?.y != null) {
    opts.x = saved.bounds.x;
    opts.y = saved.bounds.y;
  }

  const win = new BrowserWindow(opts);
  if (saved.maximized) win.maximize();

  let saveTimer: ReturnType<typeof setTimeout>;
  const debouncedSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(win), 300);
  };
  win.on("resize", debouncedSave);
  win.on("move", debouncedSave);
  win.on("close", () => saveWindowState(win));

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

ipcMain.handle("copy-to-clipboard", (_, text: string) => {
  clipboard.writeText(text);
});

ipcMain.handle("read-clipboard", () => clipboard.readText());

ipcMain.handle("open-external", (_, url: string) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

ipcMain.handle(
  "save-file",
  async (
    _,
    { content, defaultName }: { content: string; defaultName: string }
  ) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return false;
    const ext = defaultName.split(".").pop() || "txt";
    const filters: Electron.FileFilter[] = [];
    if (ext === "md") filters.push({ name: "Markdown", extensions: ["md"] });
    else if (ext === "html")
      filters.push({ name: "HTML", extensions: ["html"] });
    else filters.push({ name: "Text", extensions: ["txt"] });
    filters.push({ name: "All Files", extensions: ["*"] });

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters,
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  }
);
