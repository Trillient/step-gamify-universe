import type { ChallengeInfo } from "@/lib/api";
import { fmtDay } from "@/lib/format";
import { daysBetween, phaseCopy } from "@/lib/steps";
import { cn } from "@/lib/utils";

/** Where we are in the challenge, what other walkers can see, and how far along it is. */
const StatusBanner = ({ challenge: c }: { challenge: ChallengeInfo }) => {
  const copy = phaseCopy(c, fmtDay);
  const totalDays = daysBetween(c.start, c.end) + 1;
  const dayNumber = Math.min(Math.max(daysBetween(c.start, c.today) + 1, 0), totalDays);
  const percent = Math.round((dayNumber / totalDays) * 100);
  const blind = c.phase === "final-weeks";

  return (
    <section
      className={cn(
        "rounded-[2rem] border p-5 shadow-sm",
        blind ? "border-primary/20 bg-primary/10" : "bg-card",
      )}
      aria-labelledby="phase-title"
    >
      <h2 id="phase-title" className="text-2xl font-black tracking-tight">
        {blind && <span aria-hidden>🤫 </span>}
        {copy.title}
      </h2>
      <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">{copy.body}</p>

      {c.phase !== "upcoming" && (
        <div className="mt-4 space-y-1.5">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Challenge progress"
            aria-valuemin={0}
            aria-valuemax={totalDays}
            aria-valuenow={dayNumber}
            aria-valuetext={`Day ${dayNumber} of ${totalDays}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>{fmtDay(c.start)}</span>
            <span>{c.phase === "ended" ? "Finished" : `Day ${dayNumber} of ${totalDays}`}</span>
            <span>{fmtDay(c.end)}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default StatusBanner;
