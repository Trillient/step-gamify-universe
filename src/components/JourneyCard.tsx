import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import { fmtSteps } from "@/lib/format";
import { nextMarker, visibilityCue } from "@/lib/progress";
import { ownTotals, sumValues } from "@/lib/steps";

interface Props {
  challenge: ChallengeInfo;
  entries: OwnEntry[] | undefined;
  autosave: AutosaveQueue;
}

/** Your challenge total and how close you are to the next marker. */
const JourneyCard = ({ challenge: c, entries, autosave }: Props) => {
  if (c.phase === "upcoming" || !entries) return null;

  const own = ownTotals(entries, (w) => autosave.confirmedValue(w), c.periods.length);
  const total = sumValues(own);
  const marker = nextMarker(total, c.publicMinSteps);
  // share of the next target, so the number and bar read naturally (113k of 250k = 45%)
  const percent = Math.min(100, Math.floor((total / marker.target) * 100));
  const cue = visibilityCue(c.phase, total, c.publicMinSteps);

  return (
    <section className="surface space-y-4 p-6" aria-labelledby="journey-heading">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="journey-heading" className="eyebrow mb-1">
            Your journey
          </h2>
          <p className="big-number truncate text-3xl">
            {fmtSteps(total)} <span className="text-lg font-medium tracking-normal text-muted-foreground">steps</span>
          </p>
        </div>
        <p className="mb-1 shrink-0 text-right text-xl font-black text-primary">
          {percent}%<span className="block text-[11px] font-bold text-muted-foreground">of {fmtSteps(marker.target)}</span>
        </p>
      </div>
      <div
        className="relative h-5 w-full overflow-hidden rounded-full bg-secondary shadow-inner"
        role="progressbar"
        aria-label={`Progress to ${fmtSteps(marker.target)} steps`}
        aria-valuemin={0}
        aria-valuemax={marker.target}
        aria-valuenow={total}
        aria-valuetext={`${fmtSteps(total)} of ${fmtSteps(marker.target)} steps`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-1000 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-center text-sm font-semibold text-muted-foreground">
        {fmtSteps(marker.remaining)} to go{marker.isVisibility ? " until you show up on the board" : ` to ${fmtSteps(marker.target)}`}
      </p>
      {cue && <p className="text-center text-xs leading-relaxed text-muted-foreground">{cue}</p>}
    </section>
  );
};

export default JourneyCard;
