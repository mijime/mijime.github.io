import { Plus, X } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { useBoardActions } from "../hooks/use-board-actions";
import { BoardListItem } from "./BoardListItem";

export function BoardSidebar() {
  const { state, dispatch } = useMindStore();
  const actions = useBoardActions();

  const closeDrawer = () => dispatch({ open: false, type: "SET_DRAWER" });

  const onCreate = () => {
    closeDrawer();
    dispatch({ modal: { kind: "board-name", mode: "create" }, type: "OPEN_MODAL" });
  };
  const onRename = (boardId: string, name: string) => {
    closeDrawer();
    dispatch({
      modal: { kind: "board-name", mode: "rename", boardId, initialName: name },
      type: "OPEN_MODAL",
    });
  };
  const onDelete = (boardId: string, name: string) => {
    closeDrawer();
    dispatch({ modal: { kind: "board-delete", boardId, boardName: name }, type: "OPEN_MODAL" });
  };
  const onSelect = async (id: string) => {
    await actions.switchBoard(id);
    closeDrawer();
  };

  const sidebar = (
    <aside
      className="flex flex-col h-full rounded"
      style={{ background: "var(--toolbar-bg)", border: "1px solid var(--border)" }}
    >
      <header
        className="flex items-center justify-between p-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <h2 className="text-sm" style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600 }}>
          ボード
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCreate}
            title="新規ボード"
            className="p-1.5 rounded transition"
            style={{ background: "var(--terra)", color: "var(--paper)" }}
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            title="閉じる"
            className="p-1.5 rounded transition md:hidden"
            style={{ color: "var(--mid)" }}
          >
            <X size={14} />
          </button>
        </div>
      </header>
      <ul className="flex-1 overflow-y-auto p-2">
        {state.boards.length === 0 ? (
          <li className="text-xs text-center py-4" style={{ color: "var(--mid)" }}>
            まだありません
          </li>
        ) : (
          state.boards.map((b) => (
            <BoardListItem
              key={b.id}
              boardId={b.id}
              isCurrent={b.id === state.currentBoardId}
              onSelect={() => onSelect(b.id)}
              onRename={() => onRename(b.id, b.name)}
              onDelete={() => onDelete(b.id, b.name)}
            />
          ))
        )}
      </ul>
    </aside>
  );

  return (
    <>
      <aside className="hidden md:flex absolute left-4 top-20 bottom-4 w-60 z-10">{sidebar}</aside>
      {state.drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute left-0 top-0 bottom-0 w-72 pt-4 pl-4 pb-4 transition-transform duration-200">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
