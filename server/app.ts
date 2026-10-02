import { createHash } from "node:crypto";
import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import type { AuthUser, TokenVerifier } from "./auth";
import type { Store } from "./db";
import {
  CHALLENGE_END,
  CHALLENGE_START,
  FINAL_WEEKS_START,
  MAX_WEEKLY_STEPS,
  PERIODS,
  PUBLIC_MIN_STEPS,
  canSubmitWeek,
  currentWeek,
  dateInZone,
  getPeriod,
  othersHidden,
  phaseFor,
} from "../shared/challenge";

export interface AppDeps {
  store: Store;
  verify: TokenVerifier;
  timeZone: string;
  /** Injectable for tests. */
  now?: () => Date;
}

type Env = { Variables: { user: { uid: string; displayName: string } } };

const MAX_NAME_LENGTH = 40;

export function cleanName(raw: string): string {
  // strip control characters, collapse whitespace
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

/** Opaque, stable per-participant id so Firebase uids are never exposed. */
function publicId(uid: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${uid}`).digest("hex").slice(0, 16);
}

export function createApp(deps: AppDeps) {
  const { store, verify, timeZone } = deps;
  const now = deps.now ?? (() => new Date());
  const today = () => dateInZone(now(), timeZone);
  const idSalt = createHash("sha256").update(CHALLENGE_START).digest("hex");

  const app = new Hono<Env>();
  // same-origin-allow-popups: the default `same-origin` would break Firebase's
  // Google sign-in popup (the opener loses access to the popup window).
  app.use("*", secureHeaders({ crossOriginOpenerPolicy: "same-origin-allow-popups" }));
  app.use("/api/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
    const header = c.req.header("Authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) return c.json({ error: "unauthenticated" }, 401);
    let authUser: AuthUser;
    try {
      authUser = await verify(match[1]);
    } catch {
      return c.json({ error: "unauthenticated" }, 401);
    }
    const name = cleanName(authUser.name) || "Walker";
    const row = store.upsertUser(authUser.uid, name, now().toISOString());
    c.set("user", { uid: authUser.uid, displayName: row.display_name });
    await next();
  };

  app.get("/api/health", (c) => c.json({ status: "ok", time: now().toISOString() }));

  app.get("/api/challenge", (c) => {
    const t = today();
    return c.json({
      start: CHALLENGE_START,
      end: CHALLENGE_END,
      finalWeeksStart: FINAL_WEEKS_START,
      publicMinSteps: PUBLIC_MIN_STEPS,
      maxWeeklySteps: MAX_WEEKLY_STEPS,
      timeZone,
      today: t,
      phase: phaseFor(t),
      currentWeek: currentWeek(t),
      periods: PERIODS,
    });
  });

  app.get("/api/me", requireAuth, (c) => {
    const u = c.get("user");
    return c.json({ displayName: u.displayName });
  });

  app.put(
    "/api/me",
    requireAuth,
    bodyLimit({ maxSize: 2048, onError: (c) => c.json({ error: "payload too large" }, 413) }),
    async (c) => {
      const body = await readJson(c);
      if (!body || typeof body.displayName !== "string") {
        return c.json({ error: "displayName must be a string" }, 400);
      }
      const name = cleanName(body.displayName);
      if (name.length < 1) return c.json({ error: "displayName must not be empty" }, 400);
      store.setDisplayName(c.get("user").uid, name);
      return c.json({ displayName: name });
    },
  );

  // Deletes the participant and every entry. Signing in again starts an empty account.
  app.delete("/api/me", requireAuth, (c) => {
    store.deleteUser(c.get("user").uid);
    return c.json({ deleted: true });
  });

  app.get("/api/me/entries", requireAuth, (c) => {
    const rows = store.ownEntries(c.get("user").uid);
    return c.json({
      entries: rows.map((r) => ({ week: r.week, steps: r.steps, updatedAt: r.updated_at })),
    });
  });

  app.put(
    "/api/me/entries/:week",
    requireAuth,
    bodyLimit({ maxSize: 1024, onError: (c) => c.json({ error: "payload too large" }, 413) }),
    async (c) => {
      const weekParam = c.req.param("week");
      if (!/^\d{1,2}$/.test(weekParam)) return c.json({ error: "invalid week" }, 400);
      const week = Number(weekParam);
      if (!getPeriod(week)) return c.json({ error: "week must be between 1 and 12" }, 400);

      const body = await readJson(c);
      if (!body) return c.json({ error: "body must be a JSON object" }, 400);
      const steps = body.steps;
      if (typeof steps !== "number" || !Number.isSafeInteger(steps) || steps < 0 || steps > MAX_WEEKLY_STEPS) {
        return c.json({ error: `steps must be a whole number between 0 and ${MAX_WEEKLY_STEPS}` }, 400);
      }

      const t = today();
      if (!canSubmitWeek(week, t)) {
        const msg =
          t > CHALLENGE_END ? "the challenge has ended" : "that week has not started yet";
        return c.json({ error: msg }, 409);
      }

      const stamp = now().toISOString();
      store.saveEntry(c.get("user").uid, week, steps, stamp);
      return c.json({ week, steps, updatedAt: stamp });
    },
  );

  /**
   * Privacy is enforced here: during the final weeks (and before the start)
   * other participants' rows are never queried, let alone serialised. Outside
   * that window only participants whose complete challenge total reaches the
   * public threshold are selected.
   */
  app.get("/api/leaderboard", requireAuth, (c) => {
    const me = c.get("user");
    const t = today();
    const hidden = othersHidden(t);

    const participants = new Map<
      string,
      { id: string; name: string; isMe: boolean; weeks: Record<number, number> }
    >();

    const own = store.ownEntries(me.uid);
    if (own.length > 0) {
      participants.set(me.uid, {
        id: publicId(me.uid, idSalt),
        name: me.displayName,
        isMe: true,
        weeks: Object.fromEntries(own.map((r) => [r.week, r.steps])),
      });
    }

    if (!hidden) {
      for (const r of store.publicEntriesOfOthers(me.uid, PUBLIC_MIN_STEPS)) {
        let p = participants.get(r.uid);
        if (!p) {
          p = { id: publicId(r.uid, idSalt), name: r.display_name, isMe: false, weeks: {} };
          participants.set(r.uid, p);
        }
        p.weeks[r.week] = r.steps;
      }
    }

    const rows = [...participants.values()]
      .map((p) => ({
        id: p.id,
        name: p.name,
        isMe: p.isMe,
        weeks: p.weeks,
        total: Object.values(p.weeks).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    return c.json({ phase: phaseFor(t), othersHidden: hidden, publicMinSteps: PUBLIC_MIN_STEPS, rows });
  });

  app.notFound((c) =>
    c.req.path.startsWith("/api/") ? c.json({ error: "not found" }, 404) : c.text("Not found", 404),
  );
  app.onError((err, c) => {
    console.error("unhandled error", err);
    return c.json({ error: "internal error" }, 500);
  });

  return app;
}

async function readJson(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const v = await c.req.json();
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
