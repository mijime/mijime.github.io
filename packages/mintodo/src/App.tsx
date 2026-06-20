import { useEffect } from "react";
import { BoardDeleteDialog } from "./components/BoardDeleteDialog";
import { BoardNameDialog } from "./components/BoardNameDialog";
import { BoardSidebar } from "./components/BoardSidebar";
import { Canvas } from "./components/Canvas";
import { EditModal } from "./components/EditModal";
import { EmptyState } from "./components/EmptyState";
import { HelpModal } from "./components/HelpModal";
import { ShortcutHint } from "./components/ShortcutHint";
import { StatsPanel } from "./components/StatsPanel";
import { Toolbar } from "./components/Toolbar";
import { ZoomControls } from "./components/ZoomControls";
import { useKeyboard } from "./hooks/use-keyboard";
import { useBoardActions } from "./hooks/use-board-actions";
import { MindProvider, useMindStore } from "./hooks/use-mind-store";
import { useStorageSync } from "./hooks/use-storage-sync";

function Shell() {
  const { state } = useMindStore();
  const actions = useBoardActions();
  useStorageSync();
  useKeyboard();

  useEffect(() => {
    const onCreate = (e: Event) => {
      const {detail} = (e as CustomEvent<{ name: string }>);
      // eslint-disable-next-line no-console
      actions.createBoard(detail.name).catch((err) => console.error(err));
    };
    const onRename = (e: Event) => {
      const {detail} = (e as CustomEvent<{ name: string; mode: string; boardId?: string }>);
      if (detail.mode === "rename" && detail.boardId) {
        // eslint-disable-next-line no-console
        actions.renameBoard(detail.boardId, detail.name).catch((err) => console.error(err));
      }
    };
    const onDelete = (e: Event) => {
      const {detail} = (e as CustomEvent<{ boardId: string }>);
      // eslint-disable-next-line no-console
      actions.deleteBoard(detail.boardId).catch((err) => console.error(err));
    };
    window.addEventListener("board-name-submit", onCreate as EventListener);
    window.addEventListener("board-name-submit", onRename as EventListener);
    window.addEventListener("board-delete-confirm", onDelete as EventListener);
    return () => {
      window.removeEventListener("board-name-submit", onCreate as EventListener);
      window.removeEventListener("board-name-submit", onRename as EventListener);
      window.removeEventListener("board-delete-confirm", onDelete as EventListener);
    };
  }, [actions]);

  const showCanvas = state.boards.length > 0 && state.currentBoardId !== null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen w-screen overflow-hidden select-none font-sans">
      <Toolbar />
      <BoardSidebar />
      {showCanvas ? <Canvas /> : <EmptyState />}
      <ZoomControls />
      <StatsPanel />
      <ShortcutHint />
      <EditModal />
      <HelpModal />
      <BoardNameDialog />
      <BoardDeleteDialog />
    </div>
  );
}

export function App() {
  return (
    <MindProvider>
      <Shell />
    </MindProvider>
  );
}
