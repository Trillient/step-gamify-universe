import { describe, expect, it } from "vitest";
import { PERIODS } from "../shared/challenge";
import { daysBetween, ordinal, parseSteps, phaseCopy, rankRows, startedPeriods, weekState } from "../src/lib/steps";

const MAX = 1_000_000;

describe("parseSteps", () => {
  it("treats blank as empty, never as zero", () => {
    expect(parseSteps("", MAX)).toEqual({ kind: "empty" });
    expect(parseSteps("   ", MAX)).toEqual({ kind: "empty" });
  });

  it("accepts 0 and the maximum", () => {
    expect(parseSteps("0", MAX)).toEqual({ kind: "valid", steps: 0 });
    expect(parseSteps("1000000", MAX)).toEqual({ kind: "valid", steps: MAX });
  });

  it("tolerates separators people commonly type", () => {
    expect(parseSteps(" 52,000 ", MAX)).toEqual({ kind: "valid", steps: 52000 });
    expect(parseSteps("52 000", MAX)).toEqual({ kind: "valid", steps: 52000 });
  });

  it.each(["-5", "12.5", "1e4", "abc", "12a", "+7"])("rejects %s", (raw) => {
    expect(parseSteps(raw, MAX)).toEqual({ kind: "invalid", reason: "not-a-whole-number" });
  });

  it("rejects values above the maximum", () => {
    expect(parseSteps("1000001", MAX)).toEqual({ kind: "invalid", reason: "too-large" });
    expect(parseSteps("99999999999999999999", MAX)).toEqual({ kind: "invalid", reason: "too-large" });
  });
});

describe("calendar helpers", () => {
  it("counts whole days between calendar dates", () => {
    expect(daysBetween("2026-09-30", "2026-10-01")).toBe(1);
    expect(daysBetween("2026-10-01", "2026-12-20")).toBe(80);
    expect(daysBetween("2026-10-05", "2026-10-01")).toBe(-4);
  });

  it("lists only started weeks and classifies each week", () => {
    expect(startedPeriods(PERIODS, "2026-09-30")).toHaveLength(0);
    expect(startedPeriods(PERIODS, "2026-10-08")).toHaveLength(2);
    expect(startedPeriods(PERIODS, "2026-12-25")).toHaveLength(12);
    expect(weekState(PERIODS[1], "2026-10-07")).toBe("future");
    expect(weekState(PERIODS[1], "2026-10-08")).toBe("current");
    expect(weekState(PERIODS[0], "2026-10-08")).toBe("past");
  });

  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 111].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "111th",
    ]);
  });
});

describe("rankRows", () => {
  const rows = [
    { id: "a", name: "Ann", isMe: false, total: 5000, weeks: { "1": 5000 } as Record<string, number> },
    { id: "b", name: "Bob", isMe: true, total: 7000, weeks: { "1": 3000, "2": 4000 } as Record<string, number> },
    { id: "c", name: "Cal", isMe: false, total: 5000, weeks: {} as Record<string, number> },
  ];

  it("ranks by value with shared ranks for ties", () => {
    const ranked = rankRows(rows, (r) => r.total);
    expect(ranked.map((r) => [r.name, r.rank])).toEqual([
      ["Bob", 1],
      ["Ann", 2],
      ["Cal", 2],
    ]);
  });

  it("drops rows without a value for a week, keeping 0", () => {
    const ranked = rankRows(rows, (r) => r.weeks["2"]);
    expect(ranked.map((r) => r.name)).toEqual(["Bob"]);
    const zero = rankRows([{ id: "z", name: "Zed", isMe: true, w: 0 }], (r) => r.w);
    expect(zero).toEqual([{ id: "z", name: "Zed", isMe: true, value: 0, rank: 1 }]);
  });
});

describe("phaseCopy", () => {
  const base = {
    start: "2026-10-01",
    end: "2026-12-20",
    finalWeeksStart: "2026-11-26",
    publicMinSteps: 1000,
    periods: PERIODS,
  };
  const fmt = (d: string) => d;

  it("counts down before the start", () => {
    const c = phaseCopy({ ...base, phase: "upcoming", today: "2026-09-28", currentWeek: null }, fmt);
    expect(c.title).toBe("Starts in 3 days");
    expect(phaseCopy({ ...base, phase: "upcoming", today: "2026-09-30", currentWeek: null }, fmt).title).toBe(
      "Starts tomorrow",
    );
  });

  it("explains the open week and the public threshold", () => {
    const c = phaseCopy({ ...base, phase: "open", today: "2026-10-01", currentWeek: 1 }, fmt);
    expect(c.title).toBe("Week 1 of 12");
    expect(c.body).toContain("7 days left");
    expect(c.body).toContain("1,000");
  });

  it("explains the hidden final weeks and the end", () => {
    const c = phaseCopy({ ...base, phase: "final-weeks", today: "2026-12-20", currentWeek: 12 }, fmt);
    expect(c.body).toContain("last day");
    expect(c.privacy).toMatch(/hidden/);
    const e = phaseCopy({ ...base, phase: "ended", today: "2026-12-21", currentWeek: null }, fmt);
    expect(e.title).toMatch(/finished/);
  });
});

describe("ownTotals", () => {
  it("overlays acknowledged values on server entries", async () => {
    const { ownTotals, sumValues } = await import("../src/lib/steps");
    const map = ownTotals(
      [
        { week: 1, steps: 100 },
        { week: 2, steps: 200 },
      ],
      (w) => (w === 2 ? 0 : w === 3 ? 300 : undefined),
      12,
    );
    expect([...map.entries()]).toEqual([
      [1, 100],
      [2, 0],
      [3, 300],
    ]);
    expect(sumValues(map)).toBe(400);
    expect(ownTotals(undefined, () => undefined, 12).size).toBe(0);
  });
});
