import React, { useMemo } from "react";
import * as THREE from "three";
import { type ThreeEvent } from "@react-three/fiber";
import {
  getLightSquareTexture,
  getDarkSquareTexture,
  getBorderTexture,
} from "@/game/boardTextures";

export interface SquareHighlight {
  sq: string;
  type: "selected" | "legal-empty" | "legal-capture" | "last-move" | "check";
  label?: string;
  feedbackState?: "right" | "wrong" | "dim";
}

interface Board3DProps {
  highlights?: SquareHighlight[];
  onSquareClick?: (sq: string) => void;
  onSquareHover?: (sq: string | null) => void;
  flipped?: boolean;
}

export const sqToPos = (sq: string): [number, number] => {
  const file = sq.charCodeAt(0) - 97; // 0..7 (a..h)
  const rank = parseInt(sq[1]!, 10) - 1; // 0..7 (1..8)
  const x = file - 3.5;
  const z = 3.5 - rank;
  return [x, z];
};

/**
 * Generate border coordinate text textures (ranks 1-8, files a-h) with luxury champagne gold styling.
 */
function createCoordinateTexture(items: string[], isVertical = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = isVertical ? 64 : 512;
  canvas.height = isVertical ? 512 : 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 26px 'Cormorant Garamond', Georgia, serif";
    ctx.fillStyle = "#e5c365"; // Rich champagne gold
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const count = items.length;
    for (let i = 0; i < count; i++) {
      if (isVertical) {
        const y = ((i + 0.5) / count) * canvas.height;
        ctx.fillText(items[i]!, canvas.width / 2, y);
      } else {
        const x = ((i + 0.5) / count) * canvas.width;
        ctx.fillText(items[i]!, x, canvas.height / 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const Board3D: React.FC<Board3DProps> = React.memo(({
  highlights = [],
  onSquareClick,
  onSquareHover,
  flipped = false,
}) => {
  const lightTexture = useMemo(() => getLightSquareTexture(), []);
  const darkTexture = useMemo(() => getDarkSquareTexture(), []);
  const borderTexture = useMemo(() => getBorderTexture(), []);

  // Board coordinate textures
  const filesTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createCoordinateTexture(["a", "b", "c", "d", "e", "f", "g", "h"], false);
  }, []);

  const ranksTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createCoordinateTexture(["8", "7", "6", "5", "4", "3", "2", "1"], true);
  }, []);

  // Pre-generate 64 squares with exact alternating colors
  const squares = useMemo(() => {
    const list: { sq: string; dark: boolean; x: number; z: number }[] = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const sq = String.fromCharCode(97 + f) + r;
        const [x, z] = sqToPos(sq);
        // In chess: a1 (f=0, r=1) is dark: (0 + 1) % 2 === 1. h1 is light, etc.
        const dark = (f + r) % 2 === 1;
        list.push({ sq, dark, x, z });
      }
    }
    return list;
  }, []);

  // Fast highlight lookup by square
  const highlightMap = useMemo(() => {
    const map = new Map<string, SquareHighlight>();
    for (const h of highlights) {
      map.set(h.sq, h);
    }
    return map;
  }, [highlights]);

  // Materials for photorealistic board
  const lightSquareMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#f2e7d3",
      map: lightTexture,
      roughness: 0.28,
      metalness: 0.03,
    });
  }, [lightTexture]);

  const darkSquareMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#462c1a",
      map: darkTexture,
      roughness: 0.32,
      metalness: 0.03,
    });
  }, [darkTexture]);

  const borderMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#2e1910",
      map: borderTexture,
      roughness: 0.28,
      metalness: 0.05,
    });
  }, [borderTexture]);

  const bevelFrameMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#24130b",
      roughness: 0.30,
      metalness: 0.05,
    });
  }, []);

  const brassInlayMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#d4af37", // Polished brass inlay accent
      metalness: 0.88,
      roughness: 0.22,
    });
  }, []);

  const feltBaseMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#122a18", // Dark forest green baize felt underneath
      roughness: 0.95,
      metalness: 0.0,
    });
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, sq: string) => {
    e.stopPropagation();
    onSquareClick?.(sq);
  };

  return (
    <group rotation-y={flipped ? Math.PI : 0}>
      {/* 1. Heavy walnut plinth / foundation base */}
      <mesh position={[0, -0.26, 0]} castShadow receiveShadow material={borderMat}>
        <boxGeometry args={[10.4, 0.48, 10.4]} />
      </mesh>

      {/* 2. Stepped beveled sub-frame for board recess */}
      <mesh position={[0, -0.015, 0]} castShadow receiveShadow material={bevelFrameMat}>
        <boxGeometry args={[9.2, 0.03, 9.2]} />
      </mesh>

      {/* 3. Underside green baize felt protector */}
      <mesh position={[0, -0.505, 0]} receiveShadow material={feltBaseMat}>
        <boxGeometry args={[10.1, 0.01, 10.1]} />
      </mesh>

      {/* 4. Fine brass inlay stringing perimeter line outside the 64 squares (NOT under them) */}
      {/* North inlay strip */}
      <mesh position={[0, 0.015, -4.08]} material={brassInlayMat}>
        <boxGeometry args={[8.22, 0.008, 0.04]} />
      </mesh>
      {/* South inlay strip */}
      <mesh position={[0, 0.015, 4.08]} material={brassInlayMat}>
        <boxGeometry args={[8.22, 0.008, 0.04]} />
      </mesh>
      {/* West inlay strip */}
      <mesh position={[-4.08, 0.015, 0]} material={brassInlayMat}>
        <boxGeometry args={[0.04, 0.008, 8.22]} />
      </mesh>
      {/* East inlay strip */}
      <mesh position={[4.08, 0.015, 0]} material={brassInlayMat}>
        <boxGeometry args={[0.04, 0.008, 8.22]} />
      </mesh>

      {/* 5. Rank and File Coordinates along the wood border */}
      {filesTexture && (
        <>
          {/* Bottom files (a-h) */}
          <mesh position={[0, 0.018, 4.56]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[8.0, 0.45]} />
            <meshBasicMaterial map={filesTexture} transparent opacity={0.9} depthWrite={false} />
          </mesh>
          {/* Top files (a-h rotated for opponent perspective) */}
          <mesh position={[0, 0.018, -4.56]} rotation-x={-Math.PI / 2} rotation-z={Math.PI}>
            <planeGeometry args={[8.0, 0.45]} />
            <meshBasicMaterial map={filesTexture} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        </>
      )}

      {ranksTexture && (
        <>
          {/* Left ranks (1-8) */}
          <mesh position={[-4.56, 0.018, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.45, 8.0]} />
            <meshBasicMaterial map={ranksTexture} transparent opacity={0.9} depthWrite={false} />
          </mesh>
          {/* Right ranks (1-8 rotated) */}
          <mesh position={[4.56, 0.018, 0]} rotation-x={-Math.PI / 2} rotation-z={Math.PI}>
            <planeGeometry args={[0.45, 8.0]} />
            <meshBasicMaterial map={ranksTexture} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* 6. Exactly 64 Real 3D Inlaid Wooden Tiles in 8x8 Grid */}
      {squares.map(({ sq, dark, x, z }) => {
        const highlight = highlightMap.get(sq);
        const isSelected = highlight?.type === "selected";
        const isLegalEmpty = highlight?.type === "legal-empty";
        const isLegalCapture = highlight?.type === "legal-capture";
        const isLastMove = highlight?.type === "last-move";
        const isCheck = highlight?.type === "check";

        return (
          <group key={sq} position={[x, 0.01, z]}>
            {/* 3D Tile Block with subtle bevel margin to eliminate edge-interpolation lines */}
            <mesh
              position={[0, 0, 0]}
              receiveShadow
              castShadow
              material={dark ? darkSquareMat : lightSquareMat}
              onPointerDown={(e) => handlePointerDown(e, sq)}
              onPointerOver={(e) => {
                e.stopPropagation();
                onSquareHover?.(sq);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                onSquareHover?.(null);
                document.body.style.cursor = "";
              }}
            >
              <boxGeometry args={[0.994, 0.02, 0.994]} />
            </mesh>

            {/* Selected square highlight glow */}
            {isSelected && (
              <mesh position={[0, 0.013, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[0.98, 0.98]} />
                <meshBasicMaterial color="#e5c365" transparent opacity={0.5} depthWrite={false} />
              </mesh>
            )}

            {/* Last move highlight */}
            {isLastMove && !isSelected && (
              <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[0.98, 0.98]} />
                <meshBasicMaterial color="#f0d588" transparent opacity={0.32} depthWrite={false} />
              </mesh>
            )}

            {/* King in check red pulsing alert */}
            {isCheck && (
              <mesh position={[0, 0.014, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[0.98, 0.98]} />
                <meshBasicMaterial color="#e63946" transparent opacity={0.65} depthWrite={false} />
              </mesh>
            )}

            {/* Legal move destination: elegant warm gold dot */}
            {isLegalEmpty && (
              <mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[0.15, 32]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} depthWrite={false} />
              </mesh>
            )}

            {/* Legal capture destination: translucent ruby target ring */}
            {isLegalCapture && (
              <mesh position={[0, 0.016, 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.34, 0.46, 32]} />
                <meshBasicMaterial color="#f43f5e" transparent opacity={0.88} depthWrite={false} />
              </mesh>
            )}

            {/* Assignment challenge target label if present */}
            {highlight?.label && (
              <group position={[0, 0.018, 0]}>
                <mesh rotation-x={-Math.PI / 2}>
                  <ringGeometry args={[0.32, 0.46, 32]} />
                  <meshBasicMaterial
                    color={
                      highlight.feedbackState === "right"
                        ? "#10b981"
                        : highlight.feedbackState === "wrong"
                        ? "#ef4444"
                        : "#e5c365"
                    }
                    transparent
                    opacity={highlight.feedbackState === "dim" ? 0.35 : 0.9}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
});

Board3D.displayName = "Board3D";
