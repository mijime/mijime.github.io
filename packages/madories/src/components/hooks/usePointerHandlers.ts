import { useEffect, useRef } from "react";
import { GestureHandler } from "../../input/gestureHandler";
import { copyRegion, normalizeSelection, pasteOriginIndex } from "../../floor/clipboardLogic";
import { resolveWallSegments } from "../../input/wallLogic";
import { resolveItemAction } from "../../input/itemLogic";
import type { CopiedRegion, FloorPlan, FloorType, WallType } from "../../types";
import type { ToolMode } from "../toolMode";
import type { SelectionRef, ViewRef } from "./types";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  floor: FloorPlan;
  cellSize: number;
  tool: ToolMode;
  viewRef: ViewRef;
  selectionRef: SelectionRef;
  onSetWall: (cellIndex: number, edge: "top" | "left", wallType: WallType) => void;
  onSetFloorType: (cellIndex: number, floorType: FloorType | null) => void;
  onFillRoom: (cellIndex: number) => void;
  onPlaceItem: (cellIndex: number) => void;
  onRotateItem: (cellIndex: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPasteRegion: (originIndex: number, region: CopiedRegion) => void;
  onEraseRegion: (x1: number, y1: number, x2: number, y2: number) => void;
  onEraseCell: (cellIndex: number) => void;
  onLongPressRoom?: (cellIndex: number, clientX: number, clientY: number) => void;
  onUndo?: () => void;
  redraw: (ghost?: { mx: number; my: number; fromIdx: number }) => void;
  setSelectedItemCell: (idx: number | null) => void;
  selectedItemCell: number | null;
  onSelectionChange?: (sel: { x1: number; y1: number; x2: number; y2: number } | null) => void;
}

export function usePointerHandlers(props: Props): {
  handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  copySelection: () => void;
  pasteSelection: () => void;
  deleteSelection: () => void;
} {
  const {
    canvasRef,
    floor,
    cellSize,
    tool,
    viewRef,
    selectionRef,
    onSetWall,
    onSetFloorType,
    onFillRoom,
    onPlaceItem,
    onRotateItem,
    onMoveItem,
    onEraseCell,
    redraw,
    setSelectedItemCell,
    onSelectionChange,
  } = props;

  const onUndoRef = useRef(props.onUndo);
  onUndoRef.current = props.onUndo;
  const onLongPressRoomRef = useRef(props.onLongPressRoom);
  onLongPressRoomRef.current = props.onLongPressRoom;

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const floorRef = useRef(floor);
  floorRef.current = floor;

  const lastWallHitRef = useRef<string | null>(null);
  const wallDragStartPos = useRef<{ mx: number; my: number } | null>(null);
  const wallDragEdgeLock = useRef<"top" | "left" | null>(null);
  const wallDragLastPos = useRef<{ mx: number; my: number } | null>(null);
  const wallStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const copiedRef = useRef<CopiedRegion | null>(null);
  const mousePosRef = useRef<{ mx: number; my: number } | null>(null);
  const activePointerCountRef = useRef(0);
  const gestureRef = useRef<GestureHandler | null>(null);
  const onPasteRegionRef = useRef(props.onPasteRegion);
  onPasteRegionRef.current = props.onPasteRegion;
  const onEraseRegionRef = useRef(props.onEraseRegion);
  onEraseRegionRef.current = props.onEraseRegion;

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressDownClientRef = useRef<{ x: number; y: number } | null>(null);
  const twoFingerDownTimeRef = useRef<number | null>(null);
  const twoFingerDownClientRef = useRef<{ x: number; y: number } | null>(null);
  const twoFingerMovedRef = useRef(false);

  useEffect(() => {
    setSelectedItemCell(null);
    gestureRef.current = new GestureHandler({
      onPan: (dx, dy) => {
        viewRef.current.offsetX += dx;
        viewRef.current.offsetY += dy;
        setSelectedItemCell(null);
        redraw();
      },
      onPinch: (scale, cx, cy) => {
        const v = viewRef.current;
        const newScale = Math.max(0.25, Math.min(8, v.scale * scale));
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) {
          return;
        }
        const px = cx - rect.left;
        const py = cy - rect.top;
        v.offsetX = px - (px - v.offsetX) * (newScale / v.scale);
        v.offsetY = py - (py - v.offsetY) * (newScale / v.scale);
        v.scale = newScale;
        setSelectedItemCell(null);
        redraw();
      },
    });
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redraw, setSelectedItemCell]);

  useEffect(() => {
    if (tool.kind !== "select") {
      selectionRef.current = null;
      onSelectionChangeRef.current?.(null);
      redraw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.kind, redraw, selectionRef]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (tool.kind !== "select") {
        return;
      }
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === "c") {
        const sel = selectionRef.current;
        if (!sel) {
          return;
        }
        const result = copyRegion(floorRef.current, sel);
        if (result) {
          copiedRef.current = result;
        }
      }

      if (isCtrl && e.key === "v") {
        if (!copiedRef.current || !mousePosRef.current) {
          return;
        }
        const originIndex = pasteOriginIndex(mousePosRef.current, cellSize, floorRef.current);
        onPasteRegionRef.current(originIndex, copiedRef.current);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = selectionRef.current;
        if (!sel) {
          return;
        }
        e.preventDefault();
        const { x1, y1, x2, y2 } = normalizeSelection(sel);
        onEraseRegionRef.current(x1, y1, x2, y2);
        selectionRef.current = null;
        onSelectionChangeRef.current?.(null);
        redraw();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.kind, cellSize, selectionRef.current, selectionRef, redraw]);

  useEffect(
    () => () => {
      if (wallStopTimerRef.current) {
        clearTimeout(wallStopTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    },
    [],
  );

  function getCanvasPos(clientX: number, clientY: number): { mx: number; my: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    const { offsetX, offsetY, scale } = viewRef.current;
    return {
      mx: (clientX - (rect?.left ?? 0) - offsetX) / scale,
      my: (clientY - (rect?.top ?? 0) - offsetY) / scale,
    };
  }

  function setCursor(cursor: string) {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }
  }

  function getCellAtMouse(mx: number, my: number): number | null {
    const cx = Math.floor(mx / cellSize);
    const cy = Math.floor(my / cellSize);
    const idx = cy * floor.width + cx;
    return idx >= 0 && idx < floor.cells.length ? idx : null;
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const { mx, my } = getCanvasPos(e.clientX, e.clientY);
    const idx = getCellAtMouse(mx, my);
    if (idx === null) {
      return;
    }
    if (!floor.cells[idx].item) {
      return;
    }
    if (tool.kind !== "erase" && tool.kind !== "item") {
      return;
    }
    onRotateItem(idx);
  }

  function applyWallSegment(hit: { cx: number; cy: number; edge: "top" | "left" }, wallType: WallType) {
    const idx = hit.cy * floor.width + hit.cx;
    if (idx < 0 || idx >= floor.cells.length) {
      return;
    }
    const key = `${idx}:${hit.edge}`;
    if (key === lastWallHitRef.current) {
      return;
    }
    lastWallHitRef.current = key;
    onSetWall(idx, hit.edge, wallType);
  }

  function applyWallHit(mx: number, my: number, wallType: WallType) {
    const segments = resolveWallSegments(
      mx,
      my,
      cellSize,
      wallDragEdgeLock.current,
      wallDragStartPos.current,
      wallDragLastPos.current,
    );
    for (const seg of segments) {
      applyWallSegment(seg, wallType);
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerCountRef.current += 1;
    gestureRef.current?.onPointerDown({
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
    });
    if (activePointerCountRef.current >= 2) {
      // Cancel single-finger actions on second touch (enables pinch)
      wallDragStartPos.current = null;
      wallDragLastPos.current = null;
      wallDragEdgeLock.current = null;
      dragStartRef.current = null;
      selectionStartRef.current = null;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (activePointerCountRef.current === 2) {
        twoFingerDownTimeRef.current = Date.now();
        twoFingerDownClientRef.current = { x: e.clientX, y: e.clientY };
        twoFingerMovedRef.current = false;
      }
      return;
    }

    const { mx, my } = getCanvasPos(e.clientX, e.clientY);

    if (tool.kind === "select") {
      const idx = getCellAtMouse(mx, my);
      if (idx !== null && floor.cells[idx].item) {
        dragStartRef.current = idx;
        dragMovedRef.current = false;
      } else {
        const cx = Math.floor(mx / cellSize);
        const cy = Math.floor(my / cellSize);
        selectionStartRef.current = { x: cx, y: cy };
        selectionRef.current = { x1: cx, x2: cx, y1: cy, y2: cy };
        redraw();
      }
      return;
    }

    if (tool.kind === "wall") {
      lastWallHitRef.current = null;
      wallDragStartPos.current = { mx, my };
      wallDragLastPos.current = { mx, my };
      wallDragEdgeLock.current = null;
      startLongPress(e.clientX, e.clientY);
      return;
    }

    if (tool.kind === "floor") {
      dragStartRef.current = getCellAtMouse(mx, my);
      dragMovedRef.current = false;
      startLongPress(e.clientX, e.clientY);
      return;
    }

    if (tool.kind === "erase") {
      dragStartRef.current = getCellAtMouse(mx, my);
      dragMovedRef.current = false;
      startLongPress(e.clientX, e.clientY);
      return;
    }

    if (tool.kind !== "item") {
      return;
    }
    const idx = getCellAtMouse(mx, my);
    if (idx === null) {
      return;
    }
    dragStartRef.current = idx;
    dragMovedRef.current = false;
    startLongPress(e.clientX, e.clientY);
  }

  function startLongPress(clientX: number, clientY: number) {
    longPressDownClientRef.current = { x: clientX, y: clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      const pos = longPressDownClientRef.current;
      if (!pos) {return;}
      const { mx: lmx, my: lmy } = getCanvasPos(pos.x, pos.y);
      const lidx = getCellAtMouse(lmx, lmy);
      if (lidx === null) {return;}
      if (floor.cells[lidx].item) {
        onRotateItem(lidx);
      } else {
        onLongPressRoomRef.current?.(lidx, pos.x, pos.y);
      }
    }, 500);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    gestureRef.current?.onPointerUp({
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
    });
    const prevCount = activePointerCountRef.current;
    activePointerCountRef.current = Math.max(0, activePointerCountRef.current - 1);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (prevCount === 2 && activePointerCountRef.current === 1) {
      const elapsed = twoFingerDownTimeRef.current !== null ? Date.now() - twoFingerDownTimeRef.current : Infinity;
      if (elapsed < 300 && !twoFingerMovedRef.current) {
        onUndoRef.current?.();
      }
      twoFingerDownTimeRef.current = null;
    }
    if (activePointerCountRef.current >= 1) {
      return;
    }

    if (tool.kind === "select") {
      selectionStartRef.current = null;
      const start = dragStartRef.current;
      dragStartRef.current = null;
      if (start !== null) {
        const { mx, my } = getCanvasPos(e.clientX, e.clientY);
        const idx = getCellAtMouse(mx, my);
        if (idx !== null && idx !== start) {
          dragMovedRef.current = true;
          onMoveItem(start, idx);
        } else if (!dragMovedRef.current) {
          if (idx !== null && floor.cells[idx].item) {
            onRotateItem(idx);
            setSelectedItemCell(idx);
            // Must clear before onSelectionChangeRef fires below, otherwise popup stays visible
            selectionRef.current = null;
          } else {
            setSelectedItemCell(null);
          }
        }
        redraw();
      }
      dragMovedRef.current = false;
      onSelectionChangeRef.current?.(selectionRef.current);
      return;
    }

    if (tool.kind === "wall") {
      const wasDrag = wallDragEdgeLock.current !== null;
      lastWallHitRef.current = null;
      wallDragStartPos.current = null;
      wallDragLastPos.current = null;
      wallDragEdgeLock.current = null;
      if (wallStopTimerRef.current) {
        clearTimeout(wallStopTimerRef.current);
      }
      if (!wasDrag) {
        const { mx, my } = getCanvasPos(e.clientX, e.clientY);
        for (const seg of resolveWallSegments(mx, my, cellSize, null, null, null)) {
          applyWallSegment(seg, "none");
        }
      }
      return;
    }

    const start = dragStartRef.current;
    dragStartRef.current = null;
    const { mx, my } = getCanvasPos(e.clientX, e.clientY);
    const idx = getCellAtMouse(mx, my);

    if (tool.kind === "erase") {
      if (!dragMovedRef.current && idx !== null) {
        onEraseCell(idx);
      }
      dragMovedRef.current = false;
      return;
    }

    if (tool.kind === "floor") {
      if (
        !dragMovedRef.current &&
        idx !== null &&
        tool.floorType !== null &&
        floor.cells[idx].floorType === null
      ) {
        onFillRoom(idx);
      }
      dragMovedRef.current = false;
      return;
    }

    if (tool.kind === "item") {
      const action = resolveItemAction({
        dragMoved: dragMovedRef.current,
        endCell:
          idx !== null
            ? floor.cells[idx]
            : { floorType: null, item: null, wall: { left: "none", top: "none" } },
        endIdx: idx,
        startIdx: start,
        toolItemType: tool.itemType,
      });
      if (action === "move") {
        onMoveItem(start!, idx!);
      } else if (action === "rotate") {
        onRotateItem(idx!);
      } else if (action === "place") {
        onPlaceItem(idx!);
      }
      dragMovedRef.current = false;
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    gestureRef.current?.onPointerMove({
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
    });
    if (activePointerCountRef.current >= 2) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const start = twoFingerDownClientRef.current;
      if (start && !twoFingerMovedRef.current) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (dx * dx + dy * dy > 15 * 15) {
          twoFingerMovedRef.current = true;
        }
      }
      return;
    }
    if (longPressTimerRef.current) {
      const down = longPressDownClientRef.current;
      if (down) {
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        if (dx * dx + dy * dy > 8 * 8) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }

    const { mx, my } = getCanvasPos(e.clientX, e.clientY);

    mousePosRef.current = { mx, my };

    if (tool.kind === "select") {
      if (e.buttons === 1 && dragStartRef.current !== null) {
        setCursor("grabbing");
        redraw({ fromIdx: dragStartRef.current, mx, my });
        return;
      }
      if (e.buttons === 1 && selectionStartRef.current) {
        const cx = Math.floor(mx / cellSize);
        const cy = Math.floor(my / cellSize);
        selectionRef.current = {
          x1: selectionStartRef.current.x,
          x2: cx,
          y1: selectionStartRef.current.y,
          y2: cy,
        };
        redraw();
      }
      const hoverIdx = getCellAtMouse(mx, my);
      setCursor(hoverIdx !== null && floor.cells[hoverIdx].item !== null ? "grab" : "crosshair");
      return;
    }

    if (tool.kind === "floor" && e.buttons === 1) {
      const idx = getCellAtMouse(mx, my);
      if (idx !== null) {
        dragMovedRef.current = true;
        onSetFloorType(idx, tool.floorType);
      }
      return;
    }

    if (tool.kind === "erase" && e.buttons === 1) {
      const idx = getCellAtMouse(mx, my);
      if (idx !== null) {
        dragMovedRef.current = true;
        onEraseCell(idx);
      }
      return;
    }

    if (tool.kind === "wall" && wallDragStartPos.current) {
      if (!wallDragEdgeLock.current) {
        const dx = Math.abs(mx - wallDragStartPos.current.mx);
        const dy = Math.abs(my - wallDragStartPos.current.my);
        if (dx > 12 || dy > 12) {
          wallDragEdgeLock.current = dx > dy ? "top" : "left";
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }

      if (wallDragEdgeLock.current) {
        applyWallHit(mx, my, tool.wallType);
      }
      wallDragLastPos.current = { mx, my };

      if (wallStopTimerRef.current) {
        clearTimeout(wallStopTimerRef.current);
      }
      wallStopTimerRef.current = setTimeout(() => {
        wallDragEdgeLock.current = null;
        wallDragStartPos.current = wallDragLastPos.current;
        lastWallHitRef.current = null;
      }, 300);
      return;
    }

    if (dragStartRef.current !== null) {
      setCursor("grabbing");
      redraw({ fromIdx: dragStartRef.current, mx, my });
      return;
    }

    if (tool.kind === "erase") {
      setCursor("cell");
    } else if (tool.kind === "item") {
      const idx = getCellAtMouse(mx, my);
      const hasItem = idx !== null && floor.cells[idx].item !== null;
      setCursor(hasItem ? "grab" : "crosshair");
    } else {
      setCursor("crosshair");
    }
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    gestureRef.current?.onPointerCancel({ pointerId: e.pointerId });
    activePointerCountRef.current = Math.max(0, activePointerCountRef.current - 1);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function copySelection() {
    const sel = selectionRef.current;
    if (!sel) {
      return;
    }
    const result = copyRegion(floorRef.current, sel);
    if (result) {
      copiedRef.current = result;
    }
  }

  function pasteSelection() {
    if (!copiedRef.current) {
      return;
    }
    const pos = mousePosRef.current ?? { mx: 0, my: 0 };
    const originIndex = pasteOriginIndex(pos, cellSize, floorRef.current);
    onPasteRegionRef.current(originIndex, copiedRef.current);
  }

  function deleteSelection() {
    const sel = selectionRef.current;
    if (!sel) {
      return;
    }
    const { x1, y1, x2, y2 } = normalizeSelection(sel);
    onEraseRegionRef.current(x1, y1, x2, y2);
    selectionRef.current = null;
    onSelectionChangeRef.current?.(null);
    redraw();
  }

  return {
    copySelection,
    deleteSelection,
    handleContextMenu,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    pasteSelection,
  };
}
