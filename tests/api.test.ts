import { beforeEach, describe, expect, it } from "vitest";
import { cleanName, createApp } from "../server/app";
import { Store, openDb } from "../server/db";
import type { TokenVerifier } from "../server/auth";

const TZ = "Australia/Brisbane";

// token "tok-<uid>:<url-encoded name>" authenticates as that user
const verify: TokenVerifier = async (t) => {
  const m = /^tok-([a-z0-9]+):?(.*)$/.exec(t);
  if (!m) throw new Error("bad token");
  return { uid: m[1], name: decodeURIComponent(m[2]) };
};

function setup(isoNow: string) {
  const clock = { now: new Date(isoNow) };
  const store = new Store(openDb(":memory:"));
  const app = createApp({ store, verify, timeZone: TZ, now: () => clock.now });
  const call = (path: string, init: RequestInit & { as?: string } = {}) =>
    request(path, init) as Promise<Omit<Response, "json"> & { json(): Promise<any> }>;
  const request = (path: string, init: RequestInit & { as?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.as) headers.set("Authorization", `Bearer tok-${init.as}`);
    if (init.body) headers.set("Content-Type", "application/json");
    return app.request(path, { ...init, headers });
  };
  const put = (as: string, week: number | string, steps: unknown) =>
    call(`/api/me/entries/${week}`, { method: "PUT", as, body: JSON.stringify({ steps }) });
  const board = async (as: string) => (await call("/api/leaderboard", { as })).json() as Promise<any>;
  return { clock, call, put, board };
}

// Brisbane noon on the given date (UTC+10 year-round) is 02:00Z
const at = (date: string) => `${date}T02:00:00Z`;

describe("health and auth", () => {
  it("serves health without auth", async () => {
    const { call } = setup(at("2026-10-05"));
    const res = await call("/api/health");
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("rejects missing, malformed and invalid tokens", async () => {
    const { call } = setup(at("2026-10-05"));
    expect((await call("/api/leaderboard")).status).toBe(401);
    expect((await call("/api/me/entries", { headers: { Authorization: "Basic abc" } })).status).toBe(401);
    expect((await call("/api/me/entries", { headers: { Authorization: "Bearer nope" } })).status).toBe(401);
  });

  it("exposes the challenge calendar publicly", async () => {
    const { call } = setup(at("2026-11-26"));
    const body = await (await call("/api/challenge")).json();
    expect(body.periods).toHaveLength(12);
    expect(body.phase).toBe("final-weeks");
    expect(body.currentWeek).toBe(9);
  });

  it("returns json 404 for unknown api routes", async () => {
    const { call } = setup(at("2026-10-05"));
    const res = await call("/api/nope");
    expect(res.status).toBe(404);
  });
});

describe("entry validation", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup(at("2026-10-20")); // week 3
  });

  it("stores and updates one total per week", async () => {
    expect((await t.put("a", 1, 12345)).status).toBe(200);
    expect((await t.put("a", 1, 20000)).status).toBe(200);
    const { entries } = await (await t.call("/api/me/entries", { as: "a" })).json();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ week: 1, steps: 20000 });
  });

  it.each([
    [-1],
    [1.5],
    ["100"],
    [null],
    [1_000_001],
    [Number.MAX_SAFE_INTEGER + 1],
    [NaN],
  ])("rejects steps=%j", async (steps) => {
    expect((await t.put("a", 1, steps)).status).toBe(400);
  });

  it("accepts the bounds 0 and 1,000,000", async () => {
    expect((await t.put("a", 1, 0)).status).toBe(200);
    expect((await t.put("a", 2, 1_000_000)).status).toBe(200);
  });

  it.each(["0", "13", "abc", "1.5", "-1", "001x"])("rejects week %s", async (w) => {
    expect((await t.put("a", w, 5000)).status).toBe(400);
  });

  it("rejects non-object and invalid JSON bodies", async () => {
    const raw = (body: string) =>
      t.call("/api/me/entries/1", { method: "PUT", as: "a", body });
    expect((await raw("[1]")).status).toBe(400);
    expect((await raw("not json")).status).toBe(400);
    expect((await raw("{}")).status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    const res = await t.call("/api/me/entries/1", {
      method: "PUT",
      as: "a",
      body: JSON.stringify({ steps: 1, pad: "x".repeat(5000) }),
    });
    expect(res.status).toBe(413);
  });

  it("refuses weeks that have not started", async () => {
    expect((await t.put("a", 4, 5000)).status).toBe(409); // week 4 starts Oct 22
    t.clock.now = new Date(at("2026-10-22"));
    expect((await t.put("a", 4, 5000)).status).toBe(200);
  });

  it("refuses writes the day after the challenge ends but accepts the last day", async () => {
    t.clock.now = new Date(at("2026-12-20"));
    expect((await t.put("a", 12, 5000)).status).toBe(200);
    t.clock.now = new Date(at("2026-12-21"));
    expect((await t.put("a", 12, 6000)).status).toBe(409);
    const { entries } = await (await t.call("/api/me/entries", { as: "a" })).json();
    expect(entries[0].steps).toBe(5000);
  });

  it("uses the Brisbane date at the boundary, not UTC", async () => {
    // 2026-12-20T13:59Z = Dec 20 23:59 Brisbane: still open
    t.clock.now = new Date("2026-12-20T13:59:00Z");
    expect((await t.put("a", 12, 5000)).status).toBe(200);
    // 14:00Z = Dec 21 00:00 Brisbane: closed
    t.clock.now = new Date("2026-12-20T14:00:00Z");
    expect((await t.put("a", 12, 5001)).status).toBe(409);
  });
});

describe("leaderboard privacy", () => {
  it("shows own entries always, others once their total reaches 1000", async () => {
    const t = setup(at("2026-11-10"));
    await t.call("/api/me", { as: "a" }); // create users with names
    await t.put("a", 1, 500); // own, below threshold
    await t.put("b", 1, 999); // other, below total
    await t.put("b", 2, 1000); // other, total qualifies
    await t.put("c", 1, 8000);

    const mine = await t.board("a");
    expect(mine.othersHidden).toBe(false);
    const me = mine.rows.find((r: any) => r.isMe);
    expect(me.weeks).toEqual({ "1": 500 });
    expect(me.total).toBe(500);

    const b = mine.rows.find((r: any) => !r.isMe && r.weeks["2"] === 1000);
    expect(b.weeks).toEqual({ "1": 999, "2": 1000 });
    expect(b.total).toBe(1999);
  });

  it("omits participants with no qualifying rows entirely", async () => {
    const t = setup(at("2026-11-10"));
    await t.put("a", 1, 5000);
    await t.put("b", 1, 10);
    const res = await t.board("a");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].isMe).toBe(true);
  });

  it("never exposes firebase uids or emails", async () => {
    const t = setup(at("2026-11-10"));
    await t.put("uidsecret1", 1, 5000);
    await t.put("uidsecret2", 1, 6000);
    const text = JSON.stringify(await t.board("uidsecret1"));
    expect(text).not.toContain("uidsecret");
  });

  it("is still public on Nov 25 and hidden from the first second of Nov 26", async () => {
    const t = setup(at("2026-11-25"));
    await t.put("b", 8, 9000);
    expect((await t.board("a")).rows).toHaveLength(1);

    t.clock.now = new Date("2026-11-25T14:00:00Z"); // 00:00 Nov 26 Brisbane
    const res = await t.board("a");
    expect(res.othersHidden).toBe(true);
    expect(res.rows).toHaveLength(0);
  });

  it("returns no rows, steps, totals or names of others in the final weeks, but keeps own data", async () => {
    const t = setup(at("2026-11-20"));
    await t.call("/api/me", { as: "b" });
    await t.put("a", 5, 700);
    await t.put("b", 5, 123456);
    await t.put("b", 6, 654321);

    for (const d of ["2026-11-26", "2026-12-05", "2026-12-17", "2026-12-20"]) {
      t.clock.now = new Date(at(d));
      const res = await t.board("a");
      expect(res.othersHidden).toBe(true);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]).toMatchObject({ isMe: true, total: 700, weeks: { "5": 700 } });
      const text = JSON.stringify(res);
      expect(text).not.toContain("123456");
      expect(text).not.toContain("654321");
      expect(text).not.toContain("777777");
    }
  });

  it("preserves own data through the hidden phase and does not lose it on reveal", async () => {
    const t = setup(at("2026-11-20"));
    await t.put("a", 5, 400);
    t.clock.now = new Date(at("2026-12-10"));
    await t.put("a", 10, 3000);
    t.clock.now = new Date(at("2026-12-20"));
    const own = await (await t.call("/api/me/entries", { as: "a" })).json();
    expect(own.entries.map((e: any) => [e.week, e.steps])).toEqual([
      [5, 400],
      [10, 3000],
    ]);
  });

  it("reveals qualifying public data (and only that) once the challenge has ended", async () => {
    const t = setup(at("2026-11-20"));
    await t.put("b", 5, 5000);
    await t.put("b", 6, 900); // included because the participant total qualifies
    t.clock.now = new Date(at("2026-12-10"));
    await t.put("b", 10, 7000);
    await t.put("c", 12, 100);

    t.clock.now = new Date(at("2026-12-20"));
    expect((await t.board("a")).rows).toHaveLength(0);

    t.clock.now = new Date(at("2026-12-21"));
    const res = await t.board("a");
    expect(res.othersHidden).toBe(false);
    expect(res.phase).toBe("ended");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].weeks).toEqual({ "5": 5000, "6": 900, "10": 7000 });
    expect(res.rows[0].total).toBe(12900);
  });

  it("requires authentication", async () => {
    const t = setup(at("2026-11-10"));
    expect((await t.call("/api/leaderboard")).status).toBe(401);
  });

  it("ranks by qualifying total", async () => {
    const t = setup(at("2026-11-10"));
    await t.put("a", 1, 2000);
    await t.put("b", 1, 9000);
    await t.put("c", 1, 5000);
    const res = await t.board("a");
    expect(res.rows.map((r: any) => r.total)).toEqual([9000, 5000, 2000]);
  });
});

describe("display names", () => {
  it("takes the token name, sanitises it and lets the user override it", async () => {
    const t = setup(at("2026-10-05"));
    const first = await (await t.call("/api/me", { as: "a:Ann%20%20%20Smith" })).json();
    expect(first.displayName).toBe("Ann Smith");
    const upd = await t.call("/api/me", { method: "PUT", as: "a", body: JSON.stringify({ displayName: "  Annie  " }) });
    expect((await upd.json()).displayName).toBe("Annie");
    // token name no longer overwrites a customised name
    expect((await (await t.call("/api/me", { as: "a:Ann%20Smith" })).json()).displayName).toBe("Annie");
  });

  it("rejects empty or non-string names", async () => {
    const t = setup(at("2026-10-05"));
    expect((await t.call("/api/me", { method: "PUT", as: "a", body: JSON.stringify({ displayName: "   " }) })).status).toBe(400);
    expect((await t.call("/api/me", { method: "PUT", as: "a", body: JSON.stringify({ displayName: 5 }) })).status).toBe(400);
  });
});

describe("cleanName", () => {
  it("strips control characters, collapses whitespace and caps length", () => {
    expect(cleanName("A\u0007\tB\nC")).toBe("A B C");
    expect(cleanName("x".repeat(100))).toHaveLength(40);
  });
});

describe("account deletion", () => {
  it("deletes own name and every entry, and removes you from others' boards", async () => {
    const t = setup(at("2026-11-10"));
    await t.call("/api/me", { as: "a" });
    await t.put("a", 1, 9000);
    await t.put("a", 2, 7000);
    await t.put("b", 1, 8000);
    expect((await t.board("b")).rows).toHaveLength(2);

    const res = await t.call("/api/me", { method: "DELETE", as: "a" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });

    expect((await t.board("b")).rows).toHaveLength(1);
    // signing in again starts a fresh, empty account
    expect((await (await t.call("/api/me/entries", { as: "a" })).json()).entries).toEqual([]);
  });

  it("leaves other walkers untouched", async () => {
    const t = setup(at("2026-11-10"));
    await t.put("a", 1, 9000);
    await t.put("b", 1, 8000);
    await t.call("/api/me", { method: "DELETE", as: "a" });
    expect((await (await t.call("/api/me/entries", { as: "b" })).json()).entries).toHaveLength(1);
  });

  it("requires authentication", async () => {
    const t = setup(at("2026-11-10"));
    expect((await t.call("/api/me", { method: "DELETE" })).status).toBe(401);
  });
});
