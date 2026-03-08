import type { ViewMode } from "@/lib/store";

const options: { value: ViewMode; label: string }[] = [
  { value: "txt", label: "TXT" },
  { value: "md", label: "MD" },
  { value: "marked", label: "marked" },
];

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: Props) {
  return (
    <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer px-2 py-0.5 text-[11px] transition-colors ${
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
