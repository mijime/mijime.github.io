import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { exportFloorPng } from "../draw/export";
import type { CopiedRegion, FloorPlan, FloorType, WallType } from "../types";
import { useCanvasDraw } from "./hooks/useCanvasDraw";
import { usePointerHandlers } from "./hooks/usePointerHandlers";
import type { ToolMode } from "./toolMode";

interface SelectionContextMenuProps {
  selectionState: { x1: number; y1: number; x2: number; y2: number };
  cellSize: number;
  viewRef: React.RefObject<{ offsetX: number; offsetY: number; scale: number }>;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

function SelectionContextMenu({
  selectionState,
  cellSize,
  viewRef,
  onCopy,
  onPaste,
  onDelete,
}: SelectionContextMenuProps) {
  const { offsetX, offsetY, scale } = viewRef.current;
  const x1 = Math.min(selectionState.x1, selectionState.x2);
  const y1 = Math.min(selectionState.y1, selectionState.y2);
  const px = x1 * cellSize * scale + offsetX;
  const py = y1 * cellSize * scale + offsetY;
  return (
    <div
      className="absolute flex gap-1 z-10 pointer-events-auto"
      style={{ left: px, top: Math.max(0, py - 40) }}
    >
      <button
        className="px-2 py-1 rounded text-xs font-mono shadow"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onCopy}
      >
        コピー
      </button>
      <button
        className="px-2 py-1 rounded text-xs font-mono shadow"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onPaste}
      >
        ペースト
      </button>
      <button
        className="px-2 py-1 rounded text-xs font-mono shadow"
        style={{ background: "var(--terra)", color: "white" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
      >
        削除
      </button>
    </div>
  );
}

export interface FloorCanvasHandle {
  exportPng: () => void;
  fitToContainer: () => void;
}

interface Props {
  floor: FloorPlan;
  ghostFloors: FloorPlan[];
  cellSize: number;
  darkMode: boolean;
  tool: ToolMode;
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
}

export const FloorCanvas = forwardRef<FloorCanvasHandle, Props>(function FloorCanvas(props, ref) {
  const { floor, ghostFloors, cellSize, darkMode, tool } = props;
  const [selectedItemCell, setSelectedItemCell] = useState<number | null>(null);
  const [selectionState, setSelectionState] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
  const initializedRef = useRef(false);
  const selectionRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const { redraw } = useCanvasDraw({
    cellSize,
    darkMode,
    dynamicCanvasRef,
    floor,
    ghostFloors,
    selectedItemCell,
    selectionRef,
    staticCanvasRef,
    tool,
    viewRef,
  });

  const {
    handleContextMenu,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handlePointerCancel,
    copySelection,
    pasteSelection,
    deleteSelection,
  } = usePointerHandlers({
    canvasRef: dynamicCanvasRef,
    cellSize,
    floor,
    onEraseCell: props.onEraseCell,
    onEraseRegion: props.onEraseRegion,
    onFillRoom: props.onFillRoom,
    onLongPressRoom: props.onLongPressRoom,
    onMoveItem: props.onMoveItem,
    onPasteRegion: props.onPasteRegion,
    onPlaceItem: props.onPlaceItem,
    onRotateItem: props.onRotateItem,
    onSelectionChange: setSelectionState,
    onSetFloorType: props.onSetFloorType,
    onSetWall: props.onSetWall,
    onUndo: props.onUndo,
    redraw,
    selectedItemCell,
    selectionRef,
    setSelectedItemCell,
    tool,
    viewRef,
  });

  const floorRef = useRef({ cellSize, height: floor.height, width: floor.width });
  floorRef.current = { cellSize, height: floor.height, width: floor.width };
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  function calcFit(cw: number, ch: number) {
    const { width, height, cellSize: cs } = floorRef.current;
    const gridW = width * cs;
    const gridH = height * cs;
    const scale = Math.min(cw / gridW, ch / gridH) * 0.9;
    return { offsetX: (cw - gridW * scale) / 2, offsetY: (ch - gridH * scale) / 2, scale };
  }

  function fitToContainer() {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    viewRef.current = calcFit(container.clientWidth, container.clientHeight);
    redrawRef.current();
  }

  useEffect(() => {
    const container = containerRef.current;
    const sc = staticCanvasRef.current;
    const dc = dynamicCanvasRef.current;
    if (!container || !sc || !dc) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width: cw, height: ch } = entry.contentRect;
      sc.width = cw;
      sc.height = ch;
      dc.width = cw;
      dc.height = ch;
      if (!initializedRef.current) {
        initializedRef.current = true;
        viewRef.current = calcFit(cw, ch);
      }
      redrawRef.current();
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    exportPng() {
      exportFloorPng(floor, cellSize);
    },
    fitToContainer,
  }));

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={staticCanvasRef}
        style={{
          display: "block",
          height: "100%",
          left: 0,
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />
      <canvas
        ref={dynamicCanvasRef}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerCancel}
        className="cursor-crosshair touch-none"
        style={{
          display: "block",
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: "100%",
        }}
      />
      {tool.kind === "select" && selectionState !== null && (
        <SelectionContextMenu
          selectionState={selectionState}
          cellSize={cellSize}
          viewRef={viewRef}
          onCopy={copySelection}
          onPaste={pasteSelection}
          onDelete={deleteSelection}
        />
      )}
    </div>
  );
});
