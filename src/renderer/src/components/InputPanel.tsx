import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useStore } from "@/lib/store";
import { ViewSwitcher } from "./ViewSwitcher";
import { MdPreview } from "./MdPreview";

export function InputPanel() {
  const inputText = useStore((s) => s.inputText);
  const setInputText = useStore((s) => s.setInputText);
  const inputView = useStore((s) => s.inputView);
  const setInputView = useStore((s) => s.setInputView);
  const theme = useStore((s) => s.theme);
  const realtime = useStore((s) => s.realtime);
  const doFix = useStore((s) => s.doFix);
  const showToast = useStore((s) => s.showToast);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (realtime !== "on" || !inputText.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doFix(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [inputText, realtime, doFix]);

  const handlePaste = async () => {
    const text = await window.electronAPI.readClipboard();
    if (!text) {
      showToast("کلیپبورد خالیه!");
      return;
    }
    setInputText(text);
    showToast("Paste شد!");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".md") || file.name.endsWith(".txt"))) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result;
        if (typeof content === "string") {
          setInputText(content);
          showToast(`${file.name} بارگذاری شد`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleViewChange = (v: typeof inputView) => {
    if (v !== "txt" && !inputText.trim()) {
      showToast("متنی وارد نشده!");
      return;
    }
    setInputView(v);
  };

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_1px_var(--primary-glow)]"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--text-dim)] transition-colors">
        <span>متن ورودی</span>
        <div className="flex items-center gap-1.5">
          <ViewSwitcher value={inputView} onChange={handleViewChange} />
          <button
            onClick={handlePaste}
            className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            📋 Paste
          </button>
        </div>
      </div>

      {inputView === "txt" ? (
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          value={inputText}
          onChange={(v) => setInputText(v ?? "")}
          theme={isDark ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            wordWrap: "on",
            fontSize: 14,
            fontFamily: "'Vazirmatn', 'JetBrains Mono', monospace",
            scrollBeyondLastLine: false,
            renderWhitespace: "none",
            padding: { top: 12 },
            automaticLayout: true,
            unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
          }}
        />
      ) : (
        <MdPreview text={inputText} viewMode={inputView} />
      )}
    </div>
  );
}
