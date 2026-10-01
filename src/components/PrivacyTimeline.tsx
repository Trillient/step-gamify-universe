import { CHALLENGE_END, CHALLENGE_START, FINAL_WEEKS_START, FIRST_HIDDEN_WEEK, PUBLIC_MIN_STEPS, WEEK_COUNT, addDays } from "@shared/challenge";
import { fmtDay } from "@/lib/format";

/**
 * The three privacy windows drawn as a 12-week strip with plain-language
 * captions. Dates come from the shared challenge calendar.
 */
const PrivacyTimeline = () => {
  const openWeeks = FIRST_HIDDEN_WEEK - 1;
  const hiddenWeeks = WEEK_COUNT - openWeeks;
  const min = PUBLIC_MIN_STEPS.toLocaleString("en-AU");
  const lastOpenDay = addDays(FINAL_WEEKS_START, -1);
  const revealDay = addDays(CHALLENGE_END, 1);

  const stages = [
    {
      when: `${fmtDay(CHALLENGE_START)} to ${fmtDay(lastOpenDay)}`,
      what: `Weeks 1 to ${openWeeks}. Walkers appear on the board once their total reaches ${min} steps.`,
      swatch: "bg-primary",
    },
    {
      when: `${fmtDay(FINAL_WEEKS_START)} to ${fmtDay(CHALLENGE_END)}`,
      what: `The final ${hiddenWeeks} weeks are blind. You only see your own steps, so the finish is a surprise.`,
      swatch: "bg-highlight-foreground/70",
    },
    {
      when: `From ${fmtDay(revealDay)}`,
      what: "Final standings are revealed to everyone.",
      swatch: "bg-foreground/70",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: WEEK_COUNT }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full ${i < openWeeks ? "bg-primary/80" : "bg-highlight-foreground/40"}`}
          />
        ))}
      </div>
      <ol className="space-y-3">
        {stages.map((s) => (
          <li key={s.when} className="flex gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.swatch}`} aria-hidden />
            <p className="text-sm leading-relaxed">
              <span className="font-medium">{s.when}.</span>{" "}
              <span className="text-muted-foreground">{s.what}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default PrivacyTimeline;
