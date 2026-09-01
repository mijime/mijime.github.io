import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildWallColliders, resolveCollision } from "./collision";
import { CM_TO_M, WALK } from "./config";
import type { Box3D, SceneModel } from "./scene-model";

interface Props {
  model: SceneModel;
  // 移動入力。キーと仮想ジョイスティックの合成結果を参照
  move: React.MutableRefObject<{ x: number; z: number }>;
}

const FWD = new THREE.Vector3();
const STRAFE = new THREE.Vector3();

/** タッチ操作が可能か(pointer lockはマウスのみなので、タッチではドラッグ方式に切替) */
export function isTouchPointer(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 0;
}

/**
 * 一人称(ウォーキング)モード。
 * - デスクトップ: PointerLockControls(既存機能)でマウスの移動デルタによる視点回転
 * - タッチ: PointerLockAPIが使えないためドラッグで視点回転+仮想ジョイスティックで移動
 * 移動・壁衝突は共通。目線高さは保ち、水平移動のみ。
 */
export function WalkControls({ model, move }: Props) {
  const { camera, gl } = useThree();
  const initial = useMemo(() => initialEye(model), [model]);
  const touch = useMemo(() => isTouchPointer(), []);

  // 初期位置: 最下階の目線高さ、平面中央から少し手前
  useEffect(
    () => {
      if (initial) {
        camera.position.set(initial.x, WALK.eyeHeightCm * CM_TO_M, initial.z);
        camera.rotation.order = "YXZ";
        // 開始時は常に水平の正面(-Z)を向く
        camera.rotation.set(0, 0, 0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera, initial],
  );

  return (
    <>
      {touch ? (
        <PointerLook camera={camera} />
      ) : (
        <PointerLockControls
          camera={camera}
          makeDefault
          domElement={gl.domElement}
          pointerSpeed={WALK.pointerSpeed}
        />
      )}
      <WalkMove camera={camera} move={move} walls={model.walls} />
    </>
  );
}

function initialEye(model: SceneModel): { x: number; z: number } | null {
  // 最下階の全床スラブの重心(建物内中央)に置く。floors[0]だけだと左上寄りのセルになり外側に見える
  if (model.floors.length === 0) return null;
  let sx = 0;
  let sz = 0;
  for (const f of model.floors) {
    sx += f.position[0];
    sz += f.position[2];
  }
  return { x: sx / model.floors.length, z: sz / model.floors.length };
}

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
          // ポインタをキャプチャ: キャンバス外へドラッグしても追従し続け、
          // ドラッグ量に応じて回転が続く(俯瞰のOrbitControlsと同じ振る舞い)
          el.setPointerCapture?.(e.pointerId);
        }
      };
      const onMove = (e: PointerEvent) => {
        if (drag.current.id !== e.pointerId) return;
        const dx = e.clientX - drag.current.lastX;
        const dy = e.clientY - drag.current.lastY;
        drag.current.lastX = e.clientX;
        drag.current.lastY = e.clientY;
        // ドラッグのデルタを直接カメラへ反映(俯瞰のOrbitControlsと同じ即応)
        // 感度は俯瞰の視点回転と同等以上の量になるよう設定
        const sens = e.pointerType === "touch" ? 0.012 : 0.006;
        camera.rotation.y -= dx * sens;
        camera.rotation.x -= dy * sens;
        // 上下の見上げ/見下ろしを制限
        const maxPitch = 1.5;
        camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, camera.rotation.x));
      };
      const up = (e: PointerEvent) => {
        if (drag.current.id === e.pointerId) {
          drag.current.id = null;
          el.releasePointerCapture?.(e.pointerId);
        }
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

/** 移動: キー/ジョイスティックの合成で水平移動し、本壁に衝突したら停止 */
function WalkMove({
  camera,
  move,
  walls,
}: {
  camera: THREE.Camera;
  move: React.MutableRefObject<{ x: number; z: number }>;
  walls: Box3D[];
}) {
  const keys = useRef<Record<string, boolean>>({});
  const colliders = useMemo(() => buildWallColliders(walls), [walls]);

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
    const f = kf === 0 ? move.current.z : kf;
    const s = ks === 0 ? move.current.x : ks;
    if (f === 0 && s === 0) return;

    // ヨーに沿って水平移動(ピッチは無視)。衝突後に壁に沿って滑らせる
    camera.getWorldDirection(FWD);
    const yaw = Math.atan2(FWD.x, FWD.z);
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const step = WALK.moveSpeedMps * delta;
    STRAFE.set(sin * f + cos * s, 0, cos * f - sin * s)
      .normalize()
      .multiplyScalar(step);
    const crashed = resolveCollision(
      { x: camera.position.x, z: camera.position.z },
      STRAFE.x,
      STRAFE.z,
      WALK.playerRadiusM,
      colliders,
    );
    camera.position.x = crashed.x;
    camera.position.z = crashed.z;
  });

  return null;
}
