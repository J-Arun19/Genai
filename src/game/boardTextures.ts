import * as THREE from "three";

/**
 * Creates high-resolution procedural textures for realistic wooden chessboard and pieces.
 * Produces organic vertical wood grain without artificial horizontal banding or striped artifacts.
 */

// Cached textures
let lightSquareTexture: THREE.CanvasTexture | null = null;
let darkSquareTexture: THREE.CanvasTexture | null = null;
let borderTexture: THREE.CanvasTexture | null = null;
let woodGrainTexture: THREE.CanvasTexture | null = null;
let bumpTexture: THREE.CanvasTexture | null = null;

/**
 * Procedural authentic wood grain generator.
 * Aligns wood fibers vertically with subtle organic waviness and fiber micro-noise.
 */
function createWoodCanvas(
  width: number,
  height: number,
  baseColor: [number, number, number],
  grainColor: [number, number, number],
  density: number = 32,
  waviness: number = 0.08
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Multi-frequency smooth noise
  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };

  const smoothNoise = (x: number, y: number) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    // Cubic hermite curve
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = noise(i, j);
    const n10 = noise(i + 1, j);
    const n01 = noise(i, j + 1);
    const n11 = noise(i + 1, j + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
  };

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    // Gentle longitudinal distortion along the tree trunk grain
    const wave = Math.sin(ny * Math.PI * 4) * waviness + smoothNoise(ny * 3, 0.5) * 0.12;

    for (let x = 0; x < width; x++) {
      const nx = x / width;
      // Primary vertical wood grain fibers
      const fiberPos = (nx + wave) * density;
      const grain = Math.sin(fiberPos * Math.PI * 2);
      // Fine micro-vessels
      const micro = (noise(x * 0.8, y * 0.1) - 0.5) * 0.16;

      // Soft growth ring thresholding
      let t = (grain + 1) * 0.5;
      t = Math.pow(t, 1.4) + micro;
      t = Math.max(0, Math.min(1, t));

      const r = Math.round(baseColor[0] * (1 - t) + grainColor[0] * t);
      const g = Math.round(baseColor[1] * (1 - t) + grainColor[1] * t);
      const b = Math.round(baseColor[2] * (1 - t) + grainColor[2] * t);

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Returns warm ivory / figured light maple square texture.
 */
export function getLightSquareTexture(): THREE.CanvasTexture {
  if (lightSquareTexture) return lightSquareTexture;
  if (typeof document === "undefined") return new THREE.CanvasTexture(document?.createElement("canvas"));

  const canvas = createWoodCanvas(
    512,
    512,
    [242, 232, 214], // Warm maple ivory cream
    [220, 204, 178], // Fine honey grain lines
    26,
    0.05
  );
  lightSquareTexture = new THREE.CanvasTexture(canvas);
  lightSquareTexture.wrapS = THREE.ClampToEdgeWrapping;
  lightSquareTexture.wrapT = THREE.ClampToEdgeWrapping;
  lightSquareTexture.generateMipmaps = true;
  lightSquareTexture.minFilter = THREE.LinearMipmapLinearFilter;
  lightSquareTexture.needsUpdate = true;
  return lightSquareTexture;
}

/**
 * Returns rich polished walnut dark square texture.
 */
export function getDarkSquareTexture(): THREE.CanvasTexture {
  if (darkSquareTexture) return darkSquareTexture;
  if (typeof document === "undefined") return new THREE.CanvasTexture(document?.createElement("canvas"));

  const canvas = createWoodCanvas(
    512,
    512,
    [88, 54, 34],  // Rich walnut chocolate base
    [54, 32, 19],  // Deep espresso grain veins
    32,
    0.06
  );
  darkSquareTexture = new THREE.CanvasTexture(canvas);
  darkSquareTexture.wrapS = THREE.ClampToEdgeWrapping;
  darkSquareTexture.wrapT = THREE.ClampToEdgeWrapping;
  darkSquareTexture.generateMipmaps = true;
  darkSquareTexture.minFilter = THREE.LinearMipmapLinearFilter;
  darkSquareTexture.needsUpdate = true;
  return darkSquareTexture;
}

/**
 * Returns luxury mahogany border frame texture.
 */
export function getBorderTexture(): THREE.CanvasTexture {
  if (borderTexture) return borderTexture;
  if (typeof document === "undefined") return new THREE.CanvasTexture(document?.createElement("canvas"));

  const canvas = createWoodCanvas(
    1024,
    1024,
    [46, 26, 17], // Deep mahogany red-brown
    [30, 16, 10], // Very dark rich grain
    40,
    0.04
  );
  borderTexture = new THREE.CanvasTexture(canvas);
  borderTexture.wrapS = THREE.RepeatWrapping;
  borderTexture.wrapT = THREE.RepeatWrapping;
  borderTexture.generateMipmaps = true;
  borderTexture.minFilter = THREE.LinearMipmapLinearFilter;
  borderTexture.needsUpdate = true;
  return borderTexture;
}

/**
 * Subtle organic grain for piece materials.
 */
export function getPieceWoodTexture(): THREE.CanvasTexture {
  if (woodGrainTexture) return woodGrainTexture;
  if (typeof document === "undefined") return new THREE.CanvasTexture(document?.createElement("canvas"));

  const canvas = createWoodCanvas(
    256,
    512,
    [245, 245, 245],
    [220, 220, 220],
    18,
    0.03
  );
  woodGrainTexture = new THREE.CanvasTexture(canvas);
  woodGrainTexture.wrapS = THREE.ClampToEdgeWrapping;
  woodGrainTexture.wrapT = THREE.ClampToEdgeWrapping;
  woodGrainTexture.needsUpdate = true;
  return woodGrainTexture;
}

/**
 * Tactile micro-bump texture for wooden sheen.
 */
export function getWoodBumpTexture(): THREE.CanvasTexture {
  if (bumpTexture) return bumpTexture;
  if (typeof document === "undefined") return new THREE.CanvasTexture(document?.createElement("canvas"));

  const canvas = createWoodCanvas(
    256,
    256,
    [128, 128, 128],
    [180, 180, 180],
    36,
    0.04
  );
  bumpTexture = new THREE.CanvasTexture(canvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.needsUpdate = true;
  return bumpTexture;
}

/**
 * Procedural chess audio synthesizer using Web Audio API.
 * No external sound files needed, completely self-contained and instantaneous.
 */
class ChessAudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Crisp wooden move click.
   */
  playMove() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Heavy satisfying piece capture thud.
   */
  playCapture() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(260, now);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 0.14);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(140, now);
    osc2.frequency.exponentialRampToValueAtTime(35, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  /**
   * Tension check alert tone.
   */
  playCheck() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Victorious / game over chord.
   */
  playGameOver(isWin: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = isWin ? [440, 554.37, 659.25, 880] : [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isWin ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.18, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.45);
    });
  }
}

export const chessAudio = new ChessAudioSynthesizer();
