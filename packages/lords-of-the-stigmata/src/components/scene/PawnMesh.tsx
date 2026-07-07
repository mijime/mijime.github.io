import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PCOLORS } from "../../data/players.ts";

interface PawnMeshProps {
  type: "ac" | "ap";
  owner: number;
  dim?: boolean;
  position?: [number, number, number];
  scale?: number;
  spawnScale?: number;
}

const PawnMesh = React.memo(
  ({
    type,
    owner,
    dim = false,
    position = [0, 0, 0],
    scale = 1,
    spawnScale = 0.01,
  }: PawnMeshProps) => {
    const color = PCOLORS[owner];

    const brightMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.05,
          emissive: new THREE.Color(color).multiplyScalar(0.08),
        }),
      [color],
    );

    const dimMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0.1,
          transparent: true,
          opacity: 0.38,
          emissive: new THREE.Color(color).multiplyScalar(0.1),
        }),
      [color],
    );

    const baseMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.05,
          emissive: new THREE.Color(color).multiplyScalar(0.08),
        }),
      [color],
    );

    const haloMat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color: 0xc9a437,
          emissive: 0x3a2200,
          emissiveIntensity: 0.2,
          roughness: 0.25,
          metalness: 0.9,
        }),
      [],
    );

    const mat = dim ? dimMat : brightMat;

    const groupRef = useRef<THREE.Group>(null);
    const spawned = useRef(false);

    useFrame((_, dt) => {
      const g = groupRef.current;
      if (!g) return;
      if (!spawned.current) {
        // 降下スポーン: spawnScale===1は退場コマ（動かさない）、それ以外は上空から降下
        if (spawnScale === 1) {
          g.position.set(position[0], position[1], position[2]);
        } else {
          g.position.set(position[0], position[1] + 4, position[2]);
        }
        g.scale.setScalar(spawnScale);
        spawned.current = true;
      }
      const k = Math.min(1, dt * 8);
      g.position.lerp(new THREE.Vector3(position[0], position[1], position[2]), k);
      const s = THREE.MathUtils.lerp(g.scale.x, scale, Math.min(1, dt * 7));
      g.scale.setScalar(s);
    });

    return (
      <group ref={groupRef} position={position} scale={[spawnScale, spawnScale, spawnScale]}>
        <mesh position={[0, 0.035, 0]} material={dim ? dimMat : baseMat} castShadow>
          <cylinderGeometry args={[0.36, 0.4, 0.07, 18]} />
        </mesh>

        {type === "ac" ? (
          <>
            <mesh position={[0, 0.4, 0]} material={mat} castShadow>
              <coneGeometry args={[0.26, 0.62, 32]} />
            </mesh>
            <mesh position={[0, 0.78, 0]} material={mat} castShadow>
              <sphereGeometry args={[0.155, 32, 16]} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0.48, 0]} material={mat} castShadow>
              <cylinderGeometry args={[0.17, 0.34, 0.78, 32]} />
            </mesh>
            <mesh position={[0, 1.0, 0]} material={mat} castShadow>
              <sphereGeometry args={[0.185, 32, 16]} />
            </mesh>
            <mesh
              position={[0, 1.25, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              material={haloMat}
              castShadow
            >
              <torusGeometry args={[0.24, 0.032, 24, 64]} />
            </mesh>
          </>
        )}
      </group>
    );
  },
);

PawnMesh.displayName = "PawnMesh";

export { PawnMesh };
