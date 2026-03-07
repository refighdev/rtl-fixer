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
export type DiffMode = "off" | "on";

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
  mdStripMarks: OnOff;
  mdPrepare: OnOff;
  mdAutoDir: OnOff;

  theme: Theme;
  realtime: OnOff;
  diffMode: DiffMode;

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
  setMdStripMarks: (val: OnOff) => void;
  setMdPrepare: (val: OnOff) => void;
  setMdAutoDir: (val: OnOff) => void;
  setTheme: (theme: Theme) => void;
  setRealtime: (val: OnOff) => void;
  setDiffMode: (val: DiffMode) => void;

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
      mdStripMarks: "off",
      mdPrepare: "off",
      mdAutoDir: "off",

      theme: "system",
      realtime: "off",
      diffMode: "off",

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
      setMdStripMarks: (val) => set({ mdStripMarks: val }),
      setMdPrepare: (val) => set({ mdPrepare: val }),
      setMdAutoDir: (val) => set({ mdAutoDir: val }),
      setTheme: (theme) => set({ theme }),
      setRealtime: (val) => set({ realtime: val }),
      setDiffMode: (val) => set({ diffMode: val }),

      doFix: () => {
        const { inputText, fixMode, listDir, neutralFix } = get();
        if (!inputText.trim()) {
          get().showToast("متنی وارد نشده!");
          return;
        }
        const result = applyFix(
          inputText,
          fixMode,
          listDir,
          neutralFix === "on"
        );
        set({
          outputText: result.text,
          fixCount: result.fixCount,
          status:
            result.fixCount > 0
              ? `✓ ${result.fixCount} خط اصلاح شد`
              : "✓ متن نیازی به اصلاح نداشت",
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
        if (!source.trim()) {
          get().showToast("متنی وارد نشده!");
          return;
        }
        const result = stripAllMarks(source);
        if (result.count === 0) {
          get().showToast("نشانه‌ای پیدا نشد!");
          return;
        }
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
          outputView: "txt",
          inputView: "txt",
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
          const result = applyFix(
            inputText,
            fixMode,
            listDir,
            neutralFix === "on"
          );
          set({
            outputText: result.text,
            fixCount: result.fixCount,
            status: `✓ ${result.fixCount} خط اصلاح شد`,
          });
        }
      },
    }),
    {
      name: "rtl-fixer-store",
      partialize: (state) => ({
        outputView: state.outputView,
        inputView: state.inputView,
        isRevealed: state.isRevealed,
        settingsOpen: state.settingsOpen,
        fixMode: state.fixMode,
        listDir: state.listDir,
        neutralFix: state.neutralFix,
        mdStripMarks: state.mdStripMarks,
        mdPrepare: state.mdPrepare,
        mdAutoDir: state.mdAutoDir,
        theme: state.theme,
        realtime: state.realtime,
        diffMode: state.diffMode,
      }),
    }
  )
);
