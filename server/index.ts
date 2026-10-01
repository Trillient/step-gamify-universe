import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createApp } from "./app";
import { firebaseVerifier } from "./auth";
import { Store, openDb } from "./db";
import { DEFAULT_TIME_ZONE } from "../shared/challenge";

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("FIREBASE_PROJECT_ID is required");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? "./data/challenge.sqlite";
const staticDir = resolve(process.env.STATIC_DIR ?? "./dist");
// serveStatic resolves its root relative to the working directory
const staticRoot = relative(process.cwd(), staticDir) || ".";
const timeZone = process.env.CHALLENGE_TZ ?? DEFAULT_TIME_ZONE;

const db = openDb(dbPath);
const api = createApp({ store: new Store(db), verify: firebaseVerifier(projectId), timeZone });

const root = new Hono();
root.route("/", api);
root.all("/api/*", (c) => c.json({ error: "not found" }, 404));

if (existsSync(staticDir)) {
  root.use("*", serveStatic({ root: staticRoot }));
  // SPA fallback for client-side routes
  root.get("*", serveStatic({ path: "index.html", root: staticRoot }));
} else {
  console.warn(`static dir ${staticDir} not found, serving API only`);
}

const server = serve({ fetch: root.fetch, port }, (info) => {
  console.log(`wooly walking challenge listening on :${info.port} (db ${dbPath}, tz ${timeZone})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
