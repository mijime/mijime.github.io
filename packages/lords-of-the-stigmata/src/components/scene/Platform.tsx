import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import type { CountryKey } from "../../types.ts";
import type { DispatchPreview } from "../../engine/preview.ts";
import { COUNTRIES } from "../../data/countries.ts";
import { PCOLORS, PCOLCSS } from "../../data/players.ts";
import { PawnMesh } from "./PawnMesh";

export function platPos(i: number): THREE.Vector3 {
  if (i === 6) return new THREE.Vector3(0, 0, 0);
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  return new THREE.Vector3(Math.cos(a) * 8.2, 0, Math.sin(a) * 8.2);
}

function slotLocal(i: number, capN: number): THREE.Vector3 {
  if (capN === 1 && i === 0) {
    return new THREE.Vector3(0, 0, 0);
  }
  const ring = i < capN ? 1.3 : 1.95;
  const idx = i < capN ? i : i - capN;
  const tot = i < capN ? capN : Math.max(4, capN);
  const a = -Math.PI / 2 + (idx * 2 * Math.PI) / tot;
  return new THREE.Vector3(Math.cos(a) * ring, 0, Math.sin(a) * ring);
}

function rankLabel(
  t: (k: string, p?: Record<string, unknown>) => string,
  rank: number,
  tie: boolean,
): string {
  if (rank === 0) return t("fx.pvRankNone");
  if (rank === 1) return tie ? t("fx.pvRankTie1") : t("fx.pvRank1");
  return t("fx.pvRankN", { n: rank });
}

function makeCountryLabel(name: string, tag: string): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 200;
  const x = cv.getContext("2d");
  if (!x) throw new Error("canvas context failed");

  x.textAlign = "center";
  x.font = '600 64px "Hiragino Mincho ProN","Yu Mincho",serif';
  x.shadowColor = "rgba(0,0,0,.9)";
  x.shadowBlur = 14;
  x.fillStyle = "#ece4cf";
  x.fillText(name, 256, 96);
  x.font = '400 34px "Hiragino Mincho ProN","Yu Mincho",serif';
  x.fillStyle = "#c9a437";
  x.fillText(tag, 256, 150);

  return new THREE.CanvasTexture(cv);
}

function makeInflLabel(influences: number[]): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 96;
  const x = cv.getContext("2d");
  if (!x) throw new Error("canvas context failed");
  const active = influences.map((v, pi) => ({ v, pi })).filter((a) => a.v > 0);
  const w = 120;
  const x0 = 256 - (active.length * w) / 2;
  active.forEach((a, i) => {
    const cx = x0 + i * w + w / 2;
    x.fillStyle = PCOLCSS[a.pi];
    x.beginPath();
    x.arc(cx - 34, 48, 18, 0, 7);
    x.fill();
    x.font = '700 56px "Hiragino Sans",sans-serif';
    x.textAlign = "left";
    x.textBaseline = "middle";
    x.shadowColor = "rgba(0,0,0,.9)";
    x.shadowBlur = 10;
    x.fillStyle = "#ece4cf";
    x.fillText(String(a.v), cx - 6, 52);
  });
  return new THREE.CanvasTexture(cv);
}

interface PlatformProps {
  countryKey: CountryKey;
  index: number;
  playerCount: number;
  isHovered: boolean;
  isValid: boolean;
  pawns: Array<{ owner: number; type: "ac" | "ap"; uid: number }>;
  topPis: number[];
  influences: number[];
  onCountryClick: (k: CountryKey) => void;
  onHover: (k: CountryKey | null) => void;
  ghost: { pawn: "ac" | "ap"; preview: DispatchPreview } | null;
}

interface LeavingPawn {
  uid: number;
  owner: number;
  type: "ac" | "ap";
  slot: number;
}

const Platform = React.memo(
  ({
    countryKey,
    index,
    playerCount,
    isHovered,
    isValid,
    pawns,
    topPis,
    influences,
    onCountryClick,
    onHover,
    ghost,
  }: PlatformProps) => {
    const { t } = useTranslation();
    const countryDef = COUNTRIES[countryKey];
    const pos = platPos(index);
    const capN = countryDef.cap(playerCount);
    const rimRef = useRef<THREE.MeshStandardMaterial>(null);
    const platMatRef = useRef<THREE.MeshStandardMaterial>(null);

    const countryLabelTex = useMemo(
      () => makeCountryLabel(t(`countries.${countryKey}.name`), t(`countries.${countryKey}.tag`)),
      [countryKey, t],
    );

    const inflKey = influences.join(",");
    const inflTex = useMemo(
      () => (influences.some((v) => v > 0) ? makeInflLabel(influences) : null),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [inflKey],
    );

    useEffect(() => {
      return () => {
        inflTex?.dispose();
      };
    }, [inflTex]);

    const [leaving, setLeaving] = useState<LeavingPawn[]>([]);
    const prevPawns = useRef(pawns);

    useEffect(() => {
      const cur = new Set(pawns.map((p) => p.uid));
      const removed = prevPawns.current
        .map((p, si) => ({ uid: p.uid, owner: p.owner, type: p.type, slot: si }))
        .filter((p) => !cur.has(p.uid));
      prevPawns.current = pawns;
      if (!removed.length) return;
      setLeaving((ls) => [...ls, ...removed]);
      const timer = setTimeout(() => {
        setLeaving((ls) => ls.filter((l) => !removed.some((r) => r.uid === l.uid)));
      }, 450);
      return () => clearTimeout(timer);
    }, [pawns]);

    useFrame(({ clock }) => {
      const elapsed = clock.getElapsedTime();
      const pulse = 0.35 + 0.3 * Math.sin(elapsed * 4);

      if (rimRef.current && platMatRef.current) {
        if (isValid) {
          rimRef.current.emissiveIntensity = 0.4 + pulse;
          platMatRef.current.emissive.setHex(0x3a2f10);
        } else if (isHovered) {
          rimRef.current.emissiveIntensity = 0.55;
          platMatRef.current.emissive.setHex(0x000000);
        } else {
          rimRef.current.emissiveIntensity = 0.18;
          platMatRef.current.emissive.setHex(0x000000);
        }
      }
    });

    return (
      <group position={[pos.x, 0, pos.z]}>
        <mesh
          position={[0, 0.3, 0]}
          onClick={(ev) => {
            ev.stopPropagation();
            onCountryClick(countryKey);
          }}
          onPointerEnter={() => onHover(countryKey)}
          onPointerLeave={() => onHover(null)}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[2.25, 2.55, 0.6, 8]} />
          <meshStandardMaterial
            ref={platMatRef}
            color={countryDef.col}
            roughness={0.55}
            metalness={0}
            emissive={0x000000}
          />
        </mesh>

        <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[2.32, 0.04, 24, 64]} />
          <meshStandardMaterial
            ref={rimRef}
            color={0xc9a437}
            emissive={0x3a2200}
            emissiveIntensity={0.15}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>

        {topPis.length === 1 && (
          <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.45, 0.06, 16, 64]} />
            <meshStandardMaterial
              color={PCOLORS[topPis[0]]}
              emissive={PCOLORS[topPis[0]]}
              emissiveIntensity={0.6}
              roughness={0.3}
              metalness={0.5}
            />
          </mesh>
        )}

        {Array.from({ length: capN }).map((_, s) => {
          const lp = slotLocal(s, capN);
          return (
            <mesh key={s} position={[lp.x, 0.63, lp.z]} castShadow>
              <cylinderGeometry args={[0.33, 0.33, 0.05, 32]} />
              <meshStandardMaterial
                color={0x0e0b17}
                roughness={0.8}
                emissive={0x241c38}
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })}

        <sprite position={[0, 2.5, 0]} scale={[4.4, 1.72, 1]}>
          <spriteMaterial map={countryLabelTex} transparent depthWrite={false} />
        </sprite>

        {inflTex && (
          <sprite position={[0, 1.7, 0]} scale={[3.4, 0.64, 1]}>
            <spriteMaterial map={inflTex} transparent depthWrite={false} />
          </sprite>
        )}

        {pawns.map((pawn, si) => {
          const lp = slotLocal(si, capN);
          return (
            <PawnMesh
              key={pawn.uid}
              type={pawn.type}
              owner={pawn.owner}
              dim={false}
              position={[lp.x, 0.66, lp.z]}
            />
          );
        })}

        {leaving.map((pawn) => {
          const lp = slotLocal(pawn.slot, capN);
          return (
            <PawnMesh
              key={`leave-${pawn.uid}`}
              type={pawn.type}
              owner={pawn.owner}
              position={[lp.x, 0.66, lp.z]}
              scale={0.001}
              spawnScale={1}
            />
          );
        })}

        {ghost && (
          <>
            <PawnMesh
              type={ghost.pawn}
              owner={0}
              dim
              position={(() => {
                const lp = slotLocal(pawns.length, capN);
                return [lp.x, 0.66, lp.z] as [number, number, number];
              })()}
            />
            <Html position={[0, 1.1, 0]} center distanceFactor={16} zIndexRange={[40, 0]}>
              <div className="rank-preview">
                {t("fx.pvRank", {
                  before: rankLabel(t, ghost.preview.rankBefore, false),
                  after: rankLabel(t, ghost.preview.rankAfter, ghost.preview.tieAfter),
                })}
                <small>
                  {ghost.preview.costAp > 0
                    ? t("fx.pvCostAp", { ac: ghost.preview.costAc, ap: ghost.preview.costAp })
                    : t("fx.pvCost", { ac: ghost.preview.costAc })}
                </small>
              </div>
            </Html>
          </>
        )}
      </group>
    );
  },
);

Platform.displayName = "Platform";

export { Platform };
