import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  SKILLS, NODES, MAX_MISTAKES, MAX_SCORE, applyChoice, initChallenge, score,
  type SkillId, type ChallengeState, type Piece,
} from "@/game/logic";

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

type Phase = "start" | "choose" | "train" | "challenge" | "result";
type Tab = "game" | "eval" | "evidence";
interface Feedback { correct: boolean; text: string; note?: string | undefined }
interface TestLog { started: boolean; skillGateSeen: boolean; feedbackShown: boolean; ended: null | "win" | "loss"; restartOk: null | boolean }

const card = "rounded-xl border border-border bg-card p-5 shadow-elegant sm:p-6";
const btn = "rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:brightness-110 hover:shadow-glow`;
const btnGhost = `${btn} border border-border bg-secondary text-secondary-foreground hover:border-primary`;

function Board({ pieces, highlight }: { pieces: Piece[]; highlight: string[] }) {
  const files = "abcdefgh";
  return (
    <div className="mx-auto grid w-full max-w-[320px] grid-cols-8 overflow-hidden rounded-lg border-4 border-accent shadow-elegant">
      {Array.from({ length: 64 }, (_, i) => {
        const rank = 8 - Math.floor(i / 8); const file = files[i % 8]; const sq = `${file}${rank}`;
        const light = (i % 8 + Math.floor(i / 8)) % 2 === 0;
        const pc = pieces.find((p) => p.sq === sq);
        return (
          <div key={sq} className={`relative flex aspect-square items-center justify-center ${light ? "bg-sq-light" : "bg-sq-dark"} ${highlight.includes(sq) ? "ring-2 ring-inset ring-primary" : ""}`}>
            {pc && <span className={`text-2xl leading-none sm:text-3xl ${pc.white ? "text-piece-white [text-shadow:0_0_2px_black,0_1px_2px_black]" : "text-piece-black"}`}>{pc.p}</span>}
            {rank === 1 && <span className="absolute bottom-0 right-0.5 text-[9px] text-piece-black/60">{file}</span>}
            {file === "a" && <span className="absolute left-0.5 top-0 text-[9px] text-piece-black/60">{rank}</span>}
          </div>
        );
      })}
    </div>
  );
}

function FeedbackBox({ f }: { f: Feedback }) {
  return (
    <div role="status" className={`animate-rise mt-4 rounded-lg border p-4 text-sm ${f.correct ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"}`}>
      <p className={`font-bold ${f.correct ? "text-primary" : "text-destructive"}`}>{f.correct ? "✓ Correct" : "✗ Incorrect"}</p>
      <p className="mt-1 text-foreground/90">{f.text}</p>
      {f.note && <p className="mt-2 font-medium text-accent">{f.note}</p>}
    </div>
  );
}

function Progress({ phase }: { phase: Phase }) {
  const steps: [Phase, string][] = [["start", "Start"], ["choose", "Choose Skill"], ["train", "Training"], ["challenge", "Final Challenge"], ["result", "Result"]];
  const idx = steps.findIndex(([p]) => p === phase);
  return (
    <ol className="flex flex-wrap gap-2 text-xs" aria-label="Progress">
      {steps.map(([p, l], i) => (
        <li key={p} className={`rounded-full border px-3 py-1 ${i < idx ? "border-primary/50 text-primary" : i === idx ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{i + 1}. {l}</li>
      ))}
    </ol>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("game");
  const [phase, setPhase] = useState<Phase>("start");
  const [selected, setSelected] = useState<SkillId | null>(null);
  const [trainAnswer, setTrainAnswer] = useState<string | null>(null);
  const [skillEarned, setSkillEarned] = useState(false);
  const [ch, setCh] = useState<ChallengeState>(initChallenge(null, false));
  const [fb, setFb] = useState<Feedback | null>(null);
  const [pendingNext, setPendingNext] = useState<ChallengeState | null>(null);
  const [hintAvail, setHintAvail] = useState(false);
  const [hintShown, setHintShown] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [restartCheck, setRestartCheck] = useState(false);
  const [log, setLog] = useState<TestLog>({ started: false, skillGateSeen: false, feedbackShown: false, ended: null, restartOk: null });

  const skill = SKILLS.find((s) => s.id === selected) ?? null;

  useEffect(() => { if (phase === "choose" && selected === null) setLog((l) => ({ ...l, skillGateSeen: true })); }, [phase, selected]);
  useEffect(() => { if (fb) setLog((l) => ({ ...l, feedbackShown: true })); }, [fb]);
  // Verify restart actually reset all game state.
  useEffect(() => {
    if (!restartCheck) return;
    const ok = phase === "start" && selected === null && trainAnswer === null && !skillEarned && ch.node === "n1" && ch.mistakes === 0 && ch.correct === 0 && ch.outcome === null && fb === null && !hintAvail;
    setLog((l) => ({ ...l, restartOk: ok })); setRestartCheck(false);
  }, [restartCheck, phase, selected, trainAnswer, skillEarned, ch, fb, hintAvail]);

  function startGame() { setPhase("choose"); setLog((l) => ({ ...l, started: true })); }

  function answerTraining(id: string) {
    if (!skill || trainAnswer) return;
    const opt = skill.options.find((o) => o.id === id)!;
    setTrainAnswer(id); setSkillEarned(opt.correct);
    setFb({ correct: opt.correct, text: opt.explain, note: opt.correct ? `Skill unlocked: ${skill.reward}` : "No bonus unlocked — you can still win the final challenge with careful play." });
  }

  function beginChallenge() {
    setCh(initChallenge(selected, skillEarned));
    setHintAvail(skillEarned && selected === "tactical");
    setFb(null); setPhase("challenge");
  }

  function choose(id: string) {
    if (fb) return;
    const node = NODES[ch.node]!;
    const opt = node.options.find((o) => o.id === id)!;
    const { state, used } = applyChoice(ch, id);
    let note: string | undefined;
    if (used === "shield") note = node.endgame ? "🛡 Shield used: your blunder is taken back — choose again." : "🛡 Shield absorbed this mistake. No penalty.";
    if (used === "retry") note = "♔ Extra Move used: you get a second attempt at this endgame.";
    if (!opt.correct && !used && state.outcome !== "loss") note = `Mistake ${state.mistakes}/${MAX_MISTAKES}.`;
    setFb({ correct: opt.correct, text: opt.explain, note });
    setPendingNext(state);
  }

  function continueChallenge() {
    if (!pendingNext) return;
    setCh(pendingNext); setFb(null); setHintShown(null); setPendingNext(null);
    if (pendingNext.outcome) { setPhase("result"); setLog((l) => ({ ...l, ended: pendingNext.outcome })); }
  }

  function restart() {
    setPhase("start"); setSelected(null); setTrainAnswer(null); setSkillEarned(false);
    setCh(initChallenge(null, false)); setFb(null); setPendingNext(null); setHintAvail(false); setHintShown(null); setShowTests(false);
    setRestartCheck(true);
  }

  const node = NODES[ch.node]!;
  const final = score(skillEarned, ch);

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-accent">♛</span>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">Chess Strategist</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Skill Tree Challenge</p>
          </div>
        </div>
        <nav className="flex gap-1 rounded-lg border border-border bg-card p-1 text-sm">
          {([["game", "Game"], ["eval", "Evaluation"], ["evidence", "Assignment Evidence"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "game" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <section className="space-y-4">
              <Progress phase={phase} />

              {phase === "start" && (
                <div className={`${card} animate-rise`}>
                  <h2 className="font-display text-3xl font-bold">Become a Chess Strategist</h2>
                  <p className="mt-2 text-muted-foreground">Choose <strong className="text-foreground">exactly one</strong> of three chess skills to train. Pass its puzzle to unlock a bonus, then use it to win the final branching challenge. Takes about 3–5 minutes.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {SKILLS.map((s) => (
                      <div key={s.id} className="rounded-lg border border-border bg-secondary p-3 text-sm">
                        <div className="text-2xl text-accent">{s.icon}</div><p className="font-semibold">{s.name}</p>
                      </div>
                    ))}
                  </div>
                  <button className={`${btnPrimary} mt-6`} onClick={startGame}>Start Game</button>
                </div>
              )}

              {phase === "choose" && (
                <div className={`${card} animate-rise`}>
                  <h2 className="font-display text-2xl font-bold">Choose one skill to train</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Each skill has a different reward and tradeoff. You must select one to continue.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {SKILLS.map((s) => (
                      <button key={s.id} onClick={() => setSelected(s.id)} aria-pressed={selected === s.id}
                        className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${selected === s.id ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-secondary"}`}>
                        <div className="text-3xl text-accent">{s.icon}</div>
                        <p className="mt-1 font-display text-xl font-bold">{s.name}</p>
                        <p className="mt-2 text-xs text-primary">+ {s.reward}</p>
                        <p className="mt-1 text-xs text-muted-foreground">– {s.tradeoff}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button className={btnPrimary} disabled={!selected} onClick={() => { setPhase("train"); setFb(null); }}>Train this skill</button>
                    {!selected && <span className="text-xs text-muted-foreground">Select a skill first.</span>}
                  </div>
                </div>
              )}

              {phase === "train" && skill && (
                <div className={`${card} animate-rise`}>
                  <p className="text-xs uppercase tracking-widest text-primary">Training · {skill.name}</p>
                  <h2 className="mt-1 font-display text-2xl font-bold">{skill.prompt}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">White pieces are outlined. Highlighted squares mark the key area. One attempt only.</p>
                  <div className="mt-4 grid items-start gap-5 md:grid-cols-2">
                    <Board pieces={skill.pieces} highlight={skill.highlight} />
                    <div className="space-y-2">
                      {skill.options.map((o) => (
                        <button key={o.id} disabled={!!trainAnswer} onClick={() => answerTraining(o.id)}
                          className={`w-full rounded-lg border p-3 text-left text-sm transition-all ${trainAnswer === o.id ? (o.correct ? "border-primary bg-primary/15" : "border-destructive bg-destructive/15") : "border-border bg-secondary hover:border-primary"} disabled:cursor-default`}>
                          {o.label}
                        </button>
                      ))}
                      {fb && <FeedbackBox f={fb} />}
                      {trainAnswer && <button className={`${btnPrimary} mt-2 w-full`} onClick={beginChallenge}>Enter Final Challenge →</button>}
                    </div>
                  </div>
                </div>
              )}

              {phase === "challenge" && (
                <div className={`${card} animate-rise`} key={node.id}>
                  <p className="text-xs uppercase tracking-widest text-primary">Final Challenge · You play White</p>
                  <h2 className="mt-1 font-display text-2xl font-bold">{node.title}</h2>
                  <p className="mt-2 text-muted-foreground">{node.text}</p>
                  <div className="mt-4 space-y-2">
                    {node.options.map((o) => (
                      <button key={o.id} disabled={!!fb} onClick={() => choose(o.id)}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition-all ${hintShown === o.id ? "border-accent shadow-glow" : "border-border"} bg-secondary hover:border-primary disabled:cursor-default disabled:opacity-70`}>
                        {o.label}{hintShown === o.id && <span className="ml-2 text-xs text-accent">★ Hint</span>}
                      </button>
                    ))}
                  </div>
                  {hintAvail && !fb && (
                    <button className={`${btnGhost} mt-3`} onClick={() => { setHintShown(node.options.find((o) => o.correct)!.id); setHintAvail(false); }}>♘ Use Bonus Hint (1 left)</button>
                  )}
                  {fb && <FeedbackBox f={fb} />}
                  {fb && <button className={`${btnPrimary} mt-4`} onClick={continueChallenge}>{pendingNext?.outcome ? "See Result" : pendingNext?.node === ch.node ? "Try Again" : "Continue →"}</button>}
                </div>
              )}

              {phase === "result" && (
                <div className={`${card} animate-rise text-center`}>
                  <div className="text-6xl">{ch.outcome === "win" ? "♔" : "♚"}</div>
                  <h2 className={`mt-2 font-display text-4xl font-bold ${ch.outcome === "win" ? "text-primary" : "text-destructive"}`}>{ch.outcome === "win" ? "Victory!" : "Defeat"}</h2>
                  <p className="mt-2 text-muted-foreground">{ch.outcome === "win" ? "You converted the endgame and promoted your pawn." : ch.lossReason}</p>
                  <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3 text-sm">
                    <Stat label="Score" value={`${final}/${MAX_SCORE}`} />
                    <Stat label="Correct moves" value={`${ch.correct}/3`} />
                    <Stat label="Mistakes" value={`${ch.mistakes}`} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Skill: {skill?.name} — {skillEarned ? "bonus unlocked (+20)" : "bonus not unlocked"}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button className={btnPrimary} onClick={restart}>Play Again</button>
                    <button className={btnGhost} onClick={() => setShowTests((v) => !v)}>{showTests ? "Hide" : "Show"} Test Panel</button>
                  </div>
                  {showTests && <TestPanel log={log} />}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className={card}>
                <h3 className="font-display text-xl font-bold">Rules</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>• Pick exactly one skill and solve its puzzle (one try).</li>
                  <li>• Correct = bonus unlocked (+20 pts).</li>
                  <li>• Final challenge: 3 decisions, +25 each.</li>
                  <li>• {MAX_MISTAKES} mistakes = defeat.</li>
                  <li>• Misplaying the final endgame = draw = defeat.</li>
                  <li>• Winning adds +25. Max {MAX_SCORE}.</li>
                </ul>
              </div>
              <div className={card}>
                <h3 className="font-display text-xl font-bold">Status</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <Row k="Skill" v={skill?.name ?? "—"} />
                  <Row k="Unlocked" v={phase === "start" || phase === "choose" || !trainAnswer ? "—" : skillEarned ? "Yes" : "No"} />
                  {phase === "challenge" && <>
                    <Row k="Mistakes" v={`${ch.mistakes}/${MAX_MISTAKES}`} />
                    <Row k="Shield" v={ch.shield ? "Ready 🛡" : "—"} />
                    <Row k="Extra move" v={ch.retry ? "Ready ♔" : "—"} />
                    <Row k="Hint" v={hintAvail ? "Ready ♘" : "—"} />
                  </>}
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-secondary p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-2xl font-bold">{value}</p></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
}

function TestPanel({ log }: { log: TestLog }) {
  const rows: [string, boolean | null, string][] = [
    ["Game starts", log.started, "Start Game moved the game to skill selection."],
    ["Skill choice is required", log.skillGateSeen, "Training button was shown disabled while no skill was selected."],
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
