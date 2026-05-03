import { useRef } from "react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

interface Props {
  width: number;
  height: number;
  cellSize: number;
}

export function PreviewCamera({ width, height, cellSize }: Props) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const maxDim = Math.max(width, height);
  const distance = maxDim * cellSize * 0.8;
  const maxDistance = maxDim * cellSize * 2;
  const minDistance = cellSize * 3;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, distance, distance]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 4}
        minDistance={minDistance}
        maxDistance={maxDistance}
        target={[0, 0, 0]}
      />
    </>
  );
}
