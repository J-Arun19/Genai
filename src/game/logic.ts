export type SkillId = "hint" | "shield" | "retry";
export type Piece = { sq: string; p: string; white: boolean };
export interface Option { id: string; label: string; correct: boolean }
export interface Question {
  title: string;
  ask: string;
  terms: string;
  pieces: Piece[];
  highlight: string[];
  options: Option[];
  explain: string;
}

export interface SkillDef { id: SkillId; name: string; icon: string; bonus: string; how: string }

export const SKILLS: SkillDef[] = [
  { id: "hint", name: "Tactical Vision", icon: "♘", bonus: "1 Hint",
    how: "On any one question, press “Use my hint” and the correct answer will glow." },
  { id: "shield", name: "Defensive Thinking", icon: "♖", bonus: "1 Mistake Shield",
    how: "Your first wrong answer will not count as a mistake. It is used automatically." },
  { id: "retry", name: "Endgame Mastery", icon: "♔", bonus: "1 Retry",
    how: "The first time you answer wrong, you can try that same question again." },
];

const P = (sq: string, p: string, white: boolean): Piece => ({ sq, p, white });

export const QUESTIONS: Question[] = [
  {
    title: "Find the winning move",
    ask: "You are White. Which move checkmates the black king right now?",
    terms: "Checkmate = the king is attacked and has no safe square to move to. That wins the game.",
    pieces: [P("g1", "♚", true), P("e1", "♜", true), P("f2", "♟", true), P("g2", "♟", true), P("h2", "♟", true),
      P("g8", "♚", false), P("f7", "♟", false), P("g7", "♟", false), P("h7", "♟", false)],
    highlight: ["e1"],
    options: [
      { id: "a", label: "Move the rook all the way to the top row", correct: true },
      { id: "b", label: "Move the rook up just one square", correct: false },
      { id: "c", label: "Move a pawn forward one square", correct: false },
    ],
    explain: "Moving the rook to the top row attacks the black king. The king's own pawns block every escape square, so it is checkmate.",
  },
  {
    title: "Choose the safest move",
    ask: "You are White. The black rook wants to jump to your bottom row and checkmate your king. Which move keeps your king safe?",
    terms: "Your king is stuck behind its own three pawns, so it has nowhere to run if attacked from the side.",
    pieces: [P("g1", "♚", true), P("d4", "♞", true), P("a2", "♟", true), P("f2", "♟", true), P("g2", "♟", true), P("h2", "♟", true),
      P("g8", "♚", false), P("e8", "♜", false), P("c6", "♟", false), P("f7", "♟", false), P("g7", "♟", false), P("h7", "♟", false)],
    highlight: ["e8", "g1"],
    options: [
      { id: "a", label: "Move the pawn in front of the king's right side (h-pawn) forward one square", correct: true },
      { id: "b", label: "Use your knight to capture a black pawn", correct: false },
      { id: "c", label: "Move the far-left pawn forward one square", correct: false },
    ],
    explain: "Moving the h-pawn opens a little escape square for your king. Now the rook attack is not checkmate. The other moves ignore the danger.",
  },
  {
    title: "Help your pawn become a queen",
    ask: "You are White with a king and one pawn. How do you help the pawn reach the top row?",
    terms: "A pawn that reaches the last row turns into a queen (this is called promotion).",
    pieces: [P("e4", "♚", true), P("e3", "♟", true), P("e6", "♚", false)],
    highlight: ["e4", "e3"],
    options: [
      { id: "a", label: "Walk your king ahead of the pawn to push the enemy king away", correct: true },
      { id: "b", label: "Push the pawn forward alone as fast as possible", correct: false },
      { id: "c", label: "Keep your king behind the pawn", correct: false },
    ],
    explain: "Your king must lead the way. A pawn on its own gets blocked or captured by the enemy king.",
  },
];

export const MAX_MISTAKES_TO_WIN = 1;

export interface GameState {
  q: number; // current question index
  correct: number;
  mistakes: number;
  bonusLeft: boolean;
  done: boolean;
}

export function initGame(): GameState {
  return { q: 0, correct: 0, mistakes: 0, bonusLeft: true, done: false };
}

export type AnswerResult = "correct" | "wrong" | "shielded" | "retry";

/** Grade an answer. Does not advance; call next() after showing the explanation (unless "retry"). */
export function answer(s: GameState, skill: SkillId, optId: string): { state: GameState; result: AnswerResult } {
  const ok = QUESTIONS[s.q]!.options.find((o) => o.id === optId)!.correct;
  if (ok) return { state: { ...s, correct: s.correct + 1 }, result: "correct" };
  if (s.bonusLeft && skill === "shield") return { state: { ...s, bonusLeft: false }, result: "shielded" };
  if (s.bonusLeft && skill === "retry") return { state: { ...s, bonusLeft: false }, result: "retry" };
  return { state: { ...s, mistakes: s.mistakes + 1 }, result: "wrong" };
}

export function next(s: GameState): GameState {
  return s.q + 1 >= QUESTIONS.length ? { ...s, done: true } : { ...s, q: s.q + 1 };
}

export const isWin = (s: GameState) => s.mistakes <= MAX_MISTAKES_TO_WIN;
