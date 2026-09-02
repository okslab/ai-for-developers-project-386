# AGENTS.md

## Project

Appointment booking calendar (Calendly-like) with a single fixed calendar owner and
anonymous guests. There is **no registration or authentication**: owner endpoints assume
the pre-configured owner profile; guests book without an account. Functional requirements
live in [`spec.md`](./spec.md) (English).

## Approach: Design First

Frontend and backend are separate and communicate through an API contract defined in
TypeSpec. The contract is the single source of truth for both parts.

- [`spec.md`](./spec.md) — behaviour: roles, scenarios, occupancy rule, 14-day booking window.
- [`contract/`](./contract/) — TypeSpec specification (`main.tsp`, `models.tsp`,
  `guest.tsp`, `owner.tsp`). Authoritative representation of the API.
- `contract/openapi/openapi.yaml` — **generated** OpenAPI 3.0 artifact (checked in) that
  backend and frontend implement against.

## Stack

- **Contract:** TypeSpec 1.x (Node ≥ 20). Build with `cd contract && npm install && npm run build`
  (regenerates `openapi/openapi.yaml`); `npm run check` treats warnings as errors.
- **Backend:** Python 3.12+, FastAPI (in-memory store; see `backend/README.md`).
- **Frontend:** React (Vite), TypeScript; client types generated from the OpenAPI spec.
- **E2E:** Playwright (`e2e/`), drives the real frontend against the real backend.
- The repo root has **no** package.json — `contract/`, `frontend/` and `e2e/` each own their own npm project.

## Hexlet CI — do not touch

- `.github/workflows/hexlet-check.yml` and `.github/workflows/README.md` are auto-generated
  by Hexlet and must not be edited, deleted, or renamed. Do not rename the repository — it
  breaks the check.
- Tests run **remotely** via `hexlet/project-action` on every push (needs `HEXLET_ID`
  secret). There is no local test suite; the way to verify work is committing, pushing, and
  checking the GitHub Action / Hexlet UI.

## Local tooling (not project infrastructure)

- `opencode.jsonc` is a workspace-local OpenCode config (private LAN model endpoints,
  orchestrator/subagent definitions), currently **untracked**. It is environment tooling,
  not part of the project — don't treat its endpoints or entries as project config, and
  don't fold it into project commits.

## E2E integration tests

- User-scenario tests live in [`e2e/`](./e2e/) (Playwright) and cover the core booking
  journey in a real browser: owner creates an event type, guest books a slot, owner sees
  the upcoming meeting. Scenarios are in [`e2e/SCENARIOS.md`](./e2e/SCENARIOS.md).
- Run locally with `cd e2e && npm install && npx playwright install chromium && npm test`
  (needs backend deps installed — see `backend/README.md`; point the backend interpreter
  at it with `E2E_PYTHON` if not `python3`).
- `.github/workflows/e2e.yml` runs them on every push/PR against a freshly started
  backend + frontend.

## Commits & releases

- **Every commit, including agent-authored ones, MUST follow Conventional Commits:**
  - `feat:` — a new user-visible feature (bumps minor in a release).
  - `fix:` — a bug fix (bumps patch in a release).
  - `refactor:`, `chore:`, `docs:`, `test:`, `build:`, `ci:`, `perf:`, `style:` —
    non-versioned maintenance; do not use these for user-facing changes.
  - Scope is optional but encouraged, e.g. `feat(guest): add slot booking`.
  - Breaking changes add `!` or a `BREAKING CHANGE:` footer and bump major.
- **Releases are automated with release-please** (`.github/workflows/release-please.yml`).
  It runs on `main`, reads the Conventional Commits history, and maintains a release-PR
  with a generated `CHANGELOG.md` and a semver bump. Merging the release-PR publishes a
  GitHub release and tags the commit. Never bump versions or edit `CHANGELOG.md` by hand —
  let release-please do it.

## Workflow

- Start every change from an up-to-date `main` and create a dedicated feature branch
  (Codex-authored branches use the `codex/` prefix). The `dev` branch is no longer part
  of the development or integration workflow and must not be used as a base or target.
- Push the feature branch to trigger Hexlet CI and the e2e CI, then open a pull request
  with `main` as its base. Never commit or push directly to `main`.
- Keep the pull request title and commits in Conventional Commits format so the merge
  into `main` is interpreted correctly by release-please. Pushes to `main` additionally
  trigger release-please.
- When the API changes, update the TypeSpec contract first, regenerate
  `openapi/openapi.yaml` (`npm run build`), and keep `spec.md` in sync.
