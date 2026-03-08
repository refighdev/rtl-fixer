import { detectLineDir } from "./bidi.js";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMd(text: string): string {
  let s = escHtml(text);
  const codeSlots: string[] = [];
  s = s.replace(/`(.+?)`/g, (_, code: string) => {
    codeSlots.push(`<code>${code}</code>`);
    return `\x00CODE${codeSlots.length - 1}\x00`;
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(
    /(?<![&"=])\b(https?:\/\/[^\s<>)]+)/g,
    '<a href="$1">$1</a>'
  );
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, i: string) => codeSlots[parseInt(i)]);
  return s;
}

type Block =
  | { type: "empty" }
  | { type: "hr" }
  | { type: "heading"; level: number; content: string }
  | { type: "p"; content: string }
  | { type: "ol"; start: number; content: string; checked?: boolean }
  | { type: "ul"; content: string; checked?: boolean }
  | { type: "blockquote"; content: string }
  | { type: "code"; lang: string; content: string }
  | { type: "table-row"; raw: string };

export function renderCustomMd(text: string): string {
  const BIDI_RE = /^[\u200F\u200E]*/;
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let codeLang = "";

  for (const rawLine of lines) {
    const stripped = rawLine.replace(BIDI_RE, "");
    const fenceMatch = stripped.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      if (inCode) {
        blocks.push({ type: "code", lang: codeLang, content: codeBuf.join("\n") });
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
        codeLang = fenceMatch[1] || "";
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(rawLine);
      continue;
    }

    const leadMark = rawLine.match(BIDI_RE)![0];
    const line = rawLine.slice(leadMark.length);

    if (!line.trim() && !leadMark) {
      blocks.push({ type: "empty" });
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      blocks.push({ type: "heading", level: hMatch[1].length, content: leadMark + hMatch[2] });
      continue;
    }

    if (/^\s*([-*_]\s*){3,}$/.test(line) && !leadMark) {
      blocks.push({ type: "hr" });
      continue;
    }

    const olMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)/);
    if (olMatch) {
      blocks.push({ type: "ol", start: parseInt(olMatch[2]), content: leadMark + olMatch[3] });
      continue;
    }

    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)/);
    if (taskMatch) {
      blocks.push({ type: "ul", content: leadMark + taskMatch[3], checked: taskMatch[2] !== " " });
      continue;
    }

    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (ulMatch) {
      blocks.push({ type: "ul", content: leadMark + ulMatch[2] });
      continue;
    }

    const tableMatch = line.match(/^\|(.+)\|$/);
    if (tableMatch) {
      blocks.push({ type: "table-row", raw: tableMatch[1] });
      continue;
    }

    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      blocks.push({ type: "blockquote", content: leadMark + bqMatch[1] });
      continue;
    }

    blocks.push({ type: "p", content: rawLine });
  }

  if (inCode) {
    blocks.push({ type: "code", lang: codeLang, content: codeBuf.join("\n") });
  }

  let html = "";
  let idx = 0;

  function dirAttr(content: string): string {
    const d = detectLineDir(content);
    return d ? ` dir="${d}"` : "";
  }

  while (idx < blocks.length) {
    const b = blocks[idx];

    if (b.type === "ol") {
      const firstDir = detectLineDir(b.content);
      html += `<ol start="${b.start}"${firstDir ? ` dir="${firstDir}"` : ""}>`;
      while (idx < blocks.length && blocks[idx].type === "ol") {
        const item = blocks[idx] as Extract<Block, { type: "ol" }>;
        html += `<li${dirAttr(item.content)}>${inlineMd(item.content)}</li>`;
        idx++;
      }
      html += "</ol>";
      continue;
    }

    if (b.type === "ul") {
      const firstDir = detectLineDir(b.content);
      html += `<ul${firstDir ? ` dir="${firstDir}"` : ""}>`;
      while (idx < blocks.length && blocks[idx].type === "ul") {
        const item = blocks[idx] as Extract<Block, { type: "ul" }>;
        if (item.checked !== undefined) {
          const cb = item.checked
            ? '<input type="checkbox" checked disabled> '
            : '<input type="checkbox" disabled> ';
          html += `<li class="task-item"${dirAttr(item.content)}>${cb}${inlineMd(item.content)}</li>`;
        } else {
          html += `<li${dirAttr(item.content)}>${inlineMd(item.content)}</li>`;
        }
        idx++;
      }
      html += "</ul>";
      continue;
    }

    if (b.type === "blockquote") {
      html += "<blockquote>";
      while (idx < blocks.length && blocks[idx].type === "blockquote") {
        const item = blocks[idx] as Extract<Block, { type: "blockquote" }>;
        html += `<p${dirAttr(item.content)}>${inlineMd(item.content)}</p>`;
        idx++;
      }
      html += "</blockquote>";
      continue;
    }

    if (b.type === "table-row") {
      const rows: string[] = [];
      while (idx < blocks.length && blocks[idx].type === "table-row") {
        rows.push((blocks[idx] as Extract<Block, { type: "table-row" }>).raw);
        idx++;
      }
      if (rows.length >= 2) {
        const isSep = (r: string) => /^[\s|:\-]+$/.test(r);
        const sepIdx = isSep(rows[1]) ? 1 : -1;
        const aligns: string[] = [];
        if (sepIdx === 1) {
          rows[1].split("|").forEach((cell) => {
            const t = cell.trim();
            if (t.startsWith(":") && t.endsWith(":")) aligns.push("center");
            else if (t.endsWith(":")) aligns.push("right");
            else if (t.startsWith(":")) aligns.push("left");
            else aligns.push("");
          });
        }
        html += "<table>";
        rows.forEach((row, ri) => {
          if (ri === sepIdx) return;
          const isHead = sepIdx === 1 && ri === 0;
          const tag = isHead ? "th" : "td";
          html += "<tr>";
          row.split("|").forEach((cell, ci) => {
            const align = aligns[ci] || "";
            const style = align ? ` style="text-align:${align}"` : "";
            const content = cell.trim();
            html += `<${tag}${style}${dirAttr(content)}>${inlineMd(content)}</${tag}>`;
          });
          html += "</tr>";
        });
        html += "</table>";
      }
      continue;
    }

    if (b.type === "heading") {
      html += `<h${b.level}${dirAttr(b.content)}>${inlineMd(b.content)}</h${b.level}>`;
    } else if (b.type === "hr") {
      html += "<hr>";
    } else if (b.type === "code") {
      html += `<pre dir="ltr"><code>${escHtml(b.content)}</code></pre>`;
    } else if (b.type === "p") {
      html += `<p${dirAttr(b.content)}>${inlineMd(b.content)}</p>`;
    }

    idx++;
  }

  return html;
}

export function extractDisplayedText(container: HTMLElement): string {
  const parts: string[] = [];
  for (const child of Array.from(container.children)) {
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "ol") {
      let i = parseInt(el.getAttribute("start") || "1", 10);
      for (const li of Array.from(el.querySelectorAll(":scope > li"))) {
        parts.push(`${i}. ${(li as HTMLElement).innerText}`);
        i++;
      }
    } else if (tag === "ul") {
      for (const li of Array.from(el.querySelectorAll(":scope > li"))) {
        parts.push(`- ${(li as HTMLElement).innerText}`);
      }
    } else {
      parts.push(el.innerText);
    }
  }
  return parts.join("\n");
}
