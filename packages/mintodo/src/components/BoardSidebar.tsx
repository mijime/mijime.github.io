import { Plus } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { BoardListItem } from "./BoardListItem";

export function BoardSidebar() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();

  const onCreate = () => {
    dispatch({ modal: { kind: "board-name", mode: "create" }, type: "OPEN_MODAL" });
  };
  const onRename = (boardId: string, name: string) => {
    dispatch({
      modal: { kind: "board-name", mode: "rename", boardId, initialName: name },
      type: "OPEN_MODAL",
    });
  };
  const onDelete = (boardId: string, name: string) => {
    dispatch({ modal: { kind: "board-delete", boardId, boardName: name }, type: "OPEN_MODAL" });
  };

  return (
    <aside className="absolute left-4 top-20 bottom-4 w-60 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-slate-200/50 dark:border-slate-700/50">
        <h2 className="text-sm font-bold">ボード</h2>
        <button
          type="button"
          onClick={onCreate}
          title="新規ボード"
          className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus size={14} />
        </button>
      </header>
      <ul className="flex-1 overflow-y-auto p-2">
        {state.boards.length === 0 ? (
          <li className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
            まだありません
          </li>
        ) : (
          state.boards.map((b) => (
            <BoardListItem
              key={b.id}
              boardId={b.id}
              isCurrent={b.id === state.currentBoardId}
              onSelect={() => actions.switchBoard(b.id)}
              onRename={() => onRename(b.id, b.name)}
              onDelete={() => onDelete(b.id, b.name)}
            />
          ))
        )}
      </ul>
    </aside>
  );
}
