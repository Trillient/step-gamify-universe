import { Eye, EyeOff, Flag, Hourglass } from "lucide-react";
import type { ChallengeInfo } from "@/lib/api";
import { fmtDay } from "@/lib/format";
import { daysBetween, phaseCopy } from "@/lib/steps";

const ICONS = { upcoming: Hourglass, open: Eye, "final-weeks": EyeOff, ended: Flag } as const;

/** Where we are in the challenge, what other walkers can see, and how far along it is. */
const StatusBanner = ({ challenge: c }: { challenge: ChallengeInfo }) => {
  const copy = phaseCopy(c, fmtDay);
  const Icon = ICONS[c.phase];
  const totalDays = daysBetween(c.start, c.end) + 1;
  const dayNumber = Math.min(Math.max(daysBetween(c.start, c.today) + 1, 0), totalDays);
  const percent = Math.round((dayNumber / totalDays) * 100);
  const hidden = c.phase === "final-weeks" || c.phase === "upcoming";

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="phase-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 id="phase-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
            {copy.title}
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-medium ${
            hidden ? "bg-highlight text-highlight-foreground" : "bg-brand-soft text-brand-soft-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {copy.privacy}
        </span>
      </div>

      {c.phase !== "upcoming" && (
        <div className="mt-5 space-y-1.5">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Challenge progress"
            aria-valuemin={0}
            aria-valuemax={totalDays}
            aria-valuenow={dayNumber}
            aria-valuetext={`Day ${dayNumber} of ${totalDays}`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmtDay(c.start)}</span>
            <span>
              {c.phase === "ended" ? "Finished" : `Day ${dayNumber} of ${totalDays}`}
            </span>
            <span>{fmtDay(c.end)}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default StatusBanner;
