const RLM = "\u200F";
const LRM = "\u200E";

const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

function startsWithNeutral(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function lineNeedsRLM(line) {
  if (!line.trim()) return false;
  if (line.startsWith(RLM)) return false;
  return RTL_RANGE.test(line);
}

function lineNeedsLRM(line) {
  if (!line.trim()) return false;
  if (line.startsWith(LRM)) return false;
  if (RTL_RANGE.test(line)) return false;
  return startsWithNeutral(line);
}

function fixRTLText(text) {
  let fixCount = 0;
  const lines = text.split("\n").map((line) => {
    if (lineNeedsRLM(line)) {
      fixCount++;
      return RLM + line;
    }
    if (lineNeedsLRM(line)) {
      fixCount++;
      return LRM + line;
    }
    return line;
  });
  return { text: lines.join("\n"), fixCount };
}

function forceRTLAll(text) {
  let fixCount = 0;
  const lines = text.split("\n").map((line) => {
    if (!line.trim()) return line;
    if (line.startsWith(RLM)) return line;
    fixCount++;
    return RLM + line;
  });
  return { text: lines.join("\n"), fixCount };
}

function stripAllMarks(text) {
  const count = (text.match(/[\u200F\u200E]/g) || []).length;
  return { text: text.replace(/[\u200F\u200E]/g, ""), count };
}

function revealHidden(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\u200F/g, '<span class="rlm-mark">[RLM]</span>')
    .replace(/\u200E/g, '<span class="lrm-mark">[LRM]</span>')
    .replace(/\n/g, "<br>");
}

function setDirForText(el, text) {
  if (RTL_RANGE.test(text)) {
    el.setAttribute("dir", "rtl");
    el.style.textAlign = "right";
  } else {
    el.setAttribute("dir", "ltr");
    el.style.textAlign = "left";
  }
}

function splitByBr(node) {
  const brs = node.querySelectorAll("br");
  if (brs.length === 0) {
    setDirForText(node, node.textContent || "");
    return;
  }
  const fragment = document.createDocumentFragment();
  let span = document.createElement("span");
  span.style.display = "block";

  [...node.childNodes].forEach((child) => {
    if (child.nodeName === "BR") {
      setDirForText(span, span.textContent || "");
      fragment.appendChild(span);
      span = document.createElement("span");
      span.style.display = "block";
    } else {
      span.appendChild(child.cloneNode(true));
    }
  });
  setDirForText(span, span.textContent || "");
  fragment.appendChild(span);
  node.innerHTML = "";
  node.appendChild(fragment);
}

async function renderMdPreview(el, text) {
  const clean = text.replace(/\u200F/g, "").replace(/\u200E/g, "");
  const html = await window.electronAPI.renderMarkdown(clean);
  el.innerHTML = html;
  el.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, td, th").forEach(splitByBr);
  el.querySelectorAll("ol, ul").forEach((list) => {
    if (RTL_RANGE.test(list.textContent || "")) {
      list.setAttribute("dir", "rtl");
    } else {
      list.setAttribute("dir", "ltr");
    }
  });
  el.querySelectorAll("blockquote").forEach((bq) => {
    bq.querySelectorAll("p").forEach(splitByBr);
    if (!bq.querySelector("p")) setDirForText(bq, bq.textContent || "");
  });
  el.querySelectorAll("pre").forEach((pre) => {
    pre.setAttribute("dir", "ltr");
    pre.style.textAlign = "left";
  });
}

const toPersianNum = (n) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const input = document.getElementById("input");
const output = document.getElementById("output");
const mdPreview = document.getElementById("md-preview");
const inputMdPreview = document.getElementById("input-md-preview");
const fixBtn = document.getElementById("fix-btn");
const forceBtn = document.getElementById("force-btn");
const stripBtn = document.getElementById("strip-btn");
const revealBtn = document.getElementById("reveal-btn");
const previewBtn = document.getElementById("preview-btn");
const inputPreviewBtn = document.getElementById("input-preview-btn");
const copyBtn = document.getElementById("copy-btn");
const pasteBtn = document.getElementById("paste-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("status");
const lineCountEl = document.getElementById("line-count");
const fixCountEl = document.getElementById("fix-count");
const toastEl = document.getElementById("toast");

let lastOutput = "";
let isRevealed = false;
let isPreviewing = false;
let isInputPreviewing = false;

// --- Theme ---
function applyTheme(theme) {
  if (theme === "system") {
    document.body.removeAttribute("data-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (!prefersDark) {
      document.body.setAttribute("data-theme", "light");
    }
  } else {
    document.body.setAttribute("data-theme", theme === "light" ? "light" : "");
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

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem("rtl-fixer-theme") || "system") === "system") {
    applyTheme("system");
  }
});

// --- Output view ---
async function refreshOutputView() {
  if (isPreviewing && lastOutput) {
    output.style.display = "none";
    mdPreview.style.display = "block";
    await renderMdPreview(mdPreview, lastOutput);
  } else if (isRevealed && lastOutput) {
    output.style.display = "none";
    mdPreview.style.display = "block";
    mdPreview.innerHTML = revealHidden(lastOutput);
  } else {
    output.style.display = "";
    mdPreview.style.display = "none";
    output.value = lastOutput;
  }
}

async function refreshInputPreview() {
  if (isInputPreviewing && input.value) {
    input.style.display = "none";
    inputMdPreview.style.display = "block";
    await renderMdPreview(inputMdPreview, input.value);
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
  const result = fixRTLText(input.value);
  await updateOutput(result.text, result.fixCount);
  if (result.fixCount > 0) {
    statusEl.textContent = `✓ ${toPersianNum(result.fixCount)} خط اصلاح شد`;
    showToast(`${toPersianNum(result.fixCount)} خط اصلاح شد`);
  } else {
    statusEl.textContent = "✓ متن نیازی به اصلاح نداشت";
    showToast("بدون تغییر");
  }
});

// --- Force RTL ---
forceBtn.addEventListener("click", async () => {
  if (!input.value.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }
  const result = forceRTLAll(input.value);
  await updateOutput(result.text, result.fixCount);
  statusEl.textContent = `✓ RLM به ${toPersianNum(result.fixCount)} خط اضافه شد`;
  showToast(`${toPersianNum(result.fixCount)} خط RTL شد`);
});

// --- Strip RLM ---
stripBtn.addEventListener("click", async () => {
  const source = lastOutput || input.value;
  if (!source.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }
  const result = stripAllMarks(source);
  if (result.count === 0) {
    showToast("RLM ای پیدا نشد!");
    return;
  }
  await updateOutput(result.text, 0);
  statusEl.textContent = `✓ ${toPersianNum(result.count)} RLM حذف شد`;
  showToast(`${toPersianNum(result.count)} RLM حذف شد`);
});

// --- Reveal ---
revealBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("اول متن رو اصلاح کن!");
    return;
  }
  isRevealed = !isRevealed;
  if (isRevealed) {
    isPreviewing = false;
    previewBtn.classList.remove("active");
    revealBtn.classList.add("active");
    showToast("کاراکترهای مخفی نمایش داده شد");
  } else {
    revealBtn.classList.remove("active");
    showToast("حالت عادی");
  }
  await refreshOutputView();
});

// --- MD Preview (output) ---
previewBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("اول متن رو اصلاح کن!");
    return;
  }
  isPreviewing = !isPreviewing;
  if (isPreviewing) {
    isRevealed = false;
    revealBtn.classList.remove("active");
    previewBtn.classList.add("active");
    showToast("پیش‌نمایش Markdown");
  } else {
    previewBtn.classList.remove("active");
    showToast("حالت عادی");
  }
  await refreshOutputView();
});

// --- MD Preview (input) ---
inputPreviewBtn.addEventListener("click", async () => {
  if (!input.value.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }
  isInputPreviewing = !isInputPreviewing;
  inputPreviewBtn.classList.toggle("active", isInputPreviewing);
  await refreshInputPreview();
  showToast(isInputPreviewing ? "پیش‌نمایش Markdown" : "حالت ویرایش");
});

// --- Copy ---
copyBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("خروجی خالیه!");
    return;
  }
  await window.electronAPI.copyToClipboard(lastOutput);
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
  if (isInputPreviewing) await refreshInputPreview();
  showToast("Paste شد!");
});

// --- Clear ---
clearBtn.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  lastOutput = "";
  isRevealed = false;
  isPreviewing = false;
  isInputPreviewing = false;
  revealBtn.classList.remove("active");
  previewBtn.classList.remove("active");
  inputPreviewBtn.classList.remove("active");
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

updateStats();
