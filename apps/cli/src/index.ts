#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { applyFix, stripAllMarks } from "@rtl-fixer/core";
import type { FixMode } from "@rtl-fixer/core";

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

  let result: string;
  if (doStrip) {
    result = stripAllMarks(input).text;
  } else {
    result = applyFix(input, mode, "auto", neutralFix).text;
  }

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
