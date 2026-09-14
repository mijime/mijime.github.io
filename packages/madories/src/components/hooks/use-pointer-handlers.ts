import { useEffect, useRef } from "react";
import { GestureHandler } from "../../input/gesture-handler";
import { copyRegion, normalizeSelection } from "../../floor/clipboard-logic";
import { arrayIndex } from "../../floor/frame";
import { findItemAnchor } from "../../input/item-hit";
import { resolveEdges, snapVertex } from "../../input/wall-snap";
import type { CopiedRegion, EdgeRef, FloorPlan, FloorType, WallType } from "../../types";
import { toolBrush, type ToolMode } from "../tool-mode";
import type { SelectionRef, ViewRef } from "./types";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  floor: FloorPlan;
  cellSize: number;
  tool: ToolMode;
  viewRef: ViewRef;
  selectionRef: SelectionRef;
  onSetWalls: (edges: EdgeRef[], wallType: WallType) => void;
  onSetFloorType: (x: number, y: number, floorType: FloorType | null) => void;
  onFillRoom: (x: number, y: number) => void;
  onPlaceItem: (x: number, y: number) => void;
  onRotateItem: (x: number, y: number) => void;
  onMoveItem: (fromX: number, fromY: number, toX: number, toY: number) => void;
  onPasteRegion: (x: number, y: number, region: CopiedRegion) => void;
  onEraseRegion: (x1: number, y1: number, x2: number, y2: number) => void;
  onEraseCell: (x: number, y: number) => void;
  onLongPressRoom?: (x: number, y: number, clientX: number, clientY: number) => void;
  onCommit?: () => void;
  onUndo?: () => void;
  redraw: (
    ghost?: { mx: number; my: number; fromX: number; fromY: number },
    wallPreview?: EdgeRef[],
  ) => void;
  setSelectedItemCell: (cell: { x: number; y: number } | null) => void;
  selectedItemCell: { x: number; y: number } | null;
  onSelectionChange?: (sel: { x1: number; y1: number; x2: number; y2: number } | null) => void;
}

interface CellPos {
  x: number;
  y: number;
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
    onSetWalls,
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
  const onCommitRef = useRef(props.onCommit);
  onCommitRef.current = props.onCommit;
  const onLongPressRoomRef = useRef(props.onLongPressRoom);
  onLongPressRoomRef.current = props.onLongPressRoom;

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const floorRef = useRef(floor);
  floorRef.current = floor;

  const wallStartVertexRef = useRef<{ vx: number; vy: number } | null>(null);
  const wallPreviewRef = useRef<EdgeRef[]>([]);
  const dragStartRef = useRef<CellPos | null>(null);
  const dragDownRef = useRef<CellPos | null>(null);
  const dragMovedRef = useRef(false);
  const selectionStartRef = useRef<CellPos | null>(null);
  const copiedRef = useRef<CopiedRegion | null>(null);
  const mousePosRef = useRef<{ mx: number; my: number } | null>(null);
  const activePointerCountRef = useRef(0);
  const gestureRef = useRef<GestureHandler | null>(null);
  const onPasteRegionRef = useRef(props.onPasteRegion);
  onPasteRegionRef.current = props.onPasteRegion;
  const onEraseRegionRef = useRef(props.onEraseRegion);
  onEraseRegionRef.current = props.onEraseRegion;

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
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
        const f = floorRef.current;
        const originX = f.originX + Math.floor(mousePosRef.current.mx / cellSize);
        const originY = f.originY + Math.floor(mousePosRef.current.my / cellSize);
        onPasteRegionRef.current(originX, originY, copiedRef.current);
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

  /** World cell coordinate under the pointer. The plane is unbounded. */
  function worldAt(mx: number, my: number): CellPos {
    return {
      x: floor.originX + Math.floor(mx / cellSize),
      y: floor.originY + Math.floor(my / cellSize),
    };
  }

  function setCursor(cursor: string) {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }
  }

  function cellIndexAt(pos: CellPos): number | null {
    return arrayIndex(floor, pos.x, pos.y);
  }

  // Brush=2 (旧1セル相当) では起点セルを含む2x2ブロックを対象にする
  function blockCells(pos: CellPos): CellPos[] {
    if (toolBrush(tool) !== 2) {
      return [pos];
    }
    const ox = Math.floor(pos.x / 2) * 2;
    const oy = Math.floor(pos.y / 2) * 2;
    const out: CellPos[] = [];
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        out.push({ x: ox + dx, y: oy + dy });
      }
    }
    return out;
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const { mx, my } = getCanvasPos(e.clientX, e.clientY);
    const pos = worldAt(mx, my);
    const anchor = findItemAnchor(floor, pos.x, pos.y);
    if (!anchor) {
      return;
    }
    if (tool.kind !== "erase" && tool.kind !== "item") {
      return;
    }
    onRotateItem(anchor.x, anchor.y);
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
      wallStartVertexRef.current = null;
      wallPreviewRef.current = [];
      dragStartRef.current = null;
      dragDownRef.current = null;
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
    const pos = worldAt(mx, my);

    if (tool.kind === "select") {
      const anchor = findItemAnchor(floor, pos.x, pos.y);
      if (anchor) {
        dragStartRef.current = { x: anchor.x, y: anchor.y };
        dragDownRef.current = pos;
        dragMovedRef.current = false;
      } else {
        selectionStartRef.current = pos;
        selectionRef.current = { x1: pos.x, x2: pos.x, y1: pos.y, y2: pos.y };
        redraw();
      }
      return;
    }

    if (tool.kind === "wall") {
      wallStartVertexRef.current = snapVertex(
        mx,
        my,
        cellSize,
        floor.originX,
        floor.originY,
        toolBrush(tool),
      );
      wallPreviewRef.current = [];
      startLongPress(e.clientX, e.clientY);
      return;
    }

    if (tool.kind === "floor") {
      dragStartRef.current = pos;
      dragMovedRef.current = false;
      startLongPress(e.clientX, e.clientY);
      return;
    }

    if (tool.kind === "erase") {
      dragStartRef.current = pos;
      dragMovedRef.current = false;
      startLongPress(e.clientX, e.clientY);
      return;
    }

    if (tool.kind !== "item") {
      return;
    }
    const anchor = findItemAnchor(floor, pos.x, pos.y);
    dragStartRef.current = anchor ? { x: anchor.x, y: anchor.y } : pos;
    dragDownRef.current = pos;
    dragMovedRef.current = false;
    startLongPress(e.clientX, e.clientY);
  }

  function startLongPress(clientX: number, clientY: number) {
    longPressDownClientRef.current = { x: clientX, y: clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      const down = longPressDownClientRef.current;
      if (!down) {
        return;
      }
      const { mx, my } = getCanvasPos(down.x, down.y);
      const pos = worldAt(mx, my);
      const anchor = findItemAnchor(floor, pos.x, pos.y);
      longPressTriggeredRef.current = true;
      if (anchor) {
        onRotateItem(anchor.x, anchor.y);
      } else {
        onLongPressRoomRef.current?.(pos.x, pos.y, down.x, down.y);
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
      const elapsed =
        twoFingerDownTimeRef.current === null
          ? Infinity
          : Date.now() - twoFingerDownTimeRef.current;
      if (elapsed < 300 && !twoFingerMovedRef.current) {
        onUndoRef.current?.();
      }
      twoFingerDownTimeRef.current = null;
    }
    if (activePointerCountRef.current >= 1) {
      return;
    }

    // A completed long-press already performed its action (item rotation / room
    // Picker); suppress the normal tap action on pointer-up (e.g. wall placement
    // Or floor fill) that would otherwise also fire.
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      selectionStartRef.current = null;
      dragStartRef.current = null;
      redraw();
      return;
    }

    if (tool.kind === "select") {
      selectionStartRef.current = null;
      const start = dragStartRef.current;
      const down = dragDownRef.current;
      dragStartRef.current = null;
      dragDownRef.current = null;
      if (start !== null && down !== null) {
        const { mx, my } = getCanvasPos(e.clientX, e.clientY);
        const pos = worldAt(mx, my);
        if (pos.x !== down.x || pos.y !== down.y) {
          dragMovedRef.current = true;
          onMoveItem(start.x, start.y, start.x + (pos.x - down.x), start.y + (pos.y - down.y));
        } else if (!dragMovedRef.current) {
          const anchor = findItemAnchor(floor, start.x, start.y);
          if (anchor) {
            onRotateItem(anchor.x, anchor.y);
            setSelectedItemCell({ x: anchor.x, y: anchor.y });
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
      onCommitRef.current?.();
      return;
    }
    if (tool.kind === "wall") {
      wallStartVertexRef.current = null;
      const edges = wallPreviewRef.current;
      wallPreviewRef.current = [];
      if (edges.length > 0) {
        onSetWalls(edges, tool.wallType);
      }
      onCommitRef.current?.();
      redraw();
      return;
    }

    const start = dragStartRef.current;
    dragStartRef.current = null;
    const { mx, my } = getCanvasPos(e.clientX, e.clientY);
    const pos = worldAt(mx, my);

    if (tool.kind === "erase") {
      if (!dragMovedRef.current) {
        for (const p of blockCells(pos)) {
          onEraseCell(p.x, p.y);
        }
      }
      dragMovedRef.current = false;
      onCommitRef.current?.();
      return;
    }

    if (tool.kind === "floor") {
      const idx = cellIndexAt(pos);
      if (
        !dragMovedRef.current &&
        tool.floorType !== null &&
        (idx === null || floor.cells[idx].floorType === null)
      ) {
        onFillRoom(pos.x, pos.y);
      }
      dragMovedRef.current = false;
      onCommitRef.current?.();
      return;
    }

    if (tool.kind === "item") {
      const down = dragDownRef.current;
      dragDownRef.current = null;
      if (start === null || down === null) {
        dragMovedRef.current = false;
        return;
      }
      if (pos.x !== down.x || pos.y !== down.y) {
        onMoveItem(start.x, start.y, start.x + (pos.x - down.x), start.y + (pos.y - down.y));
      } else if (!dragMovedRef.current) {
        const anchor = findItemAnchor(floor, pos.x, pos.y);
        if (anchor && anchor.item.type === tool.itemType) {
          onRotateItem(anchor.x, anchor.y);
        } else {
          onPlaceItem(pos.x, pos.y);
        }
      }
      dragMovedRef.current = false;
      onCommitRef.current?.();
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
    const pos = worldAt(mx, my);

    mousePosRef.current = { mx, my };

    if (tool.kind === "select") {
      if (e.buttons === 1 && dragStartRef.current !== null) {
        setCursor("grabbing");
        const start = dragStartRef.current;
        redraw({ fromX: start.x, fromY: start.y, mx, my });
        return;
      }
      if (e.buttons === 1 && selectionStartRef.current) {
        selectionRef.current = {
          x1: selectionStartRef.current.x,
          x2: pos.x,
          y1: selectionStartRef.current.y,
          y2: pos.y,
        };
        redraw();
      }
      const hasHoverItem = findItemAnchor(floor, pos.x, pos.y) !== null;
      setCursor(hasHoverItem ? "grab" : "crosshair");
      return;
    }

    if (tool.kind === "floor" && e.buttons === 1) {
      dragMovedRef.current = true;
      for (const p of blockCells(pos)) {
        onSetFloorType(p.x, p.y, tool.floorType);
      }
      return;
    }

    if (tool.kind === "erase" && e.buttons === 1) {
      dragMovedRef.current = true;
      for (const p of blockCells(pos)) {
        onEraseCell(p.x, p.y);
      }
      return;
    }

    if (tool.kind === "wall" && wallStartVertexRef.current && e.buttons === 1) {
      const end = snapVertex(mx, my, cellSize, floor.originX, floor.originY, toolBrush(tool));
      wallPreviewRef.current = resolveEdges(wallStartVertexRef.current, end);
      if (wallPreviewRef.current.length > 0 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      redraw(undefined, wallPreviewRef.current);
      return;
    }

    if (dragStartRef.current !== null) {
      setCursor("grabbing");
      const start = dragStartRef.current;
      redraw({ fromX: start.x, fromY: start.y, mx, my });
      return;
    }

    if (tool.kind === "erase") {
      setCursor("cell");
    } else if (tool.kind === "item") {
      const hasItem = findItemAnchor(floor, pos.x, pos.y) !== null;
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
    wallStartVertexRef.current = null;
    wallPreviewRef.current = [];
    redraw();
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
    const f = floorRef.current;
    onPasteRegionRef.current(
      f.originX + Math.floor(pos.mx / cellSize),
      f.originY + Math.floor(pos.my / cellSize),
      copiedRef.current,
    );
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
