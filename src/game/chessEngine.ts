import { Chess, type Square, type PieceSymbol, type Color } from "chess.js";
import type { Kind, Piece } from "./logic";

export type AIDifficulty = "easy" | "medium" | "hard";

export interface ChessEnginePiece {
  id: string;
  sq: string;
  k: Kind;
  white: boolean;
}

export interface CapturedPieces {
  white: Kind[]; // Captured white pieces (held by black)
  black: Kind[]; // Captured black pieces (held by white)
  whiteAdvantage: number; // Positive if white has more material points
}

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  color: "w" | "b";
  piece: string;
  captured?: string;
  promotion?: string;
}

// Convert chess.js piece symbol to our Kind
export function symbolToKind(sym: PieceSymbol): Kind {
  return sym.toUpperCase() as Kind;
}

export function kindToSymbol(k: Kind): PieceSymbol {
  return k.toLowerCase() as PieceSymbol;
}

// Standard piece values in centipawns
export const PIECE_VALUES: Record<Kind, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

// Piece-Square Tables (White perspective, rank 8 to 1 from top to bottom)
// Flipped automatically for Black
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

function getSquareIndex(sq: string, isWhite: boolean): number {
  const file = sq.charCodeAt(0) - 97; // 0..7
  const rank = parseInt(sq[1]!, 10) - 1; // 0..7
  // PST array is top-to-bottom (rank 8 down to 1)
  const row = 7 - rank;
  const col = file;
  if (isWhite) {
    return row * 8 + col;
  } else {
    // Flip vertically for black
    return (7 - row) * 8 + col;
  }
}

function evaluatePosition(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? -99999 : 99999;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r]![c];
      if (!piece) continue;

      const isWhite = piece.color === "w";
      const sign = isWhite ? 1 : -1;
      const k = symbolToKind(piece.type);
      const val = PIECE_VALUES[k];

      const sq = String.fromCharCode(97 + c) + (8 - r);
      const idx = getSquareIndex(sq, isWhite);

      let pst = 0;
      switch (piece.type) {
        case "p": pst = PAWN_PST[idx] ?? 0; break;
        case "n": pst = KNIGHT_PST[idx] ?? 0; break;
        case "b": pst = BISHOP_PST[idx] ?? 0; break;
        case "r": pst = ROOK_PST[idx] ?? 0; break;
        case "q": pst = QUEEN_PST[idx] ?? 0; break;
        case "k": pst = KING_MID_PST[idx] ?? 0; break;
      }

      score += sign * (val + pst);
    }
  }

  return score;
}

// Quiescence search for captures to prevent horizon effect
function quiescence(chess: Chess, alpha: number, beta: number, maxDepth: number = 2): number {
  const standPat = evaluatePosition(chess);
  const isWhite = chess.turn() === "w";

  if (maxDepth <= 0) return standPat;

  if (isWhite) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;
  }

  // Generate only captures
  const captures = chess.moves({ verbose: true }).filter((m) => !!m.captured);
  // Sort captures by MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  captures.sort((a, b) => {
    const valA = PIECE_VALUES[symbolToKind(a.captured!)] - PIECE_VALUES[symbolToKind(a.piece)];
    const valB = PIECE_VALUES[symbolToKind(b.captured!)] - PIECE_VALUES[symbolToKind(b.piece)];
    return valB - valA;
  });

  for (const move of captures) {
    chess.move(move);
    const score = quiescence(chess, alpha, beta, maxDepth - 1);
    chess.undo();

    if (isWhite) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }

  return isWhite ? alpha : beta;
}

// Minimax with Alpha-Beta Pruning
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
): { score: number; bestMove?: string } {
  if (depth === 0 || chess.isGameOver()) {
    return { score: quiescence(chess, alpha, beta, 1) };
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    return { score: evaluatePosition(chess) };
  }

  // Order moves: captures first
  moves.sort((a, b) => {
    const aCap = a.captured ? PIECE_VALUES[symbolToKind(a.captured)] : 0;
    const bCap = b.captured ? PIECE_VALUES[symbolToKind(b.captured)] : 0;
    return bCap - aCap;
  });

  let bestMoveSan = moves[0]!.san;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, false).score;
      chess.undo();

      if (ev > maxEval) {
        maxEval = ev;
        bestMoveSan = move.san;
      }
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return { score: maxEval, bestMove: bestMoveSan };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, true).score;
      chess.undo();

      if (ev < minEval) {
        minEval = ev;
        bestMoveSan = move.san;
      }
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return { score: minEval, bestMove: bestMoveSan };
  }
}

/**
 * Calculates the best computer move based on selected difficulty.
 */
export async function getAIMove(chess: Chess, difficulty: AIDifficulty): Promise<string | null> {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isWhite = chess.turn() === "w";

  // Level 1: Easy / Casual (~800 ELO)
  if (difficulty === "easy") {
    // 40% chance to pick a capture or check if available, otherwise random
    const captures = legalMoves.filter((m) => !!m.captured || chess.inCheck());
    if (captures.length > 0 && Math.random() < 0.45) {
      const pick = captures[Math.floor(Math.random() * captures.length)]!;
      return pick.san;
    }
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)]!;
    return randomMove.san;
  }

  // Level 2: Medium / Club (~1400 ELO) - 2 ply minimax
  if (difficulty === "medium") {
    // Occasional human imperfection (10% random sub-optimal move)
    if (Math.random() < 0.12 && legalMoves.length > 1) {
      const filtered = legalMoves.filter((m) => !m.captured);
      if (filtered.length > 0) {
        return filtered[Math.floor(Math.random() * filtered.length)]!.san;
      }
    }
    const result = minimax(chess, 2, -Infinity, Infinity, isWhite);
    return result.bestMove ?? legalMoves[0]!.san;
  }

  // Level 3: Hard / Master (~1850 ELO) - 3 ply minimax with quiescence
  const result = minimax(chess, 3, -Infinity, Infinity, isWhite);
  return result.bestMove ?? legalMoves[0]!.san;
}

/**
 * Converts chess.board() to an array of Piece objects with stable persistent IDs.
 */
export function extractBoardPieces(
  chess: Chess,
  existingPieces: ChessEnginePiece[] = [],
): ChessEnginePiece[] {
  const board = chess.board();
  const newPieces: ChessEnginePiece[] = [];

  // Pool of existing pieces to match against
  const pool = [...existingPieces];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r]![c];
      if (!cell) continue;

      const sq = String.fromCharCode(97 + c) + (8 - r);
      const k = symbolToKind(cell.type);
      const white = cell.color === "w";

      // Try to find an existing piece that matches square & kind
      let matchIdx = pool.findIndex((p) => p.sq === sq && p.k === k && p.white === white);
      if (matchIdx === -1) {
        // Find existing piece of same kind & color that moved
        matchIdx = pool.findIndex((p) => p.k === k && p.white === white);
      }

      let id = "";
      if (matchIdx !== -1) {
        id = pool[matchIdx]!.id;
        pool.splice(matchIdx, 1);
      } else {
        id = `${cell.color}_${k}_${sq}_${Math.random().toString(36).substring(2, 7)}`;
      }

      newPieces.push({ id, sq, k, white });
    }
  }

  return newPieces;
}

/**
 * Calculates captured pieces and material balance.
 */
export function getCapturedPieces(chess: Chess): CapturedPieces {
  const startingPieces: Record<"w" | "b", Record<Kind, number>> = {
    w: { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 },
    b: { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 },
  };

  const currentPieces: Record<"w" | "b", Record<Kind, number>> = {
    w: { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 },
    b: { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 },
  };

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r]![c];
      if (!cell) continue;
      const k = symbolToKind(cell.type);
      currentPieces[cell.color][k]++;
    }
  }

  const capturedWhite: Kind[] = [];
  const capturedBlack: Kind[] = [];

  const order: Kind[] = ["Q", "R", "B", "N", "P"];
  for (const k of order) {
    const missingW = Math.max(0, startingPieces.w[k] - currentPieces.w[k]);
    for (let i = 0; i < missingW; i++) capturedWhite.push(k);

    const missingB = Math.max(0, startingPieces.b[k] - currentPieces.b[k]);
    for (let i = 0; i < missingB; i++) capturedBlack.push(k);
  }

  let whitePoints = 0;
  let blackPoints = 0;
  for (const k of order) {
    whitePoints += currentPieces.w[k] * PIECE_VALUES[k];
    blackPoints += currentPieces.b[k] * PIECE_VALUES[k];
  }

  const whiteAdvantage = Math.round((whitePoints - blackPoints) / 100);

  return {
    white: capturedWhite,
    black: capturedBlack,
    whiteAdvantage,
  };
}
