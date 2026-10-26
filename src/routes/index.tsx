import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SKILLS,
  QUESTIONS,
  WIN_AT,
  answer,
  applyMove,
  initGame,
  isWin,
  next,
  type SkillId,
  type GameState,
  type Piece,
} from "@/game/logic";
import { PlayableChessGame } from "@/components/ChessGame/PlayableChessGame";
import { chessAudio } from "@/game/boardTextures";
import {
  Trophy,
  Swords,
  Sparkles as SparklesIcon,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings as SettingsIcon,
  FileText,
  RotateCcw,
  Bot,
  User,
  Sliders,
  X,
} from "lucide-react";

const Arena = lazy(() => import("@/components/Arena"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chess Skill Quest — Realistic 3D Chess & Skill Tree Challenge" },
      {
        name: "description",
        content:
          "Play realistic 3D chess with handcrafted Staunton pieces against AI or master tactics in interactive 3D challenges.",
      },
      { property: "og:title", content: "Chess Skill Quest — Realistic 3D Chess & Skill Tree Challenge" },
      {
        property: "og:description",
        content: "Play realistic 3D chess with Staunton pieces and solve interactive skill tree challenges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Phase = "welcome" | "choose" | "play" | "result";
type Tab = "chess" | "game" | "evidence";

interface TestLog {
  started: boolean;
  skillGateSeen: boolean;
  feedbackShown: boolean;
  ended: null | "win" | "loss";
  restartOk: null | boolean;
}

const card = "rounded-2xl border border-border/80 bg-[#14171e] p-5 shadow-2xl sm:p-6";
const btn = "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btn} bg-[#e5c365] text-neutral-950 hover:brightness-110 shadow-lg shadow-[#e5c365]/20`;
const btnGhost = `${btn} border border-border/80 bg-secondary/60 text-foreground hover:border-accent/60 hover:bg-secondary`;
const LETTERS = ["A", "B", "C"];
const GLYPH: Record<string, string> = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** 2D fallback board used when WebGL is not available */
function FlatBoard({
  pieces,
  from = [],
  targets = [],
  onSquareClick,
}: {
  pieces: Piece[];
  from?: string[];
  targets?: { sq: string; label: string }[];
  onSquareClick?: (sq: string) => void;
}) {
  const cells = [];
  for (let r = 8; r >= 1; r--) {
    for (let f = 0; f < 8; f++) {
      const sq = String.fromCharCode(97 + f) + r;
      const p = pieces.find((x) => x.sq === sq);
      const t = targets.find((x) => x.sq === sq);
      const isFrom = from.includes(sq);
      cells.push(
        <div
          key={sq}
          onClick={() => onSquareClick?.(sq)}
          className={`relative flex aspect-square items-center justify-center text-2xl sm:text-3xl cursor-pointer ${
            isFrom ? "bg-[#e5c365]/40" : (f + r) % 2 ? "bg-[#ecdcb9]" : "bg-[#4b301c]"
          }`}
        >
          {p && (
            <span
              className={
                p.white
                  ? "text-[#f5eedf] [text-shadow:0_0_2px_#000,0_0_2px_#000]"
                  : "text-[#181412] [text-shadow:0_0_1px_#fff]"
              }
            >
              {GLYPH[p.k]}
            </span>
          )}
          {t && (
            <span className="absolute right-0.5 top-0.5 rounded-full bg-[#e5c365] px-1.5 text-xs font-bold text-neutral-950">
              {t.label}
            </span>
          )}
        </div>
      );
    }
  }
  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-8 overflow-hidden rounded-xl border-4 border-[#2e1910] shadow-xl">
      {cells}
    </div>
  );
}

function Stage({ children, flat }: { children: ReactNode; flat: ReactNode }) {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(hasWebGL()), []);
  const loading = (
    <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
      Loading realistic 3D arena…
    </div>
  );

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-border/80 bg-[#12151b] shadow-2xl sm:h-[480px]">
      {gl === false ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
          <p className="text-xs text-muted-foreground">3D isn't supported on this device — showing flat board.</p>
          {flat}
        </div>
      ) : gl === null ? (
        loading
      ) : (
        <ClientOnly fallback={loading}>
          <GLBoundary
            fallback={
              <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                <p className="text-xs text-muted-foreground">3D failed to start — showing flat board.</p>
                {flat}
              </div>
            }
          >
            <Suspense fallback={loading}>{children}</Suspense>
          </GLBoundary>
        </ClientOnly>
      )}
      {gl && (
        <p className="pointer-events-none absolute bottom-2.5 left-4 text-xs tracking-wide text-muted-foreground/75">
          Click piece & square to play · Drag to orbit · Scroll to zoom
        </p>
      )}
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("chess");
  const [phase, setPhase] = useState<Phase>("welcome");
  const [howTo, setHowTo] = useState(false);
  const [skillId, setSkillId] = useState<SkillId | null>(null);
  const [g, setG] = useState<GameState>(initGame());
  const [picked, setPicked] = useState<string | null>(null);
  const [selectedPieceSq, setSelectedPieceSq] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [restartCheck, setRestartCheck] = useState(false);

  // Global utilities
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGameModesModal, setShowGameModesModal] = useState(false);

  const [log, setLog] = useState<TestLog>({
    started: false,
    skillGateSeen: false,
    feedbackShown: false,
    ended: null,
    restartOk: null,
  });

  // Sound sync
  useEffect(() => {
    chessAudio.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const skill = SKILLS.find((s) => s.id === skillId) ?? null;
  const q = skillId ? QUESTIONS[skillId][g.q]! : null;
  const chosen = q?.options.find((o) => o.id === picked) ?? null;

  useEffect(() => {
    if (phase === "choose" && !skillId) setLog((l) => ({ ...l, skillGateSeen: true }));
  }, [phase, skillId]);

  useEffect(() => {
    if (picked) setLog((l) => ({ ...l, feedbackShown: true }));
  }, [picked]);

  useEffect(() => {
    if (!restartCheck) return;
    const ok =
      phase === "welcome" &&
      skillId === null &&
      g.q === 0 &&
      g.correct === 0 &&
      g.mistakes === 0 &&
      !g.done &&
      picked === null;
    setLog((l) => ({ ...l, restartOk: ok }));
    setRestartCheck(false);
  }, [restartCheck, phase, skillId, g, picked]);

  // Base pieces for the current puzzle challenge
  const base = useMemo(() => (q ? q.pieces.map((p, id) => ({ ...p, id: String(id) })) : []), [q]);
  const shown = useMemo(() => {
    if (!q || !chosen) return base;
    return applyMove(base, chosen.move) as typeof base;
  }, [base, chosen, q]);

  // Target squares mapped from options
  const targets = q
    ? q.options.map((o, i) => ({
        sq: o.move.to,
        label: LETTERS[i]!,
        state: !chosen ? undefined : o.correct ? ("right" as const) : o.id === chosen.id ? ("wrong" as const) : ("dim" as const),
      }))
    : [];

  const froms = q
    ? chosen
      ? [chosen.move.from]
      : selectedPieceSq
      ? [selectedPieceSq]
      : [...new Set(q.options.map((o) => o.move.from))]
    : [];

  // Submit an answer
  function pick(id: string) {
    if (!skillId || picked) return;
    const res = answer(g, skillId, id);
    setG(res.state);
    setPicked(id);
    setSelectedPieceSq(null);
    if (res.ok) {
      chessAudio.playMove();
    } else {
      chessAudio.playCapture();
    }
  }

  // Interactive board click: select piece or make move
  function handleBoardClick(sq: string) {
    if (!q || picked) return;

    const targetOption = q.options.find((o) => o.move.to === sq);
    if (targetOption) {
      if (!selectedPieceSq || targetOption.move.from === selectedPieceSq) {
        pick(targetOption.id);
        return;
      }
    }

    const isMovablePiece = q.options.some((o) => o.move.from === sq);
    if (isMovablePiece) {
      setSelectedPieceSq(sq);
      return;
    }

    setSelectedPieceSq(null);
  }

  function cont() {
    const n = next(g);
    setG(n);
    setPicked(null);
    setSelectedPieceSq(null);
    if (n.done) {
      setPhase("result");
      setLog((l) => ({ ...l, ended: isWin(n) ? "win" : "loss" }));
      chessAudio.playGameOver(isWin(n));
    }
  }

  function restart() {
    setPhase("welcome");
    setSkillId(null);
    setG(initGame());
    setPicked(null);
    setSelectedPieceSq(null);
    setShowTests(false);
    setHowTo(false);
    setRestartCheck(true);
  }

  const win = isWin(g);

  return (
    <div className="min-h-screen bg-[#08090c] text-foreground font-sans">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-[#0d0f14]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Left: Knight icon + Title & Subtitle */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5c365]/40 bg-[#161a22] text-2xl text-[#e5c365] shadow-md shadow-[#e5c365]/10">
              ♞
            </span>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
                Chess Skill Quest
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e5c365]/90">
                REALISTIC 3D CHESS & SKILL TREE CHALLENGE
              </p>
            </div>
          </div>

          {/* Center Navigation Items */}
          <nav className="hidden md:flex items-center gap-1.5 rounded-xl border border-border/70 bg-[#14171e]/90 p-1 text-xs shadow-md">
            <button
              onClick={() => setTab("chess")}
              className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
                tab === "chess"
                  ? "bg-[#e5c365] text-neutral-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              Play 3D Chess
            </button>
            <button
              onClick={() => setTab("game")}
              className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
                tab === "game"
                  ? "bg-[#e5c365] text-neutral-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              Skill Tree Challenges
            </button>
            <button
              onClick={() => setShowGameModesModal(true)}
              className="rounded-lg px-3.5 py-1.5 font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              Game Modes
            </button>
          </nav>

          {/* Right-Side Utility Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Assignment Evidence link button */}
            <button
              onClick={() => setTab("evidence")}
              title="Assignment Evidence"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                tab === "evidence"
                  ? "border-[#e5c365] bg-[#e5c365]/15 text-[#e5c365]"
                  : "border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-accent/60"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Evidence</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled((s) => !s)}
              title={soundEnabled ? "Mute Sound" : "Enable Sound"}
              className="rounded-lg border border-border/70 bg-secondary/50 p-2 text-muted-foreground hover:text-foreground hover:border-accent/60 transition-all"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Game Settings"
              className="rounded-lg border border-border/70 bg-secondary/50 p-2 text-muted-foreground hover:text-foreground hover:border-accent/60 transition-all"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="hidden sm:inline-flex rounded-lg border border-border/70 bg-secondary/50 p-2 text-muted-foreground hover:text-foreground hover:border-accent/60 transition-all"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden border-t border-border/50 px-4 py-1.5 overflow-x-auto gap-2 bg-[#12151b]">
          <button
            onClick={() => setTab("chess")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap ${
              tab === "chess" ? "bg-[#e5c365] text-neutral-950" : "text-muted-foreground"
            }`}
          >
            Play 3D Chess
          </button>
          <button
            onClick={() => setTab("game")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap ${
              tab === "game" ? "bg-[#e5c365] text-neutral-950" : "text-muted-foreground"
            }`}
          >
            Skill Tree
          </button>
          <button
            onClick={() => setShowGameModesModal(true)}
            className="rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap text-muted-foreground"
          >
            Game Modes
          </button>
          <button
            onClick={() => setTab("evidence")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap ${
              tab === "evidence" ? "bg-[#e5c365] text-neutral-950" : "text-muted-foreground"
            }`}
          >
            Evidence
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        {/* TAB 1: FULL REALISTIC 3D CHESS GAME */}
        {tab === "chess" && (
          <div className="space-y-6">
            <ClientOnly fallback={<div className="h-[580px] rounded-2xl border border-border/80 bg-[#12151b] flex items-center justify-center text-muted-foreground">Loading 3D Chess Arena…</div>}>
              <PlayableChessGame />
            </ClientOnly>
          </div>
        )}

        {/* TAB 2: SKILL TREE CHALLENGES */}
        {tab === "game" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#e5c365] flex items-center gap-1.5">
                  <SparklesIcon className="h-4 w-4" />
                  {phase === "welcome"
                    ? "Interactive Skill Tree"
                    : phase === "choose"
                    ? "Choose a Skill Path"
                    : phase === "play"
                    ? `Challenge ${g.q + 1} of 3`
                    : "Challenge Result"}
                </p>
                <button
                  className="rounded-full border border-[#e5c365]/60 bg-secondary/50 px-3.5 py-1 text-xs font-semibold text-[#e5c365] hover:bg-[#e5c365] hover:text-neutral-950 transition-all"
                  onClick={() => setHowTo(true)}
                >
                  How to play
                </button>
              </div>

              {howTo && (
                <div className={`${card} animate-rise space-y-3 border-[#e5c365]/70`} role="dialog" aria-label="How to play">
                  <h2 className="font-display text-2xl font-bold text-foreground">How to Play Skill Tree Challenges</h2>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      <strong className="text-foreground">1. Choose a skill:</strong> Select <strong>Tactics</strong>,{" "}
                      <strong>Defense</strong>, or <strong>Opening</strong> from the 3D pedestal or cards.
                    </li>
                    <li>
                      <strong className="text-foreground">2. Solve 3 challenges:</strong> Click your piece on the 3D board to see its legal moves, then click the destination square (or select options A, B, C).
                    </li>
                    <li>
                      <strong className="text-foreground">3. Achieve mastery:</strong> Score at least <strong>2 of 3</strong> to master the path and unlock the final challenge!
                    </li>
                  </ol>
                  <button className={btnGhost} onClick={() => setHowTo(false)}>
                    Close
                  </button>
                </div>
              )}

              {phase === "welcome" && (
                <div className={`${card} animate-rise space-y-4 text-center py-12`}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5c365]/40 bg-[#1e222b] text-3xl text-[#e5c365] shadow-lg shadow-[#e5c365]/10">
                    ♔
                  </div>
                  <h2 className="font-display text-3xl font-bold sm:text-4xl text-foreground">
                    Master the Art of Chess Strategy
                  </h2>
                  <p className="text-base text-muted-foreground max-w-lg mx-auto">
                    Choose a discipline, solve realistic positional puzzles directly on the interactive 3D chessboard, and advance your skills.
                  </p>
                  <button
                    className={`${btnPrimary} px-9 py-3 text-base font-bold`}
                    onClick={() => {
                      setPhase("choose");
                      setLog((l) => ({ ...l, started: true }));
                    }}
                  >
                    Start Challenges
                  </button>
                </div>
              )}

              {phase === "choose" && (
                <div className="animate-rise space-y-4">
                  <Stage flat={<p className="text-sm text-muted-foreground">Select a skill path below.</p>}>
                    <Arena mode="skills" skills={SKILLS} selected={skillId} onSelect={setSkillId} />
                  </Stage>

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select a skill discipline:
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {SKILLS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSkillId(s.id)}
                        aria-pressed={skillId === s.id}
                        className={`rounded-2xl border-2 bg-[#14171e] p-4 text-left transition-all ${
                          skillId === s.id
                            ? "border-[#e5c365] bg-[#e5c365]/10 shadow-lg shadow-[#e5c365]/15 scale-[1.02]"
                            : "border-border/70 hover:border-accent/60 hover:bg-secondary/40"
                        }`}
                      >
                        <span className="text-3xl text-[#e5c365]">{GLYPH[s.piece]}</span>
                        <p className="font-display text-xl font-bold mt-1 text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.tagline}</p>
                      </button>
                    ))}
                  </div>

                  <button
                    className={btnPrimary}
                    disabled={!skillId}
                    onClick={() => {
                      setG(initGame());
                      setPhase("play");
                    }}
                  >
                    {skillId ? `Start ${skill?.name} Challenges` : "Choose a skill first"}
                  </button>
                </div>
              )}

              {phase === "play" && q && (
                <div className="animate-rise space-y-4">
                  {/* Progress Indicator */}
                  <div className="flex gap-2" aria-label="Progress">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          i < g.q || (i === g.q && picked)
                            ? "bg-[#e5c365]"
                            : i === g.q
                            ? "bg-[#e5c365]/50"
                            : "bg-secondary"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Interactive 3D Puzzle Board */}
                  <Stage
                    flat={
                      <FlatBoard
                        pieces={shown}
                        from={froms}
                        targets={targets}
                        onSquareClick={handleBoardClick}
                      />
                    }
                  >
                    <Arena
                      mode="board"
                      pieces={shown}
                      from={froms}
                      targets={targets}
                      burst={chosen?.correct ? chosen.move.to : null}
                      onPickTarget={(l) => {
                        const opt = q.options[LETTERS.indexOf(l)];
                        if (opt) pick(opt.id);
                      }}
                      onPieceClick={handleBoardClick}
                      onSquareClick={handleBoardClick}
                    />
                  </Stage>

                  {/* Challenge Prompt and Options Card */}
                  <div className={`${card} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-2xl font-bold text-foreground">{q.title}</h2>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#e5c365] bg-[#e5c365]/15 border border-[#e5c365]/30 px-3 py-1 rounded-full">
                        {skill?.name}
                      </span>
                    </div>

                    <p className="text-base sm:text-lg text-foreground font-medium">{q.ask}</p>
                    <p className="text-xs text-muted-foreground">
                      On the board: {q.board} Click your piece on the 3D board to see its legal moves, or choose an answer below:
                    </p>

                    <div className="grid gap-2.5 pt-1">
                      {q.options.map((o, i) => {
                        const st = !chosen
                          ? ""
                          : o.correct
                          ? "border-[#10b981] bg-[#10b981]/15 text-[#10b981]"
                          : o.id === chosen.id
                          ? "border-destructive bg-destructive/15 text-destructive"
                          : "opacity-40";
                        return (
                          <button
                            key={o.id}
                            disabled={!!picked}
                            onClick={() => pick(o.id)}
                            onMouseEnter={() => setSelectedPieceSq(o.move.from)}
                            className={`flex items-center gap-3 rounded-xl border-2 border-border/80 bg-secondary/60 p-3 text-left text-sm font-medium transition-all enabled:hover:border-accent enabled:hover:bg-secondary ${st}`}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5c365] font-bold text-neutral-950 text-xs">
                              {LETTERS[i]}
                            </span>
                            <span>{o.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback Alert */}
                    {chosen && (
                      <div
                        className={`animate-rise rounded-xl border-2 p-4 mt-3 ${
                          chosen.correct
                            ? "border-[#10b981] bg-[#10b981]/10"
                            : "border-destructive bg-destructive/10"
                        }`}
                        role="status"
                      >
                        <p className="font-display text-xl font-bold flex items-center gap-2">
                          {chosen.correct ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-[#10b981]" />
                              Correct Move!
                            </>
                          ) : (
                            "✗ Not this time"
                          )}
                        </p>
                        <p className="mt-1 text-sm text-foreground/90">{chosen.feedback}</p>
                        <button className={`${btnPrimary} mt-3 text-sm`} onClick={cont}>
                          {g.q === 2 ? "See Final Result" : "Next Challenge"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {phase === "result" && (
                <div className={`${card} animate-rise space-y-4 text-center py-10`}>
                  <p className="text-6xl text-[#e5c365]">{win ? "♔" : "♙"}</p>
                  <h2 className="font-display text-3xl font-bold sm:text-4xl text-foreground">
                    {win ? "Skill Mastered!" : "Good Effort — Try Again!"}
                  </h2>
                  <p className="text-lg text-foreground">
                    Score: <strong className="text-[#e5c365]">{g.correct} / 3</strong> correct · {g.mistakes} mistake
                    {g.mistakes === 1 ? "" : "s"}
                  </p>
                  <p className="text-muted-foreground max-w-md mx-auto text-sm">
                    {win
                      ? `Congratulations! You mastered ${skill?.name}. Your strategic intuition is primed for real games.`
                      : `You needed ${WIN_AT} of 3 correct to achieve mastery. Review the feedback and try again!`}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 pt-3">
                    <button className={`${btnPrimary} px-8`} onClick={restart}>
                      Play Again
                    </button>
                    <button className={btnGhost} onClick={() => setTab("chess")}>
                      Play 3D Chess vs AI
                    </button>
                  </div>
                  <div className="pt-3">
                    <button
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => setShowTests((v) => !v)}
                    >
                      {showTests ? "Hide" : "Show"} test verification checklist
                    </button>
                  </div>
                  {showTests && <TestPanel log={log} />}
                </div>
              )}
            </section>

            {/* Sidebar with Scoreboard */}
            <aside className="space-y-4">
              <div className={card}>
                <h3 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                  <Trophy className="h-4 w-4 text-[#e5c365]" />
                  Scoreboard
                </h3>
                <dl className="mt-3 space-y-2 text-xs">
                  <Row k="Discipline" v={skill?.name ?? "—"} />
                  <Row k="Correct" v={String(g.correct)} />
                  <Row k="Mistakes" v={String(g.mistakes)} />
                  <Row k="Mastery Threshold" v={`${WIN_AT} of 3`} />
                </dl>
              </div>

              <div className={card}>
                <h3 className="font-display text-base font-bold text-foreground">About Challenges</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Interactive tactical situations rendered in real-time 3D. Test your ability to identify attacking lines,
                  counter defensive threats, and deploy sharp opening gambits.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* TAB 3: ASSIGNMENT EVIDENCE (PRESERVED) */}
        {tab === "evidence" && <Evidence />}
      </main>

      {/* GAME MODES MODAL */}
      {showGameModesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowGameModesModal(false)}
        >
          <div
            className="relative max-w-md w-full rounded-2xl border border-border/80 bg-[#14171e] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
                <Swords className="h-5 w-5 text-[#e5c365]" />
                Select Game Mode
              </h3>
              <button
                onClick={() => setShowGameModesModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <button
                onClick={() => {
                  setTab("chess");
                  setShowGameModesModal(false);
                }}
                className="w-full flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/50 p-3.5 text-left hover:border-accent hover:bg-secondary transition-all"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5c365]/20 text-[#e5c365]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Play vs Intelligent AI</p>
                  <p className="text-xs text-muted-foreground">Challenge computer Minimax AI across 3 difficulty settings.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setTab("chess");
                  setShowGameModesModal(false);
                }}
                className="w-full flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/50 p-3.5 text-left hover:border-accent hover:bg-secondary transition-all"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5c365]/20 text-[#e5c365]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Pass & Play (2 Players PvP)</p>
                  <p className="text-xs text-muted-foreground">Play local chess against a friend with board flip support.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setTab("game");
                  setShowGameModesModal(false);
                }}
                className="w-full flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/50 p-3.5 text-left hover:border-accent hover:bg-secondary transition-all"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e5c365]/20 text-[#e5c365]">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Skill Tree Challenges</p>
                  <p className="text-xs text-muted-foreground">Solve interactive puzzle sequences across 3 chess paths.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="relative max-w-sm w-full rounded-2xl border border-border/80 bg-[#14171e] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
                <SettingsIcon className="h-5 w-5 text-[#e5c365]" />
                Game Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="font-semibold text-foreground">Sound Effects</p>
                  <p className="text-muted-foreground">Board clicks, captures, check alerts</p>
                </div>
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className={`rounded-lg px-3 py-1 font-bold ${
                    soundEnabled ? "bg-[#e5c365] text-neutral-950" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {soundEnabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                <div>
                  <p className="font-semibold text-foreground">Board Style</p>
                  <p className="text-muted-foreground">Handcrafted Walnut & Figured Maple</p>
                </div>
                <span className="font-mono text-[11px] text-[#e5c365]">Classic</span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border/40 pt-3">
                <div>
                  <p className="font-semibold text-foreground">Chess Engine</p>
                  <p className="text-muted-foreground">chess.js + Minimax AI</p>
                </div>
                <span className="font-mono text-[11px] text-[#e5c365]">v1.4.0</span>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className={`${btnPrimary} w-full mt-2`}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 pb-1.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}

function TestPanel({ log }: { log: TestLog }) {
  const rows: [string, boolean | null, string][] = [
    ["Game starts", log.started, "Start Game moved to skill selection."],
    ["Skill choice is required", log.skillGateSeen, "Next button disabled until a skill is picked."],
    ["Feedback appears", log.feedbackShown, "Explanation displayed after a move choice."],
    ["Final challenge ends in win or loss", log.ended !== null, log.ended ? `Ended with: ${log.ended}.` : "Not yet ended."],
    [
      "Restart resets progress",
      log.restartOk,
      log.restartOk === null
        ? "Pending — click Play Again, complete another challenge, then check."
        : "All state reset after Play Again.",
    ],
  ];

  return (
    <div className="animate-rise mt-6 rounded-2xl border border-border/80 bg-[#0e1117] p-5 text-left shadow-inner">
      <h3 className="font-display text-lg font-bold text-foreground">Test Checklist Verification</h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        Live application state assertions recorded during this session.
      </p>
      <ul className="mt-3.5 space-y-2.5 text-xs">
        {rows.map(([name, ok, d], i) => (
          <li key={name} className="flex items-start gap-3">
            <span
              className={`mt-0.5 rounded px-2 py-0.5 text-[10px] font-bold ${
                ok === true
                  ? "bg-[#10b981] text-neutral-950"
                  : ok === null
                  ? "bg-secondary text-muted-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {ok === true ? "PASS" : ok === null ? "PENDING" : "FAIL"}
            </span>
            <div>
              <p className="font-medium text-foreground">
                {i + 1}. {name}
              </p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Evidence() {
  const [initial, setInitial] = useState("Make a simple chess game where players choose a skill.");
  const [refined, setRefined] = useState(
    "Create a playable chess-themed skill tree game with three meaningful skill paths, immediate feedback, a branching final challenge, clear win/loss endings, restart, and realistic 3D chess."
  );
  const [note, setNote] = useState(
    "Initial prompt result: Basic text chess representation.\nRefined prompt result: Photorealistic 3D chessboard with Staunton pieces, Minimax AI, castling, en passant, promotion, and interactive tactical skill tree challenges."
  );
  const field =
    "mt-1.5 w-full rounded-xl border border-border/80 bg-[#12151b] p-3 text-xs text-foreground focus:border-[#e5c365] focus:outline-none";

  return (
    <div className={`${card} animate-rise mx-auto max-w-3xl space-y-4`}>
      <h2 className="font-display text-2xl font-bold text-foreground">Assignment Evidence</h2>
      <p className="text-xs text-muted-foreground">
        Documentation of prompt engineering progression and generative development iteration.
      </p>

      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Initial Prompt
        <textarea
          className={field}
          rows={2}
          value={initial}
          onChange={(e) => setInitial(e.target.value)}
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Refined Prompt
        <textarea
          className={field}
          rows={3}
          value={refined}
          onChange={(e) => setRefined(e.target.value)}
        />
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Comparison Notes & Engineering Observations
        <textarea
          className={field}
          rows={5}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </div>
  );
}
