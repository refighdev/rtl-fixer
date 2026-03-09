import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-shell";

export const platformAPI = {
  async copyToClipboard(text: string) {
    await writeText(text);
  },
  async readClipboard(): Promise<string> {
    return (await readText()) ?? "";
  },
  async openExternal(url: string) {
    await open(url);
  },
  async saveFile(content: string, defaultName: string): Promise<boolean> {
    const ext = defaultName.split(".").pop() || "txt";
    const filters: { name: string; extensions: string[] }[] = [];
    if (ext === "md") filters.push({ name: "Markdown", extensions: ["md"] });
    else if (ext === "html")
      filters.push({ name: "HTML", extensions: ["html"] });
    else filters.push({ name: "Text", extensions: ["txt"] });
    filters.push({ name: "All Files", extensions: ["*"] });

    const filePath = await save({ defaultPath: defaultName, filters });
    if (!filePath) return false;
    await writeTextFile(filePath, content);
    return true;
  },
};
