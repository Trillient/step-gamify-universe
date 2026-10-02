import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { daysBetween, ownTotals, plural, sumValues } from "@/lib/steps";

interface Props {
  challenge: ChallengeInfo;
  entries: OwnEntry[] | undefined;
  autosave: AutosaveQueue;
}

/** The big rose card at the top of Stats: your total and where the challenge is up to. */
const StatsHero = ({ challenge: c, entries, autosave }: Props) => {
  const own = ownTotals(entries, (w) => autosave.confirmedValue(w), c.periods.length);
  const total = sumValues(own);
  const loggedDays = [...own.keys()].reduce((days, w) => days + (c.periods[w - 1]?.days ?? 0), 0);
  const perDay = loggedDays > 0 ? Math.round(total / loggedDays) : null;

  const totalDays = daysBetween(c.start, c.end) + 1;
  const dayNumber = Math.min(Math.max(daysBetween(c.start, c.today) + 1, 0), totalDays);
  const daysLeft = Math.max(daysBetween(c.today, c.end) + 1, 0);
  const percent = Math.round((dayNumber / totalDays) * 100);

  return (
    <section
      className="space-y-3 rounded-[2rem] bg-gradient-to-br from-rose-600 to-rose-800 p-6 text-center text-white shadow-lg shadow-rose-500/20"
      aria-labelledby="hero-heading"
    >
      <h2 id="hero-heading" className="text-sm font-bold uppercase tracking-widest text-white/90">
        Your total
      </h2>
      <p className="big-number text-5xl tracking-tighter">{entries ? fmtSteps(total) : "…"}</p>
      <p className="text-sm font-semibold text-white/90">
        {perDay !== null ? `About ${fmtSteps(perDay)} steps a day` : "Log a week to see your daily average"}
      </p>

      {c.phase !== "upcoming" && (
        <div className="space-y-1.5 pt-2">
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-black/20"
            role="progressbar"
            aria-label="Challenge progress"
            aria-valuemin={0}
            aria-valuemax={totalDays}
            aria-valuenow={dayNumber}
            aria-valuetext={`Day ${dayNumber} of ${totalDays}`}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs font-bold text-white/90">
            {c.phase === "ended"
              ? `Finished ${fmtDay(c.end)}`
              : `Day ${dayNumber} of ${totalDays} · ${daysLeft === 1 ? "last day" : `${plural(daysLeft, "day")} left`}`}
          </p>
        </div>
      )}
    </section>
  );
};

export default StatsHero;
