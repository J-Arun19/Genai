import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { StauntonPiece } from "@/game/proceduralChessPieces";
import { sqToPos } from "./Board3D";
import type { Kind } from "@/game/logic";

interface AnimatedPiece3DProps {
  id: string;
  sq: string;
  kind: Kind;
  white: boolean;
  isSelected?: boolean;
  isGlowing?: boolean;
  onClick?: (sq: string) => void;
  interactive?: boolean;
}

export const AnimatedPiece3D: React.FC<AnimatedPiece3DProps> = React.memo(({
  id,
  sq,
  kind,
  white,
  isSelected = false,
  isGlowing = false,
  onClick,
  interactive = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [targetX, targetZ] = sqToPos(sq);

  // Animation state
  const prevPos = useRef<[number, number]>([targetX, targetZ]);
  const startPos = useRef<[number, number]>([targetX, targetZ]);
  const animProgress = useRef<number>(1);
  const isMoving = useRef<boolean>(false);

  // Detect square change
  useEffect(() => {
    if (groupRef.current) {
      startPos.current = [groupRef.current.position.x, groupRef.current.position.z];
      animProgress.current = 0;
      isMoving.current = true;
    }
    prevPos.current = [targetX, targetZ];
  }, [targetX, targetZ]);

  // Frame animation loop
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Cap delta to prevent jump after backgrounding
    const dt = Math.min(delta, 0.05);

    if (isMoving.current) {
      // 0.28 seconds transition duration
      animProgress.current += dt / 0.28;
      const t = Math.min(1, animProgress.current);

      // Smooth hermite cubic easeInOut
      const ease = t * t * (3 - 2 * t);

      // Interpolate X and Z
      g.position.x = THREE.MathUtils.lerp(startPos.current[0], targetX, ease);
      g.position.z = THREE.MathUtils.lerp(startPos.current[1], targetZ, ease);

      // Parabolic arc for gentle realistic piece lift
      const liftHeight = 0.55;
      g.position.y = 0.02 + Math.sin(t * Math.PI) * liftHeight;

      if (t >= 1) {
        g.position.x = targetX;
        g.position.z = targetZ;
        g.position.y = 0.02;
        isMoving.current = false;
      }
    } else {
      // Piece is idle firmly on the square tile
      g.position.x = targetX;
      g.position.z = targetZ;
      // Gentle hover if selected
      const targetY = isSelected ? 0.12 : 0.02;
      g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 12, dt);
    }
  });

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    onClick?.(sq);
  };

  // Pieces face opponent (White faces +Z / rank 8, Black faces -Z / rank 1)
  const rotationY = white ? 0 : Math.PI;

  return (
    <group
      ref={groupRef}
      position={[targetX, 0, targetZ]}
      rotation-y={rotationY}
      onPointerDown={handleClick}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <StauntonPiece kind={kind} white={white} />

      {/* Selected piece pedestal highlight ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.38, 0.44, 32]} />
          <meshBasicMaterial color="#f0b323" transparent opacity={0.9} />
        </mesh>
      )}

      {/* Golden glow for puzzle solution celebration */}
      {isGlowing && (
        <pointLight color="#f0b323" intensity={3} distance={2.5} position={[0, 0.8, 0]} />
      )}
    </group>
  );
});

AnimatedPiece3D.displayName = "AnimatedPiece3D";
