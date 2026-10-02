import { useEffect, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, RotateCw } from "lucide-react";
import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { parseSteps, startedPeriods, weekState } from "@/lib/steps";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorNote from "./ErrorNote";

interface Props {
  challenge: ChallengeInfo;
  entries: UseQueryResult<{ entries: OwnEntry[] }>;
  autosave: AutosaveQueue;
  /** Week being edited (owned by the dashboard so Stats can jump to a week). */
  chosen: number | null;
  onSelect: (week: number) => void;
}

type View = "invalid" | "saving" | "error" | "saved" | "blank-kept" | "empty";

/** A small coral/amber burst. Loaded on demand, and skipped for reduced motion. */
function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  void import("canvas-confetti").then(({ default: confetti }) =>
    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 38,
      origin: { y: 0.45 },
      colors: ["#e0234a", "#ff8fa3", "#f6b73c", "#ffd98a"],
      disableForReducedMotion: true,
    }),
  );
}

/**
 * Step through the started weeks, type the total, pause: it saves. Enter, the
 * save button or leaving the field saves straight away. What the user is
 * typing always wins over refetched data for the selected week.
 */
const StepEntry = ({ challenge: c, entries, autosave, chosen, onSelect }: Props) => {
  const writable = c.phase === "open" || c.phase === "final-weeks";
  const started = startedPeriods(c.periods, c.today);
  const [draft, setDraft] = useState<{ week: number; text: string } | null>(null);

  const period = chosen ? c.periods[chosen - 1] : undefined;
  const server = new Map((entries.data?.entries ?? []).map((e) => [e.week, e.steps]));
  const valueOf = (week: number) => autosave.latest(week) ?? server.get(week);
  const first = started[0]?.week ?? 1;
  const last = started[started.length - 1]?.week ?? 1;

  if (!writable || !period) {
    return (
      <section className="surface p-6" aria-labelledby="log-heading">
        <h2 id="log-heading" className="text-xl font-bold tracking-tight">
          {c.phase === "upcoming" ? "Logging opens soon" : "Entries are closed"}
        </h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {c.phase === "upcoming"
            ? `You can log your first week from ${fmtDay(c.start)}. Each week opens on its first day.`
            : `Entries closed on ${fmtDay(c.end)}. Everything you logged is on the Stats tab.`}
        </p>
      </section>
    );
  }

  const isCurrent = weekState(period, c.today) === "current";

  return (
    <section className="surface flex flex-col gap-5 p-6" aria-labelledby="log-heading">
      <div className="space-y-1">
        <h2 id="log-heading" className="text-xl font-bold tracking-tight">
          {isCurrent ? "Log this week" : `Log week ${period.week}`}
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          One total per week. You can update any started week until {fmtDay(c.end)}.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-[2.5rem] border bg-background p-1.5">
        <StepButton label="Previous week" disabled={period.week <= first} onClick={() => onSelect(period.week - 1)}>
          <ChevronLeft className="h-7 w-7" strokeWidth={3} aria-hidden />
        </StepButton>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center" aria-live="polite">
          <span className="flex items-center gap-2 text-base font-black uppercase tracking-widest text-primary">
            Week {period.week}
            {isCurrent && (
              <span className="rounded-full bg-highlight px-2 py-0.5 text-[10px] font-black leading-4 tracking-wider text-highlight-foreground">
                Now
              </span>
            )}
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            {fmtDay(period.start)} to {fmtDay(period.end)} · {period.days} days
          </span>
        </div>
        <StepButton label="Next week" disabled={period.week >= last} onClick={() => onSelect(period.week + 1)}>
          <ChevronRight className="h-7 w-7" strokeWidth={3} aria-hidden />
        </StepButton>
      </div>

      {entries.isError && !entries.data ? (
        <ErrorNote message="Could not load your steps." onRetry={() => entries.refetch()} />
      ) : !entries.data ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : (
        <EntryField
          key={period.week}
          challenge={c}
          week={period.week}
          text={draft?.week === period.week ? draft.text : String(valueOf(period.week) ?? "")}
          serverSteps={server.get(period.week)}
          autosave={autosave}
          onText={(text) => {
            setDraft({ week: period.week, text });
            const parsed = parseSteps(text, c.maxWeeklySteps);
            autosave.change(period.week, parsed.kind === "valid" ? parsed.steps : null, server.get(period.week));
          }}
        />
      )}
    </section>
  );
};

const StepButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform hover:bg-secondary active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:active:scale-100"
  >
    {children}
  </button>
);

interface FieldProps {
  challenge: ChallengeInfo;
  week: number;
  text: string;
  serverSteps: number | undefined;
  autosave: AutosaveQueue;
  onText: (text: string) => void;
}

const EntryField = ({ challenge: c, week, text, serverSteps, autosave, onText }: FieldProps) => {
  const period = c.periods[week - 1];
  const parsed = parseSteps(text, c.maxWeeklySteps);
  const status = autosave.statusOf(week);
  const stored = autosave.confirmedValue(week) ?? serverSteps;

  let view: View;
  if (parsed.kind === "invalid") view = "invalid";
  else if (status === "pending" || status === "saving") view = "saving";
  else if (status === "error") view = "error";
  else if (parsed.kind === "empty") view = stored !== undefined ? "blank-kept" : "empty";
  else if (parsed.steps === stored) view = "saved";
  else view = "saving"; // between keystroke and the queue noticing; resolves immediately

  const perDay = parsed.kind === "valid" ? Math.round(parsed.steps / period.days) : null;

  // Celebrate only a save this field just made (not the value it opened with).
  const typed = useRef(false);
  const prev = useRef<View>(view);
  useEffect(() => {
    if (typed.current && prev.current === "saving" && view === "saved" && parsed.kind === "valid" && parsed.steps > 0) {
      celebrate();
    }
    prev.current = view;
  }, [view, parsed]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        autosave.flush();
      }}
    >
      <label htmlFor="steps" className="sr-only">
        Steps for week {week}, {fmtDay(period.start)} to {fmtDay(period.end)}
      </label>
      <div className="flex items-center gap-3">
        <input
          id="steps"
          name="steps"
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={text}
          onChange={(e) => {
            typed.current = true;
            onText(e.target.value);
          }}
          onBlur={() => autosave.flush()}
          aria-invalid={view === "invalid"}
          aria-describedby="steps-status steps-help"
          className="big-number h-20 w-full min-w-0 flex-1 rounded-2xl border-2 border-transparent bg-background text-center text-4xl text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary aria-[invalid=true]:border-destructive"
        />
        <button
          type="submit"
          aria-label="Save steps"
          disabled={view === "invalid" || parsed.kind === "empty"}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:bg-primary/90 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:active:scale-100"
        >
          {view === "saving" ? (
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          ) : (
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
          )}
        </button>
      </div>

      <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <div id="steps-status" role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-sm">
          {view === "saving" && (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Saving…</span>
            </>
          )}
          {view === "saved" && (
            <>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="font-semibold">Saved</span>
            </>
          )}
          {view === "invalid" && (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <span className="text-destructive">
                {parsed.kind === "invalid" && parsed.reason === "too-large"
                  ? `That's more than ${fmtSteps(c.maxWeeklySteps)}. Not saved.`
                  : "Use a whole number, like 52000. Not saved."}
              </span>
            </>
          )}
          {view === "error" && (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
              <span className="text-destructive">Could not save.</span>
            </>
          )}
          {view === "blank-kept" && (
            <span className="text-muted-foreground">
              Blank isn't saved. Week {week} stays at {fmtSteps(stored ?? 0)}.
            </span>
          )}
          {view === "empty" && <span className="text-muted-foreground">Not logged yet.</span>}
        </div>

        {view === "error" ? (
          <Button type="button" variant="outline" size="sm" className="h-11 rounded-xl" onClick={() => autosave.retry(week)}>
            <RotateCw aria-hidden /> Retry
          </Button>
        ) : (
          perDay !== null &&
          view !== "invalid" && (
            <span className="text-sm tabular-nums text-muted-foreground">About {fmtSteps(perDay)} a day</span>
          )
        )}
      </div>

      <p id="steps-help" className="px-1 text-xs text-muted-foreground">
        Saves by itself when you stop typing, or tap the tick. Rest week? Enter 0.
      </p>
    </form>
  );
};

export default StepEntry;
