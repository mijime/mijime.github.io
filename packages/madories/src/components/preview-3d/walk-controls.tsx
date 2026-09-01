import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FloorPlan } from "../../types";
import { CM_TO_M, WALK } from "./config";

interface Props {
  floors: FloorPlan[];
}

const FWD = new THREE.Vector3();
const STRAFE = new THREE.Vector3();

/**
 * 一人称(ウォーキング)モード。
 * クリックで視点ロック → WASD/矢印キーで前後左右へ、マウスで視点回転。
 * 壁衝突はしない(スコープ外)。カメラは常に地面に沿った目線高さを保つ。
 */
export function WalkControls({ floors }: Props) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});

  // ビル全体の中心を建物bboxから求める。1階の床は必ずある前提
  const footprint = floors[0] ?? null;

  // 初期位置: 最下階の目線高さ、中央からやや手前
  useEffect(() => {
    if (!footprint) return;
    const halfD = ((footprint.height * 91) / 2) * CM_TO_M;
    camera.position.set(0, WALK.eyeHeightCm * CM_TO_M, halfD * WALK.initialOffsetFactor);
    camera.rotation.order = "YXZ";
  }, [camera, footprint]);

  const onKeyDown = (e: KeyboardEvent) => {
    keys.current[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.current[e.code] = false;
  };

  useEffect(() => {
    // キー入力はウィンドウ(キャンバス外でも反応)へ、ポインターロック解除で戻る時の時計回りを防ぐ
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const k = keys.current;
    const f = (k["KeyW"] || k["ArrowUp"] ? 1 : 0) - (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
    const s = (k["KeyD"] || k["ArrowRight"] ? 1 : 0) - (k["KeyA"] || k["ArrowLeft"] ? 1 : 0);
    if (f === 0 && s === 0) return;
    // ヨー(y)に沿って水平移動し、ピッチは無視(歩行移動)
    camera.getWorldDirection(FWD);
    const yaw = Math.atan2(FWD.x, FWD.z);
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const step = WALK.moveSpeedMps * delta;
    // 前(+F)と横(+S:右)の合成は、カメラのXY回転を水平投影
    STRAFE.set(sin * f + cos * s, 0, cos * f - sin * s);
    if (STRAFE.lengthSq() > 0) STRAFE.normalize().multiplyScalar(step);
    camera.position.add(STRAFE);
  });

  // Footprintが無い(ビル空)なら何も描かない
  if (!footprint) return null;
  return <PointerLockControls makeDefault />;
}
