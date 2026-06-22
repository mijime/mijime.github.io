export function ShortcutHint() {
  return (
    <div
      className="hidden md:flex absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded text-xs gap-4 pointer-events-none"
      style={{ background: "var(--ink)", color: "var(--paper)" }}
    >
      <span>
        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--mid)" }}>
          Tab
        </kbd>{" "}
        子を追加
      </span>
      <span>
        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--mid)" }}>
          Enter
        </kbd>{" "}
        兄弟を追加
      </span>
      <span>
        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--mid)" }}>
          Space
        </kbd>{" "}
        完了状態トグル
      </span>
      <span>
        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--mid)" }}>
          Delete
        </kbd>{" "}
        削除
      </span>
      <span>
        <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--mid)" }}>
          矢印キー
        </kbd>{" "}
        移動
      </span>
    </div>
  );
}
