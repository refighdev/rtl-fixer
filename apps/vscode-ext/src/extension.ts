import * as vscode from "vscode";
import {
  RLM,
  LRM,
  RTL_RANGE,
  STRONG_LTR,
  detectLineDir,
  stripAllMarks,
} from "@rtl-fixer/core";

type LineType =
  | "heading"
  | "list"
  | "blockquote"
  | "table"
  | "tableSep"
  | "paragraph"
  | "empty";

interface LineInfo {
  type: LineType;
  prefixEnd: number;
}

function classifyLine(line: string): LineInfo {
  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;

  if (!trimmed) return { type: "empty", prefixEnd: 0 };

  const hm = trimmed.match(/^(#{1,6}\s)/);
  if (hm) return { type: "heading", prefixEnd: indent + hm[1].length };

  const tm = trimmed.match(/^([-*+]\s\[[ xX]\]\s)/);
  if (tm) return { type: "list", prefixEnd: indent + tm[1].length };

  const um = trimmed.match(/^([-*+]\s)/);
  if (um) return { type: "list", prefixEnd: indent + um[1].length };

  const om = trimmed.match(/^(\d+[.)]\s)/);
  if (om) return { type: "list", prefixEnd: indent + om[1].length };

  const bm = trimmed.match(/^(>\s?)/);
  if (bm) return { type: "blockquote", prefixEnd: indent + bm[1].length };

  if (/^[|\s:\-]+$/.test(trimmed)) return { type: "tableSep", prefixEnd: 0 };
  if (trimmed.startsWith("|") && trimmed.endsWith("|"))
    return { type: "table", prefixEnd: 0 };

  return { type: "paragraph", prefixEnd: 0 };
}

function hasBothDirections(text: string): boolean {
  return RTL_RANGE.test(text) && STRONG_LTR.test(text);
}

function startsWithNeutral(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function stripMarks(line: string): string {
  return line.replace(/[\u200F\u200E]/g, "");
}

function fixTableRow(line: string): { text: string; fixed: boolean } {
  const parts = line.split("|");
  let anyFixed = false;

  const result = parts.map((cell, i) => {
    if (i === 0 || i === parts.length - 1) return cell;
    const trimmed = cell.trim();
    if (hasBothDirections(trimmed)) {
      anyFixed = true;
      return cell.replace(trimmed, RLM + trimmed);
    }
    return cell;
  });

  return { text: anyFixed ? result.join("|") : line, fixed: anyFixed };
}

function pickMarkForContent(
  content: string,
  neutralFix: boolean
): string | null {
  if (hasBothDirections(content)) return RLM;
  if (neutralFix && startsWithNeutral(content)) {
    if (RTL_RANGE.test(content)) return RLM;
    if (STRONG_LTR.test(content)) return LRM;
  }
  return null;
}

function processText(
  text: string,
  neutralFix: boolean
): { text: string; fixCount: number } {
  const lines = text.split("\n");
  let fixCount = 0;
  let inCodeBlock = false;
  let inFrontmatter = false;

  if (lines[0]?.trim() === "---") inFrontmatter = true;

  const result = lines.map((raw, i) => {
    if (inFrontmatter) {
      if (i > 0 && raw.trim() === "---") inFrontmatter = false;
      return raw;
    }

    if (raw.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return raw;
    }
    if (inCodeBlock) return raw;

    const clean = stripMarks(raw);
    if (!clean.trim()) return clean;

    const info = classifyLine(clean);

    if (info.type === "table") {
      const res = fixTableRow(clean);
      if (res.fixed) fixCount++;
      return res.text;
    }

    if (info.type === "tableSep" || info.type === "empty") return clean;

    const content = clean.slice(info.prefixEnd);
    const mark = pickMarkForContent(content, neutralFix);
    if (!mark) return clean;

    fixCount++;
    if (info.prefixEnd > 0) {
      return clean.slice(0, info.prefixEnd) + mark + content;
    }
    return mark + clean;
  });

  return { text: result.join("\n"), fixCount };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPreviewHtml(text: string): string {
  const lines = text.split("\n");
  const body = lines
    .map((line) => {
      const dir = detectLineDir(line) || "ltr";
      return `<div dir="${dir}" style="text-align:${dir === "rtl" ? "right" : "left"}">${escapeHtml(line) || "&nbsp;"}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: var(--vscode-editor-font-family, 'Segoe UI', Tahoma, sans-serif);
    font-size: var(--vscode-editor-font-size, 14px);
    line-height: 1.7;
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background);
    padding: 16px 24px;
    margin: 0;
    unicode-bidi: plaintext;
  }
  div {
    padding: 1px 0;
    unicode-bidi: plaintext;
  }
</style>
</head>
<body>${body}</body>
</html>`;
}

let previewPanel: vscode.WebviewPanel | undefined;

function showPreview(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("RTL Fixer: فایلی باز نیست");
    return;
  }

  const column = editor.viewColumn
    ? editor.viewColumn + 1
    : vscode.ViewColumn.Beside;

  if (previewPanel) {
    previewPanel.webview.html = buildPreviewHtml(editor.document.getText());
    previewPanel.reveal(column, true);
    return;
  }

  previewPanel = vscode.window.createWebviewPanel(
    "rtlFixerPreview",
    "RTL Preview",
    { viewColumn: column as vscode.ViewColumn, preserveFocus: true },
    { enableScripts: false }
  );

  previewPanel.webview.html = buildPreviewHtml(editor.document.getText());

  const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (
      previewPanel &&
      vscode.window.activeTextEditor &&
      e.document === vscode.window.activeTextEditor.document
    ) {
      previewPanel.webview.html = buildPreviewHtml(e.document.getText());
    }
  });

  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
    (newEditor) => {
      if (previewPanel && newEditor) {
        previewPanel.webview.html = buildPreviewHtml(
          newEditor.document.getText()
        );
      }
    }
  );

  previewPanel.onDidDispose(() => {
    previewPanel = undefined;
    changeListener.dispose();
    editorChangeListener.dispose();
  });

  context.subscriptions.push(changeListener, editorChangeListener);
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "rtlFixer.fixDocument",
      (editor) => {
        const doc = editor.document;
        const cursorPos = editor.selection.active;
        const text = doc.getText();
        const result = processText(text, true);

        if (result.fixCount === 0) {
          vscode.window.showInformationMessage(
            "RTL Fixer: متن نیازی به اصلاح نداشت"
          );
          return;
        }

        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(text.length)
        );
        editor.edit((b) => b.replace(fullRange, result.text)).then(() => {
          editor.selection = new vscode.Selection(cursorPos, cursorPos);
        });
        vscode.window.showInformationMessage(
          `RTL Fixer: ${result.fixCount} خط اصلاح شد`
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
        const result = processText(text, true);
        if (result.fixCount > 0) {
          editor.edit((b) => b.replace(selection, result.text));
          vscode.window.showInformationMessage(
            `RTL Fixer: ${result.fixCount} خط اصلاح شد`
          );
        } else {
          vscode.window.showInformationMessage(
            "RTL Fixer: متن نیازی به اصلاح نداشت"
          );
        }
      }
    ),

    vscode.commands.registerTextEditorCommand(
      "rtlFixer.stripMarks",
      (editor) => {
        const doc = editor.document;
        const cursorPos = editor.selection.active;
        const text = doc.getText();
        const result = stripAllMarks(text);

        if (result.count === 0) {
          vscode.window.showInformationMessage("RTL Fixer: نشانه‌ای پیدا نشد");
          return;
        }

        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(text.length)
        );
        editor.edit((b) => b.replace(fullRange, result.text)).then(() => {
          editor.selection = new vscode.Selection(cursorPos, cursorPos);
        });
        vscode.window.showInformationMessage(
          `RTL Fixer: ${result.count} نشانه حذف شد`
        );
      }
    ),

    vscode.commands.registerCommand("rtlFixer.preview", () => {
      showPreview(context);
    })
  );
}

export function deactivate() {
  if (previewPanel) {
    previewPanel.dispose();
  }
}
