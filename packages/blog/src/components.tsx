import React, { useEffect, useRef } from "react";

interface PostBodyProps {
  html: string;
  className?: string;
}

export function PostBody({ html, className }: PostBodyProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const blocks = ref.current.querySelectorAll("pre > code.language-mermaid");
    if (blocks.length === 0) return;
    import("mermaid")
      .then((m) => {
        const isDark =
          document.documentElement.dataset.theme === "dark" ||
          (!document.documentElement.dataset.theme &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        m.default.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default" });
        const renders: Promise<void>[] = [];
        for (const el of blocks) {
          renders.push(
            m.default
              .render(`mermaid-${Math.random().toString(36).slice(2)}`, el.textContent ?? "")
              .then(({ svg }) => {
                const pre = el.parentElement!;
                const div = document.createElement("div");
                div.className = "mermaid-diagram";
                div.innerHTML = svg;
                pre.replaceWith(div);
              }),
          );
        }
        return Promise.all(renders);
      })
      .catch(() => {});
  }, [html]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
