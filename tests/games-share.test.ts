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

  it("win message carries result, score, url", () => {
    const t = buildShareText({ ...base, solved: true, guesses: 3 });
    expect(t).toContain("Alfazy #050");
    expect(t).toContain("3/6");
    expect(t).toContain("160 pts");
    expect(t).toContain("https://nnawca.org/g/alfz");
    expect(t).toMatch(/beat me/i);
  });

  it("loss message differs and omits a guess count", () => {
    const t = buildShareText({ ...base, solved: false, guesses: null });
    expect(t).toMatch(/got me/i);
    expect(t).not.toContain("/6");
  });

  it("does not double a #NNN already in the name (archive)", () => {
    const t = buildShareText({ ...base, name: "Alfazy #012", solved: true, guesses: 2 });
    expect(t).toContain("Alfazy #012");
    expect(t).not.toContain("#050");
  });

  it("includes the emoji grid when given", () => {
    const t = buildShareText({ ...base, solved: true, guesses: 2, grid: "🟩🟩🟩🟩🟩" });
    expect(t).toContain("🟩🟩🟩🟩🟩");
  });
});
