import * as vscode from "vscode";

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

function fixText(text: string, neutralFix: boolean): string {
  return text
    .split("\n")
    .map((line) => {
      const clean = stripMarks(line);
      if (!clean.trim()) return clean;
      const mark = pickMark(clean, neutralFix);
      return mark ? mark + clean : clean;
    })
    .join("\n");
}

function stripAllMarks(text: string): string {
  return text.replace(/[\u200F\u200E]/g, "");
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "rtlFixer.fixDocument",
      (editor) => {
        const doc = editor.document;
        const text = doc.getText();
        const fixed = fixText(text, true);
        if (fixed === text) {
          vscode.window.showInformationMessage(
            "RTL Fixer: متن نیازی به اصلاح نداشت"
          );
          return;
        }
        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(text.length)
        );
        editor.edit((b) => b.replace(fullRange, fixed));
        const count = (fixed.match(/[\u200F\u200E]/g) || []).length;
        vscode.window.showInformationMessage(
          `RTL Fixer: ${count} نشانه اضافه شد`
        );
      }
    ),

    vscode.commands.registerTextEditorCommand(
      "rtlFixer.fixSelection",
      (editor) => {
        const selection = editor.selection;
        if (selection.isEmpty) {
          vscode.window.showWarningMessage("RTL Fixer: متنی انتخاب نشده");
          return;
        }
        const text = editor.document.getText(selection);
        const fixed = fixText(text, true);
        editor.edit((b) => b.replace(selection, fixed));
      }
    ),

    vscode.commands.registerTextEditorCommand(
      "rtlFixer.stripMarks",
      (editor) => {
        const doc = editor.document;
        const text = doc.getText();
        const stripped = stripAllMarks(text);
        if (stripped === text) {
          vscode.window.showInformationMessage("RTL Fixer: نشانه‌ای پیدا نشد");
          return;
        }
        const count = text.length - stripped.length;
        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(text.length)
        );
        editor.edit((b) => b.replace(fullRange, stripped));
        vscode.window.showInformationMessage(
          `RTL Fixer: ${count} نشانه حذف شد`
        );
      }
    )
  );
}

export function deactivate() {}
