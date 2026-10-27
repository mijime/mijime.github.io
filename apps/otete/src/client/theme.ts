// Theme: follows the phone's dark mode, with a manual override saved locally.

const KEY = "otete-theme";
let dark = false;

function systemDark(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function apply(d: boolean): void {
  dark = d;
  document.documentElement.dataset.theme = d ? "dark" : "light";
  document.querySelector("#tmc")?.setAttribute("content", d ? "#12121c" : "#fffdf6");
}

function saved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function initTheme(): void {
  const s = saved();
  if (s === "dark") apply(true);
  else if (s === "light") apply(false);
  else apply(systemDark());
  if (typeof window.matchMedia === "function") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!saved()) apply(e.matches);
    });
  }
}

export function isDark(): boolean {
  return dark;
}

export function themeIcon(): string {
  return dark ? "☀️" : "🌙";
}

export function toggleTheme(): boolean {
  apply(!dark);
  try {
    localStorage.setItem(KEY, dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
  return dark;
}
