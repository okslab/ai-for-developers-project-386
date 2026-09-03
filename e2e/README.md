# Integration tests (E2E)

Playwright end-to-end tests that drive the real frontend against the real
backend in a browser. They cover the core booking journey end to end.

Scenarios are described in [`SCENARIOS.md`](./SCENARIOS.md).

## Prerequisites

- Node.js ≥ 24.18 and npm ≥ 10. CI and the production build use Node.js
  24.18.0.
- Python 3.12+ with the backend dependencies installed (see
  [`../backend/README.md`](../backend/README.md)).

## Install

```bash
npm ci
npx playwright install chromium
```

## Run

`npm test` starts the backend and frontend automatically (via Playwright
`webServer`) and runs the tests headless:

```bash
npm test
```

Useful flags:

```bash
npm test -- --headed        # watch the browser
npm test -- --grep "guest"  # run only the guest scenarios
```

## Configuration

- Backend API: `http://127.0.0.1:8000` (override with `E2E_API_URL` /
  `E2E_API_PORT`).
- Frontend: `http://127.0.0.1:5173` (override with `E2E_WEB_PORT`).
- Set `E2E_EXTERNAL_BASE_URL` to test an already running combined deployment
  such as the production Docker container; Playwright then does not start its
  own Vite or Uvicorn processes.
- The frontend is pointed at the backend via `VITE_API_BASE_URL`, set by the
  Playwright `webServer` entry, so no `.env` is needed.

In CI the frontend and backend are started by Playwright inside the same job
(see `.github/workflows/e2e.yml`).

## Read-only production smoke

`scripts/public-production-smoke.mjs` checks a combined public deployment without
changing its in-memory state:

```bash
node scripts/public-production-smoke.mjs <base-url> [expected-revision]
```

When `expected-revision` is present, it must exactly match the `revision` returned by
`GET /api/health`. The script also verifies JSON API routes and the HTML SPA fallback.
Its focused regression tests use Node's built-in test runner:

```bash
node --test scripts/public-production-smoke.test.mjs
```
