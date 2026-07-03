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
import { CAMERA, LIGHTING } from "./config";
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
  const camDist = maxDim * CAMERA.distanceFactor;
  const bg = darkMode ? "#1a1a1a" : "#eceae6";
  const [dirX, dirY, dirZ] = LIGHTING.directional.positionFactor;

  return (
    <Canvas
      shadows
      style={{ background: bg, inset: 0, position: "absolute", touchAction: "none" }}
      gl={{ alpha: false, antialias: true }}
    >
      <PerspectiveCamera makeDefault fov={CAMERA.fov} position={[0, camDist, camDist]} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minPolarAngle={CAMERA.minPolarAngle}
        maxPolarAngle={CAMERA.maxPolarAngle}
        minDistance={maxDim * CAMERA.minDistanceFactor}
        maxDistance={maxDim * CAMERA.maxDistanceFactor}
        enableDamping
        dampingFactor={0.1}
      />
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
