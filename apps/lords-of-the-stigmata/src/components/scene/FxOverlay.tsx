import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { useEngine } from "../../hooks/useEngine.ts";
import { getCurrentFx } from "../../store.ts";
import { PCOLCSS, PCOLORS } from "../../data/players.ts";
import { platPos } from "./Platform";

/** 審判時に支配国へ降りる王冠 */
function Crown({ pos, color }: { pos: THREE.Vector3; color: number }): React.JSX.Element {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.lerp(new THREE.Vector3(pos.x, 2.2, pos.z), Math.min(1, dt * 6));
    g.rotation.y += dt * 1.5;
  });
  return (
    <group ref={ref} position={[pos.x, 6, pos.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.09, 16, 32]} />
        <meshStandardMaterial
          color={0xc9a437}
          emissive={0x664400}
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 0.22, Math.sin(a) * 0.5]}>
            <coneGeometry args={[0.09, 0.32, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

export function FxOverlay(): React.JSX.Element | null {
  const e = useEngine();
  const { t } = useTranslation();
  const fx = getCurrentFx();
  if (!fx) return null;

  // 国に紐づくfxはその国の上に、それ以外(盤面外)はプレイヤーカード側(HUD)に任せる
  const countryKey = "country" in fx ? fx.country : null;
  if (!countryKey) return null;
  const index = e.S.sel.indexOf(countryKey);
  if (index < 0) return null;
  const pos = platPos(index);

  return (
    <group position={[0, 0, 0]}>
      {fx.kind === "vp" && (
        <Html position={[pos.x, 3.4, pos.z]} center distanceFactor={18} zIndexRange={[40, 0]}>
          <div className="vp-pop" style={{ borderColor: PCOLCSS[fx.pi] }}>
            <b>+{fx.n} VP</b>
            <small>{t(`fx.vpSrc.${fx.sourceKey}`)}</small>
          </div>
        </Html>
      )}
      {fx.kind === "judgment" && <Crown pos={pos} color={PCOLORS[fx.pi]} />}
      {(fx.kind === "dispatch" || fx.kind === "upgrade") && (
        <mesh position={[pos.x, 0.05, pos.z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.6, 0.06, 16, 64]} />
          <meshBasicMaterial color={PCOLORS[fx.pi]} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}
