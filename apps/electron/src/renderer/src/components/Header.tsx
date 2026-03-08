import { useStore } from "@/lib/store";

const themes = [
  { value: "system" as const, icon: "🖥", title: "تنظیمات سیستم" },
  { value: "light" as const, icon: "☀", title: "روشن" },
  { value: "dark" as const, icon: "🌙", title: "تاریک" },
];

export function Header() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const toggleSettings = useStore((s) => s.toggleSettings);
  const doClear = useStore((s) => s.doClear);

  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-7 py-4 transition-colors">
      <div>
        <h1 className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] bg-clip-text text-xl font-bold text-transparent">
          RTL Fixer
        </h1>
        <p className="mt-0.5 text-xs text-[var(--text-dim)]">
          اصلاح خودکار متن‌های دوجهته فارسی-انگلیسی
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
          {themes.map((t) => (
            <button
              key={t.value}
              title={t.title}
              onClick={() => setTheme(t.value)}
              className={`cursor-pointer border-none px-2.5 py-1 text-sm leading-none transition-colors ${
                theme === t.value
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-dim)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <button
          title="تنظیمات"
          onClick={toggleSettings}
          className={`cursor-pointer rounded-lg border border-transparent px-3.5 py-2 text-sm transition-colors ${
            settingsOpen
              ? "bg-[rgba(0,206,201,0.1)] text-[var(--accent)]"
              : "text-[var(--text-dim)] hover:bg-[rgba(233,69,96,0.08)] hover:text-[var(--danger)]"
          }`}
        >
          ⚙
        </button>

        <button
          onClick={doClear}
          className="cursor-pointer rounded-lg border border-transparent px-3.5 py-2 text-sm text-[var(--text-dim)] transition-colors hover:bg-[rgba(233,69,96,0.08)] hover:text-[var(--danger)]"
        >
          پاک کردن
        </button>
      </div>
    </header>
  );
}
