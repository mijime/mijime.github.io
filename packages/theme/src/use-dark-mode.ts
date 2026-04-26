import { useEffect, useState } from "react";

const getInitialDark = () => {
  if (typeof document === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export function useDarkMode() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    // Write initial preference to html attribute (CSS depends on it)
    document.documentElement.dataset.theme = dark ? "dark" : "light";

    const obs = new MutationObserver(() => {
      setDark(document.documentElement.dataset.theme === "dark");
    });
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return dark;
}
