import { useEffect } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useStore } from "@/lib/store";
import { Header } from "@/components/Header";
import { SettingsBar } from "@/components/SettingsBar";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { ControlsCenter } from "@/components/ControlsCenter";
import { Footer } from "@/components/Footer";
import { Toast } from "@/components/Toast";

function useThemeEffect() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (useStore.getState().theme === "system") {
        document.documentElement.setAttribute(
          "data-theme",
          mq.matches ? "dark" : "light"
        );
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
}

function useKeyboardShortcuts() {
  const doFix = useStore((s) => s.doFix);
  const doStrip = useStore((s) => s.doStrip);
  const toggleReveal = useStore((s) => s.toggleReveal);
  const toggleSettings = useStore((s) => s.toggleSettings);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        doFix();
      } else if (mod && e.shiftKey && e.key === "D") {
        e.preventDefault();
        doStrip();
      } else if (mod && e.shiftKey && e.key === "H") {
        e.preventDefault();
        toggleReveal();
      } else if (mod && e.key === ",") {
        e.preventDefault();
        toggleSettings();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [doFix, doStrip, toggleReveal, toggleSettings]);
}

function useLinkHandler() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (a) {
        e.preventDefault();
        window.electronAPI.openExternal(
          (a as HTMLAnchorElement).href
        );
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
}

export default function App() {
  useThemeEffect();
  useKeyboardShortcuts();
  useLinkHandler();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors">
      <Header />
      <SettingsBar />

      <main className="flex flex-1 items-stretch gap-0 overflow-hidden px-7 py-4">
        <PanelGroup direction="horizontal" autoSaveId="rtl-fixer-panels">
          <Panel defaultSize={45} minSize={25}>
            <InputPanel />
          </Panel>

          <PanelResizeHandle className="mx-0.5 flex w-1 items-center justify-center rounded-full transition-colors hover:bg-[var(--primary-glow)]">
            <div className="h-8 w-0.5 rounded-full bg-[var(--border)]" />
          </PanelResizeHandle>

          <Panel defaultSize={10} minSize={5}>
            <ControlsCenter />
          </Panel>

          <PanelResizeHandle className="mx-0.5 flex w-1 items-center justify-center rounded-full transition-colors hover:bg-[var(--primary-glow)]">
            <div className="h-8 w-0.5 rounded-full bg-[var(--border)]" />
          </PanelResizeHandle>

          <Panel defaultSize={45} minSize={25}>
            <OutputPanel />
          </Panel>
        </PanelGroup>
      </main>

      <Footer />
      <Toast />
    </div>
  );
}
