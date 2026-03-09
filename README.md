<div dir="rtl">

# RTL Fixer — اصلاح‌گر متن‌های دوجهته فارسی-انگلیسی

ابزاری برای اصلاح خودکار جهت متن‌های ترکیبی فارسی و انگلیسی با استفاده از کاراکترهای نامرئی یونیکد (RLM/LRM).

**مشکل چیست؟** وقتی یک خط هم فارسی دارد هم انگلیسی، اکثر ویرایشگرها بر اساس اولین کاراکتر قوی جهت خط را تعیین می‌کنند. اگر خط با انگلیسی شروع شود ولی محتوای اصلی فارسی باشد، چیدمان به‌هم می‌ریزد.

**راه‌حل ما:** تمام کاراکترهای خط بررسی می‌شوند. اگر فارسی (یا عربی) وجود داشته باشد، یک کاراکتر RLM (نشانه راست‌به‌چپ) به ابتدای خط اضافه می‌شود تا جهت صحیح تضمین شود.

## محصولات

| محصول | توضیح | حجم |
|---|---|---|
| 🖥 **Electron** | اپلیکیشن دسکتاپ کامل | ~107 مگابایت |
| ⚡ **Tauri** | اپلیکیشن دسکتاپ سبک | ~5 مگابایت |
| 🌐 **PWA** | نسخه وب (بدون نصب) | — |
| 💻 **CLI** | ابزار خط فرمان | — |
| 📝 **VS Code** | افزونه ویژوال استودیو کد و Cursor | — |
| 📓 **Obsidian** | پلاگین ابسیدین | — |

## ساختار پروژه

</div>

```
rtl-fixer/
├── packages/core/      # منطق مشترک BiDi + مارک‌داون
├── apps/
│   ├── electron/       # اپ دسکتاپ (Electron)
│   ├── tauri/          # اپ دسکتاپ (Tauri — سبک‌تر)
│   ├── pwa/            # نسخه وب
│   ├── cli/            # ابزار خط فرمان
│   ├── vscode-ext/     # افزونه VS Code / Cursor
│   └── obsidian/       # پلاگین Obsidian
├── package.json        # pnpm monorepo root
└── pnpm-workspace.yaml
```

<div dir="rtl">

## نصب و توسعه

</div>

```bash
# نصب وابستگی‌ها
pnpm install

# اجرای نسخه Electron
pnpm dev:electron

# اجرای نسخه Tauri
pnpm dev:tauri

# اجرای نسخه وب
pnpm dev:pwa

# بیلد همه محصولات
pnpm build:all
```

<div dir="rtl">

## قابلیت‌های اصلی

- **تشخیص هوشمند جهت** — بررسی تمام کاراکترهای خط (نه فقط اولین)
- **پشتیبانی از مارک‌داون** — حفظ بلوک‌های کد، جدول‌ها، و ساختار
- **حالت بلادرنگ** — اصلاح همزمان با تایپ
- **حذف نشانه‌ها** — پاکسازی RLM/LRM اضافه‌شده
- **پیش‌نمایش RTL** — نمایش زنده متن اصلاح‌شده
- **تم روشن/تاریک** — با تشخیص خودکار سیستم

## افزونه VS Code

۵ دستور: Fix Document، Fix Selection، Strip All Marks، RTL Preview، Toggle BiDi Mark Highlighting

نوار وضعیت: نمایش تعداد RLM/LRM — کلیک = اصلاح سند

## پلاگین Obsidian

دستورات: Fix Document، Fix Selection، Strip Marks

آیکون Ribbon: یک کلیک = اصلاح سند

نوار وضعیت: تعداد نشانه‌های BiDi

ایزوله‌سازی کد اینلاین: جلوگیری از به‌هم‌ریختگی متن داخل بک‌تیک

</div>

---

# RTL Fixer — Bidirectional Text Fixer for Persian-English

A tool for automatically fixing the direction of mixed Persian-English text using invisible Unicode characters (RLM/LRM).

**The problem:** When a line contains both Persian and English, most editors determine line direction from the first strong character. If a line starts with English but is primarily Persian, the layout breaks.

**Our solution:** All characters in a line are analyzed. If Persian (or Arabic) characters are present, an RLM (Right-to-Left Mark) is prepended to ensure correct directionality.

## Products

| Product | Description | Size |
|---|---|---|
| 🖥 **Electron** | Full desktop application | ~107 MB |
| ⚡ **Tauri** | Lightweight desktop app | ~5 MB |
| 🌐 **PWA** | Web version (no install) | — |
| 💻 **CLI** | Command-line tool | — |
| 📝 **VS Code** | Extension for VS Code & Cursor | — |
| 📓 **Obsidian** | Obsidian plugin | — |

## Project Structure

```
rtl-fixer/
├── packages/core/      # Shared BiDi + Markdown logic
├── apps/
│   ├── electron/       # Desktop app (Electron)
│   ├── tauri/          # Desktop app (Tauri — lighter)
│   ├── pwa/            # Web app
│   ├── cli/            # Command-line tool
│   ├── vscode-ext/     # VS Code / Cursor extension
│   └── obsidian/       # Obsidian plugin
├── package.json        # pnpm monorepo root
└── pnpm-workspace.yaml
```

## Setup & Development

```bash
# Install dependencies
pnpm install

# Run Electron app
pnpm dev:electron

# Run Tauri app
pnpm dev:tauri

# Run web app
pnpm dev:pwa

# Build everything
pnpm build:all
```

## Key Features

- **Smart direction detection** — scans all characters in a line, not just the first
- **Markdown-aware** — preserves code blocks, tables, and structure
- **Real-time mode** — fixes text as you type
- **Strip marks** — remove all added RLM/LRM characters
- **RTL Preview** — live preview of fixed text
- **Light/Dark theme** — with automatic system detection

## VS Code Extension

5 commands: Fix Document, Fix Selection, Strip All Marks, RTL Preview, Toggle BiDi Mark Highlighting

Status bar: shows RLM/LRM count — click to fix document

## Obsidian Plugin

Commands: Fix Document, Fix Selection, Strip Marks

Ribbon icon: one click = fix document

Status bar: BiDi mark count

Inline code isolation: prevents reordering inside backticks

## Tech Stack

- **Core:** TypeScript, Unicode BiDi algorithm
- **Electron:** React, Vite, Tailwind CSS, Zustand
- **Tauri:** Rust + same React frontend (~95% smaller binary)
- **Build:** pnpm workspaces monorepo, esbuild
- **CI:** GitHub Actions (auto-build for Linux, macOS, Windows)

## License

MIT
