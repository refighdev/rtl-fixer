import { describe, it, expect } from "vitest";
import { renderCustomMd } from "@/lib/markdown";
import { RLM } from "@/lib/bidi";

describe("renderCustomMd", () => {
  it("renders headings with dir attribute", () => {
    const html = renderCustomMd("# نقاط قوت");
    expect(html).toContain("<h1");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("نقاط قوت");
  });

  it("renders English heading as ltr", () => {
    const html = renderCustomMd("## Hello World");
    expect(html).toContain('dir="ltr"');
  });

  it("renders mixed heading as rtl", () => {
    const html = renderCustomMd("# Hono RPC Client -- بهترین انتخاب");
    expect(html).toContain('dir="rtl"');
  });

  it("renders ordered list", () => {
    const html = renderCustomMd("1. Item one\n2. Item two");
    expect(html).toContain("<ol");
    expect(html).toContain("<li");
    expect(html).toContain("Item one");
    expect(html).toContain("Item two");
  });

  it("renders unordered list", () => {
    const html = renderCustomMd("- First\n- Second");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
  });

  it("renders task list with checkboxes", () => {
    const html = renderCustomMd("- [ ] Todo\n- [x] Done");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain("task-item");
  });

  it("renders code fences", () => {
    const html = renderCustomMd("```js\nconsole.log('hi')\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain("console.log");
  });

  it("renders inline bold", () => {
    const html = renderCustomMd("**bold text**");
    expect(html).toContain("<strong>bold text</strong>");
  });

  it("renders inline italic", () => {
    const html = renderCustomMd("*italic text*");
    expect(html).toContain("<em>italic text</em>");
  });

  it("renders inline code", () => {
    const html = renderCustomMd("use `npm install` here");
    expect(html).toContain("<code>npm install</code>");
  });

  it("renders links", () => {
    const html = renderCustomMd("[Google](https://google.com)");
    expect(html).toContain('href="https://google.com"');
    expect(html).toContain(">Google</a>");
  });

  it("auto-links bare URLs", () => {
    const html = renderCustomMd("Visit https://example.com now");
    expect(html).toContain('href="https://example.com"');
  });

  it("renders blockquote", () => {
    const html = renderCustomMd("> quoted text");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("quoted text");
  });

  it("renders horizontal rule", () => {
    const html = renderCustomMd("---");
    expect(html).toContain("<hr>");
  });

  it("handles RLM prefix in lines", () => {
    const html = renderCustomMd(RLM + "سلام Hello");
    expect(html).toContain('dir="rtl"');
  });

  it("renders table", () => {
    const html = renderCustomMd("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });
});
