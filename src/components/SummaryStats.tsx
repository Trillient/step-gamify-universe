import type { ReactNode } from "react";
import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, Leaderboard, OwnEntry } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { ordinal, ownTotals, rankRows, startedPeriods, sumValues } from "@/lib/steps";

interface Props {
  challenge: ChallengeInfo;
  entries: OwnEntry[] | undefined;
  board: Leaderboard | undefined;
  boardFailed: boolean;
  autosave: AutosaveQueue;
}

const Stat = ({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) => (
  <div className="surface min-w-0 p-4 sm:p-5">
    <dt className="eyebrow">{label}</dt>
    <dd className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem]">{value}</dd>
    <dd className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{detail}</dd>
  </div>
);

const Loading = () => <span className="text-muted-foreground">…</span>;

/** Four headline numbers: total, weeks logged, this week, rank. */
const SummaryStats = ({ challenge: c, entries, board, boardFailed, autosave }: Props) => {
  const own = ownTotals(entries, (w) => autosave.confirmedValue(w), c.periods.length);
  const total = sumValues(own);
  const started = startedPeriods(c.periods, c.today);
  const loggedDays = [...own.keys()].reduce((days, w) => days + (c.periods[w - 1]?.days ?? 0), 0);
  const perDay = loggedDays > 0 ? Math.round(total / loggedDays) : null;

  const thisWeek = c.currentWeek ? own.get(c.currentWeek) : undefined;
  const best = [...own.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  let rankValue: ReactNode = <Loading />;
  let rankDetail: ReactNode = "Checking the board";
  if (c.phase === "upcoming") {
    rankValue = "–";
    rankDetail = `Board opens ${fmtDay(c.start)}`;
  } else if (c.phase === "final-weeks" || board?.othersHidden) {
    rankValue = "Hidden";
    rankDetail = `Revealed after ${fmtDay(c.end)}`;
  } else if (!board && boardFailed) {
    rankValue = "–";
    rankDetail = "Board unavailable";
  } else if (board) {
    const ranked = rankRows(board.rows, (r) => r.total);
    const me = ranked.find((r) => r.isMe);
    rankValue = me ? ordinal(me.rank) : "–";
    rankDetail = !me
      ? "Log steps to join the board"
      : ranked.length === 1
        ? "Only you on the board so far"
        : `of ${ranked.length} ${c.phase === "ended" ? "finishers" : "on the board"}`;
  }

  return (
    <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Your summary">
      <Stat
        label="Your total"
        value={entries ? fmtSteps(total) : <Loading />}
        detail={perDay !== null ? `About ${fmtSteps(perDay)} a day` : "Steps logged so far"}
      />
      <Stat
        label="Weeks logged"
        value={entries ? `${own.size} of ${started.length || c.periods.length}` : <Loading />}
        detail={
          started.length === 0
            ? `${c.periods.length} weeks in total`
            : own.size >= started.length
              ? "All caught up"
              : `${started.length - own.size} still to log`
        }
      />
      {c.currentWeek ? (
        <Stat
          label={`Week ${c.currentWeek}`}
          value={thisWeek !== undefined ? fmtSteps(thisWeek) : "–"}
          detail={thisWeek !== undefined ? "Logged this week" : "Not logged yet"}
        />
      ) : (
        <Stat
          label="Best week"
          value={best ? fmtSteps(best[1]) : "–"}
          detail={best ? `Week ${best[0]}` : "Nothing logged yet"}
        />
      )}
      <Stat label="Your rank" value={rankValue} detail={rankDetail} />
    </dl>
  );
};

export default SummaryStats;
