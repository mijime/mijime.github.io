import { useCallback, useEffect, useRef, useState } from "react";
import { useDarkMode } from "@mijime/theme/useDarkMode";
import { exportAllFloorsPng } from "../canvas/export";
import { buildShareUrl, decodeFloors, encodeFloors, getShareParam } from "../canvas/share";
import { loadFromFile, loadFromStorage, saveToFile, saveToStorage } from "../storage";
import { createBuilding, reducer } from "../store";
import type { Building, CopiedRegion, ItemType } from "../types";
import { DslPanel } from "./DslPanel";
import type { FloorCanvasHandle } from "./FloorCanvas";
import { FloorCanvas } from "./FloorCanvas";
import { FloorTabs } from "./FloorTabs";
import type { ToolMode } from "./Toolbar";
import { ToolSheet } from "./ToolSheet";

const MAX_HISTORY = 50;
const MERGE_MS = 500;

interface AppState {
  building: Building;
  activeFloorId: string;
}

function init(): AppState {
  const saved = loadFromStorage();
  if (saved) {
    return saved;
  }
  const building = createBuilding();
  return { activeFloorId: building.floors[0].id, building };
}

function initFromUrl(): Promise<AppState | null> {
  const param = getShareParam();
  if (!param) {
    return Promise.resolve(null);
  }
  return decodeFloors(param)
    .then((floors) => {
      if (floors.length === 0) {
        return null;
      }
      const building = { cellSize: 32, floors };
      return { activeFloorId: floors[0].id, building };
    })
    .catch(() => null);
}

export function App() {
  const [history, setHistory] = useState<AppState[]>(() => [init()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    initFromUrl().then((state) => {
      if (state) {
        setHistory([state]);
        setHistoryIndex(0);
      }
    });
  }, []);
  const [tool, setTool] = useState<ToolMode>({
    kind: "wall",
    wallType: "solid",
  });
  const canvasRef = useRef<FloorCanvasHandle>(null);

  const current = history[historyIndex];
  const { building, activeFloorId } = current;

  useEffect(() => {
    const id = setTimeout(() => saveToStorage(building, activeFloorId), 500);
    return () => clearTimeout(id);
  }, [building, activeFloorId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        setHistoryIndex((i) => Math.max(0, i - 1));
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history.length]);

  const lastActionRef = useRef<{
    type: string;
    floorId?: string;
    t: number;
  } | null>(null);

  const push = useCallback(
    (next: AppState) => {
      lastActionRef.current = null;
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        const newHistory = [...truncated, next];
        return newHistory.length > MAX_HISTORY ? newHistory.slice(-MAX_HISTORY) : newHistory;
      });
      setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
    },
    [historyIndex],
  );

  const dispatch = useCallback(
    (action: Parameters<typeof reducer>[1]) => {
      const now = Date.now();
      const last = lastActionRef.current;
      const floorId = "floorId" in action ? action.floorId : undefined;
      const canMerge =
        last !== null &&
        last.type === action.type &&
        last.floorId === floorId &&
        now - last.t < MERGE_MS;

      lastActionRef.current = { floorId, t: now, type: action.type };

      if (canMerge) {
        setHistory((prev) => {
          const cur = prev[historyIndex];
          const next = { ...cur, building: reducer(cur.building, action) };
          const updated = [...prev];
          updated[historyIndex] = next;
          return updated;
        });
      } else {
        setHistory((prev) => {
          const cur = prev[historyIndex];
          const next = { ...cur, building: reducer(cur.building, action) };
          const truncated = prev.slice(0, historyIndex + 1);
          const newHistory = [...truncated, next];
          return newHistory.length > MAX_HISTORY ? newHistory.slice(-MAX_HISTORY) : newHistory;
        });
        setHistoryIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
      }
    },
    [historyIndex],
  );

  const setActiveFloorId = (id: string) => {
    setHistory((prev) => {
      const cur = prev[historyIndex];
      const updated = [...prev];
      updated[historyIndex] = { ...cur, activeFloorId: id };
      return updated;
    });
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleShare = useCallback(() => {
    encodeFloors(building.floors).then((encoded) => {
      const url = buildShareUrl(encoded);
      navigator.clipboard
        .writeText(url)
        .then(() => {
          alert("URLをコピーしました");
        })
        .catch(() => {
          prompt("このURLをコピーしてください", url);
        });
    });
  }, [building.floors]);
  const dark = useDarkMode();

  const floor = building.floors.find((f) => f.id === activeFloorId) ?? building.floors[0];
  const ghostFloors = building.floors.filter((f) => f.id !== activeFloorId);

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--paper)" }}>
      <div className="flex items-center">
        <div className="flex-1">
          <FloorTabs
            floors={building.floors}
            activeFloorId={activeFloorId}
            onSelect={setActiveFloorId}
            onAdd={() => {
              const next = reducer(building, { type: "ADD_FLOOR" });
              push({
                activeFloorId: next.floors.at(-1)!.id,
                building: next,
              });
            }}
            onRename={(id, name) => dispatch({ floorId: id, name, type: "RENAME_FLOOR" })}
            onRemove={(id) => {
              const next = reducer(building, { floorId: id, type: "REMOVE_FLOOR" });
              const activeId = next.floors.some((f) => f.id === id)
                ? activeFloorId
                : next.floors[0].id;
              push({ activeFloorId: activeId, building: next });
            }}
          />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <ToolSheet
          tool={tool}
          onToolChange={setTool}
          darkMode={dark}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => setHistoryIndex((i) => Math.max(0, i - 1))}
          onRedo={() => setHistoryIndex((i) => Math.min(history.length - 1, i + 1))}
          onSave={() => saveToFile(building, activeFloorId)}
          onLoad={() => {
            loadFromFile().then((data) => {
              if (data) {
                push({
                  activeFloorId: data.activeFloorId,
                  building: data.building,
                });
              }
            });
          }}
          onExportAll={() => exportAllFloorsPng(building.floors, building.cellSize)}
          onShare={handleShare}
          onClear={() => dispatch({ floorId: floor.id, type: "CLEAR_FLOOR" })}
          onRotateFloor={() => dispatch({ floorId: floor.id, type: "ROTATE_FLOOR" })}
        />
        <DslPanel
          floor={floor}
          onImportFloor={(imported) => {
            const next = {
              ...building,
              floors: [...building.floors, imported],
            };
            push({ activeFloorId: imported.id, building: next });
          }}
        />
        <div className="flex-1 overflow-hidden relative" style={{ background: "var(--paper)" }}>
          <FloorCanvas
            ref={canvasRef}
            floor={floor}
            ghostFloors={ghostFloors}
            cellSize={building.cellSize}
            darkMode={dark}
            tool={tool}
            onSetWall={(cellIndex, edge) => {
              if (tool.kind !== "wall") {
                return;
              }
              dispatch({
                cellIndex,
                edge,
                floorId: floor.id,
                type: "SET_WALL",
                wallType: tool.wallType,
              });
            }}
            onSetFloorType={(cellIndex, floorType) =>
              dispatch({
                cellIndex,
                floorId: floor.id,
                floorType,
                type: "SET_FLOOR_TYPE",
              })
            }
            onFillRoom={(cellIndex) => {
              if (tool.kind !== "floor" || tool.floorType === null) return;
              dispatch({
                cellIndex,
                floorId: floor.id,
                floorType: tool.floorType,
                type: "FILL_ROOM",
              });
            }}
            onPlaceItem={(cellIndex) => {
              if (tool.kind !== "item") {
                return;
              }
              dispatch({
                cellIndex,
                floorId: floor.id,
                item: {
                  rotation: 0,
                  type: (tool as { kind: "item"; itemType: ItemType }).itemType,
                },
                type: "PLACE_ITEM",
              });
            }}
            onRotateItem={(cellIndex) =>
              dispatch({ cellIndex, floorId: floor.id, type: "ROTATE_ITEM" })
            }
            onMoveItem={(fromIndex, toIndex) =>
              dispatch({
                floorId: floor.id,
                fromIndex,
                toIndex,
                type: "MOVE_ITEM",
              })
            }
            onPasteRegion={(originIndex: number, region: CopiedRegion) =>
              dispatch({
                floorId: floor.id,
                originIndex,
                region,
                type: "PASTE_REGION",
              })
            }
            onEraseRegion={(x1, y1, x2, y2) =>
              dispatch({
                floorId: floor.id,
                type: "ERASE_REGION",
                x1,
                x2,
                y1,
                y2,
              })
            }
            onEraseCell={(cellIndex) =>
              dispatch({ cellIndex, floorId: floor.id, type: "ERASE_CELL" })
            }
            onDeleteItem={(cellIndex) =>
              dispatch({ cellIndex, floorId: floor.id, type: "ERASE_CELL" })
            }
          />
        </div>
      </div>
    </div>
  );
}
