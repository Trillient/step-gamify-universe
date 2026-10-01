import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutosaveQueue } from "../src/lib/autosave";

interface Call {
  week: number;
  steps: number;
  resolve: () => void;
  reject: (e: Error) => void;
}

function setup(delayMs = 800) {
  const calls: Call[] = [];
  const save = vi.fn(
    (week: number, steps: number) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ week, steps, resolve, reject });
      }),
  );
  const q = new AutosaveQueue({ save, delayMs });
  return { q, save, calls };
}

// let promise callbacks run
const tick = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("AutosaveQueue debounce", () => {
  it("saves once after the user pauses, with the last value typed", async () => {
    const { q, save, calls } = setup();
    q.change(3, 1);
    await vi.advanceTimersByTimeAsync(300);
    q.change(3, 12);
    await vi.advanceTimersByTimeAsync(300);
    q.change(3, 1234);
    expect(q.statusOf(3)).toBe("pending");
    await vi.advanceTimersByTimeAsync(799);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(3, 1234);
    expect(q.statusOf(3)).toBe("saving");
    calls[0].resolve();
    await tick();
    expect(q.statusOf(3)).toBe("saved");
    expect(q.confirmedValue(3)).toBe(1234);
    expect(q.hasUnsaved()).toBe(false);
  });

  it("treats 0 as a real value to save", async () => {
    const { q, save } = setup();
    q.change(1, 0, 5000);
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledWith(1, 0);
  });

  it("never saves blank or invalid input and cancels a pending save", async () => {
    const { q, save } = setup();
    q.change(2, 500);
    q.change(2, null);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
    expect(q.statusOf(2)).toBe("idle");
  });

  it("does not save a value the server already holds", async () => {
    const { q, save } = setup();
    q.change(4, 9000, 9000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
    expect(q.statusOf(4)).toBe("idle");
  });

  it("flush saves immediately (Enter, blur, switching week)", async () => {
    const { q, save } = setup();
    q.change(5, 4200);
    q.flush();
    expect(save).toHaveBeenCalledWith(5, 4200);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("AutosaveQueue ordering", () => {
  it("never overlaps requests and writes the newest value last", async () => {
    const { q, save, calls } = setup();
    q.change(3, 100);
    q.flush();
    q.change(3, 200);
    q.flush(); // in flight: queued, not sent
    q.change(3, 300);
    q.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(q.latest(3)).toBe(300);

    calls[0].resolve();
    await tick();
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1]).toMatchObject({ week: 3, steps: 300 });
    expect(q.statusOf(3)).toBe("saving");

    calls[1].resolve();
    await tick();
    expect(q.statusOf(3)).toBe("saved");
    expect(q.confirmedValue(3)).toBe(300);
  });

  it("keeps debouncing while the user is still typing when a request completes", async () => {
    const { q, save, calls } = setup();
    q.change(1, 10);
    q.flush();
    q.change(1, 15); // timer running
    calls[0].resolve();
    await tick();
    expect(save).toHaveBeenCalledTimes(1);
    expect(q.statusOf(1)).toBe("pending");
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1].steps).toBe(15);
  });

  it("re-saves when the user reverts to the old value while a newer one is in flight", async () => {
    const { q, save, calls } = setup();
    q.change(2, 1000, 500); // server holds 500
    q.flush();
    q.change(2, 500, 500); // back to the stored value, but 1000 is on its way
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1].steps).toBe(500);
  });

  it("keeps changes for several weeks and saves each one", async () => {
    const { q, save, calls } = setup();
    q.change(1, 111);
    q.change(2, 222);
    q.flush();
    calls[0].resolve();
    await tick();
    calls[1].resolve();
    await tick();
    expect(save.mock.calls).toEqual([
      [1, 111],
      [2, 222],
    ]);
    expect(q.statusOf(1)).toBe("saved");
    expect(q.statusOf(2)).toBe("saved");
  });
});

describe("AutosaveQueue errors", () => {
  it("reports a failure and retries the same value", async () => {
    const { q, save, calls } = setup();
    q.change(6, 7000);
    q.flush();
    calls[0].reject(new Error("network down"));
    await tick();
    expect(q.statusOf(6)).toBe("error");
    expect(q.errorOf(6)).toBe("network down");
    expect(q.hasUnsaved()).toBe(false);

    q.retry(6);
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1].steps).toBe(7000);
    calls[1].resolve();
    await tick();
    expect(q.statusOf(6)).toBe("saved");
    expect(q.errorOf(6)).toBeUndefined();
  });

  it("keeps the failed value visible when returning to that week", async () => {
    const { q, calls } = setup();
    q.change(6, 7000);
    q.flush();
    calls[0].reject(new Error("network down"));
    await tick();
    expect(q.latest(6)).toBe(7000);
  });

  it("a newer queued value supersedes a failed older one", async () => {
    const { q, calls } = setup();
    q.change(7, 1);
    q.flush();
    q.change(7, 2);
    q.flush();
    calls[0].reject(new Error("boom"));
    await tick();
    expect(q.statusOf(7)).toBe("saving");
    calls[1].resolve();
    await tick();
    expect(q.statusOf(7)).toBe("saved");
    expect(q.errorOf(7)).toBeUndefined();
  });

  it("editing after a failure clears the error and schedules a new save", async () => {
    const { q, save, calls } = setup();
    q.change(8, 1);
    q.flush();
    calls[0].reject(new Error("boom"));
    await tick();
    q.change(8, 2);
    expect(q.statusOf(8)).toBe("pending");
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenLastCalledWith(8, 2);
  });

  it("settled() flushes and waits for queued saves to finish", async () => {
    const { q, save, calls } = setup();
    q.change(9, 900);
    let done = false;
    const p = q.settled().then(() => (done = true));
    expect(save).toHaveBeenCalledWith(9, 900);
    await tick();
    expect(done).toBe(false);
    calls[0].resolve();
    await p;
    expect(done).toBe(true);
    await expect(q.settled()).resolves.toBeUndefined();
  });

  it("notifies subscribers on every state change", async () => {
    const { q, calls } = setup();
    const listener = vi.fn();
    const off = q.subscribe(listener);
    q.change(1, 5);
    q.flush();
    calls[0].resolve();
    await tick();
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(3);
    const before = q.getVersion();
    off();
    q.change(1, 6);
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(q.getVersion()).toBeGreaterThan(before);
  });
});
