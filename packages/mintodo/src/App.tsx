import { useEffect } from "react";
import { BoardDeleteDialog } from "./components/BoardDeleteDialog";
import { BoardNameDialog } from "./components/BoardNameDialog";
import { BoardSidebar } from "./components/BoardSidebar";
import { Canvas } from "./components/Canvas";
import { GanttBoard } from "./components/GanttBoard";
import { KanbanBoard } from "./components/KanbanBoard";
import { TextEditor } from "./components/TextEditor";
import { EditModal } from "./components/EditModal";
import { EmptyState } from "./components/EmptyState";
import { HelpModal } from "./components/HelpModal";
import { StatsPanel } from "./components/StatsPanel";
import { Toolbar } from "./components/Toolbar";
import { ZoomControls } from "./components/ZoomControls";
import { useCenterOnNewNode } from "./hooks/use-center-on-new-node";
import { useKeyboard } from "./hooks/use-keyboard";
import { useBoardActions } from "./hooks/use-board-actions";
import { MindProvider, useMindStore } from "./hooks/use-mind-store";
import { useStorageSync } from "./hooks/use-storage-sync";

function Shell() {
  const { state } = useMindStore();
  const actions = useBoardActions();
  useStorageSync();
  useKeyboard();
  useCenterOnNewNode();

  useEffect(() => {
    const onCreate = (e: Event) => {
      const { detail } = e as CustomEvent<{ name: string }>;
      // eslint-disable-next-line no-console
      actions.createBoard(detail.name).catch((err) => console.error(err));
    };
    const onRename = (e: Event) => {
      const { detail } = e as CustomEvent<{ name: string; mode: string; boardId?: string }>;
      if (detail.mode === "rename" && detail.boardId) {
        // eslint-disable-next-line no-console
        actions.renameBoard(detail.boardId, detail.name).catch((err) => console.error(err));
      }
    };
    const onDelete = (e: Event) => {
      const { detail } = e as CustomEvent<{ boardId: string }>;
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
    <div
      className="flex h-full w-full overflow-hidden select-none"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <BoardSidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Toolbar />
        <div className="flex-1 relative p-4">
          {showCanvas ? (
            state.viewMode === "kanban" ? (
              <KanbanBoard />
            ) : state.viewMode === "gantt" ? (
              <GanttBoard />
            ) : state.viewMode === "text" ? (
              <TextEditor />
            ) : (
              <Canvas />
            )
          ) : (
            <EmptyState />
          )}
          {state.viewMode === "mindmap" && <ZoomControls />}
          {state.viewMode !== "text" && <StatsPanel />}
        </div>
      </div>
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
