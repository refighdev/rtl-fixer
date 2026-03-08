export const RLM = "\u200F";
export const LRM = "\u200E";

export const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

const LIST_LINE = /^\s*(\d+[.)]\s|[-*+]\s)/;

export type FixMode = "auto" | "rtl" | "ltr";
export type ListDir = "auto" | "rtl" | "ltr";
export type OnOff = "on" | "off";

function startsWithNeutral(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function stripMarksFromLine(line: string): string {
  return line.replace(/^[\u200F\u200E]+/, "");
}

export function detectLineDir(txt: string): "rtl" | "ltr" | null {
  let hasRTL = false;
  let hasLTR = false;
  for (const ch of txt) {
    if (!hasRTL && (ch === RLM || RTL_RANGE.test(ch))) hasRTL = true;
    if (!hasLTR && (ch === LRM || STRONG_LTR.test(ch))) hasLTR = true;
    if (hasRTL && hasLTR) return "rtl";
  }
  if (hasRTL) return "rtl";
  if (hasLTR) return "ltr";
  return null;
}

function pickMark(
  clean: string,
  listDir: ListDir,
  neutralFix: boolean
): string | null {
  const isList = LIST_LINE.test(clean);
  if (isList && listDir !== "auto") {
    return listDir === "rtl" ? RLM : LRM;
  }
  const hasRTL = RTL_RANGE.test(clean);
  const hasLTR = STRONG_LTR.test(clean);
  if (hasRTL && hasLTR) return RLM;
  if (startsWithNeutral(clean) && neutralFix) {
    if (hasRTL) return RLM;
    if (hasLTR) return LRM;
  }
  return null;
}

export interface FixResult {
  text: string;
  fixCount: number;
}

function fixAuto(
  text: string,
  listDir: ListDir,
  neutralFix: boolean
): FixResult {
  let fixCount = 0;
  const lines = text.split("\n").map((line) => {
    const clean = stripMarksFromLine(line);
    if (!clean.trim()) return clean;
    const mark = pickMark(clean, listDir, neutralFix);
    if (mark) {
      fixCount++;
      return mark + clean;
    }
    return clean;
  });
  return { text: lines.join("\n"), fixCount };
}

function fixForceDir(
  text: string,
  mark: string,
  listDir: ListDir
): FixResult {
  let fixCount = 0;
  const lines = text.split("\n").map((line) => {
    const clean = stripMarksFromLine(line);
    if (!clean.trim()) return clean;
    const isList = LIST_LINE.test(clean);
    if (isList && listDir !== "auto") {
      fixCount++;
      return (listDir === "rtl" ? RLM : LRM) + clean;
    }
    fixCount++;
    return mark + clean;
  });
  return { text: lines.join("\n"), fixCount };
}

export function applyFix(
  text: string,
  fixMode: FixMode,
  listDir: ListDir,
  neutralFix: boolean
): FixResult {
  if (fixMode === "rtl") return fixForceDir(text, RLM, listDir);
  if (fixMode === "ltr") return fixForceDir(text, LRM, listDir);
  return fixAuto(text, listDir, neutralFix);
}

export function stripAllMarks(text: string): { text: string; count: number } {
  const count = (text.match(/[\u200F\u200E]/g) || []).length;
  return { text: text.replace(/[\u200F\u200E]/g, ""), count };
}

export function revealHidden(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\u200F/g, '<span class="rlm-mark">ر </span>')
        .replace(/\u200E/g, '<span class="lrm-mark">L </span>');
      return `<span style="display:block">${escaped}</span>`;
    })
    .join("");
}

export function revealInHtml(html: string): string {
  return html
    .replace(/\u200F/g, '<span class="rlm-mark">ر </span>')
    .replace(/\u200E/g, '<span class="lrm-mark">L </span>');
}

export function prepareForMarkdown(text: string): string {
  return text.replace(
    /^([\u200F\u200E])(\s*(?:\d+[.)]\s|[-*+]\s|#{1,6}\s|>\s?))/gm,
    "$2$1"
  );
}

export function stripMarksForMdPreview(text: string): string {
  return text
    .replace(/^[رL] /gm, "")
    .replace(
      /^([\u200F\u200E])(\s*(?:\d+[.)]\s|[-*+]\s|#{1,6}\s|>\s?))/gm,
      "$2$1"
    );
}
