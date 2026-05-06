import { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { FloorPlan } from "../../types";
import { generateFloorTiles, generateWallSegments } from "../../floor/geometry-3d";
import { PreviewCamera } from "./camera";
import { Lighting } from "./lighting";
import { FloorMesh } from "./meshes/floor-mesh";
import { WallMesh } from "./meshes/wall-mesh";
import { FurnitureMesh } from "./meshes/furniture-mesh";
import { StairsMesh } from "./meshes/stairs-mesh";
import { dedupFloorItems } from "./dedup-items";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

export function FloorPlanScene({ floor, cellSize, darkMode }: Props) {
  const tiles = useMemo(() => generateFloorTiles(floor), [floor]);
  const walls = useMemo(() => generateWallSegments(floor), [floor]);
  const items = useMemo(() => dedupFloorItems(floor), [floor]);

  const offsetX = (floor.width * cellSize) / 2 - cellSize / 2;
  const offsetZ = (floor.height * cellSize) / 2 - cellSize / 2;

  const bg = darkMode ? "#1a1a1a" : "#fafaf8";

  const maxDim = Math.max(floor.width, floor.height);

  return (
    <>
      <Canvas
        style={{ background: bg, position: "absolute", inset: 0, touchAction: "none" }}
        gl={{ antialias: true, alpha: false }}
        scene={{ background: new THREE.Color(bg) }}
      >
        <PreviewCamera width={floor.width} height={floor.height} cellSize={cellSize} />
        <Lighting darkMode={darkMode} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.1}
          minDistance={cellSize * 3}
          maxDistance={cellSize * maxDim * 2}
          enableDamping
          dampingFactor={0.1}
        />
        <group position={[-offsetX, 0, -offsetZ]}>
          {tiles.map((tile) => (
            <FloorMesh
              key={`floor-${tile.cx}-${tile.cy}`}
              cx={tile.cx}
              cy={tile.cy}
              cellSize={cellSize}
              floorType={tile.floorType}
              darkMode={darkMode}
            />
          ))}
          {walls.map((wall, i) => (
            <WallMesh
              key={`wall-${wall.cx}-${wall.cy}-${wall.edge}-${i}`}
              cx={wall.cx}
              cy={wall.cy}
              cellSize={cellSize}
              edge={wall.edge}
              wallType={wall.wallType}
              darkMode={darkMode}
            />
          ))}
          {items.map((it, i) => {
            if (!it.item) return null;
            return it.item.type === "stairs" ? (
              <StairsMesh
                key={`item-${it.x}-${it.y}-${i}`}
                x={it.x}
                y={it.y}
                cellSize={cellSize}
                item={it.item}
                darkMode={darkMode}
              />
            ) : (
              <FurnitureMesh
                key={`item-${it.x}-${it.y}-${i}`}
                x={it.x}
                y={it.y}
                cellSize={cellSize}
                item={it.item}
                darkMode={darkMode}
              />
            );
          })}
        </group>
      </Canvas>
    </>
  );
}
