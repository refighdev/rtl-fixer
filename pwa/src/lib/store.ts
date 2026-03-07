import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyFix,
  stripAllMarks,
  type FixMode,
  type ListDir,
  type OnOff,
} from "./bidi";

export type ViewMode = "txt" | "md" | "marked";
export type Theme = "system" | "light" | "dark";

interface AppState {
  inputText: string;
  outputText: string;
  fixCount: number;

  outputView: ViewMode;
  inputView: ViewMode;
  isRevealed: boolean;
  settingsOpen: boolean;

  fixMode: FixMode;
  listDir: ListDir;
  neutralFix: OnOff;

  theme: Theme;

  toastMessage: string;
  toastVisible: boolean;
  status: string;
}

interface AppActions {
  setInputText: (text: string) => void;
  setOutputView: (view: ViewMode) => void;
  setInputView: (view: ViewMode) => void;
  toggleReveal: () => void;
  toggleSettings: () => void;

  setFixMode: (mode: FixMode) => void;
  setListDir: (dir: ListDir) => void;
  setNeutralFix: (val: OnOff) => void;
  setTheme: (theme: Theme) => void;

  doFix: () => void;
  doStrip: () => void;
  doClear: () => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  reapplyFix: () => void;
}

export type Store = AppState & AppActions;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      inputText: "",
      outputText: "",
      fixCount: 0,
      outputView: "txt",
      inputView: "txt",
      isRevealed: false,
      settingsOpen: false,
      fixMode: "auto",
      listDir: "auto",
      neutralFix: "off",
      theme: "system",
      toastMessage: "",
      toastVisible: false,
      status: "آماده",

      setInputText: (text) => set({ inputText: text }),
      setOutputView: (view) => set({ outputView: view }),
      setInputView: (view) => set({ inputView: view }),
      toggleReveal: () => set((s) => ({ isRevealed: !s.isRevealed })),
      toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
      setFixMode: (mode) => {
        set({ fixMode: mode });
        get().reapplyFix();
      },
      setListDir: (dir) => {
        set({ listDir: dir });
        get().reapplyFix();
      },
      setNeutralFix: (val) => {
        set({ neutralFix: val });
        get().reapplyFix();
      },
      setTheme: (theme) => set({ theme }),

      doFix: () => {
        const { inputText, fixMode, listDir, neutralFix } = get();
        if (!inputText.trim()) {
          get().showToast("متنی وارد نشده!");
          return;
        }
        const result = applyFix(inputText, fixMode, listDir, neutralFix === "on");
        set({
          outputText: result.text,
          fixCount: result.fixCount,
          status:
            result.fixCount > 0
              ? `✓ ${result.fixCount} خط اصلاح شد`
              : "✓ بدون تغییر",
        });
        get().showToast(
          result.fixCount > 0
            ? `${result.fixCount} خط اصلاح شد`
            : "بدون تغییر"
        );
      },

      doStrip: () => {
        const { outputText, inputText } = get();
        const source = outputText || inputText;
        if (!source.trim()) return;
        const result = stripAllMarks(source);
        set({
          outputText: result.text,
          fixCount: 0,
          status: `✓ ${result.count} نشانه حذف شد`,
        });
        get().showToast(`${result.count} نشانه حذف شد`);
      },

      doClear: () =>
        set({
          inputText: "",
          outputText: "",
          fixCount: 0,
          isRevealed: false,
          status: "آماده",
        }),

      showToast: (message) => {
        set({ toastMessage: message, toastVisible: true });
        setTimeout(() => get().hideToast(), 2000);
      },
      hideToast: () => set({ toastVisible: false }),
      reapplyFix: () => {
        const { outputText, inputText, fixMode, listDir, neutralFix } = get();
        if (outputText && inputText.trim()) {
          const result = applyFix(inputText, fixMode, listDir, neutralFix === "on");
          set({ outputText: result.text, fixCount: result.fixCount });
        }
      },
    }),
    {
      name: "rtl-fixer-pwa",
      partialize: (state) => ({
        outputView: state.outputView,
        inputView: state.inputView,
        isRevealed: state.isRevealed,
        settingsOpen: state.settingsOpen,
        fixMode: state.fixMode,
        listDir: state.listDir,
        neutralFix: state.neutralFix,
        theme: state.theme,
      }),
    }
  )
);
