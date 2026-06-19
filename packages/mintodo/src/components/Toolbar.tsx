import {
  Download,
  Eye,
  Keyboard,
  Moon,
  Network,
  Search,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { downloadJson, parseImportedJson } from "../storage";

function onTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

export function Toolbar() {
  const { state, dispatch } = useMindStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const data = { nodes: Object.values(state.nodes), version: 1 as const };
    const url = downloadJson(data, `mintodo_backup_${new Date().toISOString().slice(0, 10)}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportClick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = parseImportedJson(text);
    if (!data) {
      alert("インポートに失敗しました。ファイルが壊れている可能性があります。");
      return;
    }
    const rec: Record<string, (typeof data.nodes)[number]> = {};
    for (const n of data.nodes) rec[n.id] = n;
    dispatch({ nodes: rec, type: "SET_NODES" });
    e.target.value = "";
  };

  const onReset = () => {
    if (!confirm("すべてのタスクを初期化しますか？")) return;
    dispatch({ type: "RESET" });
  };

  return (
    <header className="absolute top-4 left-4 right-4 z-10 flex flex-col lg:flex-row gap-3 lg:items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 transition-all">
      <div className="flex items-center justify-between lg:justify-start gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-500/20">
            <Network size={18} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide">MindTodo Pro</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">ショートカット＆期限管理対応</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <div className="relative flex-1 min-w-[150px] lg:max-w-[240px]">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={12} />
          </span>
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => dispatch({ query: e.target.value, type: "SET_SEARCH" })}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none transition"
            placeholder="タスクを検索..."
          />
        </div>
        <button
          type="button"
          className={`p-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            state.hideCompleted
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          }`}
          title="未完了のみ表示トグル"
          onClick={() => dispatch({ type: "TOGGLE_HIDE_COMPLETED" })}
        >
          <Eye size={12} /> <span>未完了のみ</span>
        </button>
      </div>
      <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl border border-slate-200/30 dark:border-slate-600/30">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">自動配置</span>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              state.physicsEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
            }`}
            onClick={() => dispatch({ type: "TOGGLE_PHYSICS" })}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                state.physicsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
            title="JSONエクスポート"
            onClick={onExport}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
            title="JSONインポート"
            onClick={onImportClick}
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
            title="ヘルプ・ショートカット"
            onClick={() => dispatch({ modal: { kind: "help" }, type: "OPEN_MODAL" })}
          >
            <Keyboard size={18} />
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition"
            title="すべてリセット"
            onClick={onReset}
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
            title="テーマ切り替え"
            onClick={onTheme}
          >
            <Moon size={18} className="dark:hidden" />
            <Sun size={18} className="hidden dark:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
