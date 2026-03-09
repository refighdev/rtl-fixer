import { useStore } from "@/lib/store";

export function Footer() {
  const status = useStore((s) => s.status);
  const inputText = useStore((s) => s.inputText);
  const fixCount = useStore((s) => s.fixCount);

  const lineCount = inputText ? inputText.split("\n").length : 0;

  return (
    <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-7 py-2.5 text-xs text-[var(--text-dim)] transition-colors">
      <div>{status}</div>
      <div className="flex items-center gap-2.5">
        <span>{lineCount} خط</span>
        <span className="text-[var(--border)]">|</span>
        <span>{fixCount} اصلاح</span>
      </div>
    </footer>
  );
}
