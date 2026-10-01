/**
 * Pure helpers for the progress chart and the small, data-derived rewards
 * (streaks, personal best, markers). Everything here is computed from the
 * user's own saved weekly totals; nothing is estimated or invented.
 */
// relative so the strict node tsconfig (which typechecks tests/) resolves it too
import type { Period, Phase } from "../../shared/challenge";
import { weekState, type RankRow, type WeekState } from "./steps";

export interface WeekPoint {
  week: number;
  state: WeekState;
  /** Logged total for the week; null when not logged (or not started). */
  steps: number | null;
  /** Running total of logged weeks up to this one; null for weeks not reached yet. */
  cumulative: number | null;
  isBest: boolean;
}

export interface PersonalBest {
  week: number;
  steps: number;
}

/** Highest non-zero week, earliest week on a tie. A week of 0 is never a "best". */
export function personalBest(own: ReadonlyMap<number, number>): PersonalBest | null {
  let best: PersonalBest | null = null;
  for (const [week, steps] of own) {
    if (steps <= 0) continue;
    if (!best || steps > best.steps || (steps === best.steps && week < best.week)) best = { week, steps };
  }
  return best;
}

/**
 * One point per challenge week. Future weeks have no value at all, so a
 * chart stops at today instead of drawing a flat line into the future. A
 * started week that was not logged keeps the running total flat.
 */
export function weeklySeries(
  periods: readonly Period[],
  today: string,
  own: ReadonlyMap<number, number>,
): WeekPoint[] {
  const best = personalBest(own);
  let running = 0;
  return periods.map((p) => {
    const state = weekState(p, today);
    const value = own.get(p.week);
    if (value !== undefined) running += value;
    const reached = state !== "future" || value !== undefined;
    return {
      week: p.week,
      state,
      steps: value ?? null,
      cumulative: reached ? running : null,
      isBest: best?.week === p.week,
    };
  });
}

export interface Streak {
  /** Consecutive logged weeks ending at the latest week that counts. */
  current: number;
  longest: number;
  /**
   * True when the week in progress isn't logged yet, so the current streak
   * counts up to last week and is still alive.
   */
  awaitingThisWeek: boolean;
}

/**
 * Streaks of consecutive logged weeks (a logged 0 counts: it was entered).
 * The week in progress doesn't break a streak until it ends unlogged.
 */
export function streaks(periods: readonly Period[], today: string, own: ReadonlyMap<number, number>): Streak {
  const started = periods.filter((p) => p.start <= today);
  let longest = 0;
  let run = 0;
  for (const p of started) {
    run = own.has(p.week) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const last = started[started.length - 1];
  const awaitingThisWeek = !!last && weekState(last, today) === "current" && !own.has(last.week);
  let current = 0;
  for (let i = started.length - 1 - (awaitingThisWeek ? 1 : 0); i >= 0; i--) {
    if (!own.has(started[i].week)) break;
    current++;
  }
  return { current, longest, awaitingThisWeek: awaitingThisWeek && current > 0 };
}

export interface Momentum {
  week: number;
  steps: number;
  /** Average of the logged weeks before `week`. */
  earlierAverage: number;
  /** Whole-percent change versus that average. */
  changePct: number;
}

/**
 * The latest logged week against the average of earlier logged weeks.
 * Null until there are two logged weeks and the earlier average is above 0.
 */
export function momentum(own: ReadonlyMap<number, number>): Momentum | null {
  const weeks = [...own.keys()].sort((a, b) => a - b);
  if (weeks.length < 2) return null;
  const week = weeks[weeks.length - 1];
  const earlier = weeks.slice(0, -1);
  const earlierAverage = earlier.reduce((sum, w) => sum + (own.get(w) ?? 0), 0) / earlier.length;
  if (earlierAverage <= 0) return null;
  const steps = own.get(week) ?? 0;
  return {
    week,
    steps,
    earlierAverage: Math.round(earlierAverage),
    changePct: Math.round(((steps - earlierAverage) / earlierAverage) * 100),
  };
}

/** Round-number markers for the challenge total, after the board visibility threshold. */
const MARKERS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 750_000, 1_000_000];

export interface Marker {
  /** The marker below (or at) the total; 0 before the first one. */
  previous: number;
  target: number;
  remaining: number;
  /** Progress from `previous` to `target`, 0 to 1. */
  fraction: number;
  /** The target is the public board threshold rather than a round number. */
  isVisibility: boolean;
}

/** Next marker for a challenge total. The first is always the board visibility threshold. */
export function nextMarker(total: number, publicMin: number): Marker {
  const ladder = [publicMin, ...MARKERS.filter((m) => m > publicMin)];
  let target = ladder.find((m) => m > total);
  if (target === undefined) target = (Math.floor(total / 1_000_000) + 1) * 1_000_000;
  const below = ladder.filter((m) => m <= total);
  const previous = below.length ? below[below.length - 1] : 0;
  const floor = total >= 1_000_000 ? Math.max(previous, Math.floor(total / 1_000_000) * 1_000_000) : previous;
  return {
    previous: floor,
    target,
    remaining: target - total,
    fraction: Math.min(1, Math.max(0, (total - floor) / (target - floor))),
    isVisibility: target === publicMin,
  };
}

/**
 * Honest wording about the public threshold: other walkers only see you once
 * your challenge total reaches it, and nobody is shown in the final weeks.
 */
export function visibilityCue(phase: Phase, total: number, publicMin: number): string | null {
  const min = publicMin.toLocaleString("en-AU");
  const reached = total >= publicMin;
  switch (phase) {
    case "upcoming":
      return null;
    case "open":
      return reached
        ? `You've reached ${min} steps, so other walkers can see you on the board.`
        : `${(publicMin - total).toLocaleString("en-AU")} more steps and other walkers can see you on the board (it shows totals of ${min}+).`;
    case "final-weeks":
      return reached
        ? `You've reached ${min} steps, so you'll appear in the final standings.`
        : `Reach ${min} steps to appear in the final standings.`;
    case "ended":
      return reached
        ? `You finished with at least ${min} steps and appear in the final standings.`
        : `The final standings only show totals of ${min}+ steps.`;
  }
}

export interface RankCue {
  /** "=2" style label for a shared rank, otherwise the plain number. */
  label: string;
  /** Screen-reader wording, e.g. "Tied 2nd". */
  spoken: string;
  tied: boolean;
}

export function rankCue(row: RankRow, rows: readonly RankRow[], ordinal: (n: number) => string): RankCue {
  const tied = rows.some((r) => r !== row && r.rank === row.rank);
  return {
    label: tied ? `=${row.rank}` : String(row.rank),
    spoken: tied ? `Tied ${ordinal(row.rank)}` : ordinal(row.rank),
    tied,
  };
}

export type ChaseCue =
  | { kind: "leading"; by: number }
  | { kind: "tied-first" }
  | { kind: "tied"; with: number }
  | { kind: "behind"; name: string; by: number };

/**
 * Where "you" sit relative to the row ahead, using only rows the server
 * returned. Null when you're not on the board or alone on it.
 */
export function chaseCue(rows: readonly RankRow[]): ChaseCue | null {
  const meIndex = rows.findIndex((r) => r.isMe);
  if (meIndex < 0 || rows.length < 2) return null;
  const me = rows[meIndex];
  const sharing = rows.filter((r) => r !== me && r.rank === me.rank).length;
  if (me.rank === 1) {
    if (sharing > 0) return { kind: "tied-first" };
    return { kind: "leading", by: me.value - rows.find((r) => r !== me)!.value };
  }
  if (sharing > 0) return { kind: "tied", with: sharing };
  const ahead = [...rows.slice(0, meIndex)].reverse().find((r) => r.value > me.value)!;
  return { kind: "behind", name: ahead.name, by: ahead.value - me.value };
}

/** "12k", "1.2M": compact axis labels. */
export function compactSteps(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(n);
}
