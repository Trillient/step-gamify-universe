import { EyeOff, Eye, Flag, Hourglass } from "lucide-react";
import type { ChallengeInfo } from "@/lib/api";
import { fmtDay } from "@/lib/format";

const StatusBanner = ({ challenge: c }: { challenge: ChallengeInfo }) => {
  const week = c.currentWeek ? c.periods[c.currentWeek - 1] : null;
  let Icon = Eye;
  let title = "";
  let body = "";

  switch (c.phase) {
    case "upcoming":
      Icon = Hourglass;
      title = `Starts ${fmtDay(c.start)}`;
      body = "Entries open on the first day of the challenge.";
      break;
    case "open":
      title = `Week ${c.currentWeek} of ${c.periods.length}`;
      body = `Other walkers' weekly totals show here once they reach ${c.publicMinSteps.toLocaleString("en-AU")} steps.`;
      break;
    case "final-weeks":
      Icon = EyeOff;
      title = `Week ${c.currentWeek}: final four weeks`;
      body = `Since ${fmtDay(c.finalWeeksStart)} other walkers' steps are hidden. Keep logging, the standings are revealed after ${fmtDay(c.end)}.`;
      break;
    case "ended":
      Icon = Flag;
      title = "The challenge has finished";
      body = "Entries are closed. Qualifying totals from everyone are now shown.";
      break;
  }

  return (
    <section className="flex gap-3 rounded-xl border bg-white/80 dark:bg-gray-900/80 p-4" aria-live="polite">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {body}
          {week && c.phase !== "ended" && ` This week: ${fmtDay(week.start)} to ${fmtDay(week.end)}.`}
        </p>
      </div>
    </section>
  );
};

export default StatusBanner;
