import { useEffect, useState } from "react";

const THEME_DARK = "dark";
const THEME_LIGHT = "light";

const getInitialDark = () => {
  if (typeof document === "undefined") return false;
  const stored = globalThis.localStorage.getItem("theme");
  if (stored) return stored === THEME_DARK;
  return globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export function DarkModeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    const theme = dark ? THEME_DARK : THEME_LIGHT;
    globalThis.document.documentElement.dataset.theme = theme;
    globalThis.localStorage.setItem("theme", theme);
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="toggle dark mode"
      style={{
        background: "none",
        border: "none",
        color: "var(--ink)",
        cursor: "pointer",
        fontSize: "1rem",
        padding: "0 0.5rem",
      }}
    >
      {dark ? "☀" : "☽"}
    </button>
  );
}
