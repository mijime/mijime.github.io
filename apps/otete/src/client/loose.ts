// 🧸 Loose toy physics shared by 🧩 すぽっ！ and 🍎 もぐもぐ.
//
// Toddlers expect toys to behave like real objects on a low table:
//   - pick one up and it stays exactly where it is put down. Nothing flies back
//     to its slot, and a tap no longer launches the toy across the screen;
//   - toys are solid. Dragging one into another shoves the neighbour along, and
//     the edge of the play area is a wall the toy bounces off;
//   - a flick throws it with momentum: it slides, spins, bounces and settles.
//
// The field owns a fixed overlay (`.loose-layer`) above the play surface, so a
// toy can be carried anywhere inside the play area without being clipped by the
// tray that laid it out. Games describe what "means something" (a hole to drop
// into, a mouth to eat from) from `onStep`, which runs every physics frame.

import { tone } from "./audio";

export type LooseObject = {
  el: HTMLElement;
  /** Centre position in client (viewport) pixels. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation in degrees, mostly for the carried/flying feel. */
  rot: number;
  vr: number;
  w: number;
  h: number;
  /** Collision radius. */
  r: number;
  mass: number;
  held: boolean;
  /** True once the game consumed the toy (eaten / slotted); it stops moving. */
  done: boolean;
  alive: boolean;
  handlers: LooseHandlers;
};

export type LooseHandlers = {
  canGrab?: (o: LooseObject) => boolean;
  onGrab?: (o: LooseObject) => void;
  onDrag?: (o: LooseObject) => void;
  onDrop?: (o: LooseObject) => void;
  onTap?: (o: LooseObject) => void;
  /** Runs every physics step; return true to consume the toy. */
  onStep?: (o: LooseObject) => boolean | void;
};

export type LooseField = {
  readonly layer: HTMLElement;
  /** Turns an in-flow element into a free toy resting where it already sits. */
  add: (el: HTMLElement, handlers?: LooseHandlers, at?: { x: number; y: number }) => LooseObject;
  /** Detaches a toy (call after its own exit animation). */
  remove: (o: LooseObject) => void;
  clear: () => void;
  destroy: () => void;
  /** A small physical wobble, for taps that should not move the toy. */
  kick: (o: LooseObject, vx: number, vy: number, spin: number) => void;
};

type Live = LooseObject & {
  pid: number;
  offX: number;
  offY: number;
  tx: number;
  ty: number;
  downX: number;
  downY: number;
  downAt: number;
  moved: number;
};

type Box = { l: number; t: number; r: number; b: number };

const SLIDE = 3.1; // sliding friction (1/s)
const SPIN_DAMP = 2.4; // rotational damping (1/s)
const WALL_BOUNCE = 0.48; // edge restitution
const TOY_BOUNCE = 0.4; // toy-vs-toy restitution
const SHOVE = 1.15; // how much speed a shoved neighbour inherits
const FOLLOW = 30; // carried-toy follow stiffness (1/s)
const REST = 10; // px/s that count as "at rest"
const MAX_V = 3200; // px/s speed ceiling
const EDGE = 3; // keep this far inside the play area

export function createLooseField(boundsEl: HTMLElement): LooseField {
  const layer = document.createElement("div");
  layer.className = "loose-layer";
  document.body.append(layer);

  const toys: Live[] = [];
  let raf = 0;
  let last = 0;
  let topZ = 10;
  let destroyed = false;
  let knockAt = 0;

  const area = (): Box => {
    const r = boundsEl.getBoundingClientRect();
    return { l: r.left + EDGE, t: r.top + EDGE, r: r.right - EDGE, b: r.bottom - EDGE };
  };

  const paint = (o: Live | LooseObject): void => {
    o.el.style.transform =
      `translate3d(${(o.x - o.w / 2).toFixed(2)}px, ${(o.y - o.h / 2).toFixed(2)}px, 0) ` +
      `rotate(${o.rot.toFixed(2)}deg)`;
  };

  const knock = (speed: number): void => {
    const now = performance.now();
    if (speed < 380 || now - knockAt < 110) return;
    knockAt = now;
    tone(150 + Math.random() * 70, 0.05, "sine", Math.min(0.3, 0.06 + speed / 12000), 70);
  };

  const clampSpeed = (o: Live): void => {
    const s = Math.hypot(o.vx, o.vy);
    if (s > MAX_V) {
      o.vx = (o.vx / s) * MAX_V;
      o.vy = (o.vy / s) * MAX_V;
    }
  };

  const clampWalls = (o: Live, box: Box): void => {
    const r = o.r;
    if (o.x - r < box.l) {
      o.x = box.l + r;
      if (o.held) o.vx = Math.max(0, o.vx);
      else if (o.vx < 0) {
        knock(-o.vx);
        o.vx = -o.vx * WALL_BOUNCE;
        o.vr += Math.sign(o.vy || 1) * 18;
      }
    } else if (o.x + r > box.r) {
      o.x = box.r - r;
      if (o.held) o.vx = Math.min(0, o.vx);
      else if (o.vx > 0) {
        knock(o.vx);
        o.vx = -o.vx * WALL_BOUNCE;
        o.vr -= Math.sign(o.vy || 1) * 18;
      }
    }
    if (o.y - r < box.t) {
      o.y = box.t + r;
      if (o.held) o.vy = Math.max(0, o.vy);
      else if (o.vy < 0) {
        knock(-o.vy);
        o.vy = -o.vy * WALL_BOUNCE;
        o.vr -= Math.sign(o.vx || 1) * 18;
      }
    } else if (o.y + r > box.b) {
      o.y = box.b - r;
      if (o.held) o.vy = Math.min(0, o.vy);
      else if (o.vy > 0) {
        knock(o.vy);
        o.vy = -o.vy * WALL_BOUNCE;
        o.vr += Math.sign(o.vx || 1) * 18;
      }
    }
  };

  /** A carried toy bulldozes its neighbours; resting toys bounce off each other. */
  const shove = (pusher: Live, target: Live, nx: number, ny: number): void => {
    const pv = pusher.vx * nx + pusher.vy * ny;
    if (pv <= 0) return; // not moving into the neighbour
    const tv = target.vx * nx + target.vy * ny;
    const want = Math.max(70, pv * SHOVE);
    if (want > tv) {
      target.vx += nx * (want - tv);
      target.vy += ny * (want - tv);
      target.vr += (Math.random() - 0.5) * 80;
    }
  };

  const collide = (a: Live, b: Live): void => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const min = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return;
    const d = Math.sqrt(d2) || 0.001;
    const nx = dx / d;
    const ny = dy / d;
    const overlap = min - d;

    if (a.held && b.held) {
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      return;
    }
    if (a.held) {
      b.x += nx * overlap;
      b.y += ny * overlap;
      shove(a, b, nx, ny);
      return;
    }
    if (b.held) {
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      shove(b, a, -nx, -ny);
      return;
    }

    const ia = 1 / a.mass;
    const ib = 1 / b.mass;
    const sum = ia + ib;
    a.x -= nx * overlap * (ia / sum);
    a.y -= ny * overlap * (ia / sum);
    b.x += nx * overlap * (ib / sum);
    b.y += ny * overlap * (ib / sum);

    const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn < 0) {
      const j = (-(1 + TOY_BOUNCE) * rvn) / sum;
      a.vx -= j * nx * ia;
      a.vy -= j * ny * ia;
      b.vx += j * nx * ib;
      b.vy += j * ny * ib;
      if (-rvn > 420) knock(-rvn * 0.7);
      const spin = -rvn * 0.02 * (Math.random() < 0.5 ? 1 : -1);
      a.vr += spin;
      b.vr -= spin;
    }
  };

  const step = (now: number): void => {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000));
    last = now;
    const box = area();

    for (const o of toys) {
      if (!o.alive || o.done) continue;
      if (o.held) {
        const k = Math.min(1, dt * FOLLOW);
        const nx = o.x + (o.tx - o.x) * k;
        const ny = o.y + (o.ty - o.y) * k;
        o.vx = (nx - o.x) / dt;
        o.vy = (ny - o.y) / dt;
        o.x = nx;
        o.y = ny;
        const tilt = Math.max(-10, Math.min(10, -o.vx * 0.012));
        o.rot += (tilt - o.rot) * Math.min(1, dt * 12);
        o.vr = 0;
        clampSpeed(o);
      } else {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        const damp = Math.exp(-SLIDE * dt);
        o.vx *= damp;
        o.vy *= damp;
        o.rot += o.vr * dt;
        o.vr *= Math.exp(-SPIN_DAMP * dt);
        // toys lie flat once they stop skittering
        if (Math.hypot(o.vx, o.vy) < 70) o.rot *= Math.exp(-3.4 * dt);
      }
      clampWalls(o, box);
    }

    for (let i = 0; i < toys.length; i++) {
      const a = toys[i]!;
      if (!a.alive || a.done) continue;
      for (let j = i + 1; j < toys.length; j++) {
        const b = toys[j]!;
        if (!b.alive || b.done) continue;
        collide(a, b);
      }
    }

    // Read layout (holes, mouths) before we paint transforms this frame: the
    // games' hit tests then never force a synchronous layout flush.
    for (const o of toys) {
      if (!o.alive || o.done) continue;
      if (o.handlers.onStep?.(o)) o.done = true;
    }

    for (const o of toys) {
      if (!o.alive || o.done) continue;
      clampWalls(o, box);
      clampSpeed(o);
      paint(o);
    }

    const busy = toys.some(
      (o) =>
        o.alive &&
        !o.done &&
        (o.held || Math.hypot(o.vx, o.vy) > REST || Math.abs(o.vr) > 3 || Math.abs(o.rot) > 0.4),
    );
    if (busy) {
      raf = requestAnimationFrame(step);
      return;
    }
    for (const o of toys) {
      if (!o.alive || o.done) continue;
      o.vx = 0;
      o.vy = 0;
      o.vr = 0;
      if (o.rot !== 0) {
        o.rot = 0;
        paint(o);
      }
    }
  };

  const wake = (): void => {
    if (destroyed || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  };

  const release = (o: Live, e: PointerEvent, cancelled: boolean): void => {
    if (!o.held || e.pointerId !== o.pid) return;
    o.held = false;
    o.pid = -1;
    o.el.classList.remove("loose-held");

    const tap = !cancelled && o.moved < 14;
    if (cancelled) {
      o.vx = 0;
      o.vy = 0;
      o.vr = 0;
    }
    clampSpeed(o);
    o.handlers.onDrop?.(o);

    if (tap) {
      o.vx = 0;
      o.vy = 0;
      o.vr = 0;
      o.rot = 0;
      paint(o);
      o.handlers.onTap?.(o);
    } else {
      o.tx = o.x;
      o.ty = o.y;
      // a good flick sends the toy spinning across the table
      const speed = Math.hypot(o.vx, o.vy);
      if (speed > 240) {
        o.vr = Math.max(-380, Math.min(380, speed * 0.09)) * (Math.random() < 0.5 ? -1 : 1);
      }
    }
    wake();
  };

  const add = (
    el: HTMLElement,
    handlers: LooseHandlers = {},
    at?: { x: number; y: number },
  ): LooseObject => {
    const rect = el.getBoundingClientRect();
    const w = rect.width || el.offsetWidth || 80;
    const h = rect.height || el.offsetHeight || 80;
    const o: Live = {
      el,
      x: at?.x ?? rect.left + rect.width / 2,
      y: at?.y ?? rect.top + rect.height / 2,
      vx: 0,
      vy: 0,
      rot: 0,
      vr: 0,
      w,
      h,
      r: (Math.max(w, h) / 2) * 0.88,
      mass: Math.max(1, (w * h) / 1000),
      held: false,
      done: false,
      alive: true,
      handlers,
      pid: -1,
      offX: 0,
      offY: 0,
      tx: 0,
      ty: 0,
      downX: 0,
      downY: 0,
      downAt: 0,
      moved: 0,
    };
    o.tx = o.x;
    o.ty = o.y;

    el.classList.add("loose");
    el.style.margin = "0";
    el.style.zIndex = String(topZ++);
    el.style.transform = "";
    layer.append(el);
    paint(o);

    const down = (e: PointerEvent): void => {
      if (o.done || !o.alive) return;
      if (o.handlers.canGrab && !o.handlers.canGrab(o)) return;
      e.preventDefault();
      o.held = true;
      o.pid = e.pointerId;
      o.offX = e.clientX - o.x;
      o.offY = e.clientY - o.y;
      o.tx = o.x;
      o.ty = o.y;
      o.downX = e.clientX;
      o.downY = e.clientY;
      o.downAt = performance.now();
      o.moved = 0;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      el.classList.add("loose-held");
      el.style.zIndex = String(topZ++);
      o.vx = 0;
      o.vy = 0;
      o.vr = 0;
      o.handlers.onGrab?.(o);
      wake();
    };

    const move = (e: PointerEvent): void => {
      if (!o.held || e.pointerId !== o.pid) return;
      e.preventDefault();
      o.tx = e.clientX - o.offX;
      o.ty = e.clientY - o.offY;
      o.moved = Math.max(o.moved, Math.hypot(e.clientX - o.downX, e.clientY - o.downY));
      o.handlers.onDrag?.(o);
      wake();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", (e) => release(o, e, false));
    el.addEventListener("pointercancel", (e) => release(o, e, true));
    el.addEventListener("lostpointercapture", (e) => release(o, e, true));

    toys.push(o);
    return o;
  };

  const remove = (o: LooseObject): void => {
    o.alive = false;
    const i = toys.findIndex((t) => t === o);
    if (i >= 0) toys.splice(i, 1);
    o.el.remove();
  };

  const clear = (): void => {
    for (const o of toys) {
      o.alive = false;
      o.el.remove();
    }
    toys.length = 0;
  };

  const onResize = (): void => {
    const box = area();
    for (const o of toys) {
      if (!o.alive || o.done) continue;
      // toys size themselves from CSS (vmin), so follow the new viewport
      if (o.el.isConnected) {
        o.w = o.el.offsetWidth || o.w;
        o.h = o.el.offsetHeight || o.h;
        o.r = (Math.max(o.w, o.h) / 2) * 0.88;
        o.mass = Math.max(1, (o.w * o.h) / 1000);
      }
      clampWalls(o, box);
      paint(o);
    }
    wake();
  };
  window.addEventListener("resize", onResize);

  const kick = (o: LooseObject, vx: number, vy: number, spin: number): void => {
    if (!o.alive || o.done || o.held) return;
    o.vx += vx;
    o.vy += vy;
    o.vr += spin;
    clampSpeed(o as Live);
    wake();
  };

  return {
    layer,
    add,
    remove,
    clear,
    kick,
    destroy: () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("resize", onResize);
      clear();
      layer.remove();
    },
  };
}
