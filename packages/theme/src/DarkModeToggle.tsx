import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "./useDarkMode";

export function DarkModeToggle() {
  const dark = useDarkMode();

  const toggle = () => {
    const next = !dark;
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };

  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="site-theme-toggle">
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
