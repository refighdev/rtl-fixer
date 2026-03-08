var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RtlFixerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// ../../packages/core/dist/bidi.js
var RLM = "\u200F";
var LRM = "\u200E";
var RTL_RANGE = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
var STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

// main.ts
var DEFAULT_SETTINGS = {
  headings: true,
  listItems: true,
  blockquotes: true,
  tables: true,
  paragraphs: true,
  neutralFix: true
};
function classifyLine(line) {
  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;
  if (!trimmed)
    return { type: "empty", prefixEnd: 0 };
  const hm = trimmed.match(/^(#{1,6}\s)/);
  if (hm)
    return { type: "heading", prefixEnd: indent + hm[1].length };
  const tm = trimmed.match(/^([-*+]\s\[[ xX]\]\s)/);
  if (tm)
    return { type: "list", prefixEnd: indent + tm[1].length };
  const um = trimmed.match(/^([-*+]\s)/);
  if (um)
    return { type: "list", prefixEnd: indent + um[1].length };
  const om = trimmed.match(/^(\d+[.)]\s)/);
  if (om)
    return { type: "list", prefixEnd: indent + om[1].length };
  const bm = trimmed.match(/^(>\s?)/);
  if (bm)
    return { type: "blockquote", prefixEnd: indent + bm[1].length };
  if (/^[|\s:\-]+$/.test(trimmed))
    return { type: "tableSep", prefixEnd: 0 };
  if (trimmed.startsWith("|") && trimmed.endsWith("|"))
    return { type: "table", prefixEnd: 0 };
  return { type: "paragraph", prefixEnd: 0 };
}
function hasBothDirections(text) {
  return RTL_RANGE.test(text) && STRONG_LTR.test(text);
}
function startsWithNeutral(text) {
  const trimmed = text.trim();
  if (!trimmed)
    return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}
function stripMarks(line) {
  return line.replace(/[\u200F\u200E]/g, "");
}
function shouldFix(type, s) {
  switch (type) {
    case "heading":
      return s.headings;
    case "list":
      return s.listItems;
    case "blockquote":
      return s.blockquotes;
    case "table":
      return s.tables;
    case "paragraph":
      return s.paragraphs;
    default:
      return false;
  }
}
function fixTableRow(line) {
  const parts = line.split("|");
  let anyFixed = false;
  const result = parts.map((cell, i) => {
    if (i === 0 || i === parts.length - 1)
      return cell;
    const trimmed = cell.trim();
    if (hasBothDirections(trimmed)) {
      anyFixed = true;
      return cell.replace(trimmed, RLM + trimmed);
    }
    return cell;
  });
  return { text: anyFixed ? result.join("|") : line, fixed: anyFixed };
}
function pickMarkForContent(content, neutralFix) {
  if (hasBothDirections(content))
    return RLM;
  if (neutralFix && startsWithNeutral(content)) {
    if (RTL_RANGE.test(content))
      return RLM;
    if (STRONG_LTR.test(content))
      return LRM;
  }
  return null;
}
function processText(text, settings) {
  var _a;
  const lines = text.split("\n");
  let fixCount = 0;
  let inCodeBlock = false;
  let inFrontmatter = false;
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) === "---")
    inFrontmatter = true;
  const result = lines.map((raw, i) => {
    if (inFrontmatter) {
      if (i > 0 && raw.trim() === "---")
        inFrontmatter = false;
      return raw;
    }
    if (raw.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return raw;
    }
    if (inCodeBlock)
      return raw;
    const clean = stripMarks(raw);
    if (!clean.trim())
      return clean;
    const info = classifyLine(clean);
    if (!shouldFix(info.type, settings))
      return clean;
    if (info.type === "table") {
      const res = fixTableRow(clean);
      if (res.fixed)
        fixCount++;
      return res.text;
    }
    const content = clean.slice(info.prefixEnd);
    const mark = pickMarkForContent(content, settings.neutralFix);
    if (!mark)
      return clean;
    fixCount++;
    if (info.prefixEnd > 0) {
      return clean.slice(0, info.prefixEnd) + mark + content;
    }
    return mark + clean;
  });
  return { text: result.join("\n"), fixCount };
}
function stripAllMarks2(text) {
  const matches = text.match(/[\u200F\u200E]/g);
  return {
    text: text.replace(/[\u200F\u200E]/g, ""),
    count: matches ? matches.length : 0
  };
}
function countMarks(text) {
  let rlm = 0;
  let lrm = 0;
  for (const ch of text) {
    if (ch === RLM)
      rlm++;
    else if (ch === LRM)
      lrm++;
  }
  return { rlm, lrm };
}
var RtlFixerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("languages", "RTL Fixer: \u0627\u0635\u0644\u0627\u062D \u0633\u0646\u062F", () => {
      const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
      if (!view) {
        new import_obsidian.Notice("\u0641\u0627\u06CC\u0644 \u0645\u0627\u0631\u06A9\u200C\u062F\u0627\u0648\u0646\u06CC \u0628\u0627\u0632 \u0646\u06CC\u0633\u062A");
        return;
      }
      const editor = view.editor;
      const cursor = editor.getCursor();
      const text = editor.getValue();
      const result = processText(text, this.settings);
      if (result.fixCount > 0) {
        editor.setValue(result.text);
        editor.setCursor(cursor);
        new import_obsidian.Notice(`\u2713 ${result.fixCount} \u062E\u0637 \u0627\u0635\u0644\u0627\u062D \u0634\u062F`);
      } else {
        new import_obsidian.Notice("\u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0635\u0644\u0627\u062D \u0646\u0628\u0648\u062F");
      }
      this.updateStatusBar();
    });
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("rtl-fixer-status");
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateStatusBar();
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-change", () => {
        this.updateStatusBar();
      })
    );
    this.updateStatusBar();
    this.addCommand({
      id: "fix-rtl",
      name: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0634\u0627\u0646\u0647 RLM \u0628\u0647 \u062E\u0637\u0648\u0637 \u062F\u0648\u0632\u0628\u0627\u0646\u0647",
      editorCallback: (editor) => {
        const cursor = editor.getCursor();
        const text = editor.getValue();
        const result = processText(text, this.settings);
        if (result.fixCount > 0) {
          editor.setValue(result.text);
          editor.setCursor(cursor);
          new import_obsidian.Notice(`\u2713 ${result.fixCount} \u062E\u0637 \u0627\u0635\u0644\u0627\u062D \u0634\u062F`);
        } else {
          new import_obsidian.Notice("\u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0635\u0644\u0627\u062D \u0646\u0628\u0648\u062F");
        }
        this.updateStatusBar();
      }
    });
    this.addCommand({
      id: "fix-selection",
      name: "\u0627\u0635\u0644\u0627\u062D \u0628\u062E\u0634 \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new import_obsidian.Notice("\u0645\u062A\u0646\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647");
          return;
        }
        const result = processText(selection, this.settings);
        if (result.fixCount > 0) {
          editor.replaceSelection(result.text);
          new import_obsidian.Notice(`\u2713 ${result.fixCount} \u062E\u0637 \u0627\u0635\u0644\u0627\u062D \u0634\u062F`);
        } else {
          new import_obsidian.Notice("\u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0635\u0644\u0627\u062D \u0646\u0628\u0648\u062F");
        }
        this.updateStatusBar();
      }
    });
    this.addCommand({
      id: "strip-marks",
      name: "\u062D\u0630\u0641 \u0647\u0645\u0647 \u0646\u0634\u0627\u0646\u0647\u200C\u0647\u0627\u06CC RLM \u0648 LRM",
      editorCallback: (editor) => {
        const cursor = editor.getCursor();
        const text = editor.getValue();
        const result = stripAllMarks2(text);
        if (result.count > 0) {
          editor.setValue(result.text);
          editor.setCursor(cursor);
          new import_obsidian.Notice(`\u2713 ${result.count} \u0646\u0634\u0627\u0646\u0647 \u062D\u0630\u0641 \u0634\u062F`);
        } else {
          new import_obsidian.Notice("\u0646\u0634\u0627\u0646\u0647\u200C\u0627\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F");
        }
        this.updateStatusBar();
      }
    });
    this.addSettingTab(new RtlFixerSettingTab(this.app, this));
  }
  updateStatusBar() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) {
      this.statusBarEl.setText("");
      return;
    }
    const text = view.editor.getValue();
    const { rlm, lrm } = countMarks(text);
    const total = rlm + lrm;
    if (total === 0) {
      this.statusBarEl.setText("BiDi: \u2014");
    } else {
      this.statusBarEl.setText(`BiDi: ${total} (${rlm}\u0631 ${lrm}L)`);
    }
  }
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var RtlFixerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.setAttribute("dir", "rtl");
    containerEl.createEl("h2", { text: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A RTL Fixer" });
    containerEl.createEl("p", {
      text: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u0646\u0634\u0627\u0646\u0647 RLM \u0628\u0631\u0627\u06CC \u06A9\u062F\u0627\u0645 \u0646\u0648\u0639 \u062E\u0637\u0648\u0637 \u0627\u0639\u0645\u0627\u0644 \u0634\u0648\u062F. \u0641\u0642\u0637 \u062E\u0637\u0648\u0637\u06CC \u06A9\u0647 \u0647\u0645 \u0641\u0627\u0631\u0633\u06CC \u0648 \u0647\u0645 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC \u062F\u0627\u0631\u0646\u062F \u062A\u062D\u062A \u062A\u0623\u062B\u06CC\u0631 \u0642\u0631\u0627\u0631 \u0645\u06CC\u200C\u06AF\u06CC\u0631\u0646\u062F."
    });
    new import_obsidian.Setting(containerEl).setName("\u062A\u06CC\u062A\u0631\u0647\u0627 (Headings)").setDesc("\u062E\u0637\u0648\u0637 # \u0639\u0646\u0648\u0627\u0646").addToggle(
      (t) => t.setValue(this.plugin.settings.headings).onChange(async (v) => {
        this.plugin.settings.headings = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u0644\u06CC\u0633\u062A\u200C\u0647\u0627 (Lists)").setDesc("\u0622\u06CC\u062A\u0645\u200C\u0647\u0627\u06CC \u0644\u06CC\u0633\u062A \u0645\u0631\u062A\u0628\u060C \u0646\u0627\u0645\u0631\u062A\u0628 \u0648 \u062A\u0633\u06A9\u200C\u0644\u06CC\u0633\u062A").addToggle(
      (t) => t.setValue(this.plugin.settings.listItems).onChange(async (v) => {
        this.plugin.settings.listItems = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u0646\u0642\u0644\u200C\u0642\u0648\u0644 (Blockquote)").setDesc("\u062E\u0637\u0648\u0637 > \u0646\u0642\u0644\u200C\u0642\u0648\u0644").addToggle(
      (t) => t.setValue(this.plugin.settings.blockquotes).onChange(async (v) => {
        this.plugin.settings.blockquotes = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u062C\u062F\u0648\u0644 (Table)").setDesc("\u0633\u0644\u0648\u0644\u200C\u0647\u0627\u06CC \u062C\u062F\u0648\u0644 \u0645\u0627\u0631\u06A9\u200C\u062F\u0627\u0648\u0646").addToggle(
      (t) => t.setValue(this.plugin.settings.tables).onChange(async (v) => {
        this.plugin.settings.tables = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u067E\u0627\u0631\u0627\u06AF\u0631\u0627\u0641 (Paragraph)").setDesc("\u062E\u0637\u0648\u0637 \u0645\u062A\u0646 \u0633\u0627\u062F\u0647 \u0648 \u0633\u0631\u062A\u06CC\u062A\u0631 \u0644\u06CC\u0633\u062A\u200C\u0647\u0627").addToggle(
      (t) => t.setValue(this.plugin.settings.paragraphs).onChange(async (v) => {
        this.plugin.settings.paragraphs = v;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("hr");
    new import_obsidian.Setting(containerEl).setName("\u0627\u0635\u0644\u0627\u062D \u0634\u0631\u0648\u0639 \u062E\u0646\u062B\u06CC").setDesc(
      "\u062E\u0637\u0648\u0637\u06CC \u06A9\u0647 \u0628\u0627 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u062E\u0646\u062B\u06CC (\u0639\u062F\u062F\u060C \u067E\u0631\u0627\u0646\u062A\u0632 \u0648 ...) \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0628\u0631 \u0627\u0633\u0627\u0633 \u0645\u062D\u062A\u0648\u0627 LRM \u06CC\u0627 RLM \u0628\u06AF\u06CC\u0631\u0646\u062F"
    ).addToggle(
      (t) => t.setValue(this.plugin.settings.neutralFix).onChange(async (v) => {
        this.plugin.settings.neutralFix = v;
        await this.plugin.saveSettings();
      })
    );
  }
};
