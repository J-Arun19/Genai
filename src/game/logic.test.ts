import { describe, expect, it } from "vitest";
import { applyChoice, initChallenge, score, MAX_SCORE } from "./logic";

describe("final challenge rules", () => {
  it("perfect play wins", () => {
    let s = initChallenge(null, false);
    for (const id of ["d4", "castle", "king"]) s = applyChoice(s, id).state;
    expect(s.outcome).toBe("win");
    expect(score(true, s)).toBe(MAX_SCORE);
  });
  it("two mistakes lose", () => {
    let s = initChallenge(null, false);
    s = applyChoice(s, "h3").state;
    s = applyChoice(s, "qh5").state;
    expect(s.outcome).toBe("loss");
  });
  it("shield forgives one mistake", () => {
    let s = initChallenge("defensive", true);
    s = applyChoice(s, "h3").state;
    s = applyChoice(s, "qh5").state;
    expect(s.mistakes).toBe(1);
    expect(s.outcome).toBeNull();
  });
  it("endgame extra move gives a retry", () => {
    let s = { ...initChallenge("endgame", true), node: "n3" };
    s = applyChoice(s, "push").state;
    expect(s.outcome).toBeNull();
    s = applyChoice(s, "king").state;
    expect(s.outcome).toBe("win");
  });
  it("endgame blunder without bonus is a loss", () => {
    const s = applyChoice({ ...initChallenge(null, false), node: "n3" }, "push").state;
    expect(s.outcome).toBe("loss");
  });
});
