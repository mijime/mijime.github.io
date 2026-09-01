import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FloorPlan } from "../../types";
import { CELL_CM, CM_TO_M, WALK } from "./config";

interface Props {
  floors: FloorPlan[];
  // 移動入力。キーと仮想ジョイスティックの合成結果を参照
  move: React.MutableRefObject<{ x: number; z: number }>;
}

const FWD = new THREE.Vector3();
const STRAFE = new THREE.Vector3();

/**
 * 一人称(ウォーキング)モード。
 * ドラッグ(マウス/タッチ共通)で視点回転、移動はキー(WASD/矢印)と
 * 仮想ジョイスティックの合成。壁衝突なし。目線高さは保ち、水平移動のみ。
 */
export function WalkControls({ floors, move }: Props) {
  const { camera } = useThree();
  const footprint = floors[0] ?? null;

  // 初期位置: 最下階の目線高さ、中央からやや手前
  useEffect(
    () => {
      if (!footprint) return;
      const halfD = ((footprint.height * CELL_CM) / 2) * CM_TO_M;
      camera.position.set(0, WALK.eyeHeightCm * CM_TO_M, halfD * WALK.initialOffsetFactor);
      camera.rotation.order = "YXZ";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera, footprint],
  );

  return (
    <>
      <PointerLook camera={camera} />
      <WalkMove camera={camera} move={move} />
    </>
  );
}

/** 視点回転: ポインタ/タッチドラッグでカメラのヨー・ピッチを直接回す */
function PointerLook({ camera }: { camera: THREE.Camera }) {
  const { gl } = useThree();
  const el = gl.domElement;
  const drag = useRef({ id: null as number | null, lastX: 0, lastY: 0 });

  useEffect(
    () => {
      camera.rotation.order = "YXZ";
      const down = (e: PointerEvent) => {
        // マウスは左/右ボタン、またはタッチで開始
        if (e.pointerType === "touch" || e.buttons === 1 || e.buttons === 2) {
          drag.current.id = e.pointerId;
          drag.current.lastX = e.clientX;
          drag.current.lastY = e.clientY;
        }
      };
      const onMove = (e: PointerEvent) => {
        if (drag.current.id !== e.pointerId) return;
        const dx = e.clientX - drag.current.lastX;
        const dy = e.clientY - drag.current.lastY;
        drag.current.lastX = e.clientX;
        drag.current.lastY = e.clientY;
        // マウス感度(rad/px)。タッチは移動量が小さいので大きめに補正
        const sens = e.pointerType === "touch" ? 0.01 : 0.0025;
        camera.rotation.y -= dx * sens;
        camera.rotation.x -= dy * sens;
        // 上下の見上げ/見下ろしを制限(壁衝突なしのため純粋に見回すだけ)
        const maxPitch = 1.5;
        camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, camera.rotation.x));
      };
      const up = (e: PointerEvent) => {
        if (drag.current.id === e.pointerId) drag.current.id = null;
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      return () => {
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [el],
  );

  return null;
}

/** 移動: キー(WASD/矢印)と仮想ジョイスティックの合成で水平移動 */
function WalkMove({
  camera,
  move,
}: {
  camera: THREE.Camera;
  move: React.MutableRefObject<{ x: number; z: number }>;
}) {
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const k = keys.current;
    const kf = (k["KeyW"] || k["ArrowUp"] ? 1 : 0) - (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
    const ks = (k["KeyD"] || k["ArrowRight"] ? 1 : 0) - (k["KeyA"] || k["ArrowLeft"] ? 1 : 0);
    // キー入力を優先し、なければジョイスティック値
    const f = kf === 0 ? move.current.z : kf;
    const s = ks === 0 ? move.current.x : ks;
    if (f === 0 && s === 0) return;
    // ヨーに沿って水平移動(ピッチは無視)
    camera.getWorldDirection(FWD);
    const yaw = Math.atan2(FWD.x, FWD.z);
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const step = WALK.moveSpeedMps * delta;
    STRAFE.set(sin * f + cos * s, 0, cos * f - sin * s);
    if (STRAFE.lengthSq() > 0) STRAFE.normalize().multiplyScalar(step);
    camera.position.add(STRAFE);
  });

  return null;
}
