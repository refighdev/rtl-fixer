const RLM = "\u200F";
const LRM = "\u200E";

const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
const LIST_LINE = /^\s*(\d+[.)]\s|[-*+]\s)/;

function startsWithNeutral(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function stripMarksFromLine(line) {
  return line.replace(/^[\u200F\u200E]+/, "");
}

function pickMark(clean, listDir, neutralFix) {
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

function fixAuto(text, listDir, neutralFix) {
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

function fixForceDir(text, mark, listDir) {
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

function applyFix(text) {
  const listDir = settings.listDir;
  const neutralFix = settings.neutralFix === "on";
  if (settings.fixMode === "rtl") return fixForceDir(text, RLM, listDir);
  if (settings.fixMode === "ltr") return fixForceDir(text, LRM, listDir);
  return fixAuto(text, listDir, neutralFix);
}

function stripAllMarks(text) {
  const count = (text.match(/[\u200F\u200E]/g) || []).length;
  return { text: text.replace(/[\u200F\u200E]/g, ""), count };
}

function revealHidden(text) {
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

function prepareForMarkdown(text) {
  return text.replace(
    /^([\u200F\u200E])(\s*(?:\d+[.)]\s|[-*+]\s|#{1,6}\s|>\s?))/gm,
    "$2$1"
  );
}

function stripMarksForMdPreview(text) {
  return text
    .replace(/^[رL] /gm, "")
    .replace(
      /^([\u200F\u200E])(\s*(?:\d+[.)]\s|[-*+]\s|#{1,6}\s|>\s?))/gm,
      "$2$1"
    );
}

function firstStrongDir(txt) {
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

function applyDirToBlocks(el) {
  el.querySelectorAll(
    "p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th"
  ).forEach((node) => {
    const dir = firstStrongDir(node.textContent || "");
    if (dir) node.setAttribute("dir", dir);
  });
  el.querySelectorAll("ol, ul").forEach((list) => {
    const first = list.querySelector(":scope > li");
    if (first) {
      const dir = firstStrongDir(first.textContent || "");
      if (dir) list.setAttribute("dir", dir);
    }
  });
  el.querySelectorAll("pre").forEach((pre) => pre.setAttribute("dir", "ltr"));
}

/* ====== marked library renderer (via IPC) ====== */
async function renderMarkedPreview(el, text) {
  let source = text;
  const stripped = settings.mdStripMarks === "on";
  if (stripped) source = stripMarksForMdPreview(source);
  if (settings.mdPrepare === "on") source = prepareForMarkdown(source);
  const html = await window.electronAPI.renderMarkdown(source);
  el.innerHTML = html;
  if (stripped || settings.mdAutoDir === "on") {
    applyDirToBlocks(el);
  }
}

/* ====== Custom line-by-line MD renderer ====== */
function escHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMd(text) {
  let s = escHtml(text);
  // code first — protect from other replacements
  const codeSlots = [];
  s = s.replace(/`(.+?)`/g, (_, code) => {
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
    /(?<![&"=])\b(https?:\/\/[^\s<>\)]+)/g,
    '<a href="$1">$1</a>'
  );
  // restore code slots
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeSlots[parseInt(i)]);
  return s;
}

function renderCustomMd(text) {
  const BIDI_RE = /^[\u200F\u200E]*/;
  const lines = text.split("\n");
  const blocks = [];
  let inCode = false;
  let codeBuf = [];
  let codeLang = "";

  for (const rawLine of lines) {
    const stripped = rawLine.replace(BIDI_RE, "");
    const fenceMatch = stripped.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      if (inCode) {
        blocks.push({
          type: "code",
          lang: codeLang,
          content: codeBuf.join("\n"),
        });
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

    const leadMark = rawLine.match(BIDI_RE)[0];
    const line = rawLine.slice(leadMark.length);

    if (!line.trim() && !leadMark) {
      blocks.push({ type: "empty" });
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      blocks.push({
        type: "heading",
        level: hMatch[1].length,
        content: leadMark + hMatch[2],
      });
      continue;
    }

    if (/^\s*([-*_]\s*){3,}$/.test(line) && !leadMark) {
      blocks.push({ type: "hr" });
      continue;
    }

    const olMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)/);
    if (olMatch) {
      blocks.push({
        type: "ol",
        start: parseInt(olMatch[2]),
        content: leadMark + olMatch[3],
      });
      continue;
    }

    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)/);
    if (taskMatch) {
      blocks.push({
        type: "ul",
        content: leadMark + taskMatch[3],
        checked: taskMatch[2] !== " ",
      });
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
    blocks.push({
      type: "code",
      lang: codeLang,
      content: codeBuf.join("\n"),
    });
  }

  let html = "";
  let idx = 0;

  function dirAttr(content) {
    const d = firstStrongDir(content);
    return d ? ` dir="${d}"` : "";
  }

  while (idx < blocks.length) {
    const b = blocks[idx];

    if (b.type === "ol") {
      const firstDir = firstStrongDir(b.content);
      html += `<ol start="${b.start}"${firstDir ? ` dir="${firstDir}"` : ""}>`;
      while (idx < blocks.length && blocks[idx].type === "ol") {
        const c = blocks[idx].content;
        html += `<li${dirAttr(c)}>${inlineMd(c)}</li>`;
        idx++;
      }
      html += "</ol>";
      continue;
    }

    if (b.type === "ul") {
      const firstDir = firstStrongDir(b.content);
      html += `<ul${firstDir ? ` dir="${firstDir}"` : ""}>`;
      while (idx < blocks.length && blocks[idx].type === "ul") {
        const c = blocks[idx].content;
        const checked = blocks[idx].checked;
        if (checked !== undefined) {
          const cb = checked
            ? '<input type="checkbox" checked disabled> '
            : '<input type="checkbox" disabled> ';
          html += `<li class="task-item"${dirAttr(c)}>${cb}${inlineMd(c)}</li>`;
        } else {
          html += `<li${dirAttr(c)}>${inlineMd(c)}</li>`;
        }
        idx++;
      }
      html += "</ul>";
      continue;
    }

    if (b.type === "table-row") {
      const rows = [];
      while (idx < blocks.length && blocks[idx].type === "table-row") {
        rows.push(blocks[idx].raw);
        idx++;
      }
      if (rows.length >= 2) {
        const isSep = (r) => /^[\s|:\-]+$/.test(r);
        const sepIdx = isSep(rows[1]) ? 1 : -1;
        const aligns = [];
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

    if (b.type === "blockquote") {
      html += "<blockquote>";
      while (idx < blocks.length && blocks[idx].type === "blockquote") {
        const c = blocks[idx].content;
        html += `<p${dirAttr(c)}>${inlineMd(c)}</p>`;
        idx++;
      }
      html += "</blockquote>";
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

/* ====== UI ====== */

const toPersianNum = (n) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const input = document.getElementById("input");
const output = document.getElementById("output");
const mdPreview = document.getElementById("md-preview");
const inputMdPreview = document.getElementById("input-md-preview");
const fixBtn = document.getElementById("fix-btn");
const stripBtn = document.getElementById("strip-btn");
const revealBtn = document.getElementById("reveal-btn");
const copyBtn = document.getElementById("copy-btn");
const pasteBtn = document.getElementById("paste-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("status");
const lineCountEl = document.getElementById("line-count");
const fixCountEl = document.getElementById("fix-count");
const toastEl = document.getElementById("toast");

const settingsBtn = document.getElementById("settings-btn");
const settingsBar = document.getElementById("settings-bar");

let lastOutput = "";
let isRevealed =
  localStorage.getItem("rtl-fixer-isRevealed") === "true";
let outputView =
  localStorage.getItem("rtl-fixer-outputView") || "txt";
let inputView =
  localStorage.getItem("rtl-fixer-inputView") || "txt";

// --- Settings ---
const settings = {
  fixMode: localStorage.getItem("rtl-fixer-fixMode") || "auto",
  listDir: localStorage.getItem("rtl-fixer-listDir") || "auto",
  neutralFix: localStorage.getItem("rtl-fixer-neutralFix") || "off",
  mdStripMarks: localStorage.getItem("rtl-fixer-mdStripMarks") || "off",
  mdPrepare: localStorage.getItem("rtl-fixer-mdPrepare") || "off",
  mdAutoDir: localStorage.getItem("rtl-fixer-mdAutoDir") || "off",
};

function saveSetting(key, val) {
  settings[key] = val;
  localStorage.setItem(`rtl-fixer-${key}`, val);
}

const savedSettingsBarOpen =
  localStorage.getItem("rtl-fixer-settingsBarOpen") === "true";
if (savedSettingsBarOpen) {
  settingsBar.style.display = "flex";
  settingsBtn.classList.add("active-ghost");
}

settingsBtn.addEventListener("click", () => {
  const visible = settingsBar.style.display !== "none";
  settingsBar.style.display = visible ? "none" : "flex";
  settingsBtn.classList.toggle("active-ghost", !visible);
  localStorage.setItem("rtl-fixer-settingsBarOpen", !visible);
});

function initSegmented(id, settingKey, onChange) {
  document.querySelectorAll(`#${id} .seg-btn`).forEach((btn) => {
    if (btn.dataset.val === settings[settingKey]) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll(`#${id} .seg-btn`)
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      saveSetting(settingKey, btn.dataset.val);
      if (onChange) await onChange();
    });
  });
}

async function onSettingChange() {
  if (lastOutput && input.value.trim()) {
    const result = applyFix(input.value);
    await updateOutput(result.text, result.fixCount);
    statusEl.textContent = `✓ ${toPersianNum(result.fixCount)} خط اصلاح شد`;
  }
  if (inputView !== "txt" && input.value) await refreshInputPreview();
}

async function onMdSettingChange() {
  if (outputView !== "txt" || isRevealed) await refreshOutputView();
  if (inputView !== "txt" && input.value) await refreshInputPreview();
}

initSegmented("fix-mode-switcher", "fixMode", onSettingChange);
initSegmented("list-dir-switcher", "listDir", onSettingChange);
initSegmented("neutral-fix-switcher", "neutralFix", onSettingChange);
initSegmented("md-strip-marks-switcher", "mdStripMarks", onMdSettingChange);
initSegmented("md-prepare-switcher", "mdPrepare", onMdSettingChange);
initSegmented("md-autodir-switcher", "mdAutoDir", onMdSettingChange);

// --- Theme ---
function applyTheme(theme) {
  if (theme === "system") {
    document.body.removeAttribute("data-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (!prefersDark) {
      document.body.setAttribute("data-theme", "light");
    }
  } else {
    document.body.setAttribute(
      "data-theme",
      theme === "light" ? "light" : ""
    );
    if (theme === "dark") {
      document.body.removeAttribute("data-theme");
    }
  }
  localStorage.setItem("rtl-fixer-theme", theme);
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

const savedTheme = localStorage.getItem("rtl-fixer-theme") || "system";
applyTheme(savedTheme);

document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (
      (localStorage.getItem("rtl-fixer-theme") || "system") === "system"
    ) {
      applyTheme("system");
    }
  });

// --- Output view ---
function revealInHtml(html) {
  return html
    .replace(/\u200F/g, '<span class="rlm-mark">ر </span>')
    .replace(/\u200E/g, '<span class="lrm-mark">L </span>');
}

async function refreshOutputView() {
  if (!lastOutput) {
    output.style.display = "";
    mdPreview.style.display = "none";
    output.value = "";
    return;
  }

  if (outputView === "txt") {
    if (isRevealed) {
      output.style.display = "none";
      mdPreview.style.display = "block";
      mdPreview.innerHTML = revealHidden(lastOutput);
    } else {
      output.style.display = "";
      mdPreview.style.display = "none";
      output.value = lastOutput;
    }
  } else if (outputView === "md") {
    output.style.display = "none";
    mdPreview.style.display = "block";
    mdPreview.innerHTML = renderCustomMd(lastOutput);
    if (isRevealed) {
      mdPreview.innerHTML = revealInHtml(mdPreview.innerHTML);
    }
  } else if (outputView === "marked") {
    output.style.display = "none";
    mdPreview.style.display = "block";
    await renderMarkedPreview(mdPreview, lastOutput);
    if (isRevealed) {
      mdPreview.innerHTML = revealInHtml(mdPreview.innerHTML);
    }
  }
}

async function refreshInputPreview() {
  if (inputView !== "txt" && input.value) {
    input.style.display = "none";
    inputMdPreview.style.display = "block";
    if (inputView === "md") {
      inputMdPreview.innerHTML = renderCustomMd(input.value);
    } else {
      await renderMarkedPreview(inputMdPreview, input.value);
    }
  } else {
    input.style.display = "";
    inputMdPreview.style.display = "none";
  }
}

async function updateOutput(text, count) {
  lastOutput = text;
  fixCountEl.textContent = `${toPersianNum(count)} اصلاح`;
  await refreshOutputView();
}

// --- Toast ---
let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

// --- Stats ---
function updateStats() {
  const lines = input.value ? input.value.split("\n").length : 0;
  lineCountEl.textContent = `${toPersianNum(lines)} خط`;
}
input.addEventListener("input", updateStats);

// --- Fix ---
fixBtn.addEventListener("click", async () => {
  if (!input.value.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }
  const result = applyFix(input.value);
  await updateOutput(result.text, result.fixCount);
  if (result.fixCount > 0) {
    statusEl.textContent = `✓ ${toPersianNum(result.fixCount)} خط اصلاح شد`;
    showToast(`${toPersianNum(result.fixCount)} خط اصلاح شد`);
  } else {
    statusEl.textContent = "✓ متن نیازی به اصلاح نداشت";
    showToast("بدون تغییر");
  }
});

// --- Strip ---
stripBtn.addEventListener("click", async () => {
  const source = lastOutput || input.value;
  if (!source.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }
  const result = stripAllMarks(source);
  if (result.count === 0) {
    showToast("نشانه‌ای پیدا نشد!");
    return;
  }
  await updateOutput(result.text, 0);
  statusEl.textContent = `✓ ${toPersianNum(result.count)} نشانه حذف شد`;
  showToast(`${toPersianNum(result.count)} نشانه حذف شد`);
});

// --- Reveal ---
if (isRevealed) revealBtn.classList.add("active");
revealBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("اول متن رو اصلاح کن!");
    return;
  }
  isRevealed = !isRevealed;
  revealBtn.classList.toggle("active", isRevealed);
  localStorage.setItem("rtl-fixer-isRevealed", isRevealed);
  showToast(isRevealed ? "نمایش مخفی‌ها" : "حالت عادی");
  await refreshOutputView();
});

// --- View switchers (TXT/MD/marked) ---
function initViewSwitcher(id, getState, setState) {
  const btns = document.querySelectorAll(`#${id} .seg-btn`);
  btns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.val === getState());
    btn.addEventListener("click", async () => {
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await setState(btn.dataset.val);
    });
  });
}

initViewSwitcher(
  "output-view-switcher",
  () => outputView,
  async (val) => {
    if (val !== "txt" && !lastOutput) {
      showToast("اول متن رو اصلاح کن!");
      return;
    }
    outputView = val;
    localStorage.setItem("rtl-fixer-outputView", outputView);
    await refreshOutputView();
  }
);

initViewSwitcher(
  "input-view-switcher",
  () => inputView,
  async (val) => {
    if (val !== "txt" && !input.value.trim()) {
      showToast("متنی وارد نشده!");
      return;
    }
    inputView = val;
    localStorage.setItem("rtl-fixer-inputView", inputView);
    await refreshInputPreview();
  }
);

// --- Copy ---
function extractDisplayedText(container) {
  const parts = [];
  for (const child of container.children) {
    const tag = child.tagName.toLowerCase();
    if (tag === "ol") {
      let i = parseInt(child.getAttribute("start") || "1", 10);
      for (const li of child.querySelectorAll(":scope > li")) {
        parts.push(`${i}. ${li.innerText}`);
        i++;
      }
    } else if (tag === "ul") {
      for (const li of child.querySelectorAll(":scope > li")) {
        parts.push(`- ${li.innerText}`);
      }
    } else {
      parts.push(child.innerText);
    }
  }
  return parts.join("\n");
}

copyBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("خروجی خالیه!");
    return;
  }
  let textToCopy;
  if (outputView !== "txt" || isRevealed) {
    textToCopy = extractDisplayedText(mdPreview);
  } else {
    textToCopy = lastOutput;
  }
  await window.electronAPI.copyToClipboard(textToCopy);
  showToast("کپی شد!");
});

// --- Paste ---
pasteBtn.addEventListener("click", async () => {
  const text = await window.electronAPI.readClipboard();
  if (!text) {
    showToast("کلیپبورد خالیه!");
    return;
  }
  input.value = text;
  updateStats();
  if (inputView !== "txt") await refreshInputPreview();
  showToast("Paste شد!");
});

// --- Clear ---
clearBtn.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  lastOutput = "";
  isRevealed = false;
  outputView = "txt";
  inputView = "txt";
  revealBtn.classList.remove("active");
  document
    .querySelectorAll(
      "#output-view-switcher .seg-btn, #input-view-switcher .seg-btn"
    )
    .forEach((b) => {
      b.classList.toggle("active", b.dataset.val === "txt");
    });
  mdPreview.style.display = "none";
  mdPreview.innerHTML = "";
  inputMdPreview.style.display = "none";
  inputMdPreview.innerHTML = "";
  output.style.display = "";
  input.style.display = "";
  statusEl.textContent = "آماده";
  lineCountEl.textContent = `${toPersianNum(0)} خط`;
  fixCountEl.textContent = `${toPersianNum(0)} اصلاح`;
  showToast("پاک شد!");
});

// --- Keyboard shortcut ---
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    fixBtn.click();
  }
});

// --- Open links in external browser ---
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (a) {
    e.preventDefault();
    window.electronAPI.openExternal(a.href);
  }
});

updateStats();
