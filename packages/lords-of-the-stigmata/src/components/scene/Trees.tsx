import React, { useMemo } from "react";

function Trees(): React.JSX.Element {
  const groups = useMemo(() => {
    const result = [];
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 16.5 + Math.random() * 13;
      const s = 0.8 + Math.random() * 1.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const rot = Math.random() * 6;
      const folMatIdx = Math.random() < 0.5 ? 0 : 1;
      result.push({
        x,
        z,
        s,
        rot,
        folMatIdx,
        id: i,
      });
    }
    return result;
  }, []);

  const rocks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 15 + Math.random() * 12;
      const s = 0.5 + Math.random() * 1.1;
      result.push({
        x: Math.cos(a) * r,
        y: 0.18 * s,
        z: Math.sin(a) * r,
        s,
        sy: 0.6 + Math.random() * 0.5,
        rot: [Math.random(), Math.random() * 6, Math.random()] as [number, number, number],
        id: i,
      });
    }
    return result;
  }, []);

  return (
    <>
      {groups.map(({ id, x, z, s, rot, folMatIdx }) => (
        <group key={id} position={[x, 0, z]} scale={[s, s, s]} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.2, 0.6, 32]} />
            <meshStandardMaterial color={0x3a2c1e} roughness={1} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <coneGeometry args={[0.85, 1.9, 32]} />
            <meshStandardMaterial color={folMatIdx === 0 ? 0x1c3324 : 0x25422d} roughness={1} />
          </mesh>
          <mesh position={[0, 2.05, 0]} scale={[0.68, 0.68, 0.68]} castShadow>
            <coneGeometry args={[0.85, 1.9, 32]} />
            <meshStandardMaterial color={0x1c3324} roughness={1} />
          </mesh>
        </group>
      ))}

      {rocks.map(({ id, x, y, z, s, sy, rot }) => (
        <mesh key={id} position={[x, y, z]} scale={[s, s * sy, s]} rotation={rot} castShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={0x47415a} roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

export { Trees };
