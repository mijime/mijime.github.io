import React, { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CountryKey } from "../../types.ts";
import type { Pick } from "../App.tsx";
import { useEngine } from "../../hooks/useEngine.ts";
import { topOf, inflIn } from "../../engine/helpers.ts";
import { LAYOUT_EDGES } from "../../engine/map.ts";
import { previewDispatch } from "../../engine/preview.ts";
import { Platform, platPos } from "./Platform";
import { Trees } from "./Trees";
import { FxOverlay } from "./FxOverlay";

interface SceneProps {
  onCountryClick: (k: CountryKey) => void;
  validKeys?: CountryKey[];
  pick?: Pick;
}

function woodTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 512;
  const x = cv.getContext("2d");
  if (!x) throw new Error("canvas context failed");

  x.fillStyle = "#6b4a2f";
  x.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 512; i += 8) {
    const alpha = 0.3 + Math.random() * 0.2;
    x.strokeStyle = `rgba(139, 90, 43, ${alpha})`;
    x.lineWidth = 1 + Math.random() * 2;
    x.beginPath();
    x.moveTo(0, i + Math.random() * 4);
    x.lineTo(512, i + Math.random() * 4);
    x.stroke();

    const seam = Math.floor(i / 32) * 32;
    if (i > 0 && i === seam && Math.random() < 0.3) {
      x.strokeStyle = "rgba(80, 50, 20, 0.5)";
      x.lineWidth = 0.5;
      x.beginPath();
      x.moveTo(0, seam);
      x.lineTo(512, seam);
      x.stroke();
    }
  }

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function SceneContent(props: SceneProps): React.JSX.Element {
  const engine = useEngine();
  const S = engine.S;
  const [hoverKey, setHoverKey] = useState<CountryKey | null>(null);
  const validKeys = props.validKeys ?? [];

  const pick = props.pick ?? null;
  const preview =
    pick?.purpose === "dispatch" && hoverKey && validKeys.includes(hoverKey)
      ? previewDispatch(S, 0, pick.pawn, hoverKey)
      : null;

  // frameloop="demand" 下で 30fps のアニメ駆動（CPU 抑制）
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const h = setInterval(() => invalidate(), 33);
    return () => clearInterval(h);
  }, [invalidate]);

  const groundTex = useMemo(() => {
    return woodTexture();
  }, []);

  const roomGradient = useMemo(() => {
    const sc = document.createElement("canvas");
    sc.width = 2;
    sc.height = 512;
    const sx = sc.getContext("2d");
    if (!sx) throw new Error("canvas context failed");
    const gr = sx.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#4a3a2a");
    gr.addColorStop(0.5, "#3a2a1a");
    gr.addColorStop(1, "#2a1a0a");
    sx.fillStyle = gr;
    sx.fillRect(0, 0, 2, 512);
    return new THREE.CanvasTexture(sc);
  }, []);

  const plazaTex = useMemo(() => {
    const pcv = document.createElement("canvas");
    pcv.width = pcv.height = 512;
    const px = pcv.getContext("2d");
    if (!px) throw new Error("canvas context failed");
    px.fillStyle = "#272133";
    px.fillRect(0, 0, 512, 512);
    px.fillStyle = "#2d2740";
    for (let i = 0; i < 90; i++) {
      const r = 4 + Math.random() * 16;
      px.beginPath();
      px.arc(Math.random() * 512, Math.random() * 512, r, 0, 7);
      px.fill();
    }
    px.strokeStyle = "rgba(201,164,55,0.16)";
    px.lineWidth = 3;
    for (let r = 46; r <= 246; r += 40) {
      px.beginPath();
      px.arc(256, 256, r, 0, 7);
      px.stroke();
    }
    px.strokeStyle = "rgba(160,150,190,0.18)";
    px.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      px.beginPath();
      px.moveTo(256 + Math.cos(a) * 46, 256 + Math.sin(a) * 46);
      px.lineTo(256 + Math.cos(a) * 246, 256 + Math.sin(a) * 246);
      px.stroke();
    }
    const tex = new THREE.CanvasTexture(pcv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <>
      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={32}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
      />

      <hemisphereLight color={0xfff0dd} groundColor={0x5a4a3a} intensity={0.65} />
      <directionalLight
        position={[6, 16, 4]}
        color={0xffe9c4}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      />
      <pointLight position={[0, 3.6, 0]} color={0xc9a437} intensity={0.3} />

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[58, 24, 16]} />
        <meshBasicMaterial map={roomGradient} side={THREE.BackSide} fog={false} />
      </mesh>

      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[55, 64]} />
        <meshStandardMaterial color={0x1a120c} roughness={1} />
      </mesh>

      {/* 脚: 天板下面(Y=1.25)から床(Y=-2.5)まで、高さ3.75・中心Y=-0.625 */}
      <mesh position={[22, -0.625, 22]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 3.75, 16]} />
        <meshStandardMaterial color={0x3a2a1a} roughness={0.8} />
      </mesh>

      <mesh position={[-22, -0.625, 22]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 3.75, 16]} />
        <meshStandardMaterial color={0x3a2a1a} roughness={0.8} />
      </mesh>

      <mesh position={[22, -0.625, -22]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 3.75, 16]} />
        <meshStandardMaterial color={0x3a2a1a} roughness={0.8} />
      </mesh>

      <mesh position={[-22, -0.625, -22]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 3.75, 16]} />
        <meshStandardMaterial color={0x3a2a1a} roughness={0.8} />
      </mesh>

      {/* 天板とその上に乗るもの(盤・印章・木・国・祭壇)をまとめて1.5持ち上げる。天板上面=Y1.5 */}
      <group position={[0, 1.5, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[32, 32, 0.5, 64]} />
          <meshStandardMaterial map={groundTex} roughness={0.7} />
        </mesh>

        {/* 天板/盤/広場は間隔を広めに取る（同一平面だと真上からZファイティングでチラつく） */}
        <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[11.6, 11.6, 0.04, 64]} />
          <meshStandardMaterial color={0x8b5a2b} roughness={0.6} metalness={0} />
        </mesh>

        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[11.6, 64]} />
          <meshStandardMaterial map={plazaTex} roughness={0.9} metalness={0} />
        </mesh>

        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.4, 0.05, 24, 64]} />
          <meshStandardMaterial
            color={0xc9a437}
            emissive={0x332200}
            emissiveIntensity={0.25}
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>

        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55, 0.035, 24, 64]} />
          <meshStandardMaterial
            color={0xc9a437}
            emissive={0x332200}
            emissiveIntensity={0.25}
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>

        <Trees />

        <FxOverlay />

        {S.sel.map((key, index) => {
          const boardCountry = S.board.find((c) => c.key === key);
          const pawns = boardCountry?.pawns ?? [];
          const topPis = boardCountry ? topOf(S, boardCountry) : [];
          const influences = boardCountry ? S.players.map((_p, i) => inflIn(boardCountry, i)) : [];
          return (
            <Platform
              key={key}
              countryKey={key}
              index={index}
              playerCount={S.players.length}
              isHovered={hoverKey === key}
              isValid={validKeys.includes(key)}
              pawns={pawns}
              topPis={topPis}
              influences={influences}
              onCountryClick={props.onCountryClick}
              onHover={setHoverKey}
              ghost={
                preview && hoverKey === key && preview.ok
                  ? { pawn: pick!.purpose === "dispatch" ? pick!.pawn : "ac", preview }
                  : null
              }
            />
          );
        })}

        {LAYOUT_EDGES.map(([a, b], i) => {
          const pa = platPos(a),
            pb = platPos(b);
          const mid = pa.clone().add(pb).multiplyScalar(0.5);
          const len = pa.distanceTo(pb);
          const angle = Math.atan2(pb.z - pa.z, pb.x - pa.x);
          return (
            <mesh key={i} position={[mid.x, 0.055, mid.z]} rotation={[-Math.PI / 2, 0, -angle]}>
              <planeGeometry args={[len - 3.4, 0.18]} />
              <meshBasicMaterial color={0xc9a437} transparent opacity={0.25} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

export default function Scene(props: SceneProps): React.JSX.Element {
  return (
    <Canvas
      frameloop="demand"
      shadows="soft"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
      }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 2]}
      camera={{
        position: [0, 10, 15],
        fov: 46,
        near: 0.1,
        far: 100,
      }}
    >
      <color attach="background" args={[0x2a1a0a]} />
      <fog attach="fog" args={[0x3a2a1a, 45, 90]} />
      <SceneContent {...props} />
    </Canvas>
  );
}

export type { SceneProps };
