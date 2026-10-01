import { describe, expect, it } from "vitest";
import { PERIODS } from "../shared/challenge";
import {
  chaseCue,
  compactSteps,
  momentum,
  nextMarker,
  personalBest,
  rankCue,
  streaks,
  visibilityCue,
  weeklySeries,
} from "../src/lib/progress";
import { ordinal, rankRows } from "../src/lib/steps";

const map = (entries: [number, number][]) => new Map(entries);

describe("weeklySeries", () => {
  it("keeps a logged zero, carries the running total over gaps and stops at today", () => {
    // today is in week 4; weeks 1 (0), 2 (8000) and 4 (5000) logged, 3 missed
    const s = weeklySeries(PERIODS, "2026-10-23", map([[1, 0], [2, 8000], [4, 5000]]));
    expect(s).toHaveLength(12);
    expect(s.slice(0, 5).map((p) => [p.week, p.state, p.steps, p.cumulative])).toEqual([
      [1, "past", 0, 0],
      [2, "past", 8000, 8000],
      [3, "past", null, 8000],
      [4, "current", 5000, 13000],
      [5, "future", null, null],
    ]);
    expect(s.filter((p) => p.isBest).map((p) => p.week)).toEqual([2]);
  });

  it("has no values on day one with nothing logged", () => {
    const s = weeklySeries(PERIODS, "2026-10-01", map([]));
    expect(s[0]).toMatchObject({ state: "current", steps: null, cumulative: 0, isBest: false });
    expect(s.slice(1).every((p) => p.steps === null && p.cumulative === null)).toBe(true);
  });

  it("marks only a week-1 zero, never as a best", () => {
    const s = weeklySeries(PERIODS, "2026-10-01", map([[1, 0]]));
    expect(s[0]).toMatchObject({ steps: 0, cumulative: 0, isBest: false });
  });
});

describe("personalBest", () => {
  it("ignores zeros and picks the earliest week on a tie", () => {
    expect(personalBest(map([[1, 0]]))).toBeNull();
    expect(personalBest(map([[3, 9000], [2, 9000], [1, 100]]))).toEqual({ week: 2, steps: 9000 });
  });
});

describe("streaks", () => {
  it("counts consecutive logged weeks, including a logged 0", () => {
    // today in week 5, all of 1-5 logged
    const own = map([[1, 0], [2, 1], [3, 1], [4, 1], [5, 1]]);
    expect(streaks(PERIODS, "2026-10-29", own)).toEqual({ current: 5, longest: 5, awaitingThisWeek: false });
  });

  it("does not break the streak while this week is still open", () => {
    expect(streaks(PERIODS, "2026-10-29", map([[3, 1], [4, 1]]))).toEqual({
      current: 2,
      longest: 2,
      awaitingThisWeek: true,
    });
  });

  it("resets after a missed finished week and remembers the longest", () => {
    // today in week 6, missed week 4
    const own = map([[1, 1], [2, 1], [3, 1], [5, 1], [6, 1]]);
    expect(streaks(PERIODS, "2026-11-05", own)).toEqual({ current: 2, longest: 3, awaitingThisWeek: false });
  });

  it("is zero before the challenge and with nothing logged", () => {
    expect(streaks(PERIODS, "2026-09-30", map([]))).toEqual({ current: 0, longest: 0, awaitingThisWeek: false });
    expect(streaks(PERIODS, "2026-10-01", map([]))).toEqual({ current: 0, longest: 0, awaitingThisWeek: false });
  });

  it("counts the final week after the challenge ends", () => {
    const all = map(PERIODS.map((p) => [p.week, 1]));
    expect(streaks(PERIODS, "2026-12-25", all)).toEqual({ current: 12, longest: 12, awaitingThisWeek: false });
  });
});

describe("momentum", () => {
  it("needs two logged weeks and a positive earlier average", () => {
    expect(momentum(map([[1, 5000]]))).toBeNull();
    expect(momentum(map([[1, 0], [2, 5000]]))).toBeNull();
  });

  it("compares the latest week with the earlier average", () => {
    expect(momentum(map([[1, 10000], [2, 20000], [4, 18000]]))).toEqual({
      week: 4,
      steps: 18000,
      earlierAverage: 15000,
      changePct: 20,
    });
    expect(momentum(map([[1, 10000], [2, 0]]))?.changePct).toBe(-100);
  });
});

describe("nextMarker", () => {
  it("starts with the public visibility threshold", () => {
    expect(nextMarker(0, 1000)).toEqual({ previous: 0, target: 1000, remaining: 1000, fraction: 0, isVisibility: true });
    expect(nextMarker(250, 1000)).toMatchObject({ target: 1000, remaining: 750, fraction: 0.25 });
  });

  it("moves to round markers once the threshold is reached", () => {
    expect(nextMarker(1000, 1000)).toMatchObject({ previous: 1000, target: 10000, isVisibility: false, fraction: 0 });
    expect(nextMarker(30000, 1000)).toMatchObject({ previous: 25000, target: 50000, remaining: 20000, fraction: 0.2 });
  });

  it("keeps going past a million", () => {
    expect(nextMarker(1_000_000, 1000)).toMatchObject({ previous: 1_000_000, target: 2_000_000 });
    expect(nextMarker(2_500_000, 1000)).toMatchObject({ previous: 2_000_000, target: 3_000_000, fraction: 0.5 });
  });
});

describe("visibilityCue", () => {
  it("is honest about the threshold in each phase", () => {
    expect(visibilityCue("upcoming", 0, 1000)).toBeNull();
    expect(visibilityCue("open", 0, 1000)).toBe(
      "1,000 more steps and other walkers can see you on the board (it shows totals of 1,000+).",
    );
    expect(visibilityCue("open", 1000, 1000)).toBe(
      "You've reached 1,000 steps, so other walkers can see you on the board.",
    );
    expect(visibilityCue("final-weeks", 400, 1000)).toBe("Reach 1,000 steps to appear in the final standings.");
    expect(visibilityCue("ended", 400, 1000)).toMatch(/only show totals of 1,000\+/);
  });
});

describe("leaderboard cues", () => {
  const rows = rankRows(
    [
      { id: "a", name: "Ann", isMe: false, v: 9000 },
      { id: "b", name: "Bea", isMe: false, v: 7000 },
      { id: "c", name: "Cal", isMe: true, v: 7000 },
      { id: "d", name: "Dee", isMe: false, v: 2000 },
    ],
    (r) => r.v,
  );

  it("labels shared ranks", () => {
    expect(rankCue(rows[0], rows, ordinal)).toEqual({ label: "1", spoken: "1st", tied: false });
    expect(rankCue(rows[2], rows, ordinal)).toEqual({ label: "=2", spoken: "Tied 2nd", tied: true });
  });

  it("describes the gap to the walker ahead", () => {
    expect(chaseCue(rows)).toEqual({ kind: "tied", with: 1 });
    const behind = rankRows(
      [
        { id: "a", name: "Ann", isMe: false, v: 9000 },
        { id: "c", name: "Cal", isMe: true, v: 7000 },
      ],
      (r) => r.v,
    );
    expect(chaseCue(behind)).toEqual({ kind: "behind", name: "Ann", by: 2000 });
    const leading = rankRows(
      [
        { id: "a", name: "Ann", isMe: false, v: 1000 },
        { id: "c", name: "Cal", isMe: true, v: 7000 },
      ],
      (r) => r.v,
    );
    expect(chaseCue(leading)).toEqual({ kind: "leading", by: 6000 });
  });

  it("stays quiet when you're alone or absent", () => {
    expect(chaseCue(rankRows([{ id: "c", name: "Cal", isMe: true, v: 0 }], (r) => r.v))).toBeNull();
    expect(chaseCue(rankRows([{ id: "a", name: "Ann", isMe: false, v: 5 }], (r) => r.v))).toBeNull();
  });
});

describe("compactSteps", () => {
  it("formats axis labels", () => {
    expect([0, 950, 1000, 12500, 250000, 1_200_000].map(compactSteps)).toEqual(["0", "950", "1k", "12.5k", "250k", "1.2M"]);
  });
});
