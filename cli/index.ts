#!/usr/bin/env node

import fs from "fs";
import path from "path";

const RLM = "\u200F";
const LRM = "\u200E";

const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
const LIST_LINE = /^\s*(\d+[.)]\s|[-*+]\s)/;

function startsWithNeutral(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function stripMarks(line: string): string {
  return line.replace(/^[\u200F\u200E]+/, "");
}

type FixMode = "auto" | "rtl" | "ltr";

function pickMark(
  clean: string,
  neutralFix: boolean
): string | null {
  const hasRTL = RTL_RANGE.test(clean);
  const hasLTR = STRONG_LTR.test(clean);
  if (hasRTL && hasLTR) return RLM;
  if (startsWithNeutral(clean) && neutralFix) {
    if (hasRTL) return RLM;
    if (hasLTR) return LRM;
  }
  return null;
}

function fixText(text: string, mode: FixMode, neutralFix: boolean): string {
  return text
    .split("\n")
    .map((line) => {
      const clean = stripMarks(line);
      if (!clean.trim()) return clean;
      if (mode === "rtl") return RLM + clean;
      if (mode === "ltr") return LRM + clean;
      const mark = pickMark(clean, neutralFix);
      return mark ? mark + clean : clean;
    })
    .join("\n");
}

function stripAllMarks(text: string): string {
  return text.replace(/[\u200F\u200E]/g, "");
}

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`
Usage: rtl-fix [options] <input-file> [-o <output-file>]

Options:
  -m, --mode <auto|rtl|ltr>  Fix mode (default: auto)
  -n, --neutral-fix          Enable neutral-start fix
  -s, --strip                Strip all BiDi marks instead
  -o, --output <file>        Output file (default: stdout)
  -h, --help                 Show this help

Examples:
  rtl-fix input.md -o output.md
  rtl-fix input.txt --mode rtl
  cat input.md | rtl-fix -
  rtl-fix input.md --strip -o clean.md
`);
}

let inputFile: string | null = null;
let outputFile: string | null = null;
let mode: FixMode = "auto";
let neutralFix = false;
let doStrip = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "-h":
    case "--help":
      printHelp();
      process.exit(0);
      break;
    case "-m":
    case "--mode":
      mode = (args[++i] || "auto") as FixMode;
      break;
    case "-n":
    case "--neutral-fix":
      neutralFix = true;
      break;
    case "-s":
    case "--strip":
      doStrip = true;
      break;
    case "-o":
    case "--output":
      outputFile = args[++i];
      break;
    default:
      inputFile = arg;
  }
}

async function run(): Promise<void> {
  let input: string;

  if (!inputFile || inputFile === "-") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    input = Buffer.concat(chunks).toString("utf-8");
  } else {
    const resolved = path.resolve(inputFile);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: File not found: ${resolved}`);
      process.exit(1);
    }
    input = fs.readFileSync(resolved, "utf-8");
  }

  const result = doStrip
    ? stripAllMarks(input)
    : fixText(input, mode, neutralFix);

  if (outputFile) {
    fs.writeFileSync(path.resolve(outputFile), result, "utf-8");
    const lines = result.split("\n").length;
    console.error(`✓ ${lines} lines processed → ${outputFile}`);
  } else {
    process.stdout.write(result);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
