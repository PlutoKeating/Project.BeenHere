import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "paper" | "night";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("beenhere-theme");
    if (saved === "paper" || saved === "night") return saved;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("beenhere-theme", theme);
  }, [theme]);

  const next = theme === "paper" ? "night" : "paper";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex size-11 items-center justify-center text-ink-muted transition-colors hover:text-ink"
      aria-label={next === "night" ? "切换到夜间采访记录室" : "切换到纸张主题"}
    >
      {theme === "paper" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
    </button>
  );
}
