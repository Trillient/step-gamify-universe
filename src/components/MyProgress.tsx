import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import { fmtSteps } from "@/lib/format";
import { ownTotals, sumValues, weekState } from "@/lib/steps";
import { cn } from "@/lib/utils";

interface Props {
  challenge: ChallengeInfo;
  entries: OwnEntry[] | undefined;
  autosave: AutosaveQueue;
}

/** Twelve columns, one per week, drawn with CSS so it scales to any width. */
const MyProgress = ({ challenge: c, entries, autosave }: Props) => {
  if (c.phase === "upcoming" || !entries) return null;

  const own = ownTotals(entries, (w) => autosave.confirmedValue(w), c.periods.length);
  const max = Math.max(0, ...own.values());
  const best = [...own.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const average = own.size > 0 ? Math.round(sumValues(own) / own.size) : 0;

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="progress-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="progress-heading" className="text-lg font-semibold tracking-tight">
          Week by week
        </h2>
        {best && (
          <p className="text-sm text-muted-foreground">
            Best: week {best[0]}, {fmtSteps(best[1])} · Average {fmtSteps(average)}
          </p>
        )}
      </div>

      {own.size === 0 && (
        <p className="mt-1 text-sm text-muted-foreground">Your weekly totals will show here once you log a week.</p>
      )}

      <ol className="mt-5 flex h-40 items-end gap-1 sm:gap-2" aria-label="Your steps per week">
        {c.periods.map((p) => {
          const value = own.get(p.week);
          const state = weekState(p, c.today);
          const height = value !== undefined && max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
          const isBest = best !== undefined && best[0] === p.week && max > 0;
          return (
            <li key={p.week} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="sr-only">
                Week {p.week}:{" "}
                {state === "future" ? "not started" : value !== undefined ? `${fmtSteps(value)} steps` : "not logged"}
              </span>
              <div className="flex w-full flex-1 items-end" aria-hidden>
                {value !== undefined ? (
                  <div
                    className={cn(
                      "w-full rounded-t-md",
                      isBest ? "bg-primary" : "bg-primary/55",
                      value === 0 && "h-0.5 rounded-none bg-muted-foreground/40",
                    )}
                    style={value > 0 ? { height: `${height}%` } : undefined}
                    title={`Week ${p.week}: ${fmtSteps(value)} steps`}
                  />
                ) : (
                  <div className={cn("h-0.5 w-full", state === "future" ? "trail" : "bg-border")} />
                )}
              </div>
              <span
                aria-hidden
                className={cn(
                  "text-[11px] tabular-nums leading-none",
                  state === "current" ? "font-semibold text-highlight-foreground" : "text-muted-foreground",
                )}
              >
                {p.week}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default MyProgress;
