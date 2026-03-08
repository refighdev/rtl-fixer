import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import {
	RLM,
	LRM,
	RTL_RANGE,
	STRONG_LTR,
} from "@rtl-fixer/core";

type LineType =
	| "heading"
	| "list"
	| "blockquote"
	| "table"
	| "tableSep"
	| "paragraph"
	| "empty";

interface LineInfo {
	type: LineType;
	prefixEnd: number;
}

interface RtlFixerSettings {
	headings: boolean;
	listItems: boolean;
	blockquotes: boolean;
	tables: boolean;
	paragraphs: boolean;
	neutralFix: boolean;
}

const DEFAULT_SETTINGS: RtlFixerSettings = {
	headings: true,
	listItems: true,
	blockquotes: true,
	tables: true,
	paragraphs: true,
	neutralFix: true,
};

function classifyLine(line: string): LineInfo {
	const trimmed = line.trimStart();
	const indent = line.length - trimmed.length;

	if (!trimmed) return { type: "empty", prefixEnd: 0 };

	const hm = trimmed.match(/^(#{1,6}\s)/);
	if (hm) return { type: "heading", prefixEnd: indent + hm[1].length };

	const tm = trimmed.match(/^([-*+]\s\[[ xX]\]\s)/);
	if (tm) return { type: "list", prefixEnd: indent + tm[1].length };

	const um = trimmed.match(/^([-*+]\s)/);
	if (um) return { type: "list", prefixEnd: indent + um[1].length };

	const om = trimmed.match(/^(\d+[.)]\s)/);
	if (om) return { type: "list", prefixEnd: indent + om[1].length };

	const bm = trimmed.match(/^(>\s?)/);
	if (bm) return { type: "blockquote", prefixEnd: indent + bm[1].length };

	if (/^[|\s:\-]+$/.test(trimmed)) return { type: "tableSep", prefixEnd: 0 };
	if (trimmed.startsWith("|") && trimmed.endsWith("|"))
		return { type: "table", prefixEnd: 0 };

	return { type: "paragraph", prefixEnd: 0 };
}

function hasBothDirections(text: string): boolean {
	return RTL_RANGE.test(text) && STRONG_LTR.test(text);
}

function startsWithNeutral(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed) return false;
	return !STRONG_LTR.test(trimmed[0]) && !RTL_RANGE.test(trimmed[0]);
}

function stripMarks(line: string): string {
	return line.replace(/[\u200F\u200E]/g, "");
}

function shouldFix(type: LineType, s: RtlFixerSettings): boolean {
	switch (type) {
		case "heading":
			return s.headings;
		case "list":
			return s.listItems;
		case "blockquote":
			return s.blockquotes;
		case "table":
			return s.tables;
		case "paragraph":
			return s.paragraphs;
		default:
			return false;
	}
}

function fixTableRow(line: string): { text: string; fixed: boolean } {
	const parts = line.split("|");
	let anyFixed = false;

	const result = parts.map((cell, i) => {
		if (i === 0 || i === parts.length - 1) return cell;
		const trimmed = cell.trim();
		if (hasBothDirections(trimmed)) {
			anyFixed = true;
			return cell.replace(trimmed, RLM + trimmed);
		}
		return cell;
	});

	return { text: anyFixed ? result.join("|") : line, fixed: anyFixed };
}

function pickMarkForContent(
	content: string,
	neutralFix: boolean
): string | null {
	if (hasBothDirections(content)) return RLM;
	if (neutralFix && startsWithNeutral(content)) {
		if (RTL_RANGE.test(content)) return RLM;
		if (STRONG_LTR.test(content)) return LRM;
	}
	return null;
}

function processText(
	text: string,
	settings: RtlFixerSettings
): { text: string; fixCount: number } {
	const lines = text.split("\n");
	let fixCount = 0;
	let inCodeBlock = false;
	let inFrontmatter = false;

	if (lines[0]?.trim() === "---") inFrontmatter = true;

	const result = lines.map((raw, i) => {
		if (inFrontmatter) {
			if (i > 0 && raw.trim() === "---") inFrontmatter = false;
			return raw;
		}

		if (raw.trimStart().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			return raw;
		}
		if (inCodeBlock) return raw;

		const clean = stripMarks(raw);
		if (!clean.trim()) return clean;

		const info = classifyLine(clean);
		if (!shouldFix(info.type, settings)) return clean;

		if (info.type === "table") {
			const res = fixTableRow(clean);
			if (res.fixed) fixCount++;
			return res.text;
		}

		const content = clean.slice(info.prefixEnd);
		const mark = pickMarkForContent(content, settings.neutralFix);
		if (!mark) return clean;

		fixCount++;
		if (info.prefixEnd > 0) {
			return clean.slice(0, info.prefixEnd) + mark + content;
		}
		return mark + clean;
	});

	return { text: result.join("\n"), fixCount };
}

function stripAllMarks(text: string): { text: string; count: number } {
	const matches = text.match(/[\u200F\u200E]/g);
	return {
		text: text.replace(/[\u200F\u200E]/g, ""),
		count: matches ? matches.length : 0,
	};
}

function countMarks(text: string): { rlm: number; lrm: number } {
	let rlm = 0;
	let lrm = 0;
	for (const ch of text) {
		if (ch === RLM) rlm++;
		else if (ch === LRM) lrm++;
	}
	return { rlm, lrm };
}

export default class RtlFixerPlugin extends Plugin {
	settings: RtlFixerSettings;
	statusBarEl: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("languages", "RTL Fixer: اصلاح سند", () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				new Notice("فایل مارک‌داونی باز نیست");
				return;
			}
			const editor = view.editor;
			const cursor = editor.getCursor();
			const text = editor.getValue();
			const result = processText(text, this.settings);

			if (result.fixCount > 0) {
				editor.setValue(result.text);
				editor.setCursor(cursor);
				new Notice(`✓ ${result.fixCount} خط اصلاح شد`);
			} else {
				new Notice("نیازی به اصلاح نبود");
			}
			this.updateStatusBar();
		});

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("rtl-fixer-status");

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.updateStatusBar();
			})
		);

		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				this.updateStatusBar();
			})
		);

		this.updateStatusBar();

		this.addCommand({
			id: "fix-rtl",
			name: "افزودن نشانه RLM به خطوط دوزبانه",
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const text = editor.getValue();
				const result = processText(text, this.settings);

				if (result.fixCount > 0) {
					editor.setValue(result.text);
					editor.setCursor(cursor);
					new Notice(`✓ ${result.fixCount} خط اصلاح شد`);
				} else {
					new Notice("نیازی به اصلاح نبود");
				}
				this.updateStatusBar();
			},
		});

		this.addCommand({
			id: "fix-selection",
			name: "اصلاح بخش انتخاب‌شده",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				if (!selection) {
					new Notice("متنی انتخاب نشده");
					return;
				}
				const result = processText(selection, this.settings);
				if (result.fixCount > 0) {
					editor.replaceSelection(result.text);
					new Notice(`✓ ${result.fixCount} خط اصلاح شد`);
				} else {
					new Notice("نیازی به اصلاح نبود");
				}
				this.updateStatusBar();
			},
		});

		this.addCommand({
			id: "strip-marks",
			name: "حذف همه نشانه‌های RLM و LRM",
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const text = editor.getValue();
				const result = stripAllMarks(text);

				if (result.count > 0) {
					editor.setValue(result.text);
					editor.setCursor(cursor);
					new Notice(`✓ ${result.count} نشانه حذف شد`);
				} else {
					new Notice("نشانه‌ای پیدا نشد");
				}
				this.updateStatusBar();
			},
		});

		this.addSettingTab(new RtlFixerSettingTab(this.app, this));
	}

	updateStatusBar() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			this.statusBarEl.setText("");
			return;
		}
		const text = view.editor.getValue();
		const { rlm, lrm } = countMarks(text);
		const total = rlm + lrm;
		if (total === 0) {
			this.statusBarEl.setText("BiDi: —");
		} else {
			this.statusBarEl.setText(`BiDi: ${total} (${rlm}ر ${lrm}L)`);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RtlFixerSettingTab extends PluginSettingTab {
	plugin: RtlFixerPlugin;

	constructor(app: App, plugin: RtlFixerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.setAttribute("dir", "rtl");

		containerEl.createEl("h2", { text: "تنظیمات RTL Fixer" });
		containerEl.createEl("p", {
			text: "انتخاب کنید نشانه RLM برای کدام نوع خطوط اعمال شود. فقط خطوطی که هم فارسی و هم انگلیسی دارند تحت تأثیر قرار می‌گیرند.",
		});

		new Setting(containerEl)
			.setName("تیترها (Headings)")
			.setDesc("خطوط # عنوان")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.headings)
					.onChange(async (v) => {
						this.plugin.settings.headings = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("لیست‌ها (Lists)")
			.setDesc("آیتم‌های لیست مرتب، نامرتب و تسک‌لیست")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.listItems)
					.onChange(async (v) => {
						this.plugin.settings.listItems = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("نقل‌قول (Blockquote)")
			.setDesc("خطوط > نقل‌قول")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.blockquotes)
					.onChange(async (v) => {
						this.plugin.settings.blockquotes = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("جدول (Table)")
			.setDesc("سلول‌های جدول مارک‌داون")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.tables)
					.onChange(async (v) => {
						this.plugin.settings.tables = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("پاراگراف (Paragraph)")
			.setDesc("خطوط متن ساده و سرتیتر لیست‌ها")
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.paragraphs)
					.onChange(async (v) => {
						this.plugin.settings.paragraphs = v;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("hr");

		new Setting(containerEl)
			.setName("اصلاح شروع خنثی")
			.setDesc(
				"خطوطی که با کاراکتر خنثی (عدد، پرانتز و ...) شروع می‌شوند بر اساس محتوا LRM یا RLM بگیرند"
			)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings.neutralFix)
					.onChange(async (v) => {
						this.plugin.settings.neutralFix = v;
						await this.plugin.saveSettings();
					})
			);
	}
}
