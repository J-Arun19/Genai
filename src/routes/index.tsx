import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { SKILLS, QUESTIONS, WIN_AT, answer, applyMove, initGame, isWin, next, type SkillId, type GameState, type Piece } from "@/game/logic";

const Arena = lazy(() => import("@/components/Arena"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chess Skill Quest — 3D Skill Tree Challenge" },
      { name: "description", content: "Choose a chess skill, solve 3 beginner challenges on a 3D board, and unlock the final move." },
      { property: "og:title", content: "Chess Skill Quest — 3D Skill Tree Challenge" },
      { property: "og:description", content: "A simple 3D chess mini-game: pick Tactics, Defense or Opening and solve 3 challenges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Phase = "welcome" | "choose" | "play" | "result";
type Tab = "game" | "eval" | "evidence";
interface TestLog { started: boolean; skillGateSeen: boolean; feedbackShown: boolean; ended: null | "win" | "loss"; restartOk: null | boolean }

const card = "rounded-xl border border-border bg-card p-5 shadow-elegant sm:p-6";
const btn = "rounded-lg px-5 py-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:brightness-110 hover:shadow-glow`;
const btnGhost = `${btn} border border-border bg-secondary text-secondary-foreground hover:border-primary`;
const LETTERS = ["A", "B", "C"];
const GLYPH: Record<string, string> = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** 2D board used when WebGL is not available. */
function FlatBoard({ pieces, from = [], targets = [] }: { pieces: Piece[]; from?: string[]; targets?: { sq: string; label: string }[] }) {
  const cells = [];
  for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
    const sq = String.fromCharCode(97 + f) + r;
    const p = pieces.find((x) => x.sq === sq); const t = targets.find((x) => x.sq === sq);
    cells.push(
      <div key={sq} className={`relative flex aspect-square items-center justify-center text-2xl sm:text-3xl ${from.includes(sq) ? "bg-accent" : (f + r) % 2 ? "bg-sq-light" : "bg-sq-dark"}`}>
        {p && <span className={p.white ? "text-piece-white [text-shadow:0_0_2px_#000,0_0_2px_#000]" : "text-piece-black"}>{GLYPH[p.k]}</span>}
        {t && <span className="absolute right-0.5 top-0.5 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{t.label}</span>}
      </div>,
    );
  }
  return <div className="mx-auto grid w-full max-w-sm grid-cols-8 overflow-hidden rounded-lg border-4 border-accent">{cells}</div>;
}

function Stage({ children, flat }: { children: ReactNode; flat: ReactNode }) {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(hasWebGL()), []);
  const loading = <div className="flex h-full items-center justify-center text-muted-foreground">Loading 3D arena…</div>;
  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-border bg-card sm:h-[440px]">
      {gl === false ? <div className="flex h-full flex-col items-center justify-center gap-2 p-3"><p className="text-xs text-muted-foreground">3D isn't supported on this device — showing a flat board.</p>{flat}</div>
        : gl === null ? loading : (
          <ClientOnly fallback={loading}>
            <GLBoundary fallback={<div className="flex h-full flex-col items-center justify-center gap-2 p-3"><p className="text-xs text-muted-foreground">3D failed to start — showing a flat board.</p>{flat}</div>}>
              <Suspense fallback={loading}>{children}</Suspense>
            </GLBoundary>
          </ClientOnly>
        )}
      {gl && <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-muted-foreground">Drag to rotate · scroll to zoom</p>}
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("game");
  const [phase, setPhase] = useState<Phase>("welcome");
  const [howTo, setHowTo] = useState(false);
  const [skillId, setSkillId] = useState<SkillId | null>(null);
  const [g, setG] = useState<GameState>(initGame());
  const [picked, setPicked] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [restartCheck, setRestartCheck] = useState(false);
  const [log, setLog] = useState<TestLog>({ started: false, skillGateSeen: false, feedbackShown: false, ended: null, restartOk: null });
  const skill = SKILLS.find((s) => s.id === skillId) ?? null;
  const q = skillId ? QUESTIONS[skillId][g.q]! : null;
  const chosen = q?.options.find((o) => o.id === picked) ?? null;

  useEffect(() => { if (phase === "choose" && !skillId) setLog((l) => ({ ...l, skillGateSeen: true })); }, [phase, skillId]);
  useEffect(() => { if (picked) setLog((l) => ({ ...l, feedbackShown: true })); }, [picked]);
  useEffect(() => {
    if (!restartCheck) return;
    const ok = phase === "welcome" && skillId === null && g.q === 0 && g.correct === 0 && g.mistakes === 0 && !g.done && picked === null;
    setLog((l) => ({ ...l, restartOk: ok })); setRestartCheck(false);
  }, [restartCheck, phase, skillId, g, picked]);

  const base = useMemo(() => (q ? q.pieces.map((p, id) => ({ ...p, id })) : []), [q]);
  const shown = useMemo(() => {
    if (!q || !chosen) return base;
    const moved = applyMove(base, chosen.move) as typeof base;
    return moved;
  }, [base, chosen, q]);
  const targets = q ? q.options.map((o, i) => ({
    sq: o.move.to, label: LETTERS[i]!,
    state: !chosen ? undefined : o.correct ? ("right" as const) : o.id === chosen.id ? ("wrong" as const) : ("dim" as const),
  })) : [];
  const froms = q ? (chosen ? [chosen.move.from] : [...new Set(q.options.map((o) => o.move.from))]) : [];

  function pick(id: string) {
    if (!skillId || picked) return;
    setG(answer(g, skillId, id).state); setPicked(id);
  }
  function cont() {
    const n = next(g); setG(n); setPicked(null);
    if (n.done) { setPhase("result"); setLog((l) => ({ ...l, ended: isWin(n) ? "win" : "loss" })); }
  }
  function restart() {
    setPhase("welcome"); setSkillId(null); setG(initGame()); setPicked(null); setShowTests(false); setHowTo(false); setRestartCheck(true);
  }
  const win = isWin(g);

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-accent">♞</span>
          <div><h1 className="font-display text-2xl font-bold sm:text-3xl">Chess Skill Quest</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Skill Tree Challenge</p></div>
        </div>
        <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 text-sm">
          {([["game", "Play the Game"], ["eval", "Evaluation Checklist (0–5)"], ["evidence", "Assignment Evidence (Prompts)"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "game" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                  {phase === "welcome" ? "Welcome" : phase === "choose" ? "Choose a skill" : phase === "play" ? `Challenge ${g.q + 1} of 3` : "Final result"}
                </p>
                <button className="rounded-full border border-accent px-3 py-1 text-sm font-semibold text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => setHowTo(true)}>How to play</button>
              </div>

              {howTo && (
                <div className={`${card} animate-rise space-y-3 border-accent`} role="dialog" aria-label="How to play">
                  <h2 className="font-display text-2xl font-bold">How to play</h2>
                  <ol className="space-y-2">
                    <li><strong>1.</strong> Choose one skill: Tactics, Defense or Opening.</li>
                    <li><strong>2.</strong> Answer 3 short questions. Click A, B or C (on the buttons or on the board). You play White, the light pieces at the bottom.</li>
                    <li><strong>3.</strong> Get at least <strong>2 of 3</strong> right to unlock the final move and win.</li>
                  </ol>
                  <button className={btnGhost} onClick={() => setHowTo(false)}>Back</button>
                </div>
              )}

              {phase === "welcome" && (
                <div className={`${card} animate-rise space-y-4 text-center`}>
                  <h2 className="font-display text-3xl font-bold sm:text-4xl">Chess Skill Quest</h2>
                  <p className="text-lg">Choose a skill, solve 3 mini challenges, and unlock the final move.</p>
                  <p className="text-sm text-muted-foreground">Takes about 5 minutes. No chess notation needed — just click.</p>
                  <button className={`${btnPrimary} px-10 text-lg`} onClick={() => { setPhase("choose"); setLog((l) => ({ ...l, started: true })); }}>Start</button>
                </div>
              )}

              {phase === "choose" && (
                <div className="animate-rise space-y-4">
                  <Stage flat={<p className="text-sm">Pick a skill below.</p>}>
                    <Arena mode="skills" skills={SKILLS} selected={skillId} onSelect={setSkillId} />
                  </Stage>
                  <p className="text-sm text-muted-foreground">Click a 3D piece or a card below to choose your skill.</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {SKILLS.map((s) => (
                      <button key={s.id} onClick={() => setSkillId(s.id)} aria-pressed={skillId === s.id}
                        className={`rounded-xl border-2 bg-card p-4 text-left transition-all ${skillId === s.id ? "border-primary shadow-glow" : "border-border hover:border-accent"}`}>
                        <span className="text-3xl text-accent">{GLYPH[s.piece]}</span>
                        <p className="font-display text-xl font-bold">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{s.tagline}</p>
                      </button>
                    ))}
                  </div>
                  <button className={btnPrimary} disabled={!skillId} onClick={() => { setG(initGame()); setPhase("play"); }}>
                    {skillId ? `Start ${skill?.name} challenges` : "Choose a skill first"}
                  </button>
                </div>
              )}

              {phase === "play" && q && (
                <div className="animate-rise space-y-4">
                  <div className="flex gap-2" aria-label="Progress">
                    {[0, 1, 2].map((i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < g.q || (i === g.q && picked) ? "bg-primary" : i === g.q ? "bg-accent" : "bg-muted"}`} />)}
                  </div>
                  <Stage flat={<FlatBoard pieces={shown} from={froms} targets={targets} />}>
                    <Arena mode="board" pieces={shown} from={froms} targets={targets} burst={chosen?.correct ? chosen.move.to : null}
                      onPickTarget={(l) => pick(q.options[LETTERS.indexOf(l)]!.id)} />
                  </Stage>
                  <div className={`${card} space-y-3`}>
                    <h2 className="font-display text-2xl font-bold">{q.title}</h2>
                    <p className="text-lg">{q.ask}</p>
                    <p className="text-sm text-muted-foreground">On the board: {q.board} Gold squares = pieces that can move. Rings = where each answer goes.</p>
                    <div className="grid gap-2">
                      {q.options.map((o, i) => {
                        const st = !chosen ? "" : o.correct ? "border-primary bg-primary/15" : o.id === chosen.id ? "border-destructive bg-destructive/15" : "opacity-50";
                        return (
                          <button key={o.id} disabled={!!picked} onClick={() => pick(o.id)}
                            className={`flex items-center gap-3 rounded-lg border-2 border-border bg-secondary p-3 text-left text-base transition-all enabled:hover:border-accent ${st}`}>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">{LETTERS[i]}</span>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    {chosen && (
                      <div className={`animate-rise rounded-lg border-2 p-4 ${chosen.correct ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"}`} role="status">
                        <p className="font-display text-xl font-bold">{chosen.correct ? "✓ Correct!" : "✗ Not this time"}</p>
                        <p className="mt-1">{chosen.feedback}</p>
                        <button className={`${btnPrimary} mt-3`} onClick={cont}>{g.q === 2 ? "See my result" : "Next challenge"}</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {phase === "result" && (
                <div className={`${card} animate-rise space-y-4 text-center`}>
                  <p className="text-6xl">{win ? "♔" : "♙"}</p>
                  <h2 className="font-display text-4xl font-bold">{win ? "You unlocked the final move!" : "So close — try again!"}</h2>
                  <p className="text-xl">Score: <strong>{g.correct} / 3</strong> correct · {g.mistakes} mistake{g.mistakes === 1 ? "" : "s"}</p>
                  <p className="text-muted-foreground">{win ? `You mastered ${skill?.name}. Great chess thinking!` : `You needed ${WIN_AT} of 3. Read the tips and have another go — maybe try a different skill.`}</p>
                  <button className={`${btnPrimary} px-12 text-lg`} onClick={restart}>Play Again</button>
                  <div><button className="text-sm text-muted-foreground underline" onClick={() => setShowTests((v) => !v)}>{showTests ? "Hide" : "Show"} test checklist</button></div>
                  {showTests && <TestPanel log={log} />}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className={card}>
                <h3 className="font-display text-xl font-bold">Scoreboard</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <Row k="Skill" v={skill?.name ?? "—"} />
                  <Row k="Correct" v={String(g.correct)} /><Row k="Mistakes" v={String(g.mistakes)} />
                  <Row k="To win" v={`${WIN_AT} of 3 correct`} />
                </dl>
              </div>
              <div className={card}>
                <h3 className="font-display text-xl font-bold">Assignment Info</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <Row k="Name" v="J Arun Kumar" /><Row k="USN" v="3BR24AI402" /><Row k="Section" v="B" />
                  <Row k="Hobby" v="Playing Chess" /><Row k="Assignment" v="Skill Tree Challenge" />
                </dl>
              </div>
            </aside>
          </div>
        )}
        {tab === "eval" && <Evaluation />}
        {tab === "evidence" && <Evidence />}
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
}

function TestPanel({ log }: { log: TestLog }) {
  const rows: [string, boolean | null, string][] = [
    ["Game starts", log.started, "Start Game moved you to skill selection."],
    ["Skill choice is required", log.skillGateSeen, "The Next button was shown disabled while no skill was picked."],
    ["Feedback appears", log.feedbackShown, "A correct/incorrect explanation was displayed after a choice."],
    ["Final challenge ends in win or loss", log.ended !== null, log.ended ? `Ended with: ${log.ended}.` : "Not yet ended."],
    ["Restart resets progress", log.restartOk, log.restartOk === null ? "Pending — click Play Again, finish another game, then reopen this panel." : "All game state checked after Play Again."],
  ];
  return (
    <div className="animate-rise mt-6 rounded-lg border border-border bg-background/50 p-4 text-left">
      <h3 className="font-display text-xl font-bold">Test Panel</h3>
      <p className="text-xs text-muted-foreground">Live state checks recorded while you played this session — not an automated test suite.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map(([name, ok, d], i) => (
          <li key={name} className="flex items-start gap-3">
            <span className={`mt-0.5 rounded px-2 py-0.5 text-xs font-bold ${ok === true ? "bg-primary text-primary-foreground" : ok === null ? "bg-muted text-muted-foreground" : "bg-destructive text-destructive-foreground"}`}>{ok === true ? "PASS" : ok === null ? "PENDING" : "FAIL"}</span>
            <div><p className="font-medium">{i + 1}. {name}</p><p className="text-xs text-muted-foreground">{d}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Evaluation() {
  const criteria = [
    ["Clear rules", "Objective and rules are visible before and during play."],
    ["Meaningful choices", "Each skill has a distinct reward and tradeoff that changes the final challenge."],
    ["Feedback", "Every choice shows correct/incorrect with an explanation."],
    ["Valid endings", "Every path ends in a clear win or loss."],
    ["Consistency", "Chess content and rules stay consistent across all paths."],
  ];
  const [checked, setChecked] = useState<boolean[]>(criteria.map(() => false));
  const total = checked.filter(Boolean).length;
  return (
    <div className={`${card} animate-rise mx-auto max-w-2xl`}>
      <h2 className="font-display text-3xl font-bold">Playability Checklist</h2>
      <p className="mt-1 text-sm text-muted-foreground">A checklist-based self-assessment (0–5) ticked by the student. This is not a standard benchmark or automated score.</p>
      <ul className="mt-4 space-y-2">
        {criteria.map(([n, d], i) => (
          <li key={n}>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked[i] ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={checked[i]} onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} />
              <span><span className="font-medium">{n}</span><span className="block text-xs text-muted-foreground">{d}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-5 font-display text-4xl font-bold text-primary">{total} / 5</p>
      <p className="text-xs text-muted-foreground">Checklist score</p>
    </div>
  );
}

function Evidence() {
  const [initial, setInitial] = useState("Make a simple chess game where players choose a skill.");
  const [refined, setRefined] = useState("Create a playable chess-themed skill tree game with three meaningful skill paths, immediate feedback, a branching final challenge, clear win/loss endings, restart, and a five-point playability checklist.");
  const [note, setNote] = useState("Initial prompt result: …\nRefined prompt result: …\nKey differences (rules, feedback, endings, restart): …\nConclusion: The refined prompt produced …");
  const field = "mt-1 w-full rounded-lg border border-input bg-secondary p-3 text-sm focus:border-primary focus:outline-none";
  return (
    <div className={`${card} animate-rise mx-auto max-w-2xl space-y-4`}>
      <h2 className="font-display text-3xl font-bold">Assignment Evidence</h2>
      <label className="block text-sm font-medium">Initial prompt<textarea className={field} rows={2} value={initial} onChange={(e) => setInitial(e.target.value)} /></label>
      <label className="block text-sm font-medium">Refined prompt<textarea className={field} rows={4} value={refined} onChange={(e) => setRefined(e.target.value)} /></label>
      <label className="block text-sm font-medium">Comparison note (template — fill in your observations)<textarea className={field} rows={5} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Edits stay on this page while it is open.</p>
    </div>
  );
}
