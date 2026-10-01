import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { EyeOff, Users } from "lucide-react";
import type { ChallengeInfo, Leaderboard as LeaderboardData } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { rankRows, startedPeriods } from "@/lib/steps";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ErrorNote from "./ErrorNote";

interface Props {
  challenge: ChallengeInfo;
  board: UseQueryResult<LeaderboardData>;
}

/**
 * Shows exactly what the server returned. Privacy is enforced server-side;
 * this only explains why other walkers may be missing.
 */
const Leaderboard = ({ challenge: c, board }: Props) => {
  const [view, setView] = useState<"total" | number>("total");
  const weeks = startedPeriods(c.periods, c.today);
  const data = board.data;
  const ranked = data ? rankRows(data.rows, (r) => (view === "total" ? r.total : r.weeks[String(view)])) : [];
  const top = ranked[0]?.value ?? 0;
  const othersShown = ranked.some((r) => !r.isMe);
  const min = fmtSteps(c.publicMinSteps);

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="board-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="board-heading" className="text-lg font-semibold tracking-tight">
          {c.phase === "ended" ? "Final standings" : "Leaderboard"}
        </h2>
        {weeks.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only sm:not-sr-only">Show</span>
            <select
              className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9"
              value={String(view)}
              onChange={(e) => setView(e.target.value === "total" ? "total" : Number(e.target.value))}
            >
              <option value="total">Overall</option>
              {weeks.map((p) => (
                <option key={p.week} value={p.week}>
                  Week {p.week}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {c.phase === "upcoming" && (
        <Note icon={Users}>The board opens on {fmtDay(c.start)}.</Note>
      )}
      {c.phase === "final-weeks" && (
        <Note icon={EyeOff} tone="highlight">
          The final weeks are blind. Only your own steps show here until the standings are revealed after{" "}
          {fmtDay(c.end)}.
        </Note>
      )}

      <div className="mt-4">
        {board.isLoading && (
          <div className="space-y-2" aria-busy="true" aria-label="Loading leaderboard">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        )}
        {board.isError && !data && (
          <ErrorNote message="Could not load the leaderboard." onRetry={() => board.refetch()} />
        )}

        {data && ranked.length > 0 && (
          <ol className="space-y-1.5">
            {ranked.map((r) => (
              <li
                key={r.id}
                className={cn("rounded-lg px-3 py-2.5", r.isMe ? "bg-brand-soft" : "bg-muted/50")}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      r.rank === 1 && othersShown ? "bg-highlight-foreground text-highlight" : "bg-card text-muted-foreground",
                    )}
                  >
                    {othersShown ? (
                      <>
                        <span className="sr-only">Rank </span>
                        {r.rank}
                      </>
                    ) : (
                      // alone on the board: a rank of 1 would mislead
                      <span aria-hidden>{r.name.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {r.name}
                    {r.isMe && <span className="ml-1.5 text-xs font-normal text-brand-soft-foreground">(you)</span>}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{fmtSteps(r.value)}</span>
                </div>
                <div className="ml-10 mt-1.5 h-1 overflow-hidden rounded-full bg-card" aria-hidden>
                  <div
                    className={cn("h-full rounded-full", r.isMe ? "bg-primary" : "bg-primary/45")}
                    style={{ width: `${top > 0 ? Math.max((r.value / top) * 100, r.value > 0 ? 2 : 0) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}

        {data && ranked.length === 0 && c.phase !== "upcoming" && (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {view === "total" ? "No steps on the board yet." : `Nothing logged for week ${view} yet.`}
            {c.phase === "open" && ` Walkers appear once their total reaches ${min}.`}
          </p>
        )}

        {data && ranked.length > 0 && (c.phase === "open" || c.phase === "ended") && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {!othersShown
              ? c.phase === "open"
              ? `You're the only one showing so far. Others appear once their total reaches ${min} steps.`
                : `Nobody else reached ${min} steps.`
              : c.phase === "open"
              ? `Only walkers with at least ${min} steps are shown.`
                : `Everyone who reached ${min} steps.`}
          </p>
        )}
      </div>
    </section>
  );
};

const Note = ({
  icon: Icon,
  tone = "muted",
  children,
}: {
  icon: typeof Users;
  tone?: "muted" | "highlight";
  children: React.ReactNode;
}) => (
  <p
    className={cn(
      "mt-4 flex gap-2.5 rounded-lg px-3 py-2.5 text-sm leading-relaxed",
      tone === "highlight" ? "bg-highlight text-highlight-foreground" : "bg-muted text-muted-foreground",
    )}
  >
    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
    <span>{children}</span>
  </p>
);

export default Leaderboard;
