import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  extractBoardPieces,
  getAIMove,
  getCapturedPieces,
  symbolToKind,
  kindToSymbol,
} from "./chessEngine";

describe("ChessEngine & AI", () => {
  it("converts between symbol and kind correctly", () => {
    expect(symbolToKind("p")).toBe("P");
    expect(symbolToKind("q")).toBe("Q");
    expect(kindToSymbol("K")).toBe("k");
    expect(kindToSymbol("N")).toBe("n");
  });

  it("extracts 32 pieces for standard starting position with stable IDs", () => {
    const chess = new Chess();
    const pieces = extractBoardPieces(chess);
    expect(pieces).toHaveLength(32);
    expect(pieces.filter((p) => p.white)).toHaveLength(16);
    expect(pieces.filter((p) => !p.white)).toHaveLength(16);

    // Make a move
    chess.move("e4");
    const piecesAfter = extractBoardPieces(chess, pieces);
    expect(piecesAfter).toHaveLength(32);
    const movedPawn = piecesAfter.find((p) => p.sq === "e4");
    expect(movedPawn).toBeDefined();
    expect(movedPawn?.k).toBe("P");
    expect(movedPawn?.white).toBe(true);
  });

  it("calculates captured pieces and point advantage", () => {
    const chess = new Chess();
    const initialCaptured = getCapturedPieces(chess);
    expect(initialCaptured.white).toHaveLength(0);
    expect(initialCaptured.black).toHaveLength(0);
    expect(initialCaptured.whiteAdvantage).toBe(0);

    // Scholar's mate leading to captured pawn and queen checkmate
    chess.move("e4");
    chess.move("e5");
    chess.move("Qh5");
    chess.move("Nc6");
    chess.move("Bc4");
    chess.move("Nf6");
    chess.move("Qxf7#");

    const afterMate = getCapturedPieces(chess);
    expect(afterMate.black).toContain("P"); // White captured Black's f7 pawn
    expect(afterMate.whiteAdvantage).toBe(1);
    expect(chess.isCheckmate()).toBe(true);
  });

  it("AI generates a valid legal move on easy, medium, and hard difficulties", async () => {
    const chess = new Chess();
    const easyMove = await getAIMove(chess, "easy");
    expect(easyMove).toBeTruthy();
    expect(chess.moves()).toContain(easyMove);

    const medMove = await getAIMove(chess, "medium");
    expect(medMove).toBeTruthy();
    expect(chess.moves()).toContain(medMove);

    const hardMove = await getAIMove(chess, "hard");
    expect(hardMove).toBeTruthy();
    expect(chess.moves()).toContain(hardMove);
  });

  it("correctly identifies check, checkmate, stalemate, castling", () => {
    // Castling test
    const castlingChess = new Chess("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5");
    const legalWhiteMoves = castlingChess.moves();
    expect(legalWhiteMoves).toContain("O-O");
    castlingChess.move("O-O");
    expect(castlingChess.get("g1")?.type).toBe("k");
    expect(castlingChess.get("f1")?.type).toBe("r");
  });
});
