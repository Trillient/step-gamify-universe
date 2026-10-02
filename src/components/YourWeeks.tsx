import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import WeekPicker from "./WeekPicker";

interface Props {
  challenge: ChallengeInfo;
  entries: OwnEntry[] | undefined;
  autosave: AutosaveQueue;
  /** Jump to Home with this week ready to edit. */
  onOpenWeek: (week: number) => void;
}

/** All twelve weeks with their dates and what you logged. Tap a started week to edit it. */
const YourWeeks = ({ challenge: c, entries, autosave, onOpenWeek }: Props) => {
  const writable = c.phase === "open" || c.phase === "final-weeks";
  const server = new Map((entries ?? []).map((e) => [e.week, e.steps]));

  return (
    <section className="surface space-y-4 p-6" aria-labelledby="weeks-heading">
      <div className="space-y-1">
        <h2 id="weeks-heading" className="text-xl font-bold tracking-tight">
          Your weeks
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          {writable ? "Tap a week to update it." : "Everything you logged, week by week."}
        </p>
      </div>
      <WeekPicker
        periods={c.periods}
        today={c.today}
        selected={null}
        valueOf={(w) => autosave.latest(w) ?? server.get(w)}
        statusOf={(w) => autosave.statusOf(w)}
        onSelect={writable ? onOpenWeek : undefined}
      />
    </section>
  );
};

export default YourWeeks;
