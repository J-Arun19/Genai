import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Chess, type Square } from "chess.js";
import { type SquareHighlight } from "@/components/Chess3D/Board3D";
import { PromotionModal } from "./PromotionModal";

const Arena = lazy(() => import("@/components/Arena"));
import {
  extractBoardPieces,
  getAIMove,
  getCapturedPieces,
  type AIDifficulty,
  type ChessEnginePiece,
  type CapturedPieces,
} from "@/game/chessEngine";
import { chessAudio } from "@/game/boardTextures";
import {
  RotateCcw,
  RefreshCw,
  Eye,
  Volume2,
  VolumeX,
  Swords,
  Bot,
  User,
  Sparkles as SparklesIcon,
  Trophy,
  ShieldAlert,
  Sliders,
  Camera,
  Layers,
} from "lucide-react";

export type GameMode = "ai" | "pvp";

const GLYPHS: Record<string, string> = {
  K: "♚",
  Q: "♛",
  R: "♜",
  B: "♝",
  N: "♞",
  P: "♟",
};

interface PlayableChessGameProps {
  externalMode?: GameMode;
  externalDifficulty?: AIDifficulty;
  onModeChange?: (mode: GameMode) => void;
  onDifficultyChange?: (diff: AIDifficulty) => void;
}

export const PlayableChessGame: React.FC<PlayableChessGameProps> = ({
  externalMode,
  externalDifficulty,
  onModeChange,
  onDifficultyChange,
}) => {
  // Chess instance
  const [chess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(() => chess.fen());
  const [pieces, setPieces] = useState<ChessEnginePiece[]>(() => extractBoardPieces(chess));

  // Game settings
  const [internalMode, setInternalMode] = useState<GameMode>("ai");
  const [internalDifficulty, setInternalDifficulty] = useState<AIDifficulty>("medium");
  const mode = externalMode ?? internalMode;
  const difficulty = externalDifficulty ?? internalDifficulty;

  const setMode = (m: GameMode) => {
    setInternalMode(m);
    onModeChange?.(m);
  };

  const setDifficulty = (d: AIDifficulty) => {
    setInternalDifficulty(d);
    onDifficultyChange?.(d);
  };

  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [flipped, setFlipped] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Interaction state
  const [selectedSq, setSelectedSq] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<{ to: string; captured?: boolean; promotion?: boolean }[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [resetCameraCount, setResetCameraCount] = useState<number>(0);
  const [burstSq, setBurstSq] = useState<string | null>(null);

  // Sync sound settings
  useEffect(() => {
    chessAudio.enabled = soundEnabled;
  }, [soundEnabled]);

  // Sync pieces and captured state whenever FEN changes
  const captured: CapturedPieces = useMemo(() => getCapturedPieces(chess), [fen, chess]);
  const history = useMemo(() => chess.history(), [fen, chess]);

  // Turn and check status
  const turn = chess.turn(); // 'w' | 'b'
  const isCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isDraw = chess.isDraw();
  const isGameOver = chess.isGameOver();

  // Find checked king's square for highlight
  const checkSq = useMemo(() => {
    if (!isCheck) return null;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r]![c];
        if (p && p.type === "k" && p.color === turn) {
          return String.fromCharCode(97 + c) + (8 - r);
        }
      }
    }
    return null;
  }, [chess, isCheck, turn, fen]);

  // Play game-over sound & sparkles
  useEffect(() => {
    if (isCheckmate) {
      const winner = turn === "w" ? "Black" : "White";
      const isPlayerWin = (winner === "White" && playerColor === "w") || (winner === "Black" && playerColor === "b");
      chessAudio.playGameOver(isPlayerWin);
      setBurstSq(checkSq);
    } else if (isCheck) {
      chessAudio.playCheck();
    }
  }, [isCheckmate, isCheck, turn, playerColor, checkSq]);

  // Execute a chess move
  const executeMove = useCallback((from: string, to: string, promotion?: string) => {
    try {
      const move = chess.move({
        from: from as Square,
        to: to as Square,
        promotion: promotion || "q",
      });

      if (!move) return false;

      // Audio feedback
      if (move.captured) {
        chessAudio.playCapture();
      } else {
        chessAudio.playMove();
      }

      // Update state
      setFen(chess.fen());
      setPieces((prev) => extractBoardPieces(chess, prev));
      setLastMove({ from, to });
      setSelectedSq(null);
      setLegalMoves([]);

      return true;
    } catch {
      return false;
    }
  }, [chess]);

  // Computer AI turn handler
  const aiTurnRef = useRef(false);
  useEffect(() => {
    if (mode !== "ai" || isGameOver) return;

    const isComputerTurn = turn !== playerColor;
    if (isComputerTurn && !aiTurnRef.current) {
      aiTurnRef.current = true;
      setIsAiThinking(true);

      const thinkTime = difficulty === "easy" ? 350 : difficulty === "medium" ? 500 : 700;
      const timer = setTimeout(async () => {
        try {
          const moveSan = await getAIMove(chess, difficulty);
          if (moveSan) {
            const move = chess.move(moveSan);
            if (move) {
              if (move.captured) chessAudio.playCapture();
              else chessAudio.playMove();

              setFen(chess.fen());
              setPieces((prev) => extractBoardPieces(chess, prev));
              setLastMove({ from: move.from, to: move.to });
            }
          }
        } finally {
          setIsAiThinking(false);
          aiTurnRef.current = false;
        }
      }, thinkTime);

      return () => clearTimeout(timer);
    }
  }, [chess, mode, turn, playerColor, isGameOver, difficulty, fen]);

  // Handle square or piece click
  const handleSquareClick = useCallback((sq: string) => {
    if (isGameOver || isAiThinking) return;

    // In AI mode, restrict interaction to player's turn
    if (mode === "ai" && turn !== playerColor) return;

    // 1. If we already have a piece selected, check if clicked square is a legal move
    if (selectedSq) {
      const move = legalMoves.find((m) => m.to === sq);
      if (move) {
        if (move.promotion) {
          setPendingPromotion({ from: selectedSq, to: sq });
          return;
        }
        executeMove(selectedSq, sq);
        return;
      }
    }

    // 2. Otherwise, check if clicking one's own piece to select it
    const piece = chess.get(sq as Square);
    if (piece && piece.color === turn) {
      setSelectedSq(sq);
      const moves = chess.moves({ square: sq as Square, verbose: true });
      setLegalMoves(
        moves.map((m) => ({
          to: m.to,
          captured: !!m.captured,
          promotion: !!m.promotion,
        }))
      );
    } else {
      setSelectedSq(null);
      setLegalMoves([]);
    }
  }, [chess, selectedSq, legalMoves, isGameOver, isAiThinking, mode, turn, playerColor, executeMove]);

  // Handle pawn promotion modal selection
  const handlePromotionSelect = (chosen: "q" | "r" | "b" | "n") => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, chosen);
    setPendingPromotion(null);
  };

  // Undo move
  const handleUndo = () => {
    if (isAiThinking || history.length === 0) return;

    if (mode === "ai") {
      chess.undo();
      if (chess.turn() !== playerColor) {
        chess.undo();
      }
    } else {
      chess.undo();
    }

    setFen(chess.fen());
    setPieces((prev) => extractBoardPieces(chess, prev));
    setSelectedSq(null);
    setLegalMoves([]);
    setLastMove(null);
    setBurstSq(null);
  };

  // New game restart
  const handleNewGame = () => {
    chess.reset();
    setFen(chess.fen());
    setPieces(extractBoardPieces(chess));
    setSelectedSq(null);
    setLegalMoves([]);
    setLastMove(null);
    setBurstSq(null);
    setIsAiThinking(false);
    aiTurnRef.current = false;
  };

  // Flip perspective
  const handleFlip = () => {
    setFlipped((f) => !f);
  };

  // Reset camera
  const handleResetCamera = () => {
    setResetCameraCount((c) => c + 1);
  };

  // Build highlights for 3D Board
  const highlights: SquareHighlight[] = useMemo(() => {
    const list: SquareHighlight[] = [];

    if (selectedSq) {
      list.push({ sq: selectedSq, type: "selected" });
    }

    for (const m of legalMoves) {
      list.push({
        sq: m.to,
        type: m.captured ? "legal-capture" : "legal-empty",
      });
    }

    if (lastMove) {
      list.push({ sq: lastMove.from, type: "last-move" });
      list.push({ sq: lastMove.to, type: "last-move" });
    }

    if (checkSq) {
      list.push({ sq: checkSq, type: "check" });
    }

    return list;
  }, [selectedSq, legalMoves, lastMove, checkSq]);

  // Format moves in paired turns (1. e4 e5)
  const pairedHistory = useMemo(() => {
    const pairs: { moveNum: number; white: string; black?: string }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        moveNum: Math.floor(i / 2) + 1,
        white: history[i]!,
        black: history[i + 1],
      });
    }
    return pairs;
  }, [history]);

  return (
    <div className="space-y-4">
      {/* Promotion Modal */}
      <PromotionModal
        isOpen={pendingPromotion !== null}
        isWhite={turn === "w"}
        onSelect={handlePromotionSelect}
        onCancel={() => setPendingPromotion(null)}
      />

      {/* Main Game Layout: 72% Large Board on Left, 28% Controls on Right */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]">
        {/* LEFT: 3D Chessboard Viewport */}
        <div className="relative flex flex-col rounded-2xl border border-border/80 bg-[#12151b] shadow-2xl overflow-hidden">
          {/* Top In-Canvas Status & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-[#161920]/90 px-5 py-3 backdrop-blur-md">
            {/* Active Turn Indicator */}
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-4 w-4 rounded-full shadow-sm ring-2 ${
                  turn === "w"
                    ? "bg-[#f5eedf] ring-amber-400/80"
                    : "bg-[#221c19] ring-neutral-400/80"
                } ${isAiThinking ? "animate-pulse" : ""}`}
              />
              <span className="font-display text-base font-bold tracking-wide text-foreground">
                {isGameOver
                  ? isCheckmate
                    ? `Checkmate — ${turn === "w" ? "Black" : "White"} Wins!`
                    : "Game Over (Draw)"
                  : isAiThinking
                  ? "Computer Thinking…"
                  : `${turn === "w" ? "White" : "Black"}'s Turn ${
                      mode === "ai" && turn !== playerColor ? "(AI)" : ""
                    }`}
              </span>
              {isCheck && !isCheckmate && (
                <span className="flex items-center gap-1 rounded-full bg-destructive/20 border border-destructive/40 px-2.5 py-0.5 text-xs font-bold text-destructive animate-pulse">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  CHECK
                </span>
              )}
            </div>

            {/* In-Canvas Quick Camera Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleFlip}
                title="Flip Board Perspective"
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/70 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-accent/60 transition-all"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Flip</span>
              </button>
              <button
                onClick={handleResetCamera}
                title="Reset Camera View"
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/70 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-accent/60 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={() => setSoundEnabled((s) => !s)}
                title={soundEnabled ? "Mute Audio" : "Unmute Audio"}
                className="rounded-lg border border-border/60 bg-secondary/70 p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-accent/60 transition-all"
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* 3D Canvas Area: Prominent, Large, Cinematic */}
          <div className="relative h-[480px] sm:h-[580px] lg:h-[640px] w-full">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                  Loading photorealistic 3D chessboard…
                </div>
              }
            >
              <Arena
                mode="game"
                pieces={pieces}
                highlights={highlights}
                onSquareClick={handleSquareClick}
                onPieceClick={handleSquareClick}
                flipped={flipped}
                burst={burstSq}
                resetTrigger={resetCameraCount}
              />
            </Suspense>

            {/* Captured Pieces Shelves Overlay (Top Left) */}
            <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1.5 rounded-xl border border-border/50 bg-[#0c0e12]/80 p-2.5 backdrop-blur-md text-xs font-medium shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/80 font-mono text-[11px]">White:</span>
                <span className="text-sm tracking-tight text-[#f5eedf]">
                  {captured.white.length > 0 ? captured.white.map((k) => GLYPHS[k]).join("") : "—"}
                </span>
                {captured.whiteAdvantage < 0 && (
                  <span className="text-[#e5c365] font-bold">+{Math.abs(captured.whiteAdvantage)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/80 font-mono text-[11px]">Black:</span>
                <span className="text-sm tracking-tight text-neutral-400">
                  {captured.black.length > 0 ? captured.black.map((k) => GLYPHS[k]).join("") : "—"}
                </span>
                {captured.whiteAdvantage > 0 && (
                  <span className="text-[#e5c365] font-bold">+{captured.whiteAdvantage}</span>
                )}
              </div>
            </div>

            {/* Subtle Controls Tip Overlay (Bottom Left) */}
            <p className="pointer-events-none absolute bottom-3 left-4 text-xs tracking-wide text-muted-foreground/75 font-sans">
              Click piece to select · Click square to move · Drag to orbit · Scroll to zoom
            </p>
          </div>

          {/* Game Over Modal Banner */}
          {isGameOver && (
            <div className="border-t border-border/80 bg-[#161920]/95 p-5 text-center animate-rise backdrop-blur-md">
              <div className="flex items-center justify-center gap-2.5 font-display text-2xl font-bold text-[#e5c365]">
                <Trophy className="h-6 w-6 text-[#e5c365]" />
                <span>
                  {isCheckmate
                    ? `Checkmate! ${turn === "w" ? "Black" : "White"} won the game.`
                    : "The game ended in a draw."}
                </span>
              </div>
              <button
                onClick={handleNewGame}
                className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-[#e5c365] px-7 py-2.5 text-sm font-bold text-neutral-950 hover:brightness-110 shadow-lg shadow-[#e5c365]/20 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Play New Game
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Game Controls, Game Info & Move History */}
        <div className="space-y-4">
          {/* 1. Game Setup Panel */}
          <div className="rounded-2xl border border-border/80 bg-[#14171e] p-4 sm:p-5 space-y-3.5 shadow-xl">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Swords className="h-4 w-4 text-[#e5c365]" />
              Game Setup
            </h3>

            {/* Game Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("ai")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                    mode === "ai"
                      ? "border-[#e5c365] bg-[#e5c365]/15 text-[#e5c365] shadow-sm"
                      : "border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  Play vs AI
                </button>
                <button
                  onClick={() => setMode("pvp")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                    mode === "pvp"
                      ? "border-[#e5c365] bg-[#e5c365]/15 text-[#e5c365] shadow-sm"
                      : "border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  2 Players (PvP)
                </button>
              </div>
            </div>

            {/* AI Difficulty Selector */}
            {mode === "ai" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Difficulty
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["easy", "medium", "hard"] as AIDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`rounded-lg py-1.5 text-xs font-bold uppercase transition-all border ${
                        difficulty === d
                          ? "border-[#e5c365] bg-[#e5c365] text-neutral-950 shadow-sm"
                          : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-accent/60 hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Undo Move & Restart Game */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
              <button
                onClick={handleUndo}
                disabled={history.length === 0 || isAiThinking}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 py-2.5 text-xs font-semibold hover:border-accent/60 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Undo Move
              </button>
              <button
                onClick={handleNewGame}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 py-2.5 text-xs font-semibold hover:border-accent/60 hover:text-foreground transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Restart Game
              </button>
            </div>
          </div>

          {/* 2. Game Info Panel */}
          <div className="rounded-2xl border border-border/80 bg-[#14171e] p-4 sm:p-5 space-y-3 shadow-xl">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Sliders className="h-4 w-4 text-[#e5c365]" />
              Game Info
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Current Turn</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      turn === "w" ? "bg-[#f5eedf]" : "bg-neutral-600"
                    }`}
                  />
                  {turn === "w" ? "White" : "Black"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Game Mode</span>
                <span className="font-semibold text-foreground">
                  {mode === "ai" ? `vs Computer (${difficulty})` : "Player vs Player"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`font-semibold ${
                    isCheckmate
                      ? "text-[#e5c365]"
                      : isCheck
                      ? "text-destructive font-bold animate-pulse"
                      : "text-foreground"
                  }`}
                >
                  {isCheckmate ? "Checkmate" : isCheck ? "Check!" : isDraw ? "Draw" : "Active"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Material Advantage</span>
                <span className="font-semibold text-foreground">
                  {captured.whiteAdvantage === 0
                    ? "Even (0)"
                    : captured.whiteAdvantage > 0
                    ? `White +${captured.whiteAdvantage}`
                    : `Black +${Math.abs(captured.whiteAdvantage)}`}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Move History Panel */}
          <div className="rounded-2xl border border-border/80 bg-[#14171e] p-4 sm:p-5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">Move History</h3>
              <span className="text-xs font-mono font-medium rounded-md bg-secondary/80 px-2 py-0.5 text-muted-foreground">
                {history.length} ply
              </span>
            </div>

            <div className="h-44 overflow-y-auto rounded-xl border border-border/60 bg-[#0e1117] p-2.5 text-xs space-y-1 font-mono">
              {pairedHistory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground/60 text-xs py-10">
                  No moves played yet
                </div>
              ) : (
                pairedHistory.map((p) => (
                  <div
                    key={p.moveNum}
                    className="grid grid-cols-[36px_1fr_1fr] items-center rounded-lg px-2.5 py-1.5 hover:bg-secondary/60 transition-colors"
                  >
                    <span className="text-muted-foreground/70 font-semibold">{p.moveNum}.</span>
                    <span className="font-semibold text-foreground">{p.white}</span>
                    <span className="font-medium text-muted-foreground">{p.black ?? ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Camera Controls Panel */}
          <div className="rounded-2xl border border-border/80 bg-[#14171e] p-4 space-y-2 shadow-xl">
            <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
              <Camera className="h-4 w-4 text-[#e5c365]" />
              Camera Controls
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleFlip}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-secondary/50 py-2 font-medium hover:border-accent/60 hover:text-foreground transition-all"
              >
                <Eye className="h-3.5 w-3.5" />
                Flip Board
              </button>
              <button
                onClick={handleResetCamera}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-secondary/50 py-2 font-medium hover:border-accent/60 hover:text-foreground transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
