import { describe, expect, it } from "vitest";
import { answer, initGame, isWin, next, QUESTIONS, SKILLS } from "./logic";

const play = (skill: "tactics" | "defense" | "opening", oks: boolean[]) => {
  let s = initGame();
  oks.forEach((ok, i) => {
    const id = QUESTIONS[skill][i]!.options.find((o) => o.correct === ok)!.id;
    s = next(answer(s, skill, id).state);
  });
  return s;
};

describe("game rules", () => {
  it("3 skills, 3 questions each, 3 options with exactly one correct", () => {
    expect(SKILLS.map((s) => s.name)).toEqual(["Tactics", "Defense", "Opening"]);
    for (const s of SKILLS) {
      expect(QUESTIONS[s.id]).toHaveLength(3);
      for (const q of QUESTIONS[s.id]) {
        expect(q.options).toHaveLength(3);
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
        for (const o of q.options) expect(q.pieces.some((p) => p.sq === o.move.from && p.white)).toBe(true);
      }
    }
  });
  it("2 of 3 correct wins", () => {
    const s = play("tactics", [true, false, true]);
    expect(s.done).toBe(true); expect(isWin(s)).toBe(true);
  });
  it("1 of 3 correct does not win", () => {
    const s = play("defense", [false, true, false]);
    expect(s.done).toBe(true); expect(isWin(s)).toBe(false); expect(s.mistakes).toBe(2);
  });
});
