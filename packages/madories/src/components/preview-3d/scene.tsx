import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { FloorPlan } from "../../types";
import { BoxList, useSharedMaterials } from "./meshes";
import { buildSceneModel } from "./scene-model";

interface Props {
  floor: FloorPlan;
  darkMode: boolean;
}

export function FloorPlanScene({ floor, darkMode }: Props) {
  const model = useMemo(() => buildSceneModel(floor), [floor]);
  const materials = useSharedMaterials(darkMode);

  const maxDim = Math.max(model.bounds.width, model.bounds.depth);
  const camDist = maxDim * 1.1;
  const bg = darkMode ? "#1a1a1a" : "#eceae6";

  return (
    <Canvas
      shadows
      style={{ background: bg, inset: 0, position: "absolute", touchAction: "none" }}
      gl={{ alpha: false, antialias: true }}
    >
      <PerspectiveCamera makeDefault fov={45} position={[0, camDist, camDist]} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.15}
        minDistance={maxDim * 0.3}
        maxDistance={maxDim * 2.5}
        enableDamping
        dampingFactor={0.1}
      />
      <ambientLight intensity={darkMode ? 0.3 : 0.45} />
      <directionalLight
        castShadow
        position={[maxDim * 0.6, maxDim * 1.2, maxDim * 0.4]}
        intensity={darkMode ? 1.2 : 1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
        shadow-camera-far={maxDim * 4}
        shadow-bias={-0.0002}
      />
      {/* CDNプリセットは使わずLightformerで環境反射を作る(オフライン要件) */}
      <Environment resolution={64}>
        <Lightformer
          intensity={darkMode ? 0.5 : 1}
          position={[0, 5, 0]}
          scale={[10, 10, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={darkMode ? 0.2 : 0.5}
          position={[-5, 1, -1]}
          scale={[10, 2, 1]}
          rotation-y={Math.PI / 2}
        />
      </Environment>
      <ContactShadows
        position={[0, -0.051, 0]}
        opacity={darkMode ? 0.5 : 0.35}
        scale={maxDim * 1.6}
        blur={2}
        far={3}
        resolution={512}
      />
      <BoxList boxes={model.floors} materials={materials} receiveShadow />
      <BoxList boxes={model.walls} materials={materials} castShadow receiveShadow />
      <BoxList boxes={model.items} materials={materials} castShadow receiveShadow />
    </Canvas>
  );
}
