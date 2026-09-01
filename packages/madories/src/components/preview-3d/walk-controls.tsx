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
        // ヨー固定: 常に-Z(建物正面)を見る。ピッチも水平にリセットしないと、
        // 俯瞰(OrbitControls)が残した下向きが残って「真下」に見える
        camera.rotation.set(0, 0, 0);
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

/** 視点回転: ポインタ/タッチドラッグでカメラのヨー・ピッチを直接回す */
function PointerLook({ camera }: { camera: THREE.Camera }) {
  const { gl } = useThree();
  const el = gl.domElement;
  const drag = useRef({ id: null as number | null, lastY: 0 });

  useEffect(
    () => {
      camera.rotation.order = "YXZ";
      const down = (e: PointerEvent) => {
        // マウスは左/右ボタン、またはタッチで開始
        if (e.pointerType === "touch" || e.buttons === 1 || e.buttons === 2) {
          drag.current.id = e.pointerId;
          drag.current.lastY = e.clientY;
        }
      };
      const onMove = (e: PointerEvent) => {
        if (drag.current.id !== e.pointerId) return;
        const dy = e.clientY - drag.current.lastY;
        drag.current.lastY = e.clientY;
        // ヨー(rotation.y)は固定し、ただの上下(ピッチ)だけを見回す。
        // 常に真正面(一つ目の向き)を見たまま歩く
        const sens = e.pointerType === "touch" ? 0.01 : 0.0025;
        camera.rotation.x -= dy * sens;
        camera.rotation.y = 0;
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

    // ヨー固定(=0): 前方は常に-Z、右は+X。衝突後に壁に沿って滑らせる
    const step = WALK.moveSpeedMps * delta;
    STRAFE.set(s, 0, -f).normalize().multiplyScalar(step);
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
