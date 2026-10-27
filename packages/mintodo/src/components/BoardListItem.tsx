import { useMemo } from "react";
import { IconButton, ListRow, Progress } from "@mijime/theme/ui";
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
    <li className="mb-1">
      <ListRow
        active={isCurrent}
        onClick={onSelect}
        className="group cursor-pointer items-start"
        leading={
          <span
            className="mt-1.5 h-2 w-2 rounded-full"
            style={{ background: isCurrent ? "var(--primary)" : "var(--grid)" }}
          />
        }
        title={board.name}
        description={total === 0 ? "タスクなし" : `${completed}/${total} 完了 (${rate}%)`}
        meta={
          <div className="mt-1.5">
            <Progress value={rate} label="完了率" />
          </div>
        }
        actions={
          <div className="flex opacity-0 transition group-hover:opacity-100">
            <IconButton
              label="リネーム"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
            >
              ✎
            </IconButton>
            <IconButton
              label="削除"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              🗑
            </IconButton>
          </div>
        }
      />
    </li>
  );
}
