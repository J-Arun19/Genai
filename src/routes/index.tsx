import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SKILLS, QUESTIONS, answer, initGame, isWin, next, type SkillId, type GameState, type Piece, type AnswerResult } from "@/game/logic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chess Strategist — Skill Tree Challenge" },
      { name: "description", content: "Train one chess skill, then survive a branching strategy challenge. A playable student mini-game." },
      { property: "og:title", content: "Chess Strategist — Skill Tree Challenge" },
      { property: "og:description", content: "Pick a chess skill, solve a puzzle, and win the final challenge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Phase = "start" | "choose" | "bonus" | "play" | "result";
type Tab = "game" | "eval" | "evidence";
interface TestLog { started: boolean; skillGateSeen: boolean; feedbackShown: boolean; ended: null | "win" | "loss"; restartOk: null | boolean }

const card = "rounded-xl border border-border bg-card p-5 shadow-elegant sm:p-6";
const btn = "rounded-lg px-5 py-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:brightness-110 hover:shadow-glow`;
const btnGhost = `${btn} border border-border bg-secondary text-secondary-foreground hover:border-primary`;

function Board({ pieces, highlight }: { pieces: Piece[]; highlight: string[] }) {
  const files = "abcdefgh";
  return (
    <div className="mx-auto grid w-full max-w-[300px] grid-cols-8 overflow-hidden rounded-lg border-4 border-accent shadow-elegant">
      {Array.from({ length: 64 }, (_, i) => {
        const rank = 8 - Math.floor(i / 8); const sq = `${files[i % 8]}${rank}`;
        const light = (i % 8 + Math.floor(i / 8)) % 2 === 0;
        const pc = pieces.find((p) => p.sq === sq);
        return (
          <div key={sq} className={`flex aspect-square items-center justify-center ${light ? "bg-sq-light" : "bg-sq-dark"} ${highlight.includes(sq) ? "ring-2 ring-inset ring-primary" : ""}`}>
            {pc && <span className={`text-2xl leading-none sm:text-3xl ${pc.white ? "text-piece-white [text-shadow:0_0_2px_black,0_1px_2px_black]" : "text-piece-black"}`}>{pc.p}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Guide({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">👉 {children}</p>;
}

function App() {
  const [tab, setTab] = useState<Tab>("game");
  const [phase, setPhase] = useState<Phase>("start");
  const [skillId, setSkillId] = useState<SkillId | null>(null);
  const [g, setG] = useState<GameState>(initGame());
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [hintOn, setHintOn] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [restartCheck, setRestartCheck] = useState(false);
  const [log, setLog] = useState<TestLog>({ started: false, skillGateSeen: false, feedbackShown: false, ended: null, restartOk: null });
  const skill = SKILLS.find((s) => s.id === skillId) ?? null;
  const q = QUESTIONS[g.q]!;

  useEffect(() => { if (phase === "choose" && !skillId) setLog((l) => ({ ...l, skillGateSeen: true })); }, [phase, skillId]);
  useEffect(() => { if (result) setLog((l) => ({ ...l, feedbackShown: true })); }, [result]);
  useEffect(() => {
    if (!restartCheck) return;
    const ok = phase === "start" && skillId === null && g.q === 0 && g.correct === 0 && g.mistakes === 0 && g.bonusLeft && !g.done && result === null && picked === null;
    setLog((l) => ({ ...l, restartOk: ok })); setRestartCheck(false);
  }, [restartCheck, phase, skillId, g, result, picked]);

  function pick(id: string) {
    if (!skill || result) return;
    const r = answer(g, skill.id, id);
    setG(r.state); setPicked(id); setResult(r.result); setHintOn(false);
  }
  function cont() {
    if (result === "retry") { setPicked(null); setResult(null); return; }
    const n = next(g); setG(n); setPicked(null); setResult(null);
    if (n.done) { setPhase("result"); setLog((l) => ({ ...l, ended: isWin(n) ? "win" : "loss" })); }
  }
  function restart() {
    setPhase("start"); setSkillId(null); setG(initGame()); setPicked(null); setResult(null); setHintOn(false); setShowTests(false); setRestartCheck(true);
  }
  const win = isWin(g);
  const stepLabel = { start: "Step 1 of 4 · How to play", choose: "Step 2 of 4 · Pick a skill", bonus: "Step 3 of 4 · Your bonus", play: `Step 4 of 4 · Question ${g.q + 1} of 3`, result: "Finished · Your result" }[phase];

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-accent">♛</span>
          <div><h1 className="font-display text-2xl font-bold sm:text-3xl">Chess Strategist</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Skill Tree Challenge</p></div>
        </div>
        <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 text-sm">
          {([["game", "Play the Game"], ["eval", "Evaluation Checklist (0–5)"], ["evidence", "Assignment Evidence (Prompts)"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "game" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <section className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">{stepLabel}</p>

              {phase === "start" && (
                <div className={`${card} animate-rise space-y-4`}>
                  <h2 className="font-display text-3xl font-bold">How to play</h2>
                  <ol className="space-y-2 text-base">
                    <li><strong>1.</strong> Pick <strong>one</strong> chess skill. Each skill gives you one helpful bonus.</li>
                    <li><strong>2.</strong> Read what your bonus does.</li>
                    <li><strong>3.</strong> Answer <strong>3 simple chess questions</strong>, one at a time. Each shows a small board.</li>
                    <li><strong>4.</strong> After each answer you see why it is right or wrong. Then press <strong>Continue</strong>.</li>
                  </ol>
                  <div className="rounded-lg border border-accent/50 bg-secondary p-4">
                    <p className="font-display text-xl font-bold text-accent">What do I do?</p>
                    <p className="mt-1">Just click the answer you think is best. <strong>You win if you make 1 mistake or fewer.</strong> That is the only rule. You play the white pieces (the light ones with outlines).</p>
                  </div>
                  <button className={btnPrimary} onClick={() => { setPhase("choose"); setLog((l) => ({ ...l, started: true })); }}>Start Game</button>
                </div>
              )}

              {phase === "choose" && (
                <div className={`${card} animate-rise space-y-4`}>
                  <h2 className="font-display text-2xl font-bold">Pick one skill</h2>
                  <Guide>Choose one skill, then press “Next”.</Guide>
                  <div className="grid gap-3 md:grid-cols-3">
                    {SKILLS.map((s) => (
                      <button key={s.id} onClick={() => setSkillId(s.id)} aria-pressed={skillId === s.id}
                        className={`rounded-xl border p-4 text-left transition-all ${skillId === s.id ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-secondary hover:border-primary"}`}>
                        <div className="text-3xl text-accent">{s.icon}</div>
                        <p className="font-display text-xl font-bold">{s.name}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">Bonus: {s.bonus}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{s.how}</p>
                      </button>
                    ))}
                  </div>
                  <button className={btnPrimary} disabled={!skillId} onClick={() => setPhase("bonus")}>Next</button>
                  {!skillId && <p className="text-xs text-muted-foreground">You must pick a skill first.</p>}
                </div>
              )}

              {phase === "bonus" && skill && (
                <div className={`${card} animate-rise space-y-4 text-center`}>
                  <div className="text-6xl text-accent">{skill.icon}</div>
                  <h2 className="font-display text-3xl font-bold">Skill unlocked: {skill.name}</h2>
                  <p className="text-xl font-semibold text-primary">Your bonus: {skill.bonus}</p>
                  <p className="mx-auto max-w-md">{skill.how}</p>
                  <p className="text-sm text-muted-foreground">Remember: win by making 1 mistake or fewer.</p>
                  <button className={btnPrimary} onClick={() => setPhase("play")}>Start the 3 questions</button>
                </div>
              )}

              {phase === "play" && skill && (
                <div className={`${card} animate-rise space-y-4`} key={g.q}>
                  <div className="flex items-center justify-between"><p className="font-semibold">Question {g.q + 1} of 3</p>
                    <div className="flex gap-1">{QUESTIONS.map((_, i) => <span key={i} className={`h-2 w-8 rounded-full ${i <= g.q ? "bg-primary" : "bg-muted"}`} />)}</div></div>
                  <h2 className="font-display text-2xl font-bold">{q.title}</h2>
                  <p>{q.ask}</p>
                  <p className="text-sm text-muted-foreground">ℹ️ {q.terms}</p>
                  <div className="grid items-start gap-5 md:grid-cols-2">
                    <Board pieces={q.pieces} highlight={q.highlight} />
                    <div className="space-y-2">
                      {!result && <Guide>Choose one answer.</Guide>}
                      {q.options.map((o) => (
                        <button key={o.id} disabled={!!result} onClick={() => pick(o.id)}
                          className={`w-full rounded-lg border p-3 text-left text-sm transition-all disabled:cursor-default ${picked === o.id ? (o.correct ? "border-primary bg-primary/15" : "border-destructive bg-destructive/15") : hintOn && o.correct ? "border-accent shadow-glow" : "border-border bg-secondary hover:border-primary"}`}>
                          {o.label}{hintOn && o.correct && !result && <span className="ml-2 text-xs text-accent">★ Hint</span>}
                        </button>
                      ))}
                      {skill.id === "hint" && g.bonusLeft && !result && !hintOn && (
                        <button className={`${btnGhost} w-full`} onClick={() => { setHintOn(true); setG({ ...g, bonusLeft: false }); }}>♘ Use my hint (1 left)</button>
                      )}
                    </div>
                  </div>
                  {result && (
                    <div role="status" className={`animate-rise rounded-lg border p-4 ${result === "correct" ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"}`}>
                      <p className={`text-lg font-bold ${result === "correct" ? "text-primary" : "text-destructive"}`}>{result === "correct" ? "✓ Correct!" : "✗ Not quite."}</p>
                      {result === "retry" ? <p className="mt-1 font-medium text-accent">♔ Retry used — try this question again.</p> : <p className="mt-1">{q.explain}</p>}
                      {result === "shielded" && <p className="mt-2 font-medium text-accent">🛡 Your shield protected you: this does not count as a mistake.</p>}
                      {result === "wrong" && <p className="mt-2 text-sm">Mistakes so far: {g.mistakes}</p>}
                      <button className={`${btnPrimary} mt-4`} onClick={cont}>{result === "retry" ? "Try Again" : g.q === 2 ? "See My Result" : "Continue"}</button>
                    </div>
                  )}
                </div>
              )}

              {phase === "result" && (
                <div className={`${card} animate-rise space-y-4 text-center`}>
                  <div className="text-6xl">{win ? "🏆" : "♚"}</div>
                  <h2 className={`font-display text-4xl font-bold ${win ? "text-primary" : "text-destructive"}`}>{win ? "You Win!" : "You Lost — try again!"}</h2>
                  <p className="text-lg">You got <strong>{g.correct} of 3</strong> correct and made <strong>{g.mistakes}</strong> mistake{g.mistakes === 1 ? "" : "s"}.</p>
                  <p className="text-sm text-muted-foreground">Skill used: {skill?.name} ({skill?.bonus}). You needed 1 mistake or fewer to win.</p>
                  <button className={`${btnPrimary} px-10 text-lg`} onClick={restart}>Play Again</button>
                  <div><button className="text-sm text-muted-foreground underline" onClick={() => setShowTests((v) => !v)}>{showTests ? "Hide" : "Show"} test checklist</button></div>
                  {showTests && <TestPanel log={log} />}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className={card}>
                <h3 className="font-display text-xl font-bold">The only rule</h3>
                <p className="mt-2 text-sm">Answer 3 questions. Make <strong>1 mistake or fewer</strong> to win.</p>
                {skill && phase !== "start" && <p className="mt-3 text-sm text-primary">Your bonus: {skill.bonus} {phase === "play" ? (g.bonusLeft ? "(ready)" : "(used)") : ""}</p>}
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
