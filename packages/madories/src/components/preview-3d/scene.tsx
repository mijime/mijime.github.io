import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { FloorPlan } from "../../types";
import { generateFloorTiles, generateWallSegments } from "../../floor/geometry-3d";
import { PreviewCamera } from "./camera";
import { Lighting } from "./lighting";
import { FloorMesh } from "./meshes/floor-mesh";
import { WallMesh } from "./meshes/wall-mesh";

interface Props {
  floor: FloorPlan;
  cellSize: number;
  darkMode: boolean;
}

export function FloorPlanScene({ floor, cellSize, darkMode }: Props) {
  const [status, setStatus] = useState<string>("initializing");
  const [err, setErr] = useState<string | null>(null);

  const tiles = useMemo(() => generateFloorTiles(floor), [floor]);
  const walls = useMemo(() => generateWallSegments(floor), [floor]);

  const offsetX = (floor.width * cellSize) / 2 - cellSize / 2;
  const offsetZ = (floor.height * cellSize) / 2 - cellSize / 2;

  const bg = darkMode ? "#1a1a1a" : "#f5f5f5";

  return (
    <>
      {err && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            color: "#ff4444",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "14px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>3D Error</div>
            <div>{err}</div>
          </div>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 10,
          background: "rgba(0,0,0,0.6)",
          color: "#0f0",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "11px",
          padding: "4px 8px",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      >
        3D: {status}
      </div>
      <Canvas
        style={{ background: bg, position: "absolute", inset: 0, touchAction: "none" }}
        onCreated={() => setStatus("created")}
        gl={{ antialias: true, alpha: false }}
        onError={(e) => {
          setStatus("error");
          setErr(String(e));
        }}
      >
        <PreviewCamera width={floor.width} height={floor.height} cellSize={cellSize} />
        <Lighting darkMode={darkMode} />
        <mesh position={[0, 50, 0]}>
          <boxGeometry args={[100, 100, 100]} />
          <meshBasicMaterial color="red" />
        </mesh>
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
        </group>
      </Canvas>
    </>
  );
}
