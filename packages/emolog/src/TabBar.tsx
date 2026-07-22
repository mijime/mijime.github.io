export type Tab = "record" | "history" | "stats";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "record", icon: "✏️", label: "記録" },
  { key: "history", icon: "📋", label: "履歴" },
  { key: "stats", icon: "📊", label: "分析" },
];

interface TabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="emolog-tabbar">
      {TABS.map(({ key, icon, label }) => (
        <button
          key={key}
          className={`emolog-tabbar-btn${activeTab === key ? " emolog-tabbar-active" : ""}`}
          onClick={() => onTabChange(key)}
        >
          <span className="emolog-tabbar-icon">{icon}</span>
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
