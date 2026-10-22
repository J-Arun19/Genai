import { describe, expect, it } from "vitest";
import { answer, initGame, isWin, next, QUESTIONS } from "./logic";

const right = (i: number) => QUESTIONS[i]!.options.find((o) => o.correct)!.id;
const wrong = (i: number) => QUESTIONS[i]!.options.find((o) => !o.correct)!.id;

describe("game rules", () => {
  it("each question has exactly one correct answer", () => {
    for (const q of QUESTIONS) expect(q.options.filter((o) => o.correct)).toHaveLength(1);
  });
  it("one mistake still wins, two mistakes lose", () => {
    let s = initGame();
    s = next(answer(s, "hint", wrong(0)).state);
    s = next(answer(s, "hint", right(1)).state);
    s = next(answer(s, "hint", right(2)).state);
    expect(s.done).toBe(true); expect(isWin(s)).toBe(true);
    let t = initGame();
    t = next(answer(t, "hint", wrong(0)).state);
    t = next(answer(t, "hint", wrong(1)).state);
    expect(isWin(t)).toBe(false);
  });
  it("shield forgives only the first wrong answer", () => {
    let s = initGame();
    const a = answer(s, "shield", wrong(0)); expect(a.result).toBe("shielded");
    s = next(a.state);
    const b = answer(s, "shield", wrong(1)); expect(b.result).toBe("wrong");
    expect(b.state.mistakes).toBe(1);
  });
  it("retry allows one second attempt without a mistake", () => {
    const a = answer(initGame(), "retry", wrong(0));
    expect(a.result).toBe("retry"); expect(a.state.mistakes).toBe(0); expect(a.state.q).toBe(0);
    expect(answer(a.state, "retry", wrong(0)).result).toBe("wrong");
  });
});
