import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useDarkMode } from "@mijime/theme/useDarkMode";
import { computeFloorScores, exportAllFloorsPng } from "../draw/export";
import {
  buildShareUrl,
  decodeFloors,
  encodeFloors,
  getShareParam,
  mergeFloors,
} from "../floor/share";
import {
  createPlan,
  deletePlan,
  getActivePlanId,
  listPlans,
  loadFromFile,
  migrateFromLegacy,
  putPlan,
  replaceAllPlans,
  resetDatabase,
  saveToFile,
  setActivePlanId,
} from "../storage";
import { installLogHandlers, logError, logInfo } from "../log";
import { v4 as uuidv4 } from "uuid";
import { reducer } from "../store";
import { detectRooms, ROOM_NAME_PRESETS } from "../floor/room-detection";
import { arrayIndex } from "../floor/frame";
import type { CopiedRegion, EdgeRef, ItemType, Plan } from "../types";
import { useHistory } from "../hooks/use-history";
import { DslPanel } from "./dsl-panel";
import type { FloorCanvasHandle } from "./floor-canvas";
import { FloorCanvas } from "./floor-canvas";
import { FloorTabs } from "./floor-tabs";
import { PlanTabs } from "./plan-tabs";
import type { BrushSize, ToolMode } from "./tool-mode";
import { FLOOR_TYPES, floorTypeToSwatchStyle } from "./tool-mode";
import type { CameraMode } from "./preview-3d/config";
import { LogPanel } from "./log-panel";
import { ToolSheet } from "./tool-sheet";
import type { FloorPlan } from "../types";
import { ShearDiagnostic } from "./shear-diagnostic";
import { ALL_SHEAR_LAYERS, type ShearLayerFlags } from "../draw/draw-shear-check";

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

  // Surface unexpected runtime errors in the log + toast so a blank screen never stays silent.
  useEffect(() => {
    installLogHandlers();
    const onError = (e: ErrorEvent) => {
      const msg = e.message.slice(0, 200);
      logError(msg);
      setToast(`エラー: ${msg.slice(0, 120)}`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason ?? "unhandled rejection").slice(0, 200);
      logError(msg);
      setToast(`エラー: ${msg.slice(0, 120)}`);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  // 3Dは俯瞰(OrbitControls)のみ。歩くモードUIは一時的に削除(コードは残す)
  const cameraMode: CameraMode = "orbit";
  // ウォーキングの移動入力(仮想ジョイスティックとキーの合成先)。UI削除により未使用だが
  // Preview3D が必須で受けるためダミーで保持(後日歩く機能を戻す時のため)
  const moveRef = useRef({ x: 0, z: 0 });
  const [tool, setTool] = useState<ToolMode>({ kind: "select" });
  const canvasRef = useRef<FloorCanvasHandle>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [dslOpen, setDslOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [roomPicker, setRoomPicker] = useState<{
    cx: number;
    cy: number;
    x: number;
    y: number;
  } | null>(null);
  const [shearCheck, setShearCheck] = useState(false);
  const [shearLayers, setShearLayers] = useState<ShearLayerFlags>(ALL_SHEAR_LAYERS);
  const [exportShear, setExportShear] = useState(false);
  // 描画ブラシ(一間/1/2)は全体で共有。PNG書き出しのグリッドも同じ値に従う。
  const [brush, setBrush] = useState<BrushSize>(2);
  const [centerNonce, setCenterNonce] = useState(0);

  const { building, activeFloorId } = current;

  // Boot: URL share (?d=) takes precedence and is imported as a new plan;
  // Otherwise load the plan collection from IndexedDB (with legacy migration).
  // Any failure (corrupt DB, bad rows) falls back to a fresh plan so the app always boots.
  // ?reset=1 forces a full local-database reset (recovery from data that renders blank).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        logInfo("起動: 保存データを読み込みます");
        if (new URLSearchParams(window.location.search).get("reset") === "1") {
          await resetDatabase();
          window.history.replaceState(null, "", window.location.pathname);
          if (!cancelled) {
            setToast("保存データをリセットしました");
          }
        }
        const shareParam = getShareParam();
        await migrateFromLegacy();
        let list = await listPlans();
        if (shareParam) {
          const floors = await decodeFloors(shareParam);
          if (floors.length === 0) {
            throw new Error("共有データが空です");
          }
          window.history.replaceState(null, "", window.location.pathname);
          const used = new Set(list.map((p) => p.name));
          let name = "共有プラン";
          for (let n = 2; used.has(name); n++) {
            name = `共有プラン${n}`;
          }
          const plan: Plan = {
            activeFloorId: floors[0].id,
            building: { cellSize: 32, floors },
            id: uuidv4(),
            name,
            updatedAt: Date.now(),
          };
          await Promise.all([putPlan(plan), setActivePlanId(plan.id)]);
          list = [plan, ...list];
          if (!cancelled) {
            reset({ activeFloorId: plan.activeFloorId, building: plan.building });
            setPlans(list);
            setActivePlanIdState(plan.id);
            setReady(true);
            logInfo(`共有プランを取り込みました: ${name}`);
            setToast("共有プランを取り込みました");
          }
          return;
        }
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
        reset({
          activeFloorId: target.activeFloorId,
          building: target.building,
        });
        setPlans(list);
        setActivePlanIdState(activeId);
        logInfo(`起動完了: プラン${list.length}件`);
      } catch {
        if (cancelled) {
          return;
        }
        const plan = createPlan("プラン1");
        reset({ activeFloorId: plan.activeFloorId, building: plan.building });
        setPlans([plan]);
        setActivePlanIdState(plan.id);
        logError("起動失敗: 保存データを初期化しました");
        setToast("保存データが壊れていたため初期化しました");
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
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
    encodeFloors(building.floors).then(
      (encoded) => {
        const url = buildShareUrl(encoded);
        // Navigator.clipboard requires a secure context (missing on plain-http hosts).
        if (!navigator.clipboard?.writeText) {
          setFallbackUrl(url);
          return;
        }
        navigator.clipboard.writeText(url).then(
          () => {
            logInfo("共有URLをコピーしました");
            setToast("URLをコピーしました");
          },
          () => {
            setFallbackUrl(url);
          },
        );
      },
      (e) => {
        logError(`共有URLの生成に失敗: ${String(e).slice(0, 200)}`);
        setToast("共有URLの生成に失敗しました");
      },
    );
  }, [building.floors]);
  const dark = useDarkMode();

  const floor = building.floors.find((f) => f.id === activeFloorId) ?? building.floors[0];
  const ghostFloors = building.floors.filter((f) => f.id !== activeFloorId);
  // 3Dは「選択中の階まで」を縦に表示(それより上の階は視界を遮らないよう非表示)
  const visibleFloors =
    activeFloorId === ""
      ? [floor]
      : building.floors.slice(0, building.floors.findIndex((f) => f.id === activeFloorId) + 1);

  const pickerRoom = roomPicker
    ? (() => {
        const idx = arrayIndex(floor, roomPicker.cx, roomPicker.cy);
        return idx === null
          ? null
          : (detectRooms(floor).find((r) => r.cells.includes(idx)) ?? null);
      })()
    : null;
  const pickerRoomName = pickerRoom ? (floor.cells[pickerRoom.cells[0]]?.roomName ?? "") : "";

  const applyRoomName = (name: string) => {
    if (!roomPicker) {
      return;
    }
    dispatch({
      floorId: floor.id,
      roomName: name,
      type: "SET_ROOM_NAME",
      x: roomPicker.cx,
      y: roomPicker.cy,
    });
    setCustomRoomName("");
    setRoomPicker(null);
  };

  const clearRoomName = () => {
    if (!roomPicker) {
      return;
    }
    dispatch({
      floorId: floor.id,
      roomName: null,
      type: "SET_ROOM_NAME",
      x: roomPicker.cx,
      y: roomPicker.cy,
    });
    setCustomRoomName("");
    setRoomPicker(null);
  };

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
        <div className="flex-1 min-w-0">
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
              reset({
                activeFloorId: target.activeFloorId,
                building: target.building,
              });
              setPlans(data.plans);
              setActivePlanIdState(activeId);
              replaceAllPlans(data.plans).catch(() => undefined);
              setActivePlanId(activeId).catch(() => undefined);
              setToast("読み込みました");
            });
          }}
          onExportAll={() =>
            exportAllFloorsPng(building.floors, building.cellSize, exportShear, shearLayers, brush)
          }
          onShare={handleShare}
          onClear={() => dispatch({ floorId: floor.id, type: "CLEAR_FLOOR" })}
          onRotateFloor={() => {
            dispatch({ floorId: floor.id, type: "ROTATE_FLOOR" });
            setCenterNonce((n) => n + 1);
          }}
          onFlipFloor={(axis) => {
            dispatch({ axis, floorId: floor.id, type: "FLIP_FLOOR" });
            setCenterNonce((n) => n + 1);
          }}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((v) => (v === "2d" ? "3d" : "2d"))}
          shearCheck={shearCheck}
          onToggleShear={() => setShearCheck((s) => !s)}
          onOpenDsl={() => setDslOpen(true)}
          onOpenLog={() => setLogOpen(true)}
          brush={brush}
          onBrushChange={(next) => {
            setBrush(next);
            setTool((t) =>
              t.kind === "wall" || t.kind === "floor" || t.kind === "erase"
                ? { ...t, brush: next }
                : t,
            );
          }}
        />
        <DslPanel
          key={activePlanId}
          floors={building.floors}
          onApplyFloors={(parsed) => {
            push({
              activeFloorId,
              building: { ...building, floors: mergeFloors(building.floors, parsed) },
            });
          }}
          open={dslOpen}
          onToggle={() => setDslOpen((o) => !o)}
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
                brush={brush}
                shearCheck={shearCheck}
                floors={building.floors}
                shearLayers={shearLayers}
                onSetWalls={(edges: EdgeRef[], wallType) => {
                  dispatch({
                    edges,
                    floorId: floor.id,
                    type: "SET_WALLS",
                    wallType,
                  });
                }}
                onSetFloorType={(x, y, floorType) =>
                  dispatch({
                    floorId: floor.id,
                    floorType,
                    type: "SET_FLOOR_TYPE",
                    x,
                    y,
                  })
                }
                onFillRoom={(x, y) => {
                  if (tool.kind !== "floor" || tool.floorType === null) {
                    return;
                  }
                  dispatch({
                    floorId: floor.id,
                    floorType: tool.floorType,
                    type: "FILL_ROOM",
                    x,
                    y,
                  });
                }}
                onPlaceItem={(x, y) => {
                  if (tool.kind !== "item") {
                    return;
                  }
                  dispatch({
                    floorId: floor.id,
                    item: {
                      rotation: 0,
                      type: (tool as { kind: "item"; itemType: ItemType }).itemType,
                    },
                    type: "PLACE_ITEM",
                    x,
                    y,
                  });
                }}
                onRotateItem={(x, y) => dispatch({ floorId: floor.id, type: "ROTATE_ITEM", x, y })}
                onMoveItem={(fromX, fromY, toX, toY) =>
                  dispatch({
                    floorId: floor.id,
                    fromX,
                    fromY,
                    toX,
                    toY,
                    type: "MOVE_ITEM",
                  })
                }
                onPasteRegion={(x: number, y: number, region: CopiedRegion) =>
                  dispatch({
                    floorId: floor.id,
                    region,
                    type: "PASTE_REGION",
                    x,
                    y,
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
                onEraseCell={(x, y) => dispatch({ floorId: floor.id, type: "ERASE_CELL", x, y })}
                onLongPressRoom={(cx, cy, clientX, clientY) => {
                  const idx = arrayIndex(floor, cx, cy);
                  const room =
                    idx === null ? null : detectRooms(floor).find((r) => r.cells.includes(idx));
                  const currentName =
                    room?.cells[0] === undefined ? "" : (floor.cells[room.cells[0]].roomName ?? "");
                  setCustomRoomName(currentName);
                  setRoomPicker({ cx, cy, x: clientX, y: clientY });
                }}
                onCommit={() => dispatch({ floorId: floor.id, type: "NORMALIZE_FLOOR" })}
                centerNonce={centerNonce}
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
                <Preview3D
                  floors={visibleFloors}
                  cameraMode={cameraMode}
                  move={moveRef}
                  cellSize={building.cellSize}
                  darkMode={dark}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
      {logOpen && (
        <div
          className="max-h-[calc(100vh-90px)] overflow-y-auto"
          style={{ position: "fixed", left: "270px", top: "80px", zIndex: 55 }}
        >
          <LogPanel onClose={() => setLogOpen(false)} />
        </div>
      )}
      {shearCheck && (
        <div
          className="max-h-[calc(100vh-90px)] overflow-y-auto"
          style={{ position: "fixed", right: "8px", top: "80px", zIndex: 55 }}
        >
          <ShearDiagnostic
            floor={floor}
            floors={building.floors}
            layers={shearLayers}
            onToggleLayer={(key) => setShearLayers((s) => ({ ...s, [key]: !s[key] }))}
            exportShear={exportShear}
            onToggleExportShear={() => setExportShear((s) => !s)}
            onAddWalls={(edges) =>
              dispatch({ edges, floorId: floor.id, type: "SET_WALLS", wallType: "solid" })
            }
            onClose={() => setShearCheck(false)}
          />
        </div>
      )}
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
              left: Math.min(roomPicker.x, window.innerWidth - 210),
              maxHeight: "min(70vh, 480px)",
              overflowY: "auto",
              padding: "8px",
              position: "absolute",
              top: Math.min(roomPicker.y, window.innerHeight - 360),
              width: "200px",
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
                      floorId: floor.id,
                      floorType: null,
                      type: "SET_FLOOR_TYPE",
                      x: roomPicker.cx,
                      y: roomPicker.cy,
                    });
                  } else {
                    dispatch({
                      floorId: floor.id,
                      floorType: entry.type,
                      type: "FILL_ROOM",
                      x: roomPicker.cx,
                      y: roomPicker.cy,
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
            <div
              style={{
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "2px",
                paddingTop: "6px",
              }}
            >
              <div
                style={{
                  color: "var(--mid)",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                }}
              >
                部屋名{pickerRoomName ? `: ${pickerRoomName}` : ""}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <input
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customRoomName.trim()) {
                      applyRoomName(customRoomName.trim());
                    }
                  }}
                  placeholder="名前を入力"
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    color: "var(--ink)",
                    flex: 1,
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "11px",
                    minWidth: 0,
                    padding: "4px 6px",
                  }}
                />
                <button
                  onClick={() => customRoomName.trim() && applyRoomName(customRoomName.trim())}
                  style={{
                    background: pickerRoomName ? "var(--ink)" : "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    color: pickerRoomName ? "var(--paper)" : "var(--ink)",
                    cursor: "pointer",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "11px",
                    padding: "4px 8px",
                  }}
                >
                  適用
                </button>
                {pickerRoomName && (
                  <button
                    onClick={clearRoomName}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      color: "var(--terra)",
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: "11px",
                    }}
                  >
                    解除
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {ROOM_NAME_PRESETS.map((name) => (
                  <button
                    key={name}
                    onClick={() => applyRoomName(name)}
                    style={{
                      background: pickerRoomName === name ? "var(--ink)" : "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      color: pickerRoomName === name ? "var(--paper)" : "var(--ink)",
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: "11px",
                      padding: "4px 8px",
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
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
