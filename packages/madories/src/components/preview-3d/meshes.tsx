import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { MATERIALS, type MaterialKey } from "./config";
import type { Box3D } from "./scene-model";

export function useSharedMaterials(darkMode: boolean): Map<MaterialKey, MeshStandardMaterial> {
  const map = useMemo(() => {
    const m = new Map<MaterialKey, MeshStandardMaterial>();
    for (const [key, def] of Object.entries(MATERIALS)) {
      m.set(
        key as MaterialKey,
        new MeshStandardMaterial({
          color: darkMode ? def.dark : def.light,
          metalness: def.metalness,
          opacity: def.opacity ?? 1,
          roughness: def.roughness,
          transparent: def.opacity !== undefined,
        }),
      );
    }
    return m;
  }, [darkMode]);

  // Dispose old GPU resources when materials are replaced or unmounted
  useEffect(
    () => () => {
      for (const material of map.values()) material.dispose();
    },
    [map],
  );

  return map;
}

interface BoxListProps {
  boxes: Box3D[];
  materials: Map<MaterialKey, MeshStandardMaterial>;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export function BoxList({ boxes, materials, castShadow, receiveShadow }: BoxListProps) {
  return (
    <>
      {boxes.map((box, i) => (
        <mesh
          key={i}
          position={box.position}
          material={materials.get(box.materialKey)}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        >
          <boxGeometry args={box.size} />
        </mesh>
      ))}
    </>
  );
}
