import { useEffect, useRef, useMemo } from "react";
import { marked } from "marked";
import { useStore, type ViewMode } from "@/lib/store";
import { renderCustomMd } from "@/lib/markdown";
import { revealHidden, revealInHtml, firstStrongDir } from "@/lib/bidi";
import type { FixMode, ListDir, OnOff } from "@/lib/bidi";

marked.setOptions({ breaks: true, gfm: true });

function ViewSwitcher({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
      {(["txt", "md", "marked"] as const).map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`cursor-pointer px-2 py-0.5 text-[11px] transition-colors ${
            value === o
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-dim)] hover:bg-[var(--surface-3)]"
          }`}
        >
          {o === "txt" ? "TXT" : o === "md" ? "MD" : "marked"}
        </button>
      ))}
    </div>
  );
}

function MdPreview({
  text,
  viewMode,
  isRevealed,
}: {
  text: string;
  viewMode: ViewMode;
  isRevealed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    if (viewMode === "txt" && isRevealed) {
      ref.current.innerHTML = revealHidden(text);
      return;
    }
    if (viewMode === "md") {
      let html = renderCustomMd(text);
      if (isRevealed) html = revealInHtml(html);
      ref.current.innerHTML = html;
      return;
    }
    if (viewMode === "marked") {
      ref.current.innerHTML = marked.parse(text) as string;
      ref.current
        .querySelectorAll<HTMLElement>("p, li, h1, h2, h3, h4, h5, h6")
        .forEach((node) => {
          const dir = firstStrongDir(node.textContent || "");
          if (dir) node.setAttribute("dir", dir);
        });
      if (isRevealed) {
        ref.current.innerHTML = revealInHtml(ref.current.innerHTML);
      }
    }
  }, [text, viewMode, isRevealed]);
  return <div ref={ref} className="md-preview" dir="auto" />;
}

function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer border-none px-2 py-1 text-xs transition-colors ${
            value === o.value
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-dim)] hover:bg-[var(--surface-3)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const s = useStore();

  useEffect(() => {
    const root = document.documentElement;
    if (s.theme === "system") {
      root.setAttribute(
        "data-theme",
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
      );
    } else {
      root.setAttribute("data-theme", s.theme);
    }
  }, [s.theme]);

  const handleCopy = async () => {
    if (!s.outputText) return;
    await navigator.clipboard.writeText(s.outputText);
    s.showToast("کپی شد!");
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    if (text) s.setInputText(text);
  };

  const showPreview = s.outputView !== "txt" || s.isRevealed;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
        <h1 className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] bg-clip-text text-lg font-bold text-transparent">
          RTL Fixer
        </h1>
        <div className="flex items-center gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => s.setTheme(t)}
              className={`cursor-pointer rounded-md px-2 py-1 text-xs ${
                s.theme === t
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-dim)]"
              }`}
            >
              {t === "system" ? "🖥" : t === "light" ? "☀" : "🌙"}
            </button>
          ))}
          <button
            onClick={s.toggleSettings}
            className="cursor-pointer rounded-md px-2 py-1 text-sm text-[var(--text-dim)]"
          >
            ⚙
          </button>
        </div>
      </header>

      {s.settingsOpen && (
        <div className="flex flex-wrap justify-center gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            حالت اصلاح:
            <Seg<FixMode>
              options={[
                { value: "auto", label: "خودکار" },
                { value: "rtl", label: "RTL" },
                { value: "ltr", label: "LTR" },
              ]}
              value={s.fixMode}
              onChange={s.setFixMode}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            جهت لیست:
            <Seg<ListDir>
              options={[
                { value: "auto", label: "خودکار" },
                { value: "rtl", label: "راست" },
                { value: "ltr", label: "چپ" },
              ]}
              value={s.listDir}
              onChange={s.setListDir}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            اصلاح خنثی:
            <Seg<OnOff>
              options={[
                { value: "on", label: "روشن" },
                { value: "off", label: "خاموش" },
              ]}
              value={s.neutralFix}
              onChange={s.setNeutralFix}
            />
          </div>
        </div>
      )}

      <main className="flex flex-1 gap-2 overflow-hidden p-4 max-md:flex-col">
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-dim)]">
            <span>ورودی</span>
            <div className="flex items-center gap-1.5">
              <ViewSwitcher
                value={s.inputView}
                onChange={s.setInputView}
              />
              <button
                onClick={handlePaste}
                className="cursor-pointer rounded border border-[var(--border)] px-2 py-0.5 text-[11px] hover:text-[var(--primary)]"
              >
                📋
              </button>
            </div>
          </div>
          {s.inputView === "txt" ? (
            <textarea
              value={s.inputText}
              onChange={(e) => s.setInputText(e.target.value)}
              dir="ltr"
              placeholder="متن را وارد کنید..."
              className="flex-1 resize-none border-none bg-transparent p-3 text-sm leading-8 text-[var(--text)] outline-none [unicode-bidi:plaintext]"
            />
          ) : (
            <MdPreview text={s.inputText} viewMode={s.inputView} />
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 max-md:flex-row">
          <button
            onClick={s.doFix}
            className="cursor-pointer rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_var(--primary-glow)] hover:bg-[var(--primary-hover)] active:scale-95"
          >
            ⚡ اصلاح
          </button>
          <button
            onClick={s.doStrip}
            className="cursor-pointer rounded-xl border border-[var(--danger)] px-3 py-2 text-xs text-[var(--danger)] active:scale-95"
          >
            ✕ حذف
          </button>
          <button
            onClick={s.toggleReveal}
            className={`cursor-pointer rounded-xl border px-3 py-2 text-xs active:scale-95 ${
              s.isRevealed
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--text-dim)] text-[var(--text-dim)]"
            }`}
          >
            👁 مخفی‌ها
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-dim)]">
            <span>خروجی</span>
            <div className="flex items-center gap-1.5">
              <ViewSwitcher
                value={s.outputView}
                onChange={s.setOutputView}
              />
              <button
                onClick={handleCopy}
                className="cursor-pointer rounded border border-[var(--border)] px-2 py-0.5 text-[11px] hover:text-[var(--primary)]"
              >
                📋
              </button>
            </div>
          </div>
          {showPreview ? (
            <MdPreview
              text={s.outputText}
              viewMode={s.outputView}
              isRevealed={s.isRevealed}
            />
          ) : (
            <textarea
              value={s.outputText}
              readOnly
              dir="ltr"
              placeholder="خروجی..."
              className="flex-1 resize-none border-none bg-transparent p-3 text-sm leading-8 text-[var(--accent)] outline-none [unicode-bidi:plaintext]"
            />
          )}
        </div>
      </main>

      <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-5 py-2 text-xs text-[var(--text-dim)]">
        <span>{s.status}</span>
        <span>{s.fixCount} اصلاح</span>
      </footer>

      <div
        className={`pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--success)] px-5 py-2 text-[13px] font-semibold text-white transition-all duration-250 ${
          s.toastVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {s.toastMessage}
      </div>
    </div>
  );
}
