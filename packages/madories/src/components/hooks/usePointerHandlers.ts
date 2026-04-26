import { useEffect, useRef } from "react";
import { GestureHandler } from "../../canvas/gestureHandler";
import { hitTestEdge } from "../../canvas/hitTest";
import type { CopiedRegion, FloorPlan, FloorType } from "../../types";
import type { ToolMode } from "../Toolbar";
import type { SelectionRef, ViewRef } from "./types";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  floor: FloorPlan;
  cellSize: number;
  tool: ToolMode;
  viewRef: ViewRef;
  selectionRef: SelectionRef;
  onSetWall: (cellIndex: number, edge: "top" | "left") => void;
  onSetFloorType: (cellIndex: number, floorType: FloorType | null) => void;
  onPlaceItem: (cellIndex: number) => void;
  onRotateItem: (cellIndex: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPasteRegion: (originIndex: number, region: CopiedRegion) => void;
  onEraseRegion: (x1: number, y1: number, x2: number, y2: number) => void;
  onEraseCell: (cellIndex: number) => void;
  redraw: (ghost?: { mx: number; my: number; fromIdx: number }) => void;
  setSelectedItemCell: (idx: number | null) => void;
  selectedItemCell: number | null;
}

export function usePointerHandlers(props: Props): {
  handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void;
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
    onPlaceItem,
    onRotateItem,
    onMoveItem,
    onEraseCell,
    redraw,
    setSelectedItemCell,
    selectedItemCell,
  } = props;

  const floorRef = useRef(floor);
  floorRef.current = floor;

  const wallDraggingRef = useRef(false);
  const lastWallHitRef = useRef<string | null>(null);
  const wallDragStartPos = useRef<{ mx: number; my: number } | null>(null);
  const wallDragEdgeLock = useRef<"top" | "left" | null>(null);
  const wallDragLastPos = useRef<{ mx: number; my: number } | null>(null);
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
  }, [redraw, canvasRef.current?.getBoundingClientRect, viewRef.current, setSelectedItemCell]);

  // Clear selection when tool changes away from select
  useEffect(() => {
    if (tool.kind !== "select") {
      selectionRef.current = null;
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
        const x1 = Math.min(sel.x1, sel.x2);
        const y1 = Math.min(sel.y1, sel.y2);
        const x2 = Math.max(sel.x1, sel.x2);
        const y2 = Math.max(sel.y1, sel.y2);
        const width = x2 - x1 + 1;
        const height = y2 - y1 + 1;
        const cells = [];
        for (let cy = y1; cy <= y2; cy++) {
          for (let cx = x1; cx <= x2; cx++) {
            cells.push(floorRef.current.cells[cy * floorRef.current.width + cx]);
          }
        }
        copiedRef.current = { cells, height, width };
      }

      if (isCtrl && e.key === "v") {
        if (!copiedRef.current || !mousePosRef.current) {
          return;
        }
        const { mx, my } = mousePosRef.current;
        const cx = Math.floor(mx / cellSize);
        const cy = Math.floor(my / cellSize);
        const originIndex = cy * floorRef.current.width + cx;
        onPasteRegionRef.current(originIndex, copiedRef.current);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = selectionRef.current;
        if (!sel) {
          return;
        }
        e.preventDefault();
        const x1 = Math.min(sel.x1, sel.x2);
        const y1 = Math.min(sel.y1, sel.y2);
        const x2 = Math.max(sel.x1, sel.x2);
        const y2 = Math.max(sel.y1, sel.y2);
        onEraseRegionRef.current(x1, y1, x2, y2);
        selectionRef.current = null;
        redraw();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.kind, cellSize, selectionRef.current, selectionRef, redraw]);

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

  function applyWallHit(mx: number, my: number) {
    const lock = wallDragEdgeLock.current;
    let hit: { cx: number; cy: number; edge: "top" | "left" } | null;

    if (lock === "top") {
      const cx = Math.floor(mx / cellSize);
      const cy = Math.round(my / cellSize);
      hit = { cx, cy, edge: "top" };
    } else if (lock === "left") {
      const cx = Math.round(mx / cellSize);
      const cy = Math.floor(my / cellSize);
      hit = { cx, cy, edge: "left" };
    } else {
      hit = hitTestEdge(mx, my, cellSize);
    }

    if (!hit) {
      return;
    }
    const idx = hit.cy * floor.width + hit.cx;
    if (idx < 0 || idx >= floor.cells.length) {
      return;
    }
    const key = `${idx}:${hit.edge}`;
    if (key === lastWallHitRef.current) {
      return;
    }
    lastWallHitRef.current = key;
    onSetWall(idx, hit.edge);
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
      wallDraggingRef.current = true;
      lastWallHitRef.current = null;
      wallDragStartPos.current = { mx, my };
      wallDragLastPos.current = { mx, my };
      wallDragEdgeLock.current = null;
      applyWallHit(mx, my);
      return;
    }

    if (tool.kind === "floor") {
      const idx = getCellAtMouse(mx, my);
      if (idx !== null) {
        onSetFloorType(idx, tool.floorType);
      }
      return;
    }

    if (tool.kind === "erase") {
      const idx = getCellAtMouse(mx, my);
      if (idx !== null) {
        onEraseCell(idx);
      }
      return;
    }

    if (tool.kind !== "item") {
      return;
    }
    const idx = getCellAtMouse(mx, my);
    if (idx === null || !floor.cells[idx].item) {
      return;
    }
    dragStartRef.current = idx;
    dragMovedRef.current = false;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    gestureRef.current?.onPointerUp({
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
    });
    activePointerCountRef.current = Math.max(0, activePointerCountRef.current - 1);
    e.currentTarget.releasePointerCapture(e.pointerId);
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
            if (selectedItemCell === idx) {
              onRotateItem(idx);
            } else {
              setSelectedItemCell(idx);
            }
          } else {
            setSelectedItemCell(null);
          }
        }
        redraw();
      }
      dragMovedRef.current = false;
      return;
    }

    if (tool.kind === "wall") {
      wallDraggingRef.current = false;
      lastWallHitRef.current = null;
      wallDragStartPos.current = null;
      wallDragLastPos.current = null;
      wallDragEdgeLock.current = null;
      return;
    }

    const start = dragStartRef.current;
    dragStartRef.current = null;
    const { mx, my } = getCanvasPos(e.clientX, e.clientY);
    const idx = getCellAtMouse(mx, my);

    if (tool.kind === "item") {
      if (start !== null && idx !== null && idx !== start) {
        dragMovedRef.current = true;
        onMoveItem(start, idx);
      } else if (!dragMovedRef.current && idx !== null) {
        if (floor.cells[idx].item) {
          onRotateItem(idx);
        } else {
          onPlaceItem(idx);
        }
      }
      dragMovedRef.current = false;
      return;
    }

    if (start === null) {
      return;
    }
    if (idx === null || idx === start) {
      return;
    }
    dragMovedRef.current = true;
    onMoveItem(start, idx);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    gestureRef.current?.onPointerMove({
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
    });
    if (activePointerCountRef.current >= 2) {
      return;
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
        onSetFloorType(idx, tool.floorType);
      }
      return;
    }

    if (tool.kind === "erase" && e.buttons === 1) {
      const idx = getCellAtMouse(mx, my);
      if (idx !== null) {
        onEraseCell(idx);
      }
      return;
    }

    if (tool.kind === "wall" && wallDraggingRef.current) {
      const last = wallDragLastPos.current;
      const dmx = last ? Math.abs(mx - last.mx) : 0;
      const dmy = last ? Math.abs(my - last.my) : 0;

      if (dmx < 2 && dmy < 2) {
        wallDragEdgeLock.current = null;
        wallDragStartPos.current = { mx, my };
      }

      if (!wallDragEdgeLock.current && wallDragStartPos.current) {
        const dx = Math.abs(mx - wallDragStartPos.current.mx);
        const dy = Math.abs(my - wallDragStartPos.current.my);
        if (dx > 4 || dy > 4) {
          wallDragEdgeLock.current = dx > dy ? "top" : "left";
        }
      }

      wallDragLastPos.current = { mx, my };
      applyWallHit(mx, my);
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
  }

  return {
    handleContextMenu,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
