import { BarChart3, ClipboardList, Pencil } from "lucide-react";

export type Tab = "record" | "history" | "stats";

const TABS: { key: Tab; Icon: typeof Pencil; label: string }[] = [
  { key: "record", Icon: Pencil, label: "記録" },
  { key: "history", Icon: ClipboardList, label: "履歴" },
  { key: "stats", Icon: BarChart3, label: "分析" },
];

interface TabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="emolog-tabbar">
      {TABS.map(({ key, Icon, label }) => (
        <button
          key={key}
          className={`emolog-tabbar-btn${activeTab === key ? " emolog-tabbar-active" : ""}`}
          onClick={() => onTabChange(key)}
        >
          <span className="emolog-tabbar-icon">
            <Icon size={20} />
          </span>
          <span className="emolog-tabbar-label">{label}</span>
        </button>
      ))}
      <div
        className="emolog-tabbar-indicator"
        style={{ transform: `translateX(${TABS.findIndex((t) => t.key === activeTab) * 100}%)` }}
      />
    </nav>
  );
}
