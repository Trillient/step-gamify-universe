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

export interface NativeAppleCredential {
  idToken: string;
  rawNonce: string;
  givenName: string;
  familyName: string;
}

function appleHandler(): ReplyHandler | null {
  const w = window as unknown as { webkit?: { messageHandlers?: { appleSignIn?: ReplyHandler } } };
  return w.webkit?.messageHandlers?.appleSignIn ?? null;
}

export const hasNativeAppleSignIn = (): boolean => appleHandler() !== null;

/** Shows the system Sign in with Apple sheet in the iOS app (ios/WoolyWalking/AppleSignInBridge.swift). */
export async function nativeAppleSignIn(): Promise<NativeAppleCredential> {
  const handler = appleHandler();
  if (!handler) throw new Error("unavailable");
  const r = (await handler.postMessage({})) as Partial<NativeAppleCredential> | null;
  if (!r || typeof r.idToken !== "string" || typeof r.rawNonce !== "string") throw new Error("bad-response");
  return { idToken: r.idToken, rawNonce: r.rawNonce, givenName: r.givenName ?? "", familyName: r.familyName ?? "" };
}
