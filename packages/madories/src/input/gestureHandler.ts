interface PointerInfo {
  clientX: number;
  clientY: number;
}

export interface GestureHandlerOptions {
  onTap?: (x: number, y: number) => void;
  onDrag?: (dx: number, dy: number, x: number, y: number) => void;
  onPan?: (dx: number, dy: number) => void;
  onPinch?: (scale: number, centerX: number, centerY: number) => void;
  tapThreshold?: number;
}

export class GestureHandler {
  private pointers = new Map<number, PointerInfo>();
  private dragStartPos = new Map<number, PointerInfo>();
  private didDrag = false;
  private lastPinchDist: number | null = null;
  private lastPanCenter: { x: number; y: number } | null = null;
  private opts: GestureHandlerOptions;

  constructor(opts: GestureHandlerOptions = {}) {
    this.opts = opts;
  }

  onPointerDown(e: { pointerId: number; clientX: number; clientY: number }) {
    this.pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    this.dragStartPos.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });
    if (this.pointers.size === 1) {
      this.didDrag = false;
    }
    if (this.pointers.size === 2) {
      this.lastPinchDist = this.getPinchDist();
      this.lastPanCenter = this.getPanCenter();
    }
  }

  onPointerMove(e: { pointerId: number; clientX: number; clientY: number }) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) {
      return;
    }
    this.pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (this.pointers.size === 2) {
      const dist = this.getPinchDist();
      const center = this.getPanCenter();
      if (this.lastPinchDist !== null && this.lastPanCenter !== null) {
        const scale = dist / this.lastPinchDist;
        this.opts.onPinch?.(scale, center.x, center.y);
        const dx = center.x - this.lastPanCenter.x;
        const dy = center.y - this.lastPanCenter.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          this.opts.onPan?.(dx, dy);
        }
      }
      this.lastPinchDist = dist;
      this.lastPanCenter = center;
      return;
    }

    const threshold = this.opts.tapThreshold ?? 5;
    const start = this.dragStartPos.get(e.pointerId);
    if (start) {
      const dx = e.clientX - start.clientX;
      const dy = e.clientY - start.clientY;
      if (!this.didDrag && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
        this.didDrag = true;
      }
    }

    if (this.didDrag) {
      const dx = e.clientX - prev.clientX;
      const dy = e.clientY - prev.clientY;
      this.opts.onDrag?.(dx, dy, e.clientX, e.clientY);
    }
  }

  onPointerUp(e: { pointerId: number; clientX: number; clientY: number }) {
    if (this.pointers.size === 1 && !this.didDrag) {
      this.opts.onTap?.(e.clientX, e.clientY);
    }
    this.pointers.delete(e.pointerId);
    this.dragStartPos.delete(e.pointerId);
    if (this.pointers.size < 2) {
      this.lastPinchDist = null;
      this.lastPanCenter = null;
    }
    if (this.pointers.size === 0) {
      this.didDrag = false;
    }
  }

  onPointerCancel(e: { pointerId: number }) {
    this.pointers.delete(e.pointerId);
    this.dragStartPos.delete(e.pointerId);
    this.lastPinchDist = null;
    this.lastPanCenter = null;
  }

  private getPinchDist(): number {
    const pts = [...this.pointers.values()];
    const dx = pts[1].clientX - pts[0].clientX;
    const dy = pts[1].clientY - pts[0].clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  private getPanCenter(): { x: number; y: number } {
    const pts = [...this.pointers.values()];
    return {
      x: (pts[0].clientX + pts[1].clientX) / 2,
      y: (pts[0].clientY + pts[1].clientY) / 2,
    };
  }
}
