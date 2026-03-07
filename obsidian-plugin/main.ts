import { Plugin, Editor, MarkdownView, Notice } from "obsidian";

const RLM = "\u200F";
const LRM = "\u200E";

const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

function startsWithNeutral(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function stripMarks(line: string): string {
  return line.replace(/^[\u200F\u200E]+/, "");
}

function pickMark(clean: string, neutralFix: boolean): string | null {
  const hasRTL = RTL_RANGE.test(clean);
  const hasLTR = STRONG_LTR.test(clean);
  if (hasRTL && hasLTR) return RLM;
  if (startsWithNeutral(clean) && neutralFix) {
    if (hasRTL) return RLM;
    if (hasLTR) return LRM;
  }
  return null;
}

function fixText(text: string, neutralFix: boolean): { text: string; count: number } {
  let count = 0;
  const lines = text.split("\n").map((line) => {
    const clean = stripMarks(line);
    if (!clean.trim()) return clean;
    const mark = pickMark(clean, neutralFix);
    if (mark) {
      count++;
      return mark + clean;
    }
    return clean;
  });
  return { text: lines.join("\n"), count };
}

function stripAllMarks(text: string): { text: string; count: number } {
  const count = (text.match(/[\u200F\u200E]/g) || []).length;
  return { text: text.replace(/[\u200F\u200E]/g, ""), count };
}

export default class RTLFixerPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "fix-document",
      name: "Fix entire document",
      editorCallback: (editor: Editor) => {
        const text = editor.getValue();
        const result = fixText(text, true);
        if (result.count === 0) {
          new Notice("RTL Fixer: متن نیازی به اصلاح نداشت");
          return;
        }
        editor.setValue(result.text);
        new Notice(`RTL Fixer: ${result.count} خط اصلاح شد`);
      },
    });

    this.addCommand({
      id: "fix-selection",
      name: "Fix selection",
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new Notice("RTL Fixer: متنی انتخاب نشده");
          return;
        }
        const result = fixText(selection, true);
        editor.replaceSelection(result.text);
        new Notice(`RTL Fixer: ${result.count} خط اصلاح شد`);
      },
    });

    this.addCommand({
      id: "strip-marks",
      name: "Strip all BiDi marks",
      editorCallback: (editor: Editor) => {
        const text = editor.getValue();
        const result = stripAllMarks(text);
        if (result.count === 0) {
          new Notice("RTL Fixer: نشانه‌ای پیدا نشد");
          return;
        }
        editor.setValue(result.text);
        new Notice(`RTL Fixer: ${result.count} نشانه حذف شد`);
      },
    });
  }
}
