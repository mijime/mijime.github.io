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
      className="group rounded p-2.5 mb-1 transition cursor-pointer"
      style={{
        background: isCurrent ? "var(--grid)" : "transparent",
        border: isCurrent ? "1px solid var(--border)" : "1px solid transparent",
      }}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: isCurrent ? "var(--terra)" : "var(--grid)" }}
        />
        <span
          className="flex-1 text-sm truncate"
          style={{
            color: "var(--ink)",
            fontWeight: isCurrent ? 600 : 400,
          }}
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
            className="p-1 text-xs"
            style={{ color: "var(--mid)" }}
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
            className="p-1 text-xs"
            style={{ color: "var(--terra)" }}
          >
            🗑
          </button>
        </div>
        <MoreVertical size={14} style={{ color: "var(--mid)" }} />
      </div>
      <div className="mt-1.5 ml-4">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--grid)" }}>
          <div
            className="h-full transition-all"
            style={{ background: "var(--terra)", width: `${rate}%` }}
          />
        </div>
        <div className="text-[10px] mt-1" style={{ color: "var(--mid)" }}>
          {total === 0 ? "タスクなし" : `${completed}/${total} 完了 (${rate}%)`}
        </div>
      </div>
    </li>
  );
}
