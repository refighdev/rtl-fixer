import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";

export function Toast() {
  const message = useStore((s) => s.toastMessage);
  const visible = useStore((s) => s.toastVisible);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed bottom-14 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--success)] px-5 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow)]"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
