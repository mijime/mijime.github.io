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

/**
 * 一人称(ウォーキング)モード。
 * ドラッグ(マウス/タッチ共通)で視点回転、移動はキー(WASD/矢印)と
 * 仮想ジョイスティックの合成。本壁(solid/glass)との衝突判定あり。
 * 目線高さは保ち、水平移動のみ。
 */
export function WalkControls({ model, move }: Props) {
  const { camera } = useThree();
  const initial = useMemo(() => initialEye(model), [model]);

  // 初期位置: 最下階の目線高さ、平面中央から少し手前
  useEffect(
    () => {
      if (initial) {
        camera.position.set(initial.x, WALK.eyeHeightCm * CM_TO_M, initial.z);
        camera.rotation.order = "YXZ";
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera, initial],
  );

  return (
    <>
      <PointerLook camera={camera} />
      <WalkMove camera={camera} move={move} walls={model.walls} />
    </>
  );
}

function initialEye(model: SceneModel): { x: number; z: number } | null {
  // 1階の高さが見えているときはその床中心基準(最下部の床スラブ上面)
  const floorBox = model.floors[0];
  if (!floorBox) return null;
  return { x: floorBox.position[0], z: floorBox.position[2] };
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
        // 上下の見上げ/見下ろしを制限
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
