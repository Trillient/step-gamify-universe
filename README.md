# Wooly Walking Challenge 2026

A yearly 12-week step challenge open to anyone, 2026-10-01 to 2026-12-20 inclusive. Everyone signs in with Google and enters one total step count per week.

## Rules the server enforces

Periods are fixed: weeks 1 to 11 are seven days each from 1 October, and week 12 is the short final period 17 to 20 December (4 days). Week 9 starts on 26 November. "Today" is the calendar date in `CHALLENGE_TZ` (default `Australia/Brisbane`), so boundaries flip at local midnight.

| When | Own entries | Other participants |
| --- | --- | --- |
| Before 1 Oct | none yet | not returned |
| 1 Oct to 25 Nov (weeks 1 to 8) | always visible | complete history once challenge total reaches 1000 steps |
| 26 Nov to 20 Dec (weeks 9 to 12) | always visible | nothing is returned: no rows, steps, totals or names, including weeks 1 to 8 |
| From 21 Dec | always visible | qualifying totals (at least 1000) revealed |

Notes on how this is implemented, all in `server/app.ts` and `shared/challenge.ts`:

- The 1000-step threshold is applied to each participant's challenge total in SQL. Once someone qualifies, their complete entered history is shown; before that, their name and rows never reach application code.
- During the hidden window the query for other participants is not run at all.
- Participants are identified by an opaque hash, never by Firebase uid or email.
- Entries can be written for a week once it has started, until the end of 20 December. Own data is never deleted or reset by phase changes.
- Steps must be a whole number from 0 to 1,000,000. Bodies are size limited.

## API

All `/api/*` responses are `Cache-Control: no-store`. Authenticated routes need `Authorization: Bearer <Firebase ID token>`, verified with `jose` against Google's signing keys (issuer and audience pinned to `FIREBASE_PROJECT_ID`, sign-in provider must be `google.com`).

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | no | liveness |
| `GET /api/challenge` | no | dates, periods, phase, current week |
| `GET /api/me`, `PUT /api/me` | yes | display name shown to others |
| `GET /api/me/entries` | yes | own weekly totals |
| `PUT /api/me/entries/:week` | yes | set own total, body `{ "steps": 12345 }` |
| `GET /api/leaderboard` | yes | own rows plus whatever the privacy rules allow |

## Local development

Requires Node 22.13 or newer (uses `node:sqlite`).

```sh
npm ci
cp .env.example .env.local     # VITE_FIREBASE_* for the web client
cp .env.example .env.server    # FIREBASE_PROJECT_ID etc for the API
npm run dev:server             # API on :3000
npm run dev                    # Vite on :8080, proxies /api to :3000
```

Use a Firebase project with Google sign-in enabled and `localhost` in its authorised domains.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build        # web app to dist/, API bundle to dist-server/
```

## Deployment

One container serves the API and the built web app. The Firebase web config is baked into the bundle at build time; the API reads `FIREBASE_PROJECT_ID` at runtime. SQLite lives in `/data`, so mount a persistent volume there and back it up (`challenge.sqlite`, plus `-wal`/`-shm` while running, or use `sqlite3 .backup`). Run a single replica: SQLite is the single writer.

```sh
docker build -t wooly-walking \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... .

docker run -d --name wooly-walking --restart unless-stopped \
  -e FIREBASE_PROJECT_ID=... \
  -v wooly-data:/data -p 3000:3000 wooly-walking
```

Checklist before going live:

1. In the Firebase console, enable Google as a sign-in provider and add the public hostname under Authentication, Settings, Authorised domains.
2. Terminate TLS in front of the container (reverse proxy or tunnel) and forward `Host` and the original scheme.
3. Probe `GET /api/health` (the image also has a Docker `HEALTHCHECK`).
4. Do not set `FIREBASE_PROJECT_ID` to a different project than the web config's, or every token is rejected with 401.

Secrets: there are none in the repository. The Firebase web config values are public identifiers but are supplied per deployment (`.env.example`); `.env*` files are gitignored.

### Deployment status

Not deployed yet. Needs a Firebase project with Google sign-in and the public hostname authorised, plus a host and public route for the container (see the checklist above).
