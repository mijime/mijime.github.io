export function ShortcutHint() {
  return (
    <div className="hidden md:flex absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-slate-800/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-xs gap-4 border border-slate-700/50 pointer-events-none">
      <span>
        <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Tab</kbd> 子を追加
      </span>
      <span>
        <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Enter</kbd> 兄弟を追加
      </span>
      <span>
        <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Space</kbd> 完了状態トグル
      </span>
      <span>
        <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Delete</kbd> 削除
      </span>
      <span>
        <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">矢印キー</kbd> 移動
      </span>
    </div>
  );
}
