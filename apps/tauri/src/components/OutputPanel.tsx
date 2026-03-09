import { useRef } from "react";
import { useStore } from "@/lib/store";
import { ViewSwitcher } from "./ViewSwitcher";
import { MdPreview } from "./MdPreview";
import { DiffView } from "./DiffView";
import { extractDisplayedText } from "@/lib/markdown";
import { platformAPI } from "@/lib/platform";

export function OutputPanel() {
  const outputText = useStore((s) => s.outputText);
  const outputView = useStore((s) => s.outputView);
  const setOutputView = useStore((s) => s.setOutputView);
  const isRevealed = useStore((s) => s.isRevealed);
  const diffMode = useStore((s) => s.diffMode);
  const showToast = useStore((s) => s.showToast);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleViewChange = (v: typeof outputView) => {
    if (v !== "txt" && !outputText) {
      showToast("اول متن رو اصلاح کن!");
      return;
    }
    setOutputView(v);
  };

  const handleCopy = async () => {
    if (!outputText) {
      showToast("خروجی خالیه!");
      return;
    }
    let textToCopy: string;
    if (outputView !== "txt" || isRevealed) {
      const container = previewRef.current;
      textToCopy = container
        ? extractDisplayedText(container)
        : outputText;
    } else {
      textToCopy = outputText;
    }
    await platformAPI.copyToClipboard(textToCopy);
    showToast("کپی شد!");
  };

  const handleExport = async (format: "txt" | "md" | "html") => {
    if (!outputText) {
      showToast("خروجی خالیه!");
      return;
    }
    let content = outputText;
    if (format === "html" && previewRef.current) {
      content = `<!DOCTYPE html><html dir="auto"><head><meta charset="UTF-8"></head><body>${previewRef.current.innerHTML}</body></html>`;
    }
    const saved = await platformAPI.saveFile(
      content,
      `rtl-fixed.${format}`
    );
    if (saved) showToast("ذخیره شد!");
  };

  const showPreview = outputView !== "txt" || isRevealed;
  const showDiff = diffMode === "on" && outputView === "txt" && !isRevealed;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--text-dim)] transition-colors">
        <span>متن اصلاح‌شده</span>
        <div className="flex items-center gap-1.5">
          <ViewSwitcher value={outputView} onChange={handleViewChange} />
          <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
            {(["txt", "md", "html"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                title={`Export as .${fmt}`}
                className="cursor-pointer border-none px-1.5 py-0.5 text-[10px] text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
              >
                .{fmt}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {showDiff ? (
        <DiffView />
      ) : showPreview ? (
        <div ref={previewRef} className="flex flex-1 flex-col overflow-hidden">
          <MdPreview
            text={outputText}
            viewMode={outputView}
            isRevealed={isRevealed}
          />
        </div>
      ) : (
        <textarea
          value={outputText}
          readOnly
          dir="ltr"
          placeholder="متن اصلاح‌شده اینجا نمایش داده می‌شود..."
          spellCheck={false}
          className="flex-1 resize-none border-none bg-transparent p-3.5 text-sm leading-8 text-[var(--accent)] outline-none [unicode-bidi:plaintext] placeholder:text-right placeholder:text-[var(--text-muted)] placeholder:direction-rtl"
        />
      )}
    </div>
  );
}
