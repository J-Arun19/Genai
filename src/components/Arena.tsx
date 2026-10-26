import React, { useMemo, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Sparkles, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Board3D, type SquareHighlight } from "./Chess3D/Board3D";
import { AnimatedPiece3D } from "./Chess3D/AnimatedPiece3D";
import { StauntonPiece } from "@/game/proceduralChessPieces";
import type { Piece, SkillDef, SkillId } from "@/game/logic";
import type { ChessEnginePiece } from "@/game/chessEngine";

const SCENE_BG = "#151921";
const GOLD = "#e5c365";
const IVORY = "#f8f3e8";

export const sqPos = (sq: string): [number, number] => {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]!, 10) - 1;
  return [file - 3.5, 3.5 - rank];
};

/**
 * Camera controller for smooth angle animation, orbit control, and reset.
 */
function CameraRig({
  flipped,
  resetCount,
}: {
  flipped: boolean;
  resetCount: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const targetZ = flipped ? -7.8 : 7.8;
    const targetX = 0;
    const targetY = 7.8;
    controlsRef.current.object.position.set(targetX, targetY, targetZ);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [flipped, resetCount]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      minDistance={5.5}
      maxDistance={16}
      minPolarAngle={0.2}
      maxPolarAngle={1.22}
      dampingFactor={0.08}
    />
  );
}

/**
 * Skill Selection Pedestals for the skill tree challenge.
 */
function SkillPedestals({
  skills,
  selected,
  onSelect,
}: {
  skills: SkillDef[];
  selected: SkillId | null;
  onSelect: (id: SkillId) => void;
}) {
  return (
    <group>
      {skills.map((s, i) => (
        <Pedestal
          key={s.id}
          s={s}
          x={(i - 1) * 3.2}
          active={selected === s.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function Pedestal({
  s,
  x,
  active,
  onSelect,
}: {
  s: SkillDef;
  x: number;
  active: boolean;
  onSelect: (id: SkillId) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hov, setHov] = React.useState(false);

  useFrame((st, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05);
    const target = active ? 1.45 : hov ? 1.32 : 1.2;
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * (1 - Math.exp(-8 * dt)));
    g.rotation.y += dt * (active ? 0.8 : 0.25);
    g.position.y = 0.35 + (active ? Math.sin(st.clock.elapsedTime * 2.5) * 0.08 : 0);
  });

  return (
    <group
      position={[x, 0, 0.5]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta <= 5) onSelect(s.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHov(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHov(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Pedestal Base */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.1, 0.32, 32]} />
        <meshStandardMaterial
          color={active ? GOLD : "#1e222b"}
          metalness={active ? 0.6 : 0.2}
          roughness={0.35}
          emissive={active ? GOLD : "#000"}
          emissiveIntensity={active ? 0.2 : 0}
        />
      </mesh>

      {/* 3D Staunton Piece */}
      <group ref={ref} position={[0, 0.32, 0]} scale={1.2}>
        <StauntonPiece kind={s.piece} white={true} />
      </group>

      {active && (
        <Sparkles
          position={[0, 1.4, 0]}
          count={24}
          scale={[1.8, 2.0, 1.8]}
          size={5}
          speed={0.6}
          color={GOLD}
        />
      )}

      <Html center position={[0, -0.32, 1.2]} style={{ pointerEvents: "none" }}>
        <span
          style={{
            color: active ? GOLD : IVORY,
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            whiteSpace: "nowrap",
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
          }}
        >
          {s.name}
        </span>
      </Html>
    </group>
  );
}

export type ArenaProps =
  | {
      mode: "game";
      pieces: ChessEnginePiece[];
      highlights?: SquareHighlight[];
      onSquareClick?: (sq: string) => void;
      onPieceClick?: (sq: string) => void;
      flipped?: boolean;
      burst?: string | null;
      resetTrigger?: number;
    }
  | {
      mode: "board";
      pieces: (Piece & { id: number | string })[];
      from?: string[];
      targets?: { sq: string; label: string; state?: "right" | "wrong" | "dim" }[];
      burst?: string | null;
      onPickTarget?: (label: string) => void;
      onSquareClick?: (sq: string) => void;
      onPieceClick?: (sq: string) => void;
      flipped?: boolean;
      resetTrigger?: number;
    }
  | {
      mode: "skills";
      skills: SkillDef[];
      selected: SkillId | null;
      onSelect: (id: SkillId) => void;
    };

export default function Arena(props: ArenaProps) {
  const isSkills = props.mode === "skills";
  const flipped = !isSkills ? props.flipped ?? false : false;
  const resetTrigger = !isSkills ? props.resetTrigger ?? 0 : 0;

  // Convert legacy board props to unified highlight system
  const { pieces, highlights, onSquareClick, onPieceClick, burst } = useMemo(() => {
    if (props.mode === "game") {
      return {
        pieces: props.pieces,
        highlights: props.highlights ?? [],
        onSquareClick: props.onSquareClick,
        onPieceClick: props.onPieceClick,
        burst: props.burst,
      };
    }
    if (props.mode === "board") {
      const hList: SquareHighlight[] = [];
      if (props.from) {
        for (const sq of props.from) {
          hList.push({ sq, type: "last-move" });
        }
      }
      if (props.targets) {
        for (const t of props.targets) {
          hList.push({
            sq: t.sq,
            type: "legal-empty",
            label: t.label,
            feedbackState: t.state,
          });
        }
      }
      return {
        pieces: props.pieces.map((p) => ({ ...p, id: String(p.id) })),
        highlights: hList,
        onSquareClick: (sq: string) => {
          if (props.onSquareClick) {
            props.onSquareClick(sq);
          } else if (props.onPickTarget && props.targets) {
            const hit = props.targets.find((t) => t.sq === sq);
            if (hit) props.onPickTarget(hit.label);
          }
        },
        onPieceClick: props.onPieceClick,
        burst: props.burst,
      };
    }
    return {
      pieces: [],
      highlights: [],
      onSquareClick: undefined,
      onPieceClick: undefined,
      burst: null,
    };
  }, [props]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{
        position: isSkills ? [0, 3.4, 6.8] : [0, 7.8, flipped ? -7.8 : 7.8],
        fov: 42,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.10,
      }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={[SCENE_BG]} />
      <fog attach="fog" args={[SCENE_BG, 16, 36]} />

      {/* Calibrated Studio Lighting: Soft believable shadows, clear ebony contours, no glare */}
      <ambientLight intensity={0.68} color="#ede3d5" />

      {/* Key Light: Gentle warm directional light casting soft believable shadows */}
      <directionalLight
        position={[5, 13, 6]}
        intensity={1.55}
        color="#fff8ee"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00015}
        shadow-camera-left={-6.8}
        shadow-camera-right={6.8}
        shadow-camera-top={6.8}
        shadow-camera-bottom={-6.8}
      />

      {/* Fill Light: Softly illuminates front-facing surfaces without washing out white pieces */}
      <directionalLight position={[-5, 9, 6]} intensity={0.90} color="#f4e8dc" />

      {/* Dedicated Rim Light: Backlight tracing black-piece silhouettes and crowns */}
      <directionalLight position={[0, 8.5, -8.5]} intensity={1.45} color="#fdecc5" />

      {/* Subtle Rim Accent Kicker: Soft gold edge specular highlight */}
      <directionalLight position={[7, 7, -6]} intensity={0.65} color={GOLD} />

      <Suspense fallback={null}>
        {/* Scene Content */}
        {isSkills ? (
          <>
            <SkillPedestals
              skills={props.skills}
              selected={props.selected}
              onSelect={props.onSelect}
            />
            <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={14} blur={2.2} far={4} color="#000000" />
            <OrbitControls
              makeDefault
              enablePan={false}
              target={[0, 0.8, 0]}
              minDistance={5}
              maxDistance={9.5}
              minPolarAngle={0.4}
              maxPolarAngle={1.2}
            />
          </>
        ) : (
          <>
            {/* Realistic 3D Wooden Chessboard */}
            <Board3D
              highlights={highlights}
              onSquareClick={(sq) => {
                onSquareClick?.(sq);
              }}
              flipped={flipped}
            />

            {/* 3D Animated Staunton Chess Pieces */}
            {pieces.map((p) => {
              const isSel = highlights.some((h) => h.sq === p.sq && h.type === "selected");
              const isGlow = burst === p.sq;
              return (
                <AnimatedPiece3D
                  key={p.id}
                  id={p.id}
                  sq={p.sq}
                  kind={p.k}
                  white={p.white}
                  isSelected={isSel}
                  isGlowing={isGlow}
                  onClick={(sq) => {
                    if (onPieceClick) {
                      onPieceClick(sq);
                    } else if (onSquareClick) {
                      onSquareClick(sq);
                    }
                  }}
                />
              );
            })}

            {/* Celebration sparkles for win/checkmate */}
            {burst && (() => {
              const [bx, bz] = sqPos(burst);
              return (
                <Sparkles
                  key={burst}
                  position={[bx, 0.9, bz]}
                  count={36}
                  scale={[1.4, 1.6, 1.4]}
                  size={5}
                  speed={0.65}
                  color={GOLD}
                />
              );
            })()}

            {/* Realistic soft contact shadow under board plinth */}
            <ContactShadows
              position={[0, -0.51, 0]}
              opacity={0.7}
              scale={13}
              blur={2.4}
              far={4}
              color="#000000"
            />

            {/* Camera Controls & Reset Support */}
            <CameraRig flipped={flipped} resetCount={resetTrigger} />
          </>
        )}
      </Suspense>
    </Canvas>
  );
}
