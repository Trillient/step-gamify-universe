import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, RotateCw } from "lucide-react";
import type { AutosaveQueue } from "@/lib/autosave";
import type { ChallengeInfo, OwnEntry } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { parseSteps, startedPeriods } from "@/lib/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorNote from "./ErrorNote";
import WeekPicker from "./WeekPicker";

interface Props {
  challenge: ChallengeInfo;
  entries: UseQueryResult<{ entries: OwnEntry[] }>;
  autosave: AutosaveQueue;
}

type View = "invalid" | "saving" | "error" | "saved" | "blank-kept" | "empty";

/**
 * Pick a week, type the total, pause: it saves. Enter or leaving the field
 * saves straight away. What the user is typing always wins over refetched
 * data for the selected week, so a background refresh can't overwrite it.
 */
const StepEntry = ({ challenge: c, entries, autosave }: Props) => {
  const writable = c.phase === "open" || c.phase === "final-weeks";
  const started = startedPeriods(c.periods, c.today);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ week: number; text: string } | null>(null);

  const chosen = selected ?? c.currentWeek ?? started[started.length - 1]?.week ?? null;
  const period = chosen ? c.periods[chosen - 1] : undefined;
  const server = new Map((entries.data?.entries ?? []).map((e) => [e.week, e.steps]));
  const valueOf = (week: number) => autosave.latest(week) ?? server.get(week);

  const select = (week: number) => {
    autosave.flush();
    setSelected(week);
    setDraft(null);
  };

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="log-heading">
      <div className="mb-4 space-y-1">
        <h2 id="log-heading" className="text-lg font-semibold tracking-tight">
          {writable ? "Log your steps" : "Your weeks"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {c.phase === "upcoming"
            ? `Entries open on ${fmtDay(c.start)}. Each week opens on its first day.`
            : c.phase === "ended"
              ? `Entries closed on ${fmtDay(c.end)}. Here is everything you logged.`
              : "One total per week. You can update any week that has started until the challenge ends."}
        </p>
      </div>

      <WeekPicker
        periods={c.periods}
        today={c.today}
        selected={writable ? chosen : null}
        valueOf={valueOf}
        statusOf={(w) => autosave.statusOf(w)}
        onSelect={writable ? select : undefined}
      />

      {writable && period && (
        <div className="mt-5 border-t pt-5">
          {entries.isError && !entries.data ? (
            <ErrorNote message="Could not load your steps." onRetry={() => entries.refetch()} />
          ) : !entries.data ? (
            <Skeleton className="h-28 rounded-lg" />
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
        </div>
      )}
    </section>
  );
};

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

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        autosave.flush();
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor="steps" className="font-medium">
          Steps for week {week}
        </label>
        <span className="text-sm text-muted-foreground">
          {fmtDay(period.start)} to {fmtDay(period.end)} · {period.days} days
        </span>
      </div>

      <div className="relative mt-2.5">
        <Input
          id="steps"
          name="steps"
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. 52,000"
          value={text}
          onChange={(e) => onText(e.target.value)}
          onBlur={() => autosave.flush()}
          aria-invalid={view === "invalid"}
          aria-describedby="steps-status steps-help"
          className="h-12 pr-16 text-lg font-medium md:text-lg"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          steps
        </span>
      </div>

      <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div id="steps-status" role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-sm">
          {view === "saving" && (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">Saving…</span>
            </>
          )}
          {view === "saved" && (
            <>
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>Saved</span>
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
          <Button type="button" variant="outline" size="sm" className="h-11 sm:h-9" onClick={() => autosave.retry(week)}>
            <RotateCw aria-hidden /> Retry
          </Button>
        ) : (
          perDay !== null &&
          view !== "invalid" && (
            <span className="text-sm tabular-nums text-muted-foreground">About {fmtSteps(perDay)} a day</span>
          )
        )}
      </div>

      <p id="steps-help" className="text-xs text-muted-foreground">
        Saves automatically when you stop typing. Press Enter to save straight away. Rest week? Enter 0.
      </p>
    </form>
  );
};

export default StepEntry;
