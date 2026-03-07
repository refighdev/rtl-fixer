import { useEffect, useRef } from "react";
import { marked } from "marked";
import { renderCustomMd } from "@/lib/markdown";
import {
  revealHidden,
  revealInHtml,
  stripMarksForMdPreview,
  prepareForMarkdown,
  firstStrongDir,
} from "@/lib/bidi";
import { useStore, type ViewMode } from "@/lib/store";

marked.setOptions({ breaks: true, gfm: true });

function applyDirToBlocks(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>(
    "p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th"
  ).forEach((node) => {
    const dir = firstStrongDir(node.textContent || "");
    if (dir) node.setAttribute("dir", dir);
  });
  el.querySelectorAll<HTMLElement>("ol, ul").forEach((list) => {
    const first = list.querySelector<HTMLElement>(":scope > li");
    if (first) {
      const dir = firstStrongDir(first.textContent || "");
      if (dir) list.setAttribute("dir", dir);
    }
  });
  el.querySelectorAll<HTMLElement>("pre").forEach((pre) =>
    pre.setAttribute("dir", "ltr")
  );
}

interface Props {
  text: string;
  viewMode: ViewMode;
  isRevealed?: boolean;
}

export function MdPreview({ text, viewMode, isRevealed }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mdStripMarks = useStore((s) => s.mdStripMarks);
  const mdPrepare = useStore((s) => s.mdPrepare);
  const mdAutoDir = useStore((s) => s.mdAutoDir);

  useEffect(() => {
    if (!ref.current || !text) return;

    if (viewMode === "txt" && isRevealed) {
      ref.current.innerHTML = revealHidden(text);
      return;
    }

    if (viewMode === "md") {
      let html = renderCustomMd(text);
      if (isRevealed) html = revealInHtml(html);
      ref.current.innerHTML = html;
      return;
    }

    if (viewMode === "marked") {
      let source = text;
      const stripped = mdStripMarks === "on";
      if (stripped) source = stripMarksForMdPreview(source);
      if (mdPrepare === "on") source = prepareForMarkdown(source);
      ref.current.innerHTML = marked.parse(source) as string;
      if (stripped || mdAutoDir === "on") {
        applyDirToBlocks(ref.current);
      }
      if (isRevealed) {
        ref.current.innerHTML = revealInHtml(ref.current.innerHTML);
      }
    }
  }, [text, viewMode, isRevealed, mdStripMarks, mdPrepare, mdAutoDir]);

  return <div ref={ref} className="md-preview flex-1 overflow-y-auto" dir="auto" />;
}
