import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useDarkMode } from "@mijime/theme/useDarkMode";
import { computeFloorScores, exportAllFloorsPng } from "../draw/export";
import { buildShareUrl, encodeFloors, mergeFloors } from "../floor/share";
import {
  createPlan,
  deletePlan,
  getActivePlanId,
  listPlans,
  loadFromFile,
  migrateFromLegacy,
  putPlan,
  replaceAllPlans,
  saveToFile,
  setActivePlanId,
} from "../storage";
import { reducer } from "../store";
import type { CopiedRegion, EdgeRef, ItemType, Plan } from "../types";
import { useAppInit } from "../hooks/use-app-init";
import { useHistory } from "../hooks/use-history";
import { DslPanel } from "./dsl-panel";
import type { FloorCanvasHandle } from "./floor-canvas";
import { FloorCanvas } from "./floor-canvas";
import { FloorTabs } from "./floor-tabs";
import { PlanTabs } from "./plan-tabs";
import type { ToolMode } from "./tool-mode";
import { FLOOR_TYPES, floorTypeToSwatchStyle } from "./tool-mode";
import { ToolSheet } from "./tool-sheet";
import type { FloorPlan } from "../types";

const Preview3D = lazy(() => import("./preview-3d"));

function FloorStats({ floor }: { floor: FloorPlan }) {
  const { storage, windows } = computeFloorScores(floor);

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border)",
        color: "var(--ink)",
        display: "flex",
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "11px",
        gap: "16px",
        opacity: 0.7,
        padding: "4px 10px",
      }}
    >
      <span>収納: {storage}</span>
      <span>窓: {windows}</span>
    </div>
  );
}

export function App() {
  const { canRedo, canUndo, current, dispatch, push, redo, reset, setActiveFloorId, undo } =
    useHistory({
      activeFloorId: "",
      building: { cellSize: 32, floors: [] },
    });

  useAppInit(push);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [tool, setTool] = useState<ToolMode>({ kind: "select" });
  const canvasRef = useRef<FloorCanvasHandle>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [roomPicker, setRoomPicker] = useState<{ cellIndex: number; x: number; y: number } | null>(
    null,
  );

  const { building, activeFloorId } = current;

  // Load the plan collection from IndexedDB (with legacy migration) and bootstrap the active plan.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateFromLegacy();
      let list = await listPlans();
      let activeId = await getActivePlanId();
      if (list.length === 0) {
        const plan = createPlan("プラン1");
        await Promise.all([putPlan(plan), setActivePlanId(plan.id)]);
        list = [plan];
        activeId = plan.id;
      } else if (!activeId || !list.some((p) => p.id === activeId)) {
        activeId = list[0].id;
        await setActivePlanId(activeId);
      }
      if (cancelled) {
        return;
      }
      const target = list.find((p) => p.id === activeId)!;
      reset({ activeFloorId: target.activeFloorId, building: target.building });
      setPlans(list);
      setActivePlanIdState(activeId);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  // Keep the edited building in sync with the active plan so switching preserves edits.
  useEffect(() => {
    if (!ready || !activePlanId) {
      return;
    }
    setPlans((prev) =>
      prev.some((p) => p.id === activePlanId)
        ? prev.map((p) =>
            p.id === activePlanId ? { ...p, activeFloorId, building, updatedAt: Date.now() } : p,
          )
        : prev,
    );
  }, [activeFloorId, activePlanId, building, ready]);

  // Debounced persistence of just the active plan + active plan id.
  useEffect(() => {
    if (!ready || !activePlanId) {
      return;
    }
    const activePlan = plans.find((p) => p.id === activePlanId);
    if (!activePlan) {
      return;
    }
    const id = setTimeout(() => {
      putPlan(activePlan).catch(() => undefined);
      setActivePlanId(activePlanId).catch(() => undefined);
    }, 500);
    return () => clearTimeout(id);
  }, [activePlanId, plans, ready]);

  // Flush the current active plan immediately when leaving it, so a quick switch
  // Doesn't drop the debounced save for the plan we're abandoning.
  const flushActive = useCallback(() => {
    const id = activePlanId;
    if (!id) {
      return;
    }
    const plan = plans.find((p) => p.id === id);
    if (!plan) {
      return;
    }
    putPlan(plan).catch(() => undefined);
    setActivePlanId(id).catch(() => undefined);
  }, [activePlanId, plans]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const switchPlan = useCallback(
    (id: string) => {
      const plan = plans.find((p) => p.id === id);
      if (!plan || id === activePlanId) {
        return;
      }
      flushActive();
      reset({ activeFloorId: plan.activeFloorId, building: plan.building });
      setActivePlanIdState(id);
    },
    [activePlanId, flushActive, plans, reset],
  );

  const handleAddPlan = useCallback(() => {
    const used = new Set(plans.map((p) => p.name));
    let n = 1;
    while (used.has(`プラン${n}`)) {
      n += 1;
    }
    const plan = createPlan(`プラン${n}`);
    flushActive();
    setPlans((prev) => [...prev, plan]);
    reset({ activeFloorId: plan.activeFloorId, building: plan.building });
    setActivePlanIdState(plan.id);
  }, [flushActive, plans, reset]);

  const handleRenamePlan = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
  }, []);

  const handleRemovePlan = useCallback(
    (id: string) => {
      const next = plans.filter((p) => p.id !== id);
      if (next.length === 0) {
        const plan = createPlan("プラン1");
        reset({ activeFloorId: plan.activeFloorId, building: plan.building });
        setPlans([plan]);
        setActivePlanIdState(plan.id);
      } else {
        setPlans(next);
        if (id === activePlanId) {
          const target = next[0];
          reset({ activeFloorId: target.activeFloorId, building: target.building });
          setActivePlanIdState(target.id);
        }
      }
      deletePlan(id).catch(() => undefined);
    },
    [activePlanId, plans, reset],
  );

  const handleShare = useCallback(() => {
    encodeFloors(building.floors).then((encoded) => {
      const url = buildShareUrl(encoded);
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setToast("URLをコピーしました");
        })
        .catch(() => {
          setFallbackUrl(url);
        });
    });
  }, [building.floors]);
  const dark = useDarkMode();

  const floor = building.floors.find((f) => f.id === activeFloorId) ?? building.floors[0];
  const ghostFloors = building.floors.filter((f) => f.id !== activeFloorId);

  if (!ready || !activePlanId || plans.length === 0) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--paper)" }}
      >
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "13px" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--paper)" }}>
      <PlanTabs
        plans={plans}
        activePlanId={activePlanId}
        onSelect={switchPlan}
        onAdd={handleAddPlan}
        onRename={handleRenamePlan}
        onRemove={handleRemovePlan}
      />
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
          onUndo={undo}
          onRedo={redo}
          onFitView={() => canvasRef.current?.fitToContainer()}
          onSave={() => saveToFile(plans, activePlanId)}
          onLoad={() => {
            loadFromFile().then((data) => {
              if (!data) {
                return;
              }
              let activeId = data.activePlanId;
              if (!data.plans.some((p) => p.id === activeId)) {
                activeId = data.plans[0]?.id;
              }
              if (!activeId) {
                return;
              }
              const target = data.plans.find((p) => p.id === activeId)!;
              reset({ activeFloorId: target.activeFloorId, building: target.building });
              setPlans(data.plans);
              setActivePlanIdState(activeId);
              replaceAllPlans(data.plans).catch(() => undefined);
              setActivePlanId(activeId).catch(() => undefined);
              setToast("読み込みました");
            });
          }}
          onExportAll={() => exportAllFloorsPng(building.floors, building.cellSize)}
          onShare={handleShare}
          onClear={() => dispatch({ floorId: floor.id, type: "CLEAR_FLOOR" })}
          onRotateFloor={() => dispatch({ floorId: floor.id, type: "ROTATE_FLOOR" })}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((v) => (v === "2d" ? "3d" : "2d"))}
        />
        <DslPanel
          floors={building.floors}
          onApplyFloors={(parsed) => {
            push({
              activeFloorId,
              building: { ...building, floors: mergeFloors(building.floors, parsed) },
            });
          }}
        />
        <div
          className="flex-1 overflow-hidden relative flex flex-col"
          style={{ background: "var(--paper)" }}
        >
          <FloorStats floor={floor} />
          <div className="flex-1 overflow-hidden relative">
            {viewMode === "2d" ? (
              <FloorCanvas
                ref={canvasRef}
                floor={floor}
                ghostFloors={ghostFloors}
                cellSize={building.cellSize}
                darkMode={dark}
                tool={tool}
                onSetWalls={(edges: EdgeRef[], wallType) => {
                  dispatch({
                    edges,
                    floorId: floor.id,
                    type: "SET_WALLS",
                    wallType,
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
                  if (tool.kind !== "floor" || tool.floorType === null) {
                    return;
                  }
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
                onLongPressRoom={(cellIndex, clientX, clientY) =>
                  setRoomPicker({ cellIndex, x: clientX, y: clientY })
                }
                onUndo={undo}
              />
            ) : (
              <Suspense
                fallback={
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      height: "100%",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "13px" }}>
                      Loading 3D…
                    </span>
                  </div>
                }
              >
                <Preview3D floor={floor} cellSize={building.cellSize} darkMode={dark} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
      {roomPicker && (
        <div
          style={{
            bottom: 0,
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 60,
          }}
          onClick={() => setRoomPicker(null)}
        >
          <div
            style={{
              background: "var(--toolbar)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              left: Math.min(roomPicker.x, window.innerWidth - 200),
              padding: "8px",
              position: "absolute",
              top: Math.min(roomPicker.y, window.innerHeight - 300),
              width: "180px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {FLOOR_TYPES.map((entry) => (
              <button
                key={entry.label}
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--ink)",
                  cursor: "pointer",
                  display: "flex",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "13px",
                  gap: "8px",
                  padding: "8px 10px",
                  width: "100%",
                }}
                onClick={() => {
                  if (entry.type === null) {
                    dispatch({
                      cellIndex: roomPicker.cellIndex,
                      floorId: floor.id,
                      floorType: null,
                      type: "SET_FLOOR_TYPE",
                    });
                  } else {
                    dispatch({
                      cellIndex: roomPicker.cellIndex,
                      floorId: floor.id,
                      floorType: entry.type,
                      type: "FILL_ROOM",
                    });
                  }
                  setRoomPicker(null);
                }}
              >
                <span
                  style={{
                    ...floorTypeToSwatchStyle(entry.type, dark),
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    flexShrink: 0,
                    height: "14px",
                    width: "14px",
                  }}
                />
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {toast && (
        <div
          style={{
            background: "var(--ink)",
            borderRadius: "8px",
            bottom: "32px",
            color: "var(--paper)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "13px",
            left: "50%",
            padding: "8px 18px",
            position: "fixed",
            transform: "translateX(-50%)",
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
      {fallbackUrl && (
        <div
          style={{
            alignItems: "center",
            background: "rgba(0,0,0,0.4)",
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 100,
          }}
          onClick={() => setFallbackUrl(null)}
        >
          <div
            style={{
              background: "var(--paper)",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "90vw",
              padding: "20px",
              width: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "13px" }}>
              このURLをコピーしてください
            </div>
            <input
              readOnly
              value={fallbackUrl}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "4px",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                padding: "6px 8px",
                width: "100%",
              }}
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => setFallbackUrl(null)}
              style={{
                background: "var(--ink)",
                border: "none",
                borderRadius: "4px",
                color: "var(--paper)",
                cursor: "pointer",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
                padding: "6px 0",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
