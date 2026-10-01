/**
 * Challenge calendar and privacy rules. Pure functions, shared by the API
 * (which enforces them) and the UI (which only explains them).
 *
 * All dates are calendar dates ("YYYY-MM-DD") in the challenge time zone, so
 * the period maths never depends on the machine's local zone or on DST.
 */

export const CHALLENGE_START = "2026-10-01";
export const CHALLENGE_END = "2026-12-20"; // inclusive
export const WEEK_COUNT = 12;
/** Weeks 9-12 (from 2026-11-26): other participants' data is not returned. */
export const FIRST_HIDDEN_WEEK = 9;
/** Another participant's challenge total must be at least this to be shown. */
export const PUBLIC_MIN_STEPS = 1000;
export const MAX_WEEKLY_STEPS = 1_000_000;
export const DEFAULT_TIME_ZONE = "Australia/Brisbane";

export interface Period {
  week: number;
  start: string;
  end: string;
  days: number;
}

export type Phase = "upcoming" | "open" | "final-weeks" | "ended";

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`invalid date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Calendar date of an instant in the given IANA time zone. */
export function dateInZone(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function buildPeriods(): Period[] {
  const out: Period[] = [];
  for (let week = 1; week <= WEEK_COUNT; week++) {
    const start = addDays(CHALLENGE_START, (week - 1) * 7);
    const end = week === WEEK_COUNT ? CHALLENGE_END : addDays(start, 6);
    out.push({ week, start, end, days: (toUtcMs(end) - toUtcMs(start)) / DAY_MS + 1 });
  }
  return out;
}

export const PERIODS: readonly Period[] = Object.freeze(buildPeriods());

export const FINAL_WEEKS_START: string = PERIODS[FIRST_HIDDEN_WEEK - 1].start;

export function getPeriod(week: number): Period | undefined {
  return Number.isInteger(week) ? PERIODS[week - 1] : undefined;
}

/** Week containing `today`, or null outside the challenge. */
export function currentWeek(today: string): number | null {
  const p = PERIODS.find((x) => today >= x.start && today <= x.end);
  return p ? p.week : null;
}

export function phaseFor(today: string): Phase {
  if (today < CHALLENGE_START) return "upcoming";
  if (today > CHALLENGE_END) return "ended";
  if (today >= FINAL_WEEKS_START) return "final-weeks";
  return "open";
}

/** Entries may be written once their week has started, until the end date. */
export function canSubmitWeek(week: number, today: string): boolean {
  const p = getPeriod(week);
  return !!p && today >= p.start && today <= CHALLENGE_END;
}

/** True while other participants' data must not be returned at all. */
export function othersHidden(today: string): boolean {
  const phase = phaseFor(today);
  return phase === "upcoming" || phase === "final-weeks";
}

export function isPublicTotal(steps: number): boolean {
  return steps >= PUBLIC_MIN_STEPS;
}
