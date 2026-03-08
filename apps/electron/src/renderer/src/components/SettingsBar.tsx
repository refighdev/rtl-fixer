import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import type { FixMode, ListDir, OnOff } from "@/lib/bidi";

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
          className={`cursor-pointer border-none px-2.5 py-1 text-xs transition-colors ${
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

function Row({
  title,
  badge,
  tooltip,
  children,
}: {
  title: string;
  badge?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3" title={tooltip}>
      <span className="whitespace-nowrap text-xs font-medium text-[var(--text-dim)]">
        {title}
        {badge && (
          <small className="mr-1 text-[10px] text-[var(--text-muted)]">
            ({badge})
          </small>
        )}
      </span>
      {children}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="mb-0.5 border-b border-[var(--border)] pb-1 text-center text-[11px] font-bold text-[var(--primary)]">
        {title}
      </div>
      {children}
    </div>
  );
}

const fixModes: { value: FixMode; label: string }[] = [
  { value: "auto", label: "خودکار" },
  { value: "rtl", label: "همه RTL" },
  { value: "ltr", label: "همه LTR" },
];

const listDirs: { value: ListDir; label: string }[] = [
  { value: "auto", label: "خودکار" },
  { value: "rtl", label: "راست‌چین" },
  { value: "ltr", label: "چپ‌چین" },
];

const onOff: { value: OnOff; label: string }[] = [
  { value: "on", label: "روشن" },
  { value: "off", label: "خاموش" },
];

export function SettingsBar() {
  const s = useStore();

  return (
    <AnimatePresence>
      {!s.settingsOpen ? null : (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
    <div className="flex flex-wrap justify-center gap-7 border-b border-[var(--border)] bg-[var(--surface-2)] px-7 py-2.5 transition-colors">
      <Group title="اصلاح متن (هاردکد)">
        <Row
          title="حالت اصلاح"
          tooltip="نحوه اضافه کردن کاراکتر جهت به ابتدای خطوط"
        >
          <Seg options={fixModes} value={s.fixMode} onChange={s.setFixMode} />
        </Row>
        <Row
          title="جهت سرتیتر لیست"
          tooltip="جهت سرتیتر لیست‌های شماره‌دار و بولتی"
        >
          <Seg options={listDirs} value={s.listDir} onChange={s.setListDir} />
        </Row>
        <Row
          title="اصلاح شروع خنثی"
          tooltip="وقتی خط با کاراکتر خنثی شروع شود (عدد، پرانتز...)"
        >
          <Seg
            options={onOff}
            value={s.neutralFix}
            onChange={s.setNeutralFix}
          />
        </Row>
      </Group>

      <Group title="تنظیمات marked">
        <Row
          title="حذف نشانه‌ها"
          badge="نمایشی"
          tooltip="حذف نشانه‌های قابل مشاهده قبل از پردازش marked"
        >
          <Seg
            options={onOff}
            value={s.mdStripMarks}
            onChange={s.setMdStripMarks}
          />
        </Row>
        <Row
          title="آماده‌سازی"
          badge="هاردکد"
          tooltip="جابجایی کاراکتر جهت از قبل سینتکس مارک‌دان به بعدش"
        >
          <Seg
            options={onOff}
            value={s.mdPrepare}
            onChange={s.setMdPrepare}
          />
        </Row>
        <Row
          title="جهت خودکار"
          badge="نمایشی"
          tooltip="اضافه کردن dir=auto روی هر بلاک مارک‌دان"
        >
          <Seg
            options={onOff}
            value={s.mdAutoDir}
            onChange={s.setMdAutoDir}
          />
        </Row>
      </Group>

      <Group title="قابلیت‌ها">
        <Row
          title="پیش‌نمایش زنده"
          tooltip="اصلاح خودکار همزمان با تایپ (با debounce)"
        >
          <Seg
            options={onOff}
            value={s.realtime}
            onChange={s.setRealtime}
          />
        </Row>
        <Row
          title="نمایش تفاوت"
          tooltip="هایلایت تفاوت‌ها بین ورودی و خروجی"
        >
          <Seg
            options={[
              { value: "off" as const, label: "خاموش" },
              { value: "on" as const, label: "روشن" },
            ]}
            value={s.diffMode}
            onChange={s.setDiffMode}
          />
        </Row>
      </Group>
    </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
