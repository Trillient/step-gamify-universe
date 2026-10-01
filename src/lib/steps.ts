/**
 * Pure UI helpers for step entry, the challenge calendar and the leaderboard.
 * The server enforces every rule; these only parse input and explain state.
 */
// relative so the strict node tsconfig (which typechecks tests/) resolves it too
import type { Period, Phase } from "../../shared/challenge";

export type ParsedSteps =
  | { kind: "empty" }
  | { kind: "invalid"; reason: "not-a-whole-number" | "too-large" }
  | { kind: "valid"; steps: number };

/**
 * Parse what the user typed. Blank is "empty" (never saved), 0 is valid.
 * Spaces and thousands separators are tolerated ("52,000", "52 000").
 */
export function parseSteps(raw: string, max: number): ParsedSteps {
  const cleaned = raw.trim().replace(/[\s,_]/g, "");
  if (cleaned === "") return { kind: "empty" };
  if (!/^\d+$/.test(cleaned)) return { kind: "invalid", reason: "not-a-whole-number" };
  const steps = Number(cleaned);
  if (!Number.isSafeInteger(steps) || steps > max) return { kind: "invalid", reason: "too-large" };
  return { kind: "valid", steps };
}

const DAY_MS = 86_400_000;
const toMs = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole calendar days from `from` to `to` ("YYYY-MM-DD"), negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-AU")} ${n === 1 ? one : many}`;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Weeks that have started (and so can hold an entry) as of `today`. */
export function startedPeriods(periods: readonly Period[], today: string): Period[] {
  return periods.filter((p) => p.start <= today);
}

export type WeekState = "future" | "current" | "past";

export function weekState(p: Period, today: string): WeekState {
  if (today < p.start) return "future";
  if (today <= p.end) return "current";
  return "past";
}

export interface RankRow {
  id: string;
  name: string;
  isMe: boolean;
  value: number;
  rank: number;
}

/**
 * Rank rows by `value` (descending, ties share a rank, name breaks display
 * order). Rows without a value for the chosen view are dropped.
 */
export function rankRows<T extends { id: string; name: string; isMe: boolean }>(
  rows: readonly T[],
  valueOf: (row: T) => number | undefined,
): RankRow[] {
  const withValue = rows
    .map((r) => ({ id: r.id, name: r.name, isMe: r.isMe, value: valueOf(r) }))
    .filter((r): r is Omit<RankRow, "rank"> => typeof r.value === "number")
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  let rank = 0;
  return withValue.map((r, i) => {
    if (i === 0 || r.value !== withValue[i - 1].value) rank = i + 1;
    return { ...r, rank };
  });
}

export interface PhaseCopy {
  title: string;
  body: string;
  /** Short label for the privacy state of other walkers. */
  privacy: string;
}

/** Plain-language explanation of the phase. `fmt` formats a date like "1 Oct". */
export function phaseCopy(
  c: {
    phase: Phase;
    today: string;
    start: string;
    end: string;
    finalWeeksStart: string;
    publicMinSteps: number;
    currentWeek: number | null;
    periods: readonly Period[];
  },
  fmt: (date: string) => string,
): PhaseCopy {
  const min = c.publicMinSteps.toLocaleString("en-AU");
  switch (c.phase) {
    case "upcoming": {
      const days = daysBetween(c.today, c.start);
      return {
        title: days === 1 ? "Starts tomorrow" : `Starts in ${plural(days, "day")}`,
        body: `The challenge runs ${fmt(c.start)} to ${fmt(c.end)}. You can log steps from the first day.`,
        privacy: "Nobody's steps are shown yet",
      };
    }
    case "open": {
      const period = c.currentWeek ? c.periods[c.currentWeek - 1] : undefined;
      const left = period ? daysBetween(c.today, period.end) + 1 : 0;
      return {
        title: `Week ${c.currentWeek} of ${c.periods.length}`,
        body: period
          ? `${fmt(period.start)} to ${fmt(period.end)}, ${left === 1 ? "last day" : `${plural(left, "day")} left`}. Other walkers appear once their total reaches ${min} steps.`
          : `Other walkers appear once their total reaches ${min} steps.`,
        privacy: `Walkers with ${min}+ steps are visible`,
      };
    }
    case "final-weeks": {
      const daysLeft = daysBetween(c.today, c.end) + 1;
      return {
        title: `Week ${c.currentWeek} of ${c.periods.length}: the final stretch`,
        body: `Since ${fmt(c.finalWeeksStart)} everyone's steps are hidden, so the result is a surprise. Keep logging: standings are revealed after ${fmt(c.end)} (${daysLeft === 1 ? "last day" : `${plural(daysLeft, "day")} to go`}).`,
        privacy: "Other walkers hidden until the end",
      };
    }
    case "ended":
      return {
        title: "The challenge has finished",
        body: `Entries closed on ${fmt(c.end)}. Final standings show everyone who reached ${min} steps.`,
        privacy: "Final standings revealed",
      };
  }
}

/**
 * Own saved totals by week: server entries, overlaid with any value the
 * server acknowledged later in this session (so a stale refetch can't make a
 * saved total appear to go backwards).
 */
export function ownTotals(
  entries: readonly { week: number; steps: number }[] | undefined,
  acknowledged: (week: number) => number | undefined,
  weekCount: number,
): Map<number, number> {
  const out = new Map<number, number>();
  for (const e of entries ?? []) out.set(e.week, e.steps);
  for (let week = 1; week <= weekCount; week++) {
    const v = acknowledged(week);
    if (v !== undefined) out.set(week, v);
  }
  return out;
}

export function sumValues(map: ReadonlyMap<number, number>): number {
  let total = 0;
  for (const v of map.values()) total += v;
  return total;
}
