import { describe, it, expect } from "vitest";
import {
  daysSinceLaunch,
  puzzleNumber,
  mondayOf,
  isoWeek,
  mondayOfIsoWeek,
  anchorFor,
  dateForAnchor,
  windowFor,
  priorAnchor,
  justClosedAnchor,
} from "@/modules/games/periods";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`); // noon UTC to dodge TZ edges

describe("puzzle numbering", () => {
  it("launch day is puzzle #1", () => {
    expect(daysSinceLaunch(d("2026-07-01"))).toBe(0);
    expect(puzzleNumber(d("2026-07-01"))).toBe(1);
  });
  it("counts whole days", () => {
    expect(puzzleNumber(d("2026-08-05"))).toBe(36); // 35 days later
  });
});

describe("weeks are Monday–Sunday", () => {
  it("mondayOf snaps back to Monday", () => {
    expect(mondayOf(d("2026-08-05")).toISOString().slice(0, 10)).toBe("2026-08-03"); // Wed→Mon
    expect(mondayOf(d("2026-08-03")).toISOString().slice(0, 10)).toBe("2026-08-03"); // Mon→Mon
    expect(mondayOf(d("2026-08-09")).toISOString().slice(0, 10)).toBe("2026-08-03"); // Sun→Mon
  });
  it("computes ISO week + is invertible", () => {
    expect(isoWeek(d("2026-08-05"))).toEqual({ year: 2026, week: 32 });
    expect(mondayOfIsoWeek(2026, 32).toISOString().slice(0, 10)).toBe("2026-08-03");
  });
});

describe("anchors round-trip", () => {
  it("daily", () => {
    expect(anchorFor("daily", d("2026-08-05"))).toBe("2026-08-05");
    expect(dateForAnchor("daily", "2026-08-05").toISOString().slice(0, 10)).toBe("2026-08-05");
  });
  it("weekly", () => {
    expect(anchorFor("weekly", d("2026-08-05"))).toBe("2026-W32");
    expect(dateForAnchor("weekly", "2026-W32").toISOString().slice(0, 10)).toBe("2026-08-03");
  });
  it("monthly / yearly", () => {
    expect(anchorFor("monthly", d("2026-08-05"))).toBe("2026-08");
    expect(anchorFor("yearly", d("2026-08-05"))).toBe("2026");
  });
  it("rejects malformed anchors", () => {
    expect(() => dateForAnchor("weekly", "2026-08")).toThrow();
    expect(() => dateForAnchor("daily", "nope")).toThrow();
  });
});

describe("windows are half-open [start,end)", () => {
  it("daily", () => {
    const w = windowFor("daily", "2026-08-05");
    expect(w.start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-08-06T00:00:00.000Z");
  });
  it("weekly Mon→next Mon", () => {
    const w = windowFor("weekly", "2026-W32");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-08-03");
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-08-10");
  });
  it("monthly", () => {
    const w = windowFor("monthly", "2026-08");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-09-01");
  });
});

describe("priorAnchor + justClosedAnchor", () => {
  it("prior week", () => {
    expect(priorAnchor("weekly", "2026-W32")).toBe("2026-W31");
  });
  it("prior day across month boundary", () => {
    expect(priorAnchor("daily", "2026-08-01")).toBe("2026-07-31");
  });
  it("returns null before launch", () => {
    expect(priorAnchor("daily", "2026-07-01")).toBeNull();
  });
  it("justClosed daily = yesterday", () => {
    expect(justClosedAnchor("daily", d("2026-08-06"))).toBe("2026-08-05");
  });
  it("justClosed monthly = previous month", () => {
    expect(justClosedAnchor("monthly", d("2026-08-06"))).toBe("2026-07");
  });
});
