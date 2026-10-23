import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer, Sparkles, Html, ContactShadows } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Kind, Move, Piece, SkillDef, SkillId } from "@/game/logic";

const NAVY = "#1b2440";
const GOLD = "#d9b45a";
const IVORY = "#f3ead6";
const DARKSQ = "#2e3d63";
const LIGHTSQ = "#d8ccb0";

export const sqPos = (sq: string): [number, number] => [sq.charCodeAt(0) - 97 - 3.5, 3.5 - (Number(sq[1]) - 1)];

const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 24);
const GEO = {
  base: lathe([[0, 0], [0.36, 0], [0.36, 0.08], [0.3, 0.12], [0.3, 0.16], [0, 0.16]]),
  pawn: lathe([[0, 0.16], [0.24, 0.16], [0.13, 0.42], [0.2, 0.46], [0, 0.48]]),
  tall: lathe([[0, 0.16], [0.26, 0.16], [0.15, 0.7], [0.24, 0.76], [0.24, 0.8], [0, 0.82]]),
  mid: lathe([[0, 0.16], [0.26, 0.16], [0.15, 0.56], [0.22, 0.6], [0, 0.62]]),
};

function PieceMesh({ k, white }: { k: Kind; white: boolean }) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: white ? IVORY : "#20222b", roughness: white ? 0.45 : 0.35, metalness: 0.1 }),
    [white],
  );
  const s = { castShadow: true, material: mat };
  return (
    <group>
      <mesh geometry={GEO.base} {...s} />
      {k === "P" && (<><mesh geometry={GEO.pawn} {...s} /><mesh position={[0, 0.56, 0]} {...s}><sphereGeometry args={[0.14, 20, 16]} /></mesh></>)}
      {k === "R" && (<><mesh position={[0, 0.42, 0]} {...s}><cylinderGeometry args={[0.2, 0.26, 0.52, 20]} /></mesh>
        <mesh position={[0, 0.72, 0]} {...s}><cylinderGeometry args={[0.27, 0.27, 0.14, 20]} /></mesh>
        {[0, 1, 2, 3].map((i) => (<mesh key={i} position={[Math.cos(i * 1.57) * 0.19, 0.84, Math.sin(i * 1.57) * 0.19]} {...s}><boxGeometry args={[0.1, 0.1, 0.1]} /></mesh>))}</>)}
      {k === "N" && (<><mesh geometry={GEO.mid} {...s} />
        <mesh position={[0, 0.78, 0.04]} rotation={[0.45, 0, 0]} {...s}><boxGeometry args={[0.22, 0.42, 0.3]} /></mesh>
        <mesh position={[0, 0.86, 0.24]} rotation={[1.1, 0, 0]} {...s}><boxGeometry args={[0.18, 0.32, 0.16]} /></mesh>
        <mesh position={[0, 1.02, -0.06]} {...s}><coneGeometry args={[0.06, 0.14, 8]} /></mesh></>)}
      {k === "B" && (<><mesh geometry={GEO.tall} {...s} /><mesh position={[0, 0.95, 0]} scale={[1, 1.3, 1]} {...s}><sphereGeometry args={[0.15, 20, 16]} /></mesh>
        <mesh position={[0, 1.15, 0]} {...s}><sphereGeometry args={[0.05, 10, 8]} /></mesh></>)}
      {k === "Q" && (<><mesh geometry={GEO.tall} scale={[1, 1.15, 1]} {...s} /><mesh position={[0, 1.02, 0]} {...s}><cylinderGeometry args={[0.24, 0.14, 0.16, 12]} /></mesh>
        <mesh position={[0, 1.16, 0]} {...s}><sphereGeometry args={[0.08, 12, 10]} /></mesh></>)}
      {k === "K" && (<><mesh geometry={GEO.tall} scale={[1, 1.2, 1]} {...s} /><mesh position={[0, 1.04, 0]} {...s}><cylinderGeometry args={[0.2, 0.15, 0.16, 16]} /></mesh>
        <mesh position={[0, 1.26, 0]} {...s}><boxGeometry args={[0.07, 0.28, 0.07]} /></mesh>
        <mesh position={[0, 1.28, 0]} {...s}><boxGeometry args={[0.22, 0.07, 0.07]} /></mesh></>)}
    </group>
  );
}

/** A piece that glides (with a small hop) to its target square. */
function MovingPiece({ p, glow }: { p: Piece; glow: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [x, z] = sqPos(p.sq);
  const start = useRef<[number, number] | null>(null);
  useFrame((_, raw) => {
    const g = ref.current; if (!g) return;
    const dt = Math.min(raw, 0.05);
    if (!start.current) { start.current = [x, z]; g.position.set(x, 0, z); }
    const a = 1 - Math.exp(-5 * dt);
    g.position.x += (x - g.position.x) * a;
    g.position.z += (z - g.position.z) * a;
    const d = Math.hypot(x - g.position.x, z - g.position.z);
    g.position.y = Math.min(d, 1.2) * 0.5;
  });
  return (
    <group ref={ref} rotation-y={p.white ? Math.PI : 0}>
      <PieceMesh k={p.k} white={p.white} />
      {glow && <pointLight color={GOLD} intensity={2} distance={2.5} position={[0, 0.8, 0]} />}
    </group>
  );
}

export interface BoardProps {
  pieces: (Piece & { id: number })[];
  from?: string[];
  targets?: { sq: string; label: string; state?: "right" | "wrong" | "dim" }[];
  burst?: string | null;
  onPickTarget?: (label: string) => void;
}

function Board({ pieces, from, targets = [], burst, onPickTarget }: BoardProps) {
  const [hover, setHover] = useState<string | null>(null);
  const squares = useMemo(() => {
    const out: { sq: string; dark: boolean }[] = [];
    for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) out.push({ sq: String.fromCharCode(97 + f) + r, dark: (f + r) % 2 === 1 });
    return out;
  }, []);
  const click = (e: ThreeEvent<MouseEvent>, label: string) => {
    e.stopPropagation();
    if (e.delta > 5) return; // ignore drags
    onPickTarget?.(label);
  };
  return (
    <group>
      <mesh position={[0, -0.16, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.8, 0.3, 8.8]} />
        <meshStandardMaterial color="#5a4220" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.005, 0]}><boxGeometry args={[8.3, 0.02, 8.3]} /><meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} /></mesh>
      {squares.map(({ sq, dark }) => {
        const [x, z] = sqPos(sq);
        const isFrom = !!from?.includes(sq);
        return (
          <mesh key={sq} position={[x, 0.01, z]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color={isFrom ? GOLD : dark ? DARKSQ : LIGHTSQ} emissive={isFrom ? GOLD : "#000"} emissiveIntensity={isFrom ? 0.35 : 0} roughness={0.7} />
          </mesh>
        );
      })}
      {targets.map((t) => {
        const [x, z] = sqPos(t.sq);
        const col = t.state === "right" ? "#4fd18b" : t.state === "wrong" ? "#e8664f" : GOLD;
        const hov = hover === t.label && !t.state;
        return (
          <group key={t.label} position={[x, 0.03, z]}>
            <mesh rotation-x={-Math.PI / 2}
              onClick={(e) => click(e, t.label)}
              onPointerOver={(e) => { e.stopPropagation(); setHover(t.label); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { setHover(null); document.body.style.cursor = ""; }}>
              <ringGeometry args={[0.28, hov ? 0.48 : 0.42, 32]} />
              <meshBasicMaterial color={col} transparent opacity={t.state === "dim" ? 0.25 : 0.9} />
            </mesh>
            <Html center position={[0, 0.9, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <span style={{ background: col, color: NAVY, fontWeight: 800, borderRadius: 999, padding: "1px 8px", fontSize: 14, opacity: t.state === "dim" ? 0.45 : 1 }}>{t.label}</span>
            </Html>
          </group>
        );
      })}
      {pieces.map((p) => <MovingPiece key={p.id} p={p} glow={p.sq === burst} />)}
      {burst && (() => { const [x, z] = sqPos(burst); return <Sparkles key={burst} position={[x, 0.8, z]} count={28} scale={[1.2, 1.4, 1.2]} size={5} speed={0.6} color={GOLD} />; })()}
    </group>
  );
}

function SkillPedestals({ skills, selected, onSelect }: { skills: SkillDef[]; selected: SkillId | null; onSelect: (id: SkillId) => void }) {
  return (
    <group>
      {skills.map((s, i) => <Pedestal key={s.id} s={s} x={(i - 1) * 2.8} active={selected === s.id} onSelect={onSelect} />)}
    </group>
  );
}
function Pedestal({ s, x, active, onSelect }: { s: SkillDef; x: number; active: boolean; onSelect: (id: SkillId) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hov, setHov] = useState(false);
  useFrame((st, raw) => {
    const g = ref.current; if (!g) return;
    const dt = Math.min(raw, 0.05);
    const target = active ? 1.5 : hov ? 1.35 : 1.2;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * (1 - Math.exp(-8 * dt)));
    g.rotation.y += dt * (active ? 0.8 : 0.2);
    g.position.y = 0.3 + (active ? Math.sin(st.clock.elapsedTime * 2) * 0.06 : 0);
  });
  return (
    <group position={[x, 0, 0.5]}
      onClick={(e) => { e.stopPropagation(); if (e.delta <= 5) onSelect(s.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHov(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHov(false); document.body.style.cursor = ""; }}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1, 0.3, 32]} />
        <meshStandardMaterial color={active ? GOLD : NAVY} metalness={0.5} roughness={0.35} emissive={active ? GOLD : "#000"} emissiveIntensity={active ? 0.3 : 0} />
      </mesh>
      <group ref={ref} position={[0, 0.3, 0]} scale={1.2}><PieceMesh k={s.piece} white /></group>
      {active && <Sparkles position={[0, 1.2, 0]} count={20} scale={[1.6, 1.8, 1.6]} size={4} speed={0.5} color={GOLD} />}
      <Html center position={[0, -0.25, 1.1]} style={{ pointerEvents: "none" }}>
        <span style={{ color: active ? GOLD : IVORY, fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", textShadow: "0 1px 4px #000" }}>{s.name}</span>
      </Html>
    </group>
  );
}

export type ArenaProps =
  | ({ mode: "board" } & BoardProps)
  | { mode: "skills"; skills: SkillDef[]; selected: SkillId | null; onSelect: (id: SkillId) => void };

export default function Arena(props: ArenaProps) {
  const isBoard = props.mode === "board";
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: isBoard ? [0, 9, 8] : [0, 3.2, 6.5], fov: 45 }} style={{ touchAction: "none" }}>
      <color attach="background" args={["#121a30"]} />
      <fog attach="fog" args={["#121a30", 14, 30]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 10, 6]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <pointLight position={[-5, 4, -4]} intensity={8} color={GOLD} distance={14} />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.8} color={GOLD} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      {isBoard ? <Board {...props} /> : (
        <>
          <SkillPedestals skills={props.skills} selected={props.selected} onSelect={props.onSelect} />
          <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={12} blur={2} far={4} />
        </>
      )}
      <OrbitControls makeDefault enablePan={false} target={isBoard ? [0, 0, 0.3] : [0, 0.9, 0]}
        minDistance={isBoard ? 8 : 5} maxDistance={isBoard ? 15 : 9}
        minPolarAngle={0.35} maxPolarAngle={1.15}
        minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} />
    </Canvas>
  );
}
