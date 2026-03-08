import { useStore } from "@/lib/store";

export function ControlsCenter() {
  const doFix = useStore((s) => s.doFix);
  const doStrip = useStore((s) => s.doStrip);
  const isRevealed = useStore((s) => s.isRevealed);
  const toggleReveal = useStore((s) => s.toggleReveal);
  const outputText = useStore((s) => s.outputText);
  const showToast = useStore((s) => s.showToast);

  const handleReveal = () => {
    if (!outputText) {
      showToast("اول متن رو اصلاح کن!");
      return;
    }
    toggleReveal();
  };

  return (
    <div className="flex h-full shrink-0 flex-col items-center justify-center gap-1.5 px-1">
      <button
        onClick={doFix}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_16px_var(--primary-glow)] transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_6px_24px_var(--primary-glow)] active:scale-95"
      >
        <span className="text-lg">⚡</span>
        <span>اصلاح</span>
      </button>

      <button
        onClick={doStrip}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--danger)] bg-transparent px-4 py-2.5 text-sm text-[var(--danger)] transition-all hover:bg-[rgba(233,69,96,0.12)] active:scale-95"
      >
        <span>✕</span>
        <span>حذف</span>
      </button>

      <button
        onClick={handleReveal}
        className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm transition-all active:scale-95 ${
          isRevealed
            ? "border-[var(--accent)] bg-[rgba(0,206,201,0.15)] text-[var(--accent)]"
            : "border-[var(--text-dim)] bg-transparent text-[var(--text-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <span>👁</span>
        <span>مخفی‌ها</span>
      </button>
    </div>
  );
}
