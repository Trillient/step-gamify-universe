import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { Period } from "@shared/challenge";
import type { SaveStatus } from "@/lib/autosave";
import { fmtDay, fmtSteps } from "@/lib/format";
import { weekState } from "@/lib/steps";
import { cn } from "@/lib/utils";

interface Props {
  periods: readonly Period[];
  today: string;
  selected: number | null;
  /** Newest known value per week (saved, or being saved). */
  valueOf: (week: number) => number | undefined;
  statusOf: (week: number) => SaveStatus;
  /** Omit for a read-only view (before the start and after the end). */
  onSelect?: (week: number) => void;
}

/**
 * All twelve weeks at a glance: which is selected, which is this week, which
 * have a value, and which haven't started yet (not selectable).
 */
const WeekPicker = ({ periods, today, selected, valueOf, statusOf, onSelect }: Props) => (
  <div className="space-y-2.5">
    <ul
      className="grid grid-cols-3 gap-2"
      aria-label={onSelect ? "Choose a week" : "Your weeks"}
    >
      {periods.map((p) => {
        const state = weekState(p, today);
        const value = valueOf(p.week);
        const status = statusOf(p.week);
        const isSelected = selected === p.week;
        const busy = status === "pending" || status === "saving";
        const label = [
          `Week ${p.week}, ${fmtDay(p.start)} to ${fmtDay(p.end)}`,
          state === "current" ? "this week" : null,
          state === "future" ? "not started yet" : value !== undefined ? `${fmtSteps(value)} steps` : "not logged",
          status === "error" ? "not saved" : null,
        ]
          .filter(Boolean)
          .join(", ");

        const interactive = Boolean(onSelect) && state !== "future";
        const Tag = onSelect ? "button" : "div";
        const tagProps = onSelect
          ? {
              type: "button" as const,
              "aria-pressed": isSelected,
              disabled: state === "future",
              onClick: () => onSelect(p.week),
            }
          : {};

        return (
          <li key={p.week} className="min-w-0">
            <Tag
              {...tagProps}
              className={cn(
                "flex h-full min-h-[3.75rem] w-full min-w-0 flex-col justify-center gap-0.5 rounded-2xl border-2 px-2.5 py-2 text-left transition-[color,background-color,border-color,transform]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                state === "future" ? "border-dashed bg-transparent text-muted-foreground" : "bg-card",
                onSelect && state === "future" && "cursor-not-allowed",
                interactive && "hover:border-primary/50 hover:bg-accent/60 active:scale-[0.97]",
                state === "current" && !isSelected && "border-highlight-foreground/30 bg-highlight/60",
                isSelected && "border-primary bg-brand-soft hover:bg-brand-soft",
              )}
            >
              <span className="sr-only">{label}</span>
              <span className="flex w-full items-center justify-between gap-1 text-xs font-medium" aria-hidden>
                <span className="truncate">Week {p.week}</span>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : status === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : state === "current" ? (
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-highlight-foreground" />
                ) : value !== undefined ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  "truncate text-sm tabular-nums",
                  value === undefined || state === "future" ? "text-muted-foreground" : "font-bold",
                )}
              >
                {state === "future" ? fmtDay(p.start) : value !== undefined ? fmtSteps(value) : "–"}
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-highlight-foreground" /> this week
      </span>
      <span className="inline-flex items-center gap-1">
        <Check className="h-3.5 w-3.5 text-primary" /> logged
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-4 rounded-sm border border-dashed border-muted-foreground/60" /> not started
      </span>
    </p>
  </div>
);

export default WeekPicker;
