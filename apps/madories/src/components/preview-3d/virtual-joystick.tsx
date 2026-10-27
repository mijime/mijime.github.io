import { useRef, type TouchEvent } from "react";

interface Props {
  // 移動入力の共有ref。x=-1(左)..1(右), z=-1(後)..1(前)
  move: React.MutableRefObject<{ x: number; z: number }>;
}

const RADIUS = 56; // ジョイスティックの可動半径(px)

function findTouch(list: React.TouchList, id: number): React.Touch | null {
  for (let i = 0; i < list.length; i++) {
    if (list.item(i)?.identifier === id) return list.item(i);
  }
  return null;
}

/**
 * スマホ用の仮想ジョイスティック。左下に固定表示され、タッチドラッグで
 * カメラの水平移動量(x/z)を move ref に書き込む。離すと中心に戻る。
 */
export function VirtualJoystick({ move }: Props) {
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const reset = () => {
    move.current = { x: 0, z: 0 };
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t || activeId.current !== null) return;
    activeId.current = t.identifier;
    origin.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchMove = (e: TouchEvent) => {
    if (activeId.current === null) return;
    const t = findTouch(e.touches, activeId.current);
    if (!t) return;
    let dx = t.clientX - origin.current.x;
    let dy = t.clientY - origin.current.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    // 画面上で上へドラッグ=前進(z>0)。yは画面下向きなので反転
    move.current = { x: dx / RADIUS, z: -dy / RADIUS };
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const end = (e: TouchEvent) => {
    // 全指が離れたらリセット
    if (e.touches.length === 0) {
      activeId.current = null;
      reset();
    }
  };

  return (
    <div
      className="touch-none"
      onTouchCancel={end}
      onTouchEnd={end}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
      style={{
        alignItems: "center",
        background: "rgba(0,0,0,0.25)",
        borderRadius: "50%",
        boxSizing: "border-box",
        display: "flex",
        height: RADIUS * 2,
        justifyContent: "center",
        left: "28px",
        margin: 0,
        padding: 0,
        position: "absolute",
        bottom: "40px",
        touchAction: "none",
        userSelect: "none",
        width: RADIUS * 2,
        zIndex: 20,
      }}
    >
      <div
        ref={knobRef}
        style={{
          background: "rgba(255,255,255,0.7)",
          borderRadius: "50%",
          height: RADIUS * 0.7,
          touchAction: "none",
          width: RADIUS * 0.7,
        }}
      />
    </div>
  );
}
