import { describe, it, expect } from "vitest";
import { buildShareText, gameShareUrl } from "@/lib/games/share";

describe("gameShareUrl", () => {
  it("builds /g/<code> and tolerates a trailing slash", () => {
    expect(gameShareUrl("https://nnawca.org", "alfz")).toBe("https://nnawca.org/g/alfz");
    expect(gameShareUrl("https://nnawca.org/", "htbl")).toBe("https://nnawca.org/g/htbl");
  });
});

describe("buildShareText", () => {
  const base = { name: "Alfazy", puzzleNo: 50, maxGuesses: 6, score: 160, url: "https://nnawca.org/g/alfz" };

  it("win message: 'I Solved ... in g/max' + beat-me hashtag + link", () => {
    const t = buildShareText({ ...base, solved: true, guesses: 3 });
    expect(t).toContain("I Solved Alfazy #050 in 3/6");
    expect(t).toContain("Try now to beat me at #Alfazy https://nnawca.org/g/alfz");
  });

  it("loss message differs and omits a guess count", () => {
    const t = buildShareText({ ...base, solved: false, guesses: null });
    expect(t).toContain("Alfazy #050 beat me today");
    expect(t).not.toContain("/6");
    expect(t).toContain("Try now to beat me at #Alfazy");
  });

  it("does not double a #NNN already in the name (archive)", () => {
    const t = buildShareText({ ...base, name: "Alfazy #012", solved: true, guesses: 2 });
    expect(t).toContain("I Solved Alfazy #012 in 2/6");
    expect(t).not.toContain("#050");
    expect(t).toContain("#Alfazy "); // hashtag strips the puzzle number
  });

  it("hashtag strips spaces from multi-word names", () => {
    const t = buildShareText({ ...base, name: "Hit and Blow", solved: true, guesses: 4, maxGuesses: 9 });
    expect(t).toContain("#HitandBlow");
  });

  it("includes the emoji grid when given", () => {
    const t = buildShareText({ ...base, solved: true, guesses: 2, grid: "🟩🟩🟩🟩🟩" });
    expect(t).toContain("🟩🟩🟩🟩🟩");
  });
});
