import { describe, it, expect } from "vitest";
import {
  detectLineDir,
  applyFix,
  stripAllMarks,
  RLM,
  LRM,
  prepareForMarkdown,
  stripMarksForMdPreview,
} from "@/lib/bidi";

describe("detectLineDir", () => {
  it("returns 'rtl' for pure Persian", () => {
    expect(detectLineDir("سلام دنیا")).toBe("rtl");
  });

  it("returns 'ltr' for pure English", () => {
    expect(detectLineDir("Hello World")).toBe("ltr");
  });

  it("returns 'rtl' for mixed Persian + English", () => {
    expect(detectLineDir("سلام Hello")).toBe("rtl");
    expect(detectLineDir("Hello سلام")).toBe("rtl");
  });

  it("returns 'rtl' when RLM is present", () => {
    expect(detectLineDir(RLM + "test")).toBe("rtl");
  });

  it("returns 'ltr' when LRM is present alone", () => {
    expect(detectLineDir(LRM + "123")).toBe("ltr");
  });

  it("returns null for neutral-only text", () => {
    expect(detectLineDir("123 456")).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(detectLineDir("")).toBe(null);
  });
});

describe("applyFix", () => {
  it("adds RLM to mixed lines in auto mode", () => {
    const result = applyFix(
      "packages/shared با types و validators",
      "auto",
      "auto",
      false
    );
    expect(result.text.startsWith(RLM)).toBe(true);
    expect(result.fixCount).toBe(1);
  });

  it("does not touch pure Persian lines", () => {
    const result = applyFix("سلام دنیا", "auto", "auto", false);
    expect(result.text).toBe("سلام دنیا");
    expect(result.fixCount).toBe(0);
  });

  it("does not touch pure English lines", () => {
    const result = applyFix("Hello World", "auto", "auto", false);
    expect(result.text).toBe("Hello World");
    expect(result.fixCount).toBe(0);
  });

  it("adds LRM to neutral-starting English line when neutralFix is on", () => {
    const result = applyFix("4. Better Auth", "auto", "auto", true);
    expect(result.text.startsWith(LRM)).toBe(true);
    expect(result.fixCount).toBe(1);
  });

  it("adds RLM to neutral-starting mixed line when neutralFix is on", () => {
    const result = applyFix("5. next-intl با 4 زبان", "auto", "auto", true);
    expect(result.text.startsWith(RLM)).toBe(true);
  });

  it("does not add mark to neutral-starting line when neutralFix is off", () => {
    const result = applyFix("4. Better Auth", "auto", "auto", false);
    expect(result.text).toBe("4. Better Auth");
    expect(result.fixCount).toBe(0);
  });

  it("forces RTL on all lines in rtl mode", () => {
    const result = applyFix("Hello World\nسلام", "rtl", "auto", false);
    const lines = result.text.split("\n");
    expect(lines[0].startsWith(RLM)).toBe(true);
    expect(lines[1].startsWith(RLM)).toBe(true);
    expect(result.fixCount).toBe(2);
  });

  it("forces LTR on all lines in ltr mode", () => {
    const result = applyFix("Hello World\nسلام", "ltr", "auto", false);
    const lines = result.text.split("\n");
    expect(lines[0].startsWith(LRM)).toBe(true);
    expect(lines[1].startsWith(LRM)).toBe(true);
    expect(result.fixCount).toBe(2);
  });

  it("respects listDir override", () => {
    const result = applyFix("1. Hello World", "auto", "rtl", false);
    expect(result.text.startsWith(RLM)).toBe(true);
  });

  it("handles multiline text correctly", () => {
    const input = "نقاط قوت\nHello World\npackages/shared با types";
    const result = applyFix(input, "auto", "auto", false);
    const lines = result.text.split("\n");
    expect(lines[0]).toBe("نقاط قوت");
    expect(lines[1]).toBe("Hello World");
    expect(lines[2].startsWith(RLM)).toBe(true);
  });

  it("strips existing marks before reapplying", () => {
    const input = RLM + "Hello World";
    const result = applyFix(input, "auto", "auto", false);
    expect(result.text).toBe("Hello World");
  });
});

describe("stripAllMarks", () => {
  it("removes all RLM and LRM characters", () => {
    const input = RLM + "سلام " + LRM + "Hello";
    const result = stripAllMarks(input);
    expect(result.text).toBe("سلام Hello");
    expect(result.count).toBe(2);
  });

  it("returns count 0 when no marks present", () => {
    const result = stripAllMarks("plain text");
    expect(result.count).toBe(0);
  });
});

describe("prepareForMarkdown", () => {
  it("moves RLM after list number syntax", () => {
    const input = RLM + "1. سلام";
    const result = prepareForMarkdown(input);
    expect(result).toBe("1. " + RLM + "سلام");
  });

  it("moves mark after heading syntax", () => {
    const input = RLM + "## عنوان";
    const result = prepareForMarkdown(input);
    expect(result).toBe("## " + RLM + "عنوان");
  });
});

describe("stripMarksForMdPreview", () => {
  it("strips visible ر  marker", () => {
    const input = "ر سلام";
    const result = stripMarksForMdPreview(input);
    expect(result).toBe("سلام");
  });

  it("strips visible L marker", () => {
    const input = "L Hello";
    const result = stripMarksForMdPreview(input);
    expect(result).toBe("Hello");
  });
});
