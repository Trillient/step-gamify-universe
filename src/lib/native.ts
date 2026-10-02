/** Bridge to the iOS app (ios/WoolyWalking/HealthBridge.swift). Absent in a normal browser. */
interface ReplyHandler {
  postMessage(message: unknown): Promise<unknown>;
}

function healthHandler(): ReplyHandler | null {
  const w = window as unknown as { webkit?: { messageHandlers?: { health?: ReplyHandler } } };
  return w.webkit?.messageHandlers?.health ?? null;
}

export const canImportHealthSteps = (): boolean => healthHandler() !== null;

/** Steps Apple Health recorded across the given dates (inclusive), or an error if unavailable. */
export async function importHealthSteps(start: string, end: string): Promise<number> {
  const handler = healthHandler();
  if (!handler) throw new Error("unavailable");
  const steps = await handler.postMessage({ start, end });
  if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) throw new Error("bad-response");
  return Math.round(steps);
}
