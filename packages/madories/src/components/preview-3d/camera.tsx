import { PerspectiveCamera } from "@react-three/drei";

interface Props {
  width: number;
  height: number;
  cellSize: number;
}

export function PreviewCamera({ width, height, cellSize }: Props) {
  const maxDim = Math.max(width, height);
  const distance = maxDim * cellSize * 0.8;

  return <PerspectiveCamera makeDefault position={[0, distance, distance]} fov={50} />;
}
