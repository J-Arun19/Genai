import React, { useMemo } from "react";
import * as THREE from "three";
import type { Kind } from "@/game/logic";
import { getPieceWoodTexture } from "./boardTextures";

// Create lathe geometry from [x, y] coordinates
function createLathe(pts: [number, number][], segments = 32): THREE.LatheGeometry {
  const vectors = pts.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(vectors, segments);
}

/**
 * Procedurally generated Staunton chess pieces with authentic silhouettes.
 */
class StauntonGeometries {
  // Shared weighted base
  readonly base: THREE.LatheGeometry;
  readonly felt: THREE.CylinderGeometry;

  // Pawn
  readonly pawnStem: THREE.LatheGeometry;
  readonly pawnHead: THREE.SphereGeometry;
  readonly pawnPip: THREE.SphereGeometry;

  // Rook
  readonly rookTower: THREE.LatheGeometry;
  readonly rookCrown: THREE.CylinderGeometry;
  readonly rookMerlon: THREE.BoxGeometry;

  // Bishop
  readonly bishopBody: THREE.LatheGeometry;
  readonly bishopMiter: THREE.SphereGeometry;
  readonly bishopFinial: THREE.SphereGeometry;

  // Queen
  readonly queenBody: THREE.LatheGeometry;
  readonly queenCoronet: THREE.CylinderGeometry;
  readonly queenPoint: THREE.SphereGeometry;
  readonly queenOrb: THREE.SphereGeometry;

  // King
  readonly kingBody: THREE.LatheGeometry;
  readonly kingFinialDome: THREE.SphereGeometry;
  readonly kingCrossVert: THREE.BoxGeometry;
  readonly kingCrossHoriz: THREE.BoxGeometry;

  // Knight horse head geometry
  readonly knightHead: THREE.BufferGeometry;
  readonly knightEar: THREE.ConeGeometry;
  readonly knightSnout: THREE.BoxGeometry;
  readonly knightMuzzle: THREE.SphereGeometry;

  constructor() {
    // Elegant weighted pedestal base with stepped bevels and concave scoop
    this.base = createLathe([
      [0, 0],
      [0.37, 0],
      [0.37, 0.04],
      [0.34, 0.07],
      [0.30, 0.11],
      [0.32, 0.14],
      [0.30, 0.17],
      [0.24, 0.22],
      [0.21, 0.25],
      [0, 0.25],
    ]);

    this.felt = new THREE.CylinderGeometry(0.35, 0.35, 0.01, 32);

    // PAWN: concave stem, double collar ring, head sphere with pip
    this.pawnStem = createLathe([
      [0, 0.25],
      [0.21, 0.25],
      [0.17, 0.32],
      [0.12, 0.44],
      [0.11, 0.54],
      [0.15, 0.58],
      [0.17, 0.61],
      [0.14, 0.63],
      [0.10, 0.66],
      [0, 0.66],
    ]);
    this.pawnHead = new THREE.SphereGeometry(0.165, 32, 24);
    this.pawnPip = new THREE.SphereGeometry(0.04, 16, 12);

    // ROOK: fluted cylindrical tower, flared parapet, 4 crenellated battlements
    this.rookTower = createLathe([
      [0, 0.25],
      [0.23, 0.25],
      [0.20, 0.35],
      [0.18, 0.55],
      [0.18, 0.72],
      [0.21, 0.77],
      [0.25, 0.82],
      [0.27, 0.85],
      [0.23, 0.85],
      [0, 0.85],
    ]);
    this.rookCrown = new THREE.CylinderGeometry(0.26, 0.24, 0.16, 32, 1, true);
    this.rookMerlon = new THREE.BoxGeometry(0.12, 0.14, 0.09);

    // BISHOP: slender fluted waist, lower & upper collar rings, oval mitre
    this.bishopBody = createLathe([
      [0, 0.25],
      [0.22, 0.25],
      [0.18, 0.34],
      [0.13, 0.52],
      [0.12, 0.70],
      [0.17, 0.75],
      [0.19, 0.78],
      [0.14, 0.81],
      [0.12, 0.84],
      [0, 0.84],
    ]);
    this.bishopMiter = new THREE.SphereGeometry(0.165, 32, 24);
    this.bishopFinial = new THREE.SphereGeometry(0.05, 16, 12);

    // QUEEN: flared regal stem, double neck rings, flared coronet
    this.queenBody = createLathe([
      [0, 0.25],
      [0.23, 0.25],
      [0.19, 0.35],
      [0.14, 0.55],
      [0.13, 0.80],
      [0.18, 0.86],
      [0.21, 0.90],
      [0.16, 0.94],
      [0.21, 1.06],
      [0.26, 1.15],
      [0.23, 1.16],
      [0, 1.16],
    ]);
    this.queenCoronet = new THREE.CylinderGeometry(0.26, 0.18, 0.18, 24, 1, true);
    this.queenPoint = new THREE.SphereGeometry(0.032, 12, 10);
    this.queenOrb = new THREE.SphereGeometry(0.08, 20, 16);

    // KING: tall fluted body, regal stepped capital, cross finial
    this.kingBody = createLathe([
      [0, 0.25],
      [0.24, 0.25],
      [0.20, 0.36],
      [0.15, 0.58],
      [0.14, 0.88],
      [0.20, 0.95],
      [0.23, 1.00],
      [0.17, 1.05],
      [0.22, 1.18],
      [0.25, 1.25],
      [0.22, 1.27],
      [0, 1.27],
    ]);
    this.kingFinialDome = new THREE.SphereGeometry(0.14, 24, 18);
    this.kingCrossVert = new THREE.BoxGeometry(0.065, 0.28, 0.065);
    this.kingCrossHoriz = new THREE.BoxGeometry(0.20, 0.065, 0.065);

    // KNIGHT: sculpted horse head using curved extrusion profile
    const horseShape = new THREE.Shape();
    // Neck base
    horseShape.moveTo(-0.16, 0.24);
    // Back of neck / mane curve
    horseShape.quadraticCurveTo(-0.24, 0.55, -0.16, 0.82);
    // Poll / crown behind ears
    horseShape.lineTo(-0.10, 0.92);
    // Top of head / forelock
    horseShape.lineTo(0.02, 0.93);
    // Forehead slope down to snout
    horseShape.lineTo(0.18, 0.72);
    // Muzzle tip
    horseShape.quadraticCurveTo(0.24, 0.64, 0.20, 0.58);
    // Chin and throat latch
    horseShape.lineTo(0.08, 0.56);
    // Jaw curve
    horseShape.quadraticCurveTo(0.12, 0.44, 0.05, 0.34);
    // Chest down to base
    horseShape.quadraticCurveTo(0.02, 0.26, 0.16, 0.24);
    horseShape.closePath();

    this.knightHead = new THREE.ExtrudeGeometry(horseShape, {
      depth: 0.20,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    // Center extrusion on z-axis
    this.knightHead.translate(0, 0, -0.14);

    this.knightEar = new THREE.ConeGeometry(0.045, 0.14, 8);
    this.knightSnout = new THREE.BoxGeometry(0.12, 0.14, 0.18);
    this.knightMuzzle = new THREE.SphereGeometry(0.07, 16, 12);
  }
}

// Singleton geometries instance
let geometriesInstance: StauntonGeometries | null = null;
function getGeometries(): StauntonGeometries {
  if (!geometriesInstance) {
    geometriesInstance = new StauntonGeometries();
  }
  return geometriesInstance;
}

export interface PieceProps {
  kind: Kind;
  white: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Beautifully shaded, physically based Staunton chess piece component.
 */
export const StauntonPiece: React.FC<PieceProps> = React.memo(({ kind, white, castShadow = true, receiveShadow = true }) => {
  const geo = useMemo(() => getGeometries(), []);
  const woodTexture = useMemo(() => getPieceWoodTexture(), []);

  // Physically based materials: Polished Ivory/Maple (white) vs Ebonized Dark Walnut/Ebony (black)
  const pieceMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: white ? "#f5eedf" : "#342c26",
      roughness: white ? 0.30 : 0.31,
      metalness: 0.01,
      clearcoat: white ? 0.25 : 0.50,
      clearcoatRoughness: 0.25,
      reflectivity: 0.50,
      map: woodTexture,
      bumpMap: woodTexture,
      bumpScale: 0.002,
    });
  }, [white, woodTexture]);

  // Emerald felt bottom pad
  const feltMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#1b4d2e",
      roughness: 0.9,
      metalness: 0.0,
    });
  }, []);

  const s = { castShadow, receiveShadow, material: pieceMaterial };

  return (
    <group dispose={null}>
      {/* Green felt pad under base */}
      <mesh geometry={geo.felt} material={feltMaterial} position={[0, 0.005, 0]} />

      {/* Weighted pedestal base */}
      <mesh geometry={geo.base} {...s} />

      {/* PAWN */}
      {kind === "P" && (
        <>
          <mesh geometry={geo.pawnStem} {...s} />
          <mesh geometry={geo.pawnHead} position={[0, 0.78, 0]} {...s} />
          <mesh geometry={geo.pawnPip} position={[0, 0.94, 0]} {...s} />
        </>
      )}

      {/* ROOK */}
      {kind === "R" && (
        <>
          <mesh geometry={geo.rookTower} {...s} />
          <mesh geometry={geo.rookCrown} position={[0, 0.88, 0]} {...s} />
          {/* 4 crenellated merlons */}
          {[0, 1, 2, 3].map((i) => {
            const angle = (i * Math.PI) / 2 + Math.PI / 4;
            const r = 0.21;
            return (
              <mesh
                key={i}
                geometry={geo.rookMerlon}
                position={[Math.cos(angle) * r, 0.96, Math.sin(angle) * r]}
                rotation={[0, -angle, 0]}
                {...s}
              />
            );
          })}
        </>
      )}

      {/* KNIGHT */}
      {kind === "N" && (
        <>
          <mesh geometry={geo.knightHead} {...s} />
          {/* Left and right ears */}
          <mesh
            geometry={geo.knightEar}
            position={[-0.04, 0.96, 0.05]}
            rotation={[-0.1, 0, 0.2]}
            {...s}
          />
          <mesh
            geometry={geo.knightEar}
            position={[-0.04, 0.96, -0.05]}
            rotation={[0.1, 0, 0.2]}
            {...s}
          />
          {/* Muzzle definition */}
          <mesh
            geometry={geo.knightMuzzle}
            position={[0.16, 0.62, 0]}
            scale={[1.1, 0.9, 1.2]}
            {...s}
          />
        </>
      )}

      {/* BISHOP */}
      {kind === "B" && (
        <>
          <mesh geometry={geo.bishopBody} {...s} />
          <mesh
            geometry={geo.bishopMiter}
            position={[0, 0.98, 0]}
            scale={[0.9, 1.25, 0.9]}
            {...s}
          />
          <mesh geometry={geo.bishopFinial} position={[0, 1.19, 0]} {...s} />
        </>
      )}

      {/* QUEEN */}
      {kind === "Q" && (
        <>
          <mesh geometry={geo.queenBody} {...s} />
          <mesh geometry={geo.queenOrb} position={[0, 1.20, 0]} {...s} />
          <mesh geometry={geo.queenPoint} position={[0, 1.29, 0]} {...s} />
          {/* 8 coronet pearls around the crown */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * Math.PI) / 4;
            const r = 0.24;
            return (
              <mesh
                key={i}
                geometry={geo.queenPoint}
                position={[Math.cos(angle) * r, 1.18, Math.sin(angle) * r]}
                {...s}
              />
            );
          })}
        </>
      )}

      {/* KING */}
      {kind === "K" && (
        <>
          <mesh geometry={geo.kingBody} {...s} />
          <mesh geometry={geo.kingFinialDome} position={[0, 1.34, 0]} {...s} />
          {/* Regal 3D Cross on King's crown */}
          <mesh geometry={geo.kingCrossVert} position={[0, 1.54, 0]} {...s} />
          <mesh geometry={geo.kingCrossHoriz} position={[0, 1.57, 0]} {...s} />
        </>
      )}
    </group>
  );
});

StauntonPiece.displayName = "StauntonPiece";
