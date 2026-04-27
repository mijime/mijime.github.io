import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { exportFloorPng } from "../draw/export";
import type { CopiedRegion, FloorPlan, FloorType } from "../types";
import { useCanvasDraw } from "./hooks/useCanvasDraw";
import { usePointerHandlers } from "./hooks/usePointerHandlers";
import type { ToolMode } from "./toolMode";

export interface FloorCanvasHandle {
  exportPng: () => void;
}

interface Props {
  floor: FloorPlan;
  ghostFloors: FloorPlan[];
  cellSize: number;
  darkMode: boolean;
  tool: ToolMode;
  onSetWall: (cellIndex: number, edge: "top" | "left") => void;
  onSetFloorType: (cellIndex: number, floorType: FloorType | null) => void;
  onFillRoom: (cellIndex: number) => void;
  onPlaceItem: (cellIndex: number) => void;
  onRotateItem: (cellIndex: number) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPasteRegion: (originIndex: number, region: CopiedRegion) => void;
  onEraseRegion: (x1: number, y1: number, x2: number, y2: number) => void;
  onEraseCell: (cellIndex: number) => void;
  onDeleteItem: (cellIndex: number) => void;
}

export const FloorCanvas = forwardRef<FloorCanvasHandle, Props>(function FloorCanvas(props, ref) {
  const { floor, ghostFloors, cellSize, darkMode, tool } = props;
  const [selectedItemCell, setSelectedItemCell] = useState<number | null>(null);
  const [selectionState, setSelectionState] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 });
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
    onMoveItem: props.onMoveItem,
    onPasteRegion: props.onPasteRegion,
    onPlaceItem: props.onPlaceItem,
    onRotateItem: props.onRotateItem,
    onSelectionChange: setSelectionState,
    onSetFloorType: props.onSetFloorType,
    onSetWall: props.onSetWall,
    redraw,
    selectedItemCell,
    selectionRef,
    setSelectedItemCell,
    tool,
    viewRef,
  });

  useImperativeHandle(ref, () => ({
    exportPng() {
      exportFloorPng(floor, cellSize);
    },
  }));

  return (
    <div className="relative w-full h-full">
      <div
        style={{
          height: floor.height * cellSize,
          position: "relative",
          width: floor.width * cellSize,
        }}
      >
        <canvas
          ref={staticCanvasRef}
          width={floor.width * cellSize}
          height={floor.height * cellSize}
          style={{
            display: "block",
            left: 0,
            pointerEvents: "none",
            position: "absolute",
            top: 0,
          }}
        />
        <canvas
          ref={dynamicCanvasRef}
          width={floor.width * cellSize}
          height={floor.height * cellSize}
          onContextMenu={handleContextMenu}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerCancel={handlePointerCancel}
          className="cursor-crosshair touch-none"
          style={{ display: "block", left: 0, position: "absolute", top: 0 }}
        />
      </div>
      {tool.kind === "select" &&
        selectedItemCell !== null &&
        (() => {
          const cell = floor.cells[selectedItemCell];
          if (!cell?.item) {
            return;
          }
          const cx = selectedItemCell % floor.width;
          const cy = Math.floor(selectedItemCell / floor.width);
          const { offsetX, offsetY, scale } = viewRef.current;
          const px = cx * cellSize * scale + offsetX;
          const py = cy * cellSize * scale + offsetY;
          return (
            <div
              className="absolute flex gap-1 z-10 pointer-events-auto"
              style={{ left: px, top: Math.max(0, py - 40) }}
            >
              <button
                className="px-2 py-1 rounded text-xs font-mono shadow"
                style={{ background: "#c0392b", color: "white" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  props.onDeleteItem(selectedItemCell);
                  setSelectedItemCell(null);
                }}
              >
                削除
              </button>
            </div>
          );
        })()}
      {tool.kind === "select" &&
        selectionState !== null &&
        selectedItemCell === null &&
        (() => {
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
                onClick={copySelection}
              >
                コピー
              </button>
              <button
                className="px-2 py-1 rounded text-xs font-mono shadow"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={pasteSelection}
              >
                ペースト
              </button>
              <button
                className="px-2 py-1 rounded text-xs font-mono shadow"
                style={{ background: "#c0392b", color: "white" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={deleteSelection}
              >
                削除
              </button>
            </div>
          );
        })()}
    </div>
  );
});
