import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import { fmtSteps } from "@/lib/format";
import { momentum, nextMarker, streaks, visibilityCue, weeklySeries } from "@/lib/progress";
import { ownTotals, plural, sumValues } from "@/lib/steps";
import { cn } from "@/lib/utils";
import type { ChartMode } from "./WeeklyChart";

// recharts is only needed once there is something to draw
const WeeklyChart = lazy(() => import("./WeeklyChart"));

interface Props {
  challenge: ChallengeInfo;
  entries: OwnEntry[] | undefined;
  autosave: AutosaveQueue;
}

function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Weekly chart plus a few quiet, data-derived rewards: streak, best week, next marker. */
const MyProgress = ({ challenge: c, entries, autosave }: Props) => {
  const [mode, setMode] = useState<ChartMode>("weekly");
  const reducedMotion = usePrefersReducedMotion();
  if (c.phase === "upcoming" || !entries) return null;

  const own = ownTotals(entries, (w) => autosave.confirmedValue(w), c.periods.length);
  const total = sumValues(own);
  const points = weeklySeries(c.periods, c.today, own);
  const best = points.find((p) => p.isBest);
  const streak = streaks(c.periods, c.today, own);
  const trend = momentum(own);
  const marker = nextMarker(total, c.publicMinSteps);
  const visibility = visibilityCue(c.phase, total, c.publicMinSteps);

  const summary =
    own.size === 0
      ? "Nothing logged yet."
      : mode === "weekly"
        ? `${plural(own.size, "week")} logged.${best ? ` Best is week ${best.week} with ${fmtSteps(best.steps ?? 0)} steps.` : ""}`
        : `Running total ${fmtSteps(total)} steps across ${plural(own.size, "logged week")}.`;

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="progress-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="progress-heading" className="text-lg font-semibold tracking-tight">
          Your walk
        </h2>
        <div role="group" aria-label="Chart view" className="inline-flex rounded-lg bg-muted p-0.5 text-sm">
          {(
            [
              ["weekly", "Weekly"],
              ["running", "Running total"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "h-11 rounded-md px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8",
                mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
        {summary}
        {mode === "weekly" && trend && (
          <>
            {" "}
            Week {trend.week} is{" "}
            {trend.changePct === 0
              ? "level with"
              : `${Math.abs(trend.changePct)}% ${trend.changePct > 0 ? "above" : "below"}`}{" "}
            your earlier average.
          </>
        )}
      </p>

      <div className="mt-4 h-48 sm:h-56">
        <Suspense fallback={<div className="h-full rounded-lg bg-muted/50" aria-hidden />}>
          <WeeklyChart points={points} periods={c.periods} mode={mode} animate={!reducedMotion} />
        </Suspense>
      </div>

      <details className="group mt-2 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8">
          Show as a table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-1.5 pr-3 font-medium">Week</th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">Steps</th>
                <th scope="col" className="py-1.5 text-right font-medium">Running total</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.week} className="border-b last:border-0">
                  <th scope="row" className="py-1.5 pr-3 font-normal">
                    {p.week}
                    {p.state === "current" && <span className="text-muted-foreground"> (this week)</span>}
                  </th>
                  <td className="py-1.5 pr-3 text-right">
                    {p.steps !== null ? fmtSteps(p.steps) : p.state === "future" ? "Not started" : "Not logged"}
                    {p.isBest && <span className="text-muted-foreground"> (best)</span>}
                  </td>
                  <td className="py-1.5 text-right">{p.cumulative !== null ? fmtSteps(p.cumulative) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <dl className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
        <Reward
          label="Streak"
          value={streak.current > 0 ? plural(streak.current, "week") : "–"}
          detail={
            streak.awaitingThisWeek
              ? "Log this week to keep it going"
              : streak.current > 0
                ? streak.longest > streak.current
                  ? `Longest ${plural(streak.longest, "week")}`
                  : "Weeks logged in a row"
                : own.size > 0
                  ? "Log the latest week to start one"
                  : "Log a week to start one"
          }
        />
        <Reward
          label="Personal best"
          value={best ? fmtSteps(best.steps ?? 0) : "–"}
          detail={best ? `Week ${best.week}` : "Your top week shows here"}
        />
        <Reward
          label="Average week"
          value={own.size > 0 ? fmtSteps(Math.round(total / own.size)) : "–"}
          detail={own.size > 0 ? `Across ${plural(own.size, "logged week")}` : "Shows once you log a week"}
        />
      </dl>

      <div className="mt-4 rounded-lg bg-muted/60 px-3 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
          <span className="font-medium">
            {marker.isVisibility ? "Next: show on the board" : `Next marker: ${fmtSteps(marker.target)}`}
          </span>
          <span className="tabular-nums text-muted-foreground">{fmtSteps(marker.remaining)} to go</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-card"
          role="progressbar"
          aria-label={`Progress to ${fmtSteps(marker.target)} steps`}
          aria-valuemin={marker.previous}
          aria-valuemax={marker.target}
          aria-valuenow={total}
          aria-valuetext={`${fmtSteps(total)} of ${fmtSteps(marker.target)} steps`}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${marker.fraction * 100}%` }} />
        </div>
        {visibility && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{visibility}</p>}
      </div>
    </section>
  );
};

const Reward = ({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) => (
  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 sm:block">
    <dt className="eyebrow row-span-2">{label}</dt>
    <dd className="truncate text-right text-lg font-semibold tabular-nums tracking-tight sm:mt-1 sm:text-left">{value}</dd>
    <dd className="truncate text-right text-xs text-muted-foreground sm:text-left">{detail}</dd>
  </div>
);

export default MyProgress;
