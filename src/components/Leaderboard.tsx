import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ChallengeInfo, Leaderboard as LeaderboardData } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { chaseCue, rankCue } from "@/lib/progress";
import { ordinal, plural, rankRows, startedPeriods } from "@/lib/steps";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ErrorNote from "./ErrorNote";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

// Friendly avatar colours, picked from the walker's id so they stay stable.
const AVATARS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
] as const;

const avatarFor = (id: string) => AVATARS[[...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATARS.length];

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
  const othersShown = ranked.some((r) => !r.isMe);
  const chase = othersShown ? chaseCue(ranked) : null;
  const scope = view === "total" ? "overall" : `in week ${view}`;
  const min = fmtSteps(c.publicMinSteps);

  return (
    <section className="space-y-4 pt-2" aria-labelledby="board-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        <h2 id="board-heading" className="text-xl font-bold tracking-tight">
          {c.phase === "ended" ? "Final standings" : "Leaderboard"}
        </h2>
        {weeks.length > 0 && (
          <label className="flex items-center">
            <span className="sr-only">Show</span>
            <select
              className="h-11 rounded-2xl border bg-card px-3 text-sm font-bold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <Callout emoji="⏳" title="Not long now">
          The board opens on {fmtDay(c.start)}.
        </Callout>
      )}
      {c.phase === "final-weeks" && (
        <Callout emoji="🫣" title="The final stretch!">
          Everyone else is hidden from {fmtDay(c.finalWeeksStart)} to {fmtDay(c.end)}. Keep walking: the big reveal is
          after {fmtDay(c.end)}.
        </Callout>
      )}

      {board.isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading leaderboard">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
          ))}
        </div>
      )}
      {board.isError && !data && <ErrorNote message="Could not load the leaderboard." onRetry={() => board.refetch()} />}

      {data && ranked.length > 0 && (
        <ol className="flex flex-col gap-3">
          {ranked.map((r) => {
            const cue = rankCue(r, ranked, ordinal);
            const podium = othersShown && r.rank <= 3;
            const leader = othersShown && r.rank === 1;
            return (
              <li
                key={r.id}
                aria-current={r.isMe ? "true" : undefined}
                className={cn(
                  "flex items-center rounded-2xl border p-4 shadow-sm",
                  leader ? "border-primary/20 bg-primary/10" : "bg-card",
                  r.isMe && !leader && "ring-2 ring-inset ring-primary/30",
                )}
              >
                <div className="w-9 shrink-0 text-sm font-black text-muted-foreground">
                  {othersShown ? (
                    <>
                      <span className="sr-only">{cue.spoken}</span>
                      <span aria-hidden className={cn(podium && "text-2xl")}>
                        {podium ? MEDALS[r.rank - 1] : `${cue.label}.`}
                      </span>
                    </>
                  ) : (
                    // alone on the board: a rank of 1 would mislead
                    <span aria-hidden>–</span>
                  )}
                </div>
                <div
                  aria-hidden
                  className={cn(
                    "mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-card text-base font-black shadow-sm",
                    r.isMe ? "bg-brand-soft text-brand-soft-foreground" : avatarFor(r.id),
                  )}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    <span className="truncate">{r.name}</span>
                    {r.isMe && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-black text-primary-foreground">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-muted-foreground">{fmtSteps(r.value)} steps</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {chase && (
        <p className="px-2 text-sm font-semibold text-muted-foreground">
          {chase.kind === "leading" && <>You're leading {scope} by {fmtSteps(chase.by)} steps. 🔥</>}
          {chase.kind === "tied-first" && <>You're sharing first place {scope}.</>}
          {chase.kind === "tied" && <>You're level with {plural(chase.with, "other walker")} {scope}.</>}
          {chase.kind === "behind" && (
            <>
              {fmtSteps(chase.by)} steps behind {chase.name} {scope}. You've got this.
            </>
          )}
        </p>
      )}

      {data && ranked.length === 0 && c.phase !== "upcoming" && c.phase !== "final-weeks" && (
        <p className="rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm font-medium text-muted-foreground">
          {view === "total" ? "No steps on the board yet." : `Nothing logged for week ${view} yet.`}
          {c.phase === "open" && ` Walkers appear once their total reaches ${min}.`}
        </p>
      )}

      {data && ranked.length > 0 && (c.phase === "open" || c.phase === "ended") && (
        <p className="px-2 text-xs leading-relaxed text-muted-foreground">
          {!othersShown
            ? c.phase === "open"
              ? `You're the only one showing so far. Others appear once their total reaches ${min} steps.`
              : `Nobody else reached ${min} steps.`
            : c.phase === "open"
              ? `Only walkers with at least ${min} steps are shown.`
              : `Everyone who reached ${min} steps.`}
        </p>
      )}
    </section>
  );
};

const Callout = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
  <div className="surface space-y-3 p-8 text-center">
    <div className="text-5xl" aria-hidden>
      {emoji}
    </div>
    <h3 className="text-lg font-bold">{title}</h3>
    <p className="text-sm font-medium text-muted-foreground">{children}</p>
  </div>
);

export default Leaderboard;
