import { useMindStore } from "../hooks/use-mind-store";

export function EmptyState() {
  const { dispatch } = useMindStore();
  const onCreate = () =>
    dispatch({ modal: { kind: "board-name", mode: "create" }, type: "OPEN_MODAL" });

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🌱</div>
        <h2 className="text-2xl font-bold mb-2">最初のボードを作成</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          プロジェクト、アイデア、ToDo...
          <br />
          ボードを作成してマインドマップを始めましょう
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/30 hover:bg-indigo-700 transition"
        >
          + 新規ボード作成
        </button>
      </div>
    </div>
  );
}
