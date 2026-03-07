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
  return text.split("\n").map((line) => {
    const escaped = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\u200F/g, '<span class="rlm-mark">ر </span>')
      .replace(/\u200E/g, '<span class="lrm-mark">L </span>');
    return `<span style="display:block">${escaped}</span>`;
  }).join("");
}

function prepareForMarkdown(text) {
  return text.replace(/^([\u200F\u200E])(\s*(?:\d+[.)]\s|[-*+]\s|#{1,6}\s|>\s?))/gm, "$2$1");
}

function stripMarksForMdPreview(text) {
  return text
    .replace(/^[رL] /gm, "")
    .replace(/^[\u200F\u200E](?=\s*(?:\d+[.)]\s|[-*+]\s|#{1,6}\s|>\s?))/gm, "");
}

async function renderMdPreview(el, text) {
  let source = text;
  if (settings.mdStripMarks === "on") source = stripMarksForMdPreview(source);
  if (settings.mdPrepare === "on") source = prepareForMarkdown(source);
  const html = await window.electronAPI.renderMarkdown(source);
  el.innerHTML = html;
  if (settings.mdAutoDir === "on") {
    el.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, ol, ul").forEach((node) => {
      node.setAttribute("dir", "auto");
    });
    el.querySelectorAll("pre").forEach((pre) => pre.setAttribute("dir", "ltr"));
  }
}

const toPersianNum = (n) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const input = document.getElementById("input");
const output = document.getElementById("output");
const mdPreview = document.getElementById("md-preview");
const inputMdPreview = document.getElementById("input-md-preview");
const fixBtn = document.getElementById("fix-btn");
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

const settingsBtn = document.getElementById("settings-btn");
const settingsBar = document.getElementById("settings-bar");

let lastOutput = "";
let isRevealed = localStorage.getItem("rtl-fixer-isRevealed") === "true";
let isPreviewing = localStorage.getItem("rtl-fixer-isPreviewing") === "true";
let isInputPreviewing = false;

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

const savedSettingsBarOpen = localStorage.getItem("rtl-fixer-settingsBarOpen") === "true";
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
      document.querySelectorAll(`#${id} .seg-btn`).forEach((b) => b.classList.remove("active"));
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
  if (isInputPreviewing && input.value) await refreshInputPreview();
}

async function onMdSettingChange() {
  if (isPreviewing || isRevealed) await refreshOutputView();
  if (isInputPreviewing && input.value) await refreshInputPreview();
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

  if (isPreviewing) {
    output.style.display = "none";
    mdPreview.style.display = "block";
    await renderMdPreview(mdPreview, lastOutput);
    if (isRevealed) {
      mdPreview.innerHTML = revealInHtml(mdPreview.innerHTML);
    }
  } else if (isRevealed) {
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

// --- MD Preview (output) ---
if (isPreviewing) previewBtn.classList.add("active");
previewBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("اول متن رو اصلاح کن!");
    return;
  }
  isPreviewing = !isPreviewing;
  previewBtn.classList.toggle("active", isPreviewing);
  localStorage.setItem("rtl-fixer-isPreviewing", isPreviewing);
  showToast(isPreviewing ? "پیش‌نمایش Markdown" : "حالت عادی");
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
  if (isPreviewing || isRevealed) {
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
