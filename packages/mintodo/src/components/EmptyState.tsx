import { useMindStore } from "../hooks/use-mind-store";

export function EmptyState() {
  const { dispatch } = useMindStore();
  const onCreate = () =>
    dispatch({ modal: { kind: "board-name", mode: "create" }, type: "OPEN_MODAL" });

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "var(--paper)" }}
    >
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🌱</div>
        <h2
          className="text-2xl mb-2"
          style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
        >
          最初のボードを作成
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--mid)" }}>
          プロジェクト、アイデア、ToDo...
          <br />
          ボードを作成してマインドマップを始めましょう
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="px-6 py-3 rounded text-sm font-semibold transition"
          style={{ background: "var(--terra)", color: "var(--paper)" }}
        >
          + 新規ボード作成
        </button>
      </div>
    </div>
  );
}
