export type SkillId = "tactical" | "defensive" | "endgame";
export type Piece = { sq: string; p: string; white: boolean };

export interface Option { id: string; label: string; correct: boolean; explain: string }

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  reward: string;
  tradeoff: string;
  prompt: string;
  pieces: Piece[];
  highlight: string[];
  options: Option[];
}

const P = (sq: string, p: string, white: boolean): Piece => ({ sq, p, white });

export const SKILLS: SkillDef[] = [
  {
    id: "tactical",
    name: "Tactical Vision",
    icon: "♘",
    reward: "Bonus Hint: reveal the best move once in the final challenge.",
    tradeoff: "No safety net — a hint only helps if you use it at the right moment.",
    prompt: "White to move. Find the mate in one.",
    pieces: [P("g1", "♚", true), P("e1", "♜", true), P("f2", "♟", true), P("g2", "♟", true), P("h2", "♟", true),
      P("g8", "♚", false), P("f7", "♟", false), P("g7", "♟", false), P("h7", "♟", false)],
    highlight: ["e1", "e8"],
    options: [
      { id: "re8", label: "Re8#", correct: true, explain: "Correct! Black's own pawns trap the king on the back rank — Re8 is checkmate." },
      { id: "re7", label: "Re7", correct: false, explain: "Re7 is not check. Black is fine. The back rank (e8) was the target: Re8#." },
      { id: "h3", label: "h3", correct: false, explain: "h3 is a quiet safety move, not mate. Re8# wins immediately because Black has no escape squares." },
    ],
  },
  {
    id: "defensive",
    name: "Defensive Thinking",
    icon: "♖",
    reward: "Shield: one mistake in the final challenge is forgiven.",
    tradeoff: "No hints — you must find every good move yourself.",
    prompt: "White to move. Black threatens Re1# on your back rank. Choose the safest move.",
    pieces: [P("g1", "♚", true), P("d4", "♞", true), P("a2", "♟", true), P("f2", "♟", true), P("g2", "♟", true), P("h2", "♟", true),
      P("g8", "♚", false), P("e8", "♜", false), P("c6", "♟", false), P("f7", "♟", false), P("g7", "♟", false), P("h7", "♟", false)],
    highlight: ["e8", "e1"],
    options: [
      { id: "h3", label: "h3", correct: true, explain: "Correct! h3 gives your king an escape square (h2), so Re1+ is no longer mate." },
      { id: "nxc6", label: "Nxc6", correct: false, explain: "Greedy! After Nxc6, Black plays Re1# — the knight cannot cover e1. h3 (luft) was safest." },
      { id: "a3", label: "a3", correct: false, explain: "a3 ignores the threat: Re1 is checkmate. Making luft with h3 was the safe choice." },
    ],
  },
  {
    id: "endgame",
    name: "Endgame Mastery",
    icon: "♔",
    reward: "Extra Move: a second attempt on the final endgame decision.",
    tradeoff: "Only helps in the endgame — middlegame mistakes still count fully.",
    prompt: "King + pawn vs king. Which principle wins for White?",
    pieces: [P("e4", "♚", true), P("e3", "♟", true), P("e6", "♚", false)],
    highlight: ["e4", "e6"],
    options: [
      { id: "front", label: "Lead with the king in front of the pawn and fight for the opposition", correct: true, explain: "Correct! The king escorts the pawn; gaining the opposition forces the defending king aside." },
      { id: "rush", label: "Push the pawn as fast as possible", correct: false, explain: "A pawn running alone gets blocked by the enemy king — often a draw. The king must lead." },
      { id: "behind", label: "Keep the king behind the pawn for protection", correct: false, explain: "From behind, the king can't control the queening squares. Put it in front and take the opposition." },
    ],
  },
];

export interface Node {
  id: string;
  title: string;
  text: string;
  endgame?: boolean;
  options: (Option & { next: string })[];
}

/** Final challenge graph. "END" means the scenario is complete. */
export const NODES: Record<string, Node> = {
  n1: {
    id: "n1", title: "1 · The f2 Pressure",
    text: "Black's bishop on c5 and queen on h4 both aim at your f2 pawn. Your move.",
    options: [
      { id: "d4", label: "d4 — block the bishop's diagonal with tempo", correct: true, next: "n2a", explain: "Strong! d4 cuts the c5–f2 diagonal and attacks the bishop. f2 is safe." },
      { id: "h3", label: "h3 — stop a future ...Ng4", correct: false, next: "n2b", explain: "Too slow. Black plays ...Qxf2+ and wins a pawn with attack. d4 was needed." },
      { id: "nxe5", label: "Nxe5 — grab the central pawn", correct: false, next: "n2b", explain: "Greedy. ...Bxf2+ rips open your king. Defend first: d4." },
    ],
  },
  n2a: {
    id: "n2a", title: "2 · The Open e-File",
    text: "The bishop retreats. Black's king is still uncastled on e8 and the e-file is opening.",
    options: [
      { id: "castle", label: "Castle and bring a rook to e1", correct: true, next: "n3", explain: "Excellent! King safe, rook on the open file — you win material on e-file pins and trade into a won endgame." },
      { id: "storm", label: "Launch g4–g5 with your king still in the centre", correct: false, next: "n3", explain: "Risky — your own king gets exposed and Black equalises. Castling first was correct." },
    ],
  },
  n2b: {
    id: "n2b", title: "2 · Under Fire",
    text: "You are a pawn down and Black's queen is swarming your king.",
    options: [
      { id: "trade", label: "Offer a queen trade to kill the attack", correct: true, next: "n3", explain: "Smart defence! Without queens the attack fizzles. Activity lets you win the pawn back into an endgame." },
      { id: "qh5", label: "Counterattack alone with Qh5", correct: false, next: "n3", explain: "A lone queen can't attack. Black's pieces keep hitting your king. Trading queens was safer." },
    ],
  },
  n3: {
    id: "n3", title: "3 · The Deciding Endgame", endgame: true,
    text: "Everything is traded: your king and an extra e-pawn vs the lone black king. Convert it.",
    options: [
      { id: "king", label: "Advance the king ahead of the pawn and take the opposition", correct: true, next: "END", explain: "Textbook! Your king clears the path and the pawn promotes. Victory!" },
      { id: "push", label: "Push the pawn immediately", correct: false, next: "END", explain: "The black king blocks the pawn — it's a draw, not a win. The king had to lead." },
    ],
  },
};

export const MAX_MISTAKES = 2;

export interface ChallengeState {
  node: string;
  mistakes: number;
  shield: boolean; // available
  retry: boolean; // available (endgame extra move)
  correct: number;
  outcome: null | "win" | "loss";
  lossReason?: string;
}

export function initChallenge(skill: SkillId | null, skillEarned: boolean): ChallengeState {
  return {
    node: "n1", mistakes: 0, correct: 0, outcome: null,
    shield: skillEarned && skill === "defensive",
    retry: skillEarned && skill === "endgame",
  };
}

/** Apply a choice. Returns new state plus a note about which bonus (if any) was consumed. */
export function applyChoice(s: ChallengeState, optId: string): { state: ChallengeState; used?: "shield" | "retry" } {
  const node = NODES[s.node]!;
  const opt = node!.options.find((o) => o.id === optId)!;
  if (opt.correct) {
    const correct = s.correct + 1;
    if (opt.next === "END") return { state: { ...s, correct, outcome: "win" } };
    return { state: { ...s, correct, node: opt.next } };
  }
  // Mistake. Endgame retry stays on the same node.
  if (node.endgame && s.retry) return { state: { ...s, retry: false }, used: "retry" };
  if (s.shield) {
    // Shield forgives the mistake: no count, and an endgame blunder is taken back.
    if (node.endgame) return { state: { ...s, shield: false }, used: "shield" };
    return { state: { ...s, shield: false, node: opt.next }, used: "shield" };
  }
  const mistakes = s.mistakes + 1;
  if (mistakes >= MAX_MISTAKES) return { state: { ...s, mistakes, outcome: "loss", lossReason: "Two mistakes — your position collapsed." } };
  if (node.endgame) return { state: { ...s, mistakes, outcome: "loss", lossReason: "The endgame was misplayed and ended in a draw." } };
  return { state: { ...s, mistakes, node: opt.next } };
}

export function score(skillEarned: boolean, c: ChallengeState) {
  return (skillEarned ? 20 : 0) + c.correct * 25 + (c.outcome === "win" ? 25 : 0);
}
export const MAX_SCORE = 20 + 3 * 25 + 25;
