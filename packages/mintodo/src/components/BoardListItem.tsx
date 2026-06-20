import { MoreVertical } from "lucide-react";
import { useMemo } from "react";
import { useMindStore } from "../hooks/use-mind-store";

interface Props {
  boardId: string;
  isCurrent: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function BoardListItem({ boardId, isCurrent, onSelect, onRename, onDelete }: Props) {
  const { state } = useMindStore();
  const board = state.boards.find((b) => b.id === boardId);
  if (!board) return null;

  const { total, completed, rate } = useMemo(() => {
    const nodes = Object.values(state.nodes).filter((n) => n.boardId === boardId && !n.isRoot);
    const total = nodes.length;
    const completed = nodes.filter((n) => n.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, rate };
  }, [state.nodes, boardId]);

  return (
    <li
      className={`group rounded-xl p-2.5 mb-1 transition cursor-pointer ${
        isCurrent
          ? "bg-indigo-100 dark:bg-indigo-950/40"
          : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isCurrent ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
        />
        <span
          className={`flex-1 text-sm font-medium truncate ${
            isCurrent ? "text-indigo-700 dark:text-indigo-200" : ""
          }`}
        >
          {board.name}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition flex">
          <button
            type="button"
            title="リネーム"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="p-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            ✎
          </button>
          <button
            type="button"
            title="削除"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-xs text-rose-400 hover:text-rose-600"
          >
            🗑
          </button>
        </div>
        <MoreVertical size={14} className="text-slate-400" />
      </div>
      <div className="mt-1.5 ml-4">
        <div className="bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
          <div className="bg-indigo-500 h-full transition-all" style={{ width: `${rate}%` }} />
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
          {total === 0 ? "タスクなし" : `${completed}/${total} 完了 (${rate}%)`}
        </div>
      </div>
    </li>
  );
}
