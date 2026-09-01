import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { FloorPlan } from "../../types";
import { type CameraMode, CAMERA, LIGHTING } from "./config";
import { BoxList, useSharedMaterials } from "./meshes";
import { buildBuildingScene } from "./scene-model";
import { WalkControls } from "./walk-controls";

interface Props {
  floors: FloorPlan[];
  cameraMode: CameraMode;
  // ウォーキング時に入力(キー/ジョイスティック合成)を渡す共有ref
  move: React.MutableRefObject<{ x: number; z: number }>;
  darkMode: boolean;
}

type OrbitHandle = React.ElementRef<typeof OrbitControls>;

// 俯瞰モードのジョイスティックパン: OrbitControls の target とカメラを水平に動かす
function OrbitPan({
  controls,
  move,
  panSpeed,
}: {
  controls: React.RefObject<OrbitHandle | null>;
  move: React.MutableRefObject<{ x: number; z: number }>;
  panSpeed: number;
}) {
  const { camera } = useThree();
  const right = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, frameDelta) => {
    const c = controls.current;
    if (!c) return;
    const { x, z } = move.current;
    if (x === 0 && z === 0) return;
    // カメラの右ベクトルと、水平投影した前方ベクトルで移動方向を作る
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) return;
    fwd.normalize();
    right.set(fwd.z, 0, -fwd.x); // -Z前方からの右=+X方向
    const step = panSpeed * frameDelta;
    delta
      .set(0, 0, 0)
      .addScaledVector(fwd, z * step)
      .addScaledVector(right, x * step);
    camera.position.add(delta);
    c.target.add(delta);
  });
  return null;
}

export function FloorPlanScene({ floors, cameraMode, move, darkMode }: Props) {
  // 全階を縦に積んだモデルを1回だけ構築
  const model = useMemo(() => buildBuildingScene(floors), [floors]);
  const materials = useSharedMaterials(darkMode);

  const maxDim = Math.max(model.bounds.width, model.bounds.depth);
  const camDist = maxDim * CAMERA.distanceFactor;
  const bg = darkMode ? "#1a1a1a" : "#eceae6";
  const [dirX, dirY, dirZ] = LIGHTING.directional.positionFactor;
  const orbitRef = useRef<OrbitHandle>(null);
  const panSpeed = maxDim * CAMERA.panSpeedFactor;

  return (
    <Canvas
      shadows
      style={{ background: bg, inset: 0, position: "absolute", touchAction: "none" }}
      gl={{ alpha: false, antialias: true }}
    >
      <PerspectiveCamera makeDefault fov={CAMERA.fov} position={[0, camDist, camDist]} />
      {cameraMode === "orbit" ? (
        <>
          <OrbitControls
            ref={orbitRef}
            makeDefault
            enablePan={false}
            minPolarAngle={CAMERA.minPolarAngle}
            maxPolarAngle={CAMERA.maxPolarAngle}
            minDistance={maxDim * CAMERA.minDistanceFactor}
            maxDistance={maxDim * CAMERA.maxDistanceFactor}
            enableDamping
            dampingFactor={0.1}
          />
          <OrbitPan controls={orbitRef} move={move} panSpeed={panSpeed} />
        </>
      ) : (
        <WalkControls model={model} move={move} />
      )}
      <ambientLight
        intensity={darkMode ? LIGHTING.ambientIntensity.dark : LIGHTING.ambientIntensity.light}
      />
      <directionalLight
        castShadow
        position={[maxDim * dirX, maxDim * dirY, maxDim * dirZ]}
        intensity={
          darkMode ? LIGHTING.directional.intensity.dark : LIGHTING.directional.intensity.light
        }
        shadow-mapSize={LIGHTING.directional.shadowMapSize}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
        shadow-camera-far={maxDim * LIGHTING.directional.shadowCameraFarFactor}
        shadow-bias={LIGHTING.directional.shadowBias}
      />
      {/* CDNプリセットは使わずLightformerで環境反射を作る(オフライン要件) */}
      <Environment resolution={64}>
        <Lightformer
          intensity={
            darkMode
              ? LIGHTING.lightformers[0].intensity.dark
              : LIGHTING.lightformers[0].intensity.light
          }
          position={LIGHTING.lightformers[0].position}
          scale={LIGHTING.lightformers[0].scale}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={
            darkMode
              ? LIGHTING.lightformers[1].intensity.dark
              : LIGHTING.lightformers[1].intensity.light
          }
          position={LIGHTING.lightformers[1].position}
          scale={LIGHTING.lightformers[1].scale}
          rotation-y={Math.PI / 2}
        />
      </Environment>
      <ContactShadows
        position={[0, LIGHTING.contactShadows.y, 0]}
        opacity={
          darkMode ? LIGHTING.contactShadows.opacity.dark : LIGHTING.contactShadows.opacity.light
        }
        scale={maxDim * LIGHTING.contactShadows.scaleFactor}
        blur={LIGHTING.contactShadows.blur}
        far={LIGHTING.contactShadows.far}
        resolution={LIGHTING.contactShadows.resolution}
      />
      <BoxList boxes={model.floors} materials={materials} receiveShadow />
      <BoxList boxes={model.walls} materials={materials} castShadow receiveShadow />
      <BoxList boxes={model.items} materials={materials} castShadow receiveShadow />
    </Canvas>
  );
}
