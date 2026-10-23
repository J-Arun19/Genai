export type SkillId = "tactics" | "defense" | "opening";
export type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
export type Piece = { sq: string; k: Kind; white: boolean };
export interface Move { from: string; to: string; extra?: { from: string; to: string } }
export interface Option { id: string; label: string; correct: boolean; move: Move; feedback: string }
export interface Question { title: string; ask: string; board: string; pieces: Piece[]; options: Option[] }
export interface SkillDef { id: SkillId; name: string; piece: Kind; tagline: string }

export const SKILLS: SkillDef[] = [
  { id: "tactics", name: "Tactics", piece: "N", tagline: "Find moves that win: checkmates, forks and free pieces." },
  { id: "defense", name: "Defense", piece: "R", tagline: "Keep your king and pieces safe from attacks." },
  { id: "opening", name: "Opening", piece: "P", tagline: "Start the game well: centre, knights, castling." },
];

const P = (sq: string, k: Kind, white: boolean): Piece => ({ sq, k, white });
const mv = (from: string, to: string, extra?: Move["extra"]): Move => ({ from, to, extra });
const KINGS_BACK = [P("g1", "K", true), P("g8", "K", false), P("f7", "P", false), P("g7", "P", false), P("h7", "P", false)];
const START: Piece[] = (() => {
  const back: Kind[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  const out: Piece[] = [];
  "abcdefgh".split("").forEach((f, i) => {
    out.push(P(f + "1", back[i]!, true), P(f + "2", "P", true), P(f + "7", "P", false), P(f + "8", back[i]!, false));
  });
  return out;
})();
const after = (ps: Piece[], moves: [string, string][]) =>
  moves.reduce((acc, [f, t]) => acc.filter((p) => p.sq !== t).map((p) => (p.sq === f ? { ...p, sq: t } : p)), ps);

export const QUESTIONS: Record<SkillId, Question[]> = {
  tactics: [
    {
      title: "Checkmate in one move",
      ask: "Your rook (glowing) can move in straight lines. Which move checkmates the black king?",
      board: "White: king + rook. Black: king behind its own 3 pawns.",
      pieces: [P("a1", "R", true), P("f2", "P", true), P("g2", "P", true), P("h2", "P", true), ...KINGS_BACK],
      options: [
        { id: "a", label: "Rook to the top row (a8)", correct: true, move: mv("a1", "a8"),
          feedback: "Checkmate! The rook attacks the king along the top row, and the king's own pawns block every escape." },
        { id: "b", label: "Rook up six squares (a7)", correct: false, move: mv("a1", "a7"),
          feedback: "Not quite. That doesn't attack the king. Going all the way to the top row is checkmate." },
        { id: "c", label: "Rook one step right (b1)", correct: false, move: mv("a1", "b1"),
          feedback: "That move does nothing to the king. The rook should go to the top row for checkmate." },
      ],
    },
    {
      title: "Knight fork",
      ask: "A 'fork' attacks two pieces at once. Which knight jump attacks the black king AND the black rook?",
      board: "White: king + knight on d5. Black: king on e8, rook on a8.",
      pieces: [P("e1", "K", true), P("d5", "N", true), P("e8", "K", false), P("a8", "R", false)],
      options: [
        { id: "a", label: "Knight to c7", correct: true, move: mv("d5", "c7"),
          feedback: "Fork! From c7 the knight attacks both the king and the rook. The king must move, then you take the rook." },
        { id: "b", label: "Knight to f6", correct: false, move: mv("d5", "f6"),
          feedback: "That checks the king, but it doesn't attack the rook. Knight to c7 hits both." },
        { id: "c", label: "Knight to b6", correct: false, move: mv("d5", "b6"),
          feedback: "That attacks the rook only, and it can simply move away. Knight to c7 attacks king and rook." },
      ],
    },
    {
      title: "Take the free piece",
      ask: "Your queen can capture something. Which move wins a piece without losing anything?",
      board: "White: king + queen on d1. Black: king, pawns, and an unprotected knight on d5.",
      pieces: [P("d1", "Q", true), P("f2", "P", true), P("g2", "P", true), P("h2", "P", true), P("d5", "N", false), ...KINGS_BACK],
      options: [
        { id: "a", label: "Queen takes the knight on d5", correct: true, move: mv("d1", "d5"),
          feedback: "Correct! Nothing protects that knight, so you win it for free." },
        { id: "b", label: "Queen to d4 (next to the knight)", correct: false, move: mv("d1", "d4"),
          feedback: "That wastes time. The knight was free to take right now." },
        { id: "c", label: "Queen to a4", correct: false, move: mv("d1", "a4"),
          feedback: "This ignores the free knight. Always look for pieces you can take for free." },
      ],
    },
  ],
  defense: [
    {
      title: "Escape the check",
      ask: "The black rook attacks your king (check). Which square is safe for your king?",
      board: "White: king on e1 with pawns. Black: rook on e8, bishop on b3 aiming at d1.",
      pieces: [P("e1", "K", true), P("d2", "P", true), P("f2", "P", true), P("g8", "K", false), P("e8", "R", false), P("b3", "B", false)],
      options: [
        { id: "a", label: "King to f1", correct: true, move: mv("e1", "f1"),
          feedback: "Safe! On f1 nothing attacks your king." },
        { id: "b", label: "King to d1", correct: false, move: mv("e1", "d1"),
          feedback: "Illegal: the black bishop on b3 attacks d1. A king may never move into an attack. f1 is safe." },
        { id: "c", label: "King to e2", correct: false, move: mv("e1", "e2"),
          feedback: "Illegal: e2 is still on the rook's line, so the king would still be in check. f1 is safe." },
      ],
    },
    {
      title: "Save your queen",
      ask: "A black pawn attacks your queen. Where should the queen go to be safe?",
      board: "White: queen on d4. Black: pawn on c5 (attacks d4 and b4), pawn on b6 (protects c5).",
      pieces: [P("g1", "K", true), P("d4", "Q", true), P("g8", "K", false), P("c5", "P", false), P("b6", "P", false)],
      options: [
        { id: "a", label: "Queen back to d1", correct: true, move: mv("d4", "d1"),
          feedback: "Safe! Nothing can attack the queen on d1." },
        { id: "b", label: "Queen to b4", correct: false, move: mv("d4", "b4"),
          feedback: "The c5 pawn also attacks b4, so you'd lose the queen. Go back to d1." },
        { id: "c", label: "Queen takes the pawn on c5", correct: false, move: mv("d4", "c5"),
          feedback: "The b6 pawn would take your queen back. A queen for a pawn is a bad trade." },
      ],
    },
    {
      title: "Stop the back-row checkmate",
      ask: "Black threatens Rook to e1, checkmating your trapped king. Which move stops it?",
      board: "White: king on g1 behind 3 pawns. Black: rook on e8.",
      pieces: [P("g1", "K", true), P("a2", "P", true), P("f2", "P", true), P("g2", "P", true), P("h2", "P", true),
        P("g8", "K", false), P("e8", "R", false), P("f7", "P", false), P("g7", "P", false), P("h7", "P", false)],
      options: [
        { id: "a", label: "Push the h-pawn one square (h3)", correct: true, move: mv("h2", "h3"),
          feedback: "Correct! Your king now has an escape square on h2, so Rook to e1 is no longer checkmate." },
        { id: "b", label: "Push the far-left pawn (a3)", correct: false, move: mv("a2", "a3"),
          feedback: "That ignores the danger. Rook to e1 would still be checkmate. h3 gives your king air." },
        { id: "c", label: "King to the corner (h1)", correct: false, move: mv("g1", "h1"),
          feedback: "The king is still trapped behind its pawns. Rook to e1 would be checkmate." },
      ],
    },
  ],
  opening: [
    {
      title: "First move: control the centre",
      ask: "This is the starting position. Which first move follows the rule 'take the centre'?",
      board: "All pieces on their starting squares. You are White (bottom).",
      pieces: START,
      options: [
        { id: "a", label: "King's pawn two squares (e4)", correct: true, move: mv("e2", "e4"),
          feedback: "Great! e4 takes a centre square and opens paths for your queen and bishop." },
        { id: "b", label: "Edge pawn one square (a3)", correct: false, move: mv("a2", "a3"),
          feedback: "Edge pawns don't fight for the centre. Start with a centre pawn like e4." },
        { id: "c", label: "Edge pawn two squares (h4)", correct: false, move: mv("h2", "h4"),
          feedback: "This weakens your king side and ignores the centre. e4 is the classic start." },
      ],
    },
    {
      title: "Bring out a knight",
      ask: "Both sides moved a centre pawn. What is a good next move?",
      board: "After White e4 and Black e5.",
      pieces: after(START, [["e2", "e4"], ["e7", "e5"]]),
      options: [
        { id: "a", label: "Knight to f3 (towards the centre)", correct: true, move: mv("g1", "f3"),
          feedback: "Correct! The knight joins the game, aims at the centre and attacks the e5 pawn." },
        { id: "b", label: "Knight to h3 (the edge)", correct: false, move: mv("g1", "h3"),
          feedback: "'A knight on the rim is dim': on the edge it controls fewer squares. f3 is better." },
        { id: "c", label: "King one step forward (e2)", correct: false, move: mv("e1", "e2"),
          feedback: "Walking the king out early puts it in danger and blocks your bishop. Develop a knight." },
      ],
    },
    {
      title: "Make your king safe: castle",
      ask: "The squares between your king and right rook are empty. What keeps your king safest?",
      board: "Your knight and bishop already moved out. Castling = king 2 squares right, rook jumps over it.",
      pieces: [P("e1", "K", true), P("h1", "R", true), P("a1", "R", true), P("f2", "P", true), P("g2", "P", true), P("h2", "P", true),
        P("e4", "P", true), P("d2", "P", true), P("f3", "N", true), P("c4", "B", true),
        P("e8", "K", false), P("e5", "P", false), P("d7", "P", false), P("c6", "N", false), P("a8", "R", false), P("h8", "R", false)],
      options: [
        { id: "a", label: "Castle (king to g1, rook to f1)", correct: true, move: mv("e1", "g1", { from: "h1", to: "f1" }),
          feedback: "Perfect! Castling tucks the king into the corner behind pawns and brings the rook into play." },
        { id: "b", label: "King one step right (f1)", correct: false, move: mv("e1", "f1"),
          feedback: "Now the king blocks its own rook and you can't castle any more. Castling is better." },
        { id: "c", label: "Push the h-pawn one square (h3)", correct: false, move: mv("h2", "h3"),
          feedback: "Your king still sits in the open middle. Castling moves it to safety in one move." },
      ],
    },
  ],
};

export const WIN_AT = 2;
export interface GameState { q: number; correct: number; mistakes: number; done: boolean }
export const initGame = (): GameState => ({ q: 0, correct: 0, mistakes: 0, done: false });

export function answer(s: GameState, skill: SkillId, optId: string) {
  const ok = QUESTIONS[skill][s.q]!.options.find((o) => o.id === optId)!.correct;
  return { ok, state: ok ? { ...s, correct: s.correct + 1 } : { ...s, mistakes: s.mistakes + 1 } };
}
export const next = (s: GameState): GameState => (s.q + 1 >= 3 ? { ...s, done: true } : { ...s, q: s.q + 1 });
export const isWin = (s: GameState) => s.correct >= WIN_AT;

/** Board after applying a move (captures removed, castling rook moved). */
export function applyMove(ps: Piece[], m: Move): Piece[] {
  const pairs: [string, string][] = [[m.from, m.to]];
  if (m.extra) pairs.push([m.extra.from, m.extra.to]);
  return after(ps, pairs);
}
