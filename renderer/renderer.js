const RLM = "\u200F";

const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function lineNeedsRLM(line) {
  if (!line.trim()) return false;
  if (line.startsWith(RLM)) return false;
  return RTL_RANGE.test(line);
}

function fixRTLText(text) {
  let fixCount = 0;
  const lines = text.split("\n").map((line) => {
    if (lineNeedsRLM(line)) {
      fixCount++;
      return RLM + line;
    }
    return line;
  });
  return { text: lines.join("\n"), fixCount, totalLines: lines.length };
}

const toPersianNum = (n) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

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

function revealHidden(text) {
  return text.replace(/\u200F/g, "[RLM]").replace(/\u200E/g, "[LRM]");
}

const input = document.getElementById("input");
const output = document.getElementById("output");
const fixBtn = document.getElementById("fix-btn");
const forceBtn = document.getElementById("force-btn");
const revealBtn = document.getElementById("reveal-btn");
const copyBtn = document.getElementById("copy-btn");
const pasteBtn = document.getElementById("paste-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("status");
const lineCountEl = document.getElementById("line-count");
const fixCountEl = document.getElementById("fix-count");
const toastEl = document.getElementById("toast");

let lastOutput = "";
let isRevealed = false;

function updateOutput(text, count) {
  lastOutput = text;
  fixCountEl.textContent = `${toPersianNum(count)} اصلاح`;
  if (isRevealed) {
    output.value = revealHidden(text);
  } else {
    output.value = text;
  }
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function updateStats() {
  const lines = input.value ? input.value.split("\n").length : 0;
  lineCountEl.textContent = `${toPersianNum(lines)} خط`;
}

input.addEventListener("input", updateStats);

fixBtn.addEventListener("click", () => {
  if (!input.value.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }

  const result = fixRTLText(input.value);
  updateOutput(result.text, result.fixCount);

  if (result.fixCount > 0) {
    statusEl.textContent = `✓ ${toPersianNum(result.fixCount)} خط اصلاح شد`;
    showToast(`${toPersianNum(result.fixCount)} خط اصلاح شد`);
  } else {
    statusEl.textContent = "✓ متن نیازی به اصلاح نداشت";
    showToast("بدون تغییر");
  }
});

forceBtn.addEventListener("click", () => {
  if (!input.value.trim()) {
    showToast("متنی وارد نشده!");
    return;
  }

  const result = forceRTLAll(input.value);
  updateOutput(result.text, result.fixCount);
  statusEl.textContent = `✓ RLM به ${toPersianNum(result.fixCount)} خط اضافه شد`;
  showToast(`${toPersianNum(result.fixCount)} خط RTL شد`);
});

revealBtn.addEventListener("click", () => {
  if (!lastOutput) {
    showToast("اول متن رو اصلاح کن!");
    return;
  }

  isRevealed = !isRevealed;
  if (isRevealed) {
    output.value = revealHidden(lastOutput);
    revealBtn.classList.add("active");
    showToast("کاراکترهای مخفی نمایش داده شد");
  } else {
    output.value = lastOutput;
    revealBtn.classList.remove("active");
    showToast("حالت عادی");
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastOutput) {
    showToast("خروجی خالیه!");
    return;
  }
  await window.electronAPI.copyToClipboard(lastOutput);
  showToast("کپی شد!");
});

pasteBtn.addEventListener("click", async () => {
  const text = await window.electronAPI.readClipboard();
  if (!text) {
    showToast("کلیپبورد خالیه!");
    return;
  }
  input.value = text;
  updateStats();
  showToast("Paste شد!");
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  lastOutput = "";
  isRevealed = false;
  revealBtn.classList.remove("active");
  statusEl.textContent = "آماده";
  lineCountEl.textContent = `${toPersianNum(0)} خط`;
  fixCountEl.textContent = `${toPersianNum(0)} اصلاح`;
  showToast("پاک شد!");
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    fixBtn.click();
  }
});

updateStats();
