import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { exportFloorPng } from "../draw/export";
import type { CopiedRegion, EdgeRef, FloorPlan, FloorType, WallType } from "../types";
import { contentArrayRect } from "../floor/frame";
import { useCanvasDraw } from "./hooks/use-canvas-draw";
import { usePointerHandlers } from "./hooks/use-pointer-handlers";
import type { BrushSize, ToolMode } from "./tool-mode";
import type { ShearLayerFlags } from "../draw/draw-shear-check";

interface SelectionContextMenuProps {
  selectionState: { x1: number; y1: number; x2: number; y2: number };
  cellSize: number;
  originX: number;
  originY: number;
  viewRef: React.RefObject<{ offsetX: number; offsetY: number; scale: number }>;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

function SelectionContextMenu({
  selectionState,
  cellSize,
  originX,
  originY,
  viewRef,
  onCopy,
  onPaste,
  onDelete,
}: SelectionContextMenuProps) {
  const { offsetX, offsetY, scale } = viewRef.current;
  const x1 = Math.min(selectionState.x1, selectionState.x2);
  const y1 = Math.min(selectionState.y1, selectionState.y2);
  const px = (x1 - originX) * cellSize * scale + offsetX;
  const py = (y1 - originY) * cellSize * scale + offsetY;
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
  centerContent: () => void;
}

interface Props {
  floor: FloorPlan;
  ghostFloors: FloorPlan[];
  cellSize: number;
  darkMode: boolean;
  tool: ToolMode;
  brush: BrushSize;
  shearCheck: boolean;
  floors: FloorPlan[];
  shearLayers: ShearLayerFlags;
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
  centerNonce?: number;
  onUndo?: () => void;
}

function contentRectOf(f: FloorPlan) {
  const r = contentArrayRect(f);
  if (r) {
    return r;
  }
  return { x1: 0, x2: f.width - 1, y1: 0, y2: f.height - 1 };
}

export const FloorCanvas = forwardRef<FloorCanvasHandle, Props>((props, ref) => {
  const { floor, ghostFloors, cellSize, darkMode, tool, brush, shearCheck, floors, shearLayers } =
    props;
  const [selectedItemCell, setSelectedItemCell] = useState<{ x: number; y: number } | null>(null);
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
    brush,
    viewRef,
    shearCheck,
    floors,
    shearLayers,
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
    onSetWalls: props.onSetWalls,
    onCommit: props.onCommit,
    onUndo: props.onUndo,
    redraw,
    selectedItemCell,
    selectionRef,
    setSelectedItemCell,
    tool,
    viewRef,
  });

  const frameRef = useRef({ cellSize, floor });
  frameRef.current = { cellSize, floor };
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  function calcFit(cw: number, ch: number) {
    const { floor: f, cellSize: cs } = frameRef.current;
    const r = contentRectOf(f);
    const gridW = (r.x2 - r.x1 + 1) * cs;
    const gridH = (r.y2 - r.y1 + 1) * cs;
    const scale = Math.min(cw / gridW, ch / gridH) * 0.9;
    return {
      offsetX: (cw - gridW * scale) / 2 - r.x1 * cs * scale,
      offsetY: (ch - gridH * scale) / 2 - r.y1 * cs * scale,
      scale,
    };
  }

  function fitToContainer() {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    viewRef.current = calcFit(container.clientWidth, container.clientHeight);
    redrawRef.current();
  }

  function centerContent() {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const { floor: f, cellSize: cs } = frameRef.current;
    const r = contentRectOf(f);
    const v = viewRef.current;
    const cx = (r.x1 + r.x2 + 1) / 2;
    const cy = (r.y1 + r.y2 + 1) / 2;
    v.offsetX = container.clientWidth / 2 - cx * cs * v.scale;
    v.offsetY = container.clientHeight / 2 - cy * cs * v.scale;
    redrawRef.current();
  }

  // Keep the content visually fixed when normalization moves the window origin.
  const prevOriginRef = useRef({ id: floor.id, x: floor.originX, y: floor.originY });
  useLayoutEffect(() => {
    const prev = prevOriginRef.current;
    prevOriginRef.current = { id: floor.id, x: floor.originX, y: floor.originY };
    if (prev.id !== floor.id) {
      return;
    }
    if (prev.x === floor.originX && prev.y === floor.originY) {
      return;
    }
    const v = viewRef.current;
    v.offsetX += (floor.originX - prev.x) * cellSize * v.scale;
    v.offsetY += (floor.originY - prev.y) * cellSize * v.scale;
    redrawRef.current();
  }, [floor.id, floor.originX, floor.originY, cellSize]);

  const lastCenterNonceRef = useRef(props.centerNonce ?? 0);
  useEffect(() => {
    const nonce = props.centerNonce ?? 0;
    if (nonce === lastCenterNonceRef.current) {
      return;
    }
    lastCenterNonceRef.current = nonce;
    centerContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.centerNonce]);

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
    centerContent,
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
          originX={floor.originX}
          originY={floor.originY}
          viewRef={viewRef}
          onCopy={copySelection}
          onPaste={pasteSelection}
          onDelete={deleteSelection}
        />
      )}
    </div>
  );
});
