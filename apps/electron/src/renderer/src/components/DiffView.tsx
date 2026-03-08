import { useMemo } from "react";
import { diffChars } from "diff";
import { useStore } from "@/lib/store";

export function DiffView() {
  const inputText = useStore((s) => s.inputText);
  const outputText = useStore((s) => s.outputText);

  const diffHtml = useMemo(() => {
    if (!inputText || !outputText) return "";
    const changes = diffChars(inputText, outputText);
    return changes
      .map((part) => {
        const escaped = part.value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        if (part.added) {
          return `<span class="diff-add">${escaped}</span>`;
        }
        if (part.removed) {
          return `<span class="diff-remove">${escaped}</span>`;
        }
        return escaped;
      })
      .join("");
  }, [inputText, outputText]);

  if (!outputText) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
        اول متن رو اصلاح کن تا تفاوت‌ها نمایش داده بشه
      </div>
    );
  }

  return (
    <div
      className="diff-view flex-1 overflow-y-auto p-4 text-sm leading-8 whitespace-pre-wrap [unicode-bidi:plaintext]"
      dangerouslySetInnerHTML={{ __html: diffHtml }}
    />
  );
}
