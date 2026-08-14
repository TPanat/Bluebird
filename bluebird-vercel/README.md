# Operation Bluebird — Classroom Layoff Simulation

A layoff-decision simulation game (inspired by the 2022 Twitter restructuring case
study) for a class of 3+ teams. Students describe how they'd lay off staff in free
text, Claude judges the impact server-side, and an instructor-only admin panel shows
every team's submission and score.

## What's in this project

```
├── api/
│   ├── judge.js          POST — sends the team's cuts + method text to Claude, returns impact scores
│   ├── submit.js         POST — saves a team's final result (one record per team name)
│   ├── leaderboard.js    GET  — public, trimmed comparison table (shown to students in-game)
│   ├── admin-data.js     GET  — full data for every team, password-protected
│   └── admin-reset.js    POST — wipes all submissions, password-protected
├── lib/
│   └── upstash.js        tiny helper for the Upstash Redis REST API
├── public/
│   ├── index.html         the game students play
│   └── admin.html         password-gated dashboard for you
├── package.json
└── .env.example
```

No frontend framework, no build step — Vercel serves `public/` as static files and
`api/*.js` as serverless functions automatically.

## 1. Get the two things you need

1. **Anthropic API key** — console.anthropic.com → Get API Keys. This project calls
   the real Claude API (not the in-artifact "free" version), so **usage here is billed
   to that API key** like any normal API call. Judging one team's method is a small
   request (well under 1K output tokens), so cost for a class of a few teams is
   negligible, but keep an eye on console.anthropic.com/usage if you reuse this a lot.
2. **A Redis database** (to store submissions across requests — serverless functions
   don't have their own persistent memory). Easiest path: in your Vercel project →
   **Storage** tab → **Marketplace Database Providers** → add **Upstash Redis** (paid or free
   tier). It automatically creates `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` env vars for you. (Or make one directly at
   upstash.com and paste the REST URL/token in yourself — same result.)
   Since Vercel's storage marketplace changes from time to time, check
   vercel.com/docs/storage if the UI looks different from what you expected.

## 2. Deploy

1. Push this folder to a new GitHub repo.
2. Go to vercel.com/new and import that repo (framework preset: "Other" — no build
   command needed).
3. Before/after the first deploy, set these Project → Settings → Environment
   Variables:
   - `ANTHROPIC_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `ADMIN_PASSWORD` — pick your own; this gates `admin.html`
4. Redeploy after adding env vars (Vercel doesn't hot-reload them into an existing
   deployment).

You'll get a URL like `https://operation-bluebird.vercel.app`.

- Share `https://operation-bluebird.vercel.app` with the class — every team opens it,
  types a team name, plays, and submits.
- Only you open `https://operation-bluebird.vercel.app/admin.html` and log in with
  `ADMIN_PASSWORD` to see every team's full answer (department cuts, full method
  text, all scores, Claude's reasoning, timestamp).

## 3. Run it locally first (optional but recommended)

```bash
npm i -g vercel
cp .env.example .env.local   # fill in your real keys
vercel dev
```

Open http://localhost:3000 for the game and http://localhost:3000/admin.html for the
dashboard.

## Notes / things to know

- **Storage model:** submissions are stored one-per-team-name (a team resubmitting
  overwrites its previous entry — last attempt wins). If two teams use the same name,
  they'll overwrite each other, so ask students to use distinct team names.
- **Between classes:** click "Reset all data" in the admin panel (or call
  `POST /api/admin-reset` with the password) to clear old submissions before a new
  session.
- **Admin auth is intentionally simple** (a shared password sent in a request
  header) — fine for a low-stakes classroom tool, not meant for anything sensitive.
- **Rate/cost limits:** because this now calls the real Anthropic API with your own
  key rather than the in-artifact version, normal API rate limits and billing apply.
  For a single class session with a handful of teams this is trivial, but if you plan
  to reuse this across many sections, check current limits/pricing at
  docs.claude.com before relying on it at scale.
