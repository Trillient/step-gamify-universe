/**
 * Debounced, serialised autosave for weekly step totals.
 *
 * - A change is saved after the user pauses for `delayMs`.
 * - Only one request is in flight at a time. Changes made meanwhile are
 *   queued and coalesced, so the newest value for a week is always the last
 *   one written and an older response can never overwrite a newer value.
 * - Blank or invalid input (passed as `null`) cancels a pending save for that
 *   week and is never sent.
 * - A failed save is remembered per week until the user edits or retries.
 *
 * Framework free so it can be tested with fake timers; React subscribes via
 * `subscribe`/`getVersion` (useSyncExternalStore).
 */

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface Scheduler {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const defaultScheduler: Scheduler = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface AutosaveOptions {
  save: (week: number, steps: number) => Promise<void>;
  delayMs: number;
  scheduler?: Scheduler;
}

export class AutosaveQueue {
  private readonly pending = new Map<number, number>();
  private inFlight: { week: number; steps: number } | null = null;
  /** Values the server acknowledged during this session. */
  private readonly confirmed = new Map<number, number>();
  private readonly errors = new Map<number, { steps: number; message: string }>();
  private readonly savedWeeks = new Set<number>();
  private readonly listeners = new Set<() => void>();
  private readonly scheduler: Scheduler;
  private timer: unknown = null;
  private version = 0;

  constructor(private readonly opts: AutosaveOptions) {
    this.scheduler = opts.scheduler ?? defaultScheduler;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.version;

  /**
   * Record the latest input for `week`. `steps` is null for blank or invalid
   * input. `baseline` is the value the server is known to hold (from a query),
   * used to avoid saving a value that is already stored.
   */
  change(week: number, steps: number | null, baseline?: number): void {
    this.clearTimer();
    this.errors.delete(week);
    this.savedWeeks.delete(week);
    if (steps === null || steps === this.serverValue(week, baseline)) {
      this.pending.delete(week);
    } else {
      this.pending.set(week, steps);
    }
    if (this.pending.size > 0) this.timer = this.scheduler.set(() => this.flush(), this.opts.delayMs);
    this.notify();
  }

  /** Save everything pending now (Enter, blur, week switch, unmount). */
  flush(): void {
    this.clearTimer();
    this.pump();
  }

  retry(week: number): void {
    const failed = this.errors.get(week);
    if (!failed || this.pending.has(week)) return;
    this.errors.delete(week);
    this.pending.set(week, failed.steps);
    this.notify();
    this.flush();
  }

  statusOf(week: number): SaveStatus {
    if (this.inFlight?.week === week) return "saving";
    if (this.pending.has(week)) return "pending";
    if (this.errors.has(week)) return "error";
    if (this.savedWeeks.has(week)) return "saved";
    return "idle";
  }

  errorOf(week: number): string | undefined {
    return this.errors.get(week)?.message;
  }

  /** Newest value for the week this session knows of (queued, sending or acknowledged). */
  latest(week: number): number | undefined {
    if (this.pending.has(week)) return this.pending.get(week);
    if (this.inFlight?.week === week) return this.inFlight.steps;
    if (this.errors.has(week)) return this.errors.get(week)?.steps;
    return this.confirmed.get(week);
  }

  /** Last value the server acknowledged for the week during this session. */
  confirmedValue(week: number): number | undefined {
    return this.confirmed.get(week);
  }

  hasUnsaved(): boolean {
    return this.pending.size > 0 || this.inFlight !== null;
  }

  /** Flush, then resolve once nothing is queued or in flight (or after `timeoutMs`). */
  settled(timeoutMs = 5000): Promise<void> {
    this.flush();
    if (!this.hasUnsaved()) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        off();
        this.scheduler.clear(guard);
        resolve();
      };
      const off = this.subscribe(() => {
        if (!this.hasUnsaved()) done();
      });
      const guard = this.scheduler.set(done, timeoutMs);
    });
  }

  /** Value the server will hold once in-flight work settles, if known. */
  private serverValue(week: number, baseline?: number): number | undefined {
    if (this.inFlight?.week === week) return this.inFlight.steps;
    return this.confirmed.has(week) ? this.confirmed.get(week) : baseline;
  }

  private pump(): void {
    if (this.inFlight) return; // resumes when the current request settles
    const next = this.pending.entries().next();
    if (next.done) return;
    const [week, steps] = next.value;
    this.pending.delete(week);
    if (this.confirmed.get(week) === steps) {
      this.savedWeeks.add(week);
      this.notify();
      this.pump();
      return;
    }
    this.inFlight = { week, steps };
    this.notify();
    this.opts.save(week, steps).then(
      () => {
        this.confirmed.set(week, steps);
        if (!this.pending.has(week)) this.savedWeeks.add(week);
        this.settle();
      },
      (err: unknown) => {
        // a newer queued value for this week supersedes the failure
        if (!this.pending.has(week)) {
          this.errors.set(week, { steps, message: err instanceof Error ? err.message : "Could not save" });
        }
        this.settle();
      },
    );
  }

  private settle(): void {
    this.inFlight = null;
    this.notify();
    // keep debouncing if the user is still mid-edit; otherwise drain the queue
    if (this.timer === null) this.pump();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.scheduler.clear(this.timer);
      this.timer = null;
    }
  }

  private notify(): void {
    this.version++;
    for (const fn of this.listeners) fn();
  }
}
