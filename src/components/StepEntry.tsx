import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ChallengeInfo } from "@/lib/api";
import { fmtDay, fmtSteps } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const StepEntry = ({ challenge }: { challenge: ChallengeInfo }) => {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const entries = useQuery({ queryKey: ["entries"], queryFn: () => api.entries(getToken) });

  const open = challenge.phase === "open" || challenge.phase === "final-weeks";
  const selectable = challenge.periods.filter((p) => p.start <= challenge.today);
  const [week, setWeek] = useState<number | null>(null);
  const [value, setValue] = useState("");

  const chosen = week ?? challenge.currentWeek ?? selectable[selectable.length - 1]?.week ?? null;
  const existing = entries.data?.entries.find((e) => e.week === chosen);
  const existingSteps = existing?.steps;

  useEffect(() => {
    setValue(existingSteps === undefined ? "" : String(existingSteps));
  }, [chosen, existingSteps]);

  const save = useMutation({
    mutationFn: (steps: number) => api.saveEntry(getToken, chosen!, steps),
    onSuccess: () => {
      toast.success(`Week ${chosen} saved`);
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const trimmed = value.trim();
  const steps = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  const valid = Number.isSafeInteger(steps) && steps <= challenge.maxWeeklySteps;

  return (
    <section className="rounded-xl border bg-white/80 dark:bg-gray-900/80 p-4 space-y-4">
      <h2 className="text-lg font-semibold">Log your steps</h2>
      {!open || chosen === null ? (
        <p className="text-sm text-muted-foreground">
          {challenge.phase === "ended" ? "Entries are closed." : `Entries open on ${fmtDay(challenge.start)}.`}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate(steps);
          }}
        >
          <div className="space-y-1">
            <label htmlFor="week" className="text-sm font-medium">
              Week
            </label>
            <select
              id="week"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={chosen}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {selectable.map((p) => {
                const logged = entries.data?.entries.find((e) => e.week === p.week);
                return (
                  <option key={p.week} value={p.week}>
                    Week {p.week} ({fmtDay(p.start)} to {fmtDay(p.end)}){logged ? ` - ${fmtSteps(logged.steps)}` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="steps" className="text-sm font-medium">
              Total steps for the week
            </label>
            <Input
              id="steps"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 52000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={trimmed !== "" && !valid}
            />
            {trimmed !== "" && !valid && (
              <p className="text-xs text-destructive">
                Enter a whole number up to {fmtSteps(challenge.maxWeeklySteps)}.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!valid || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? "Update week" : "Save week"}
          </Button>
        </form>
      )}
    </section>
  );
};

export default StepEntry;
