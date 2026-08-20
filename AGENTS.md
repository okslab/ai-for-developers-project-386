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
- **Backend (planned):** Python 3.12, FastAPI, SQLite.
- **Frontend (planned):** React (Vite), TypeScript; client types generated from the OpenAPI spec.
- The repo root has **no** package.json — `contract/` owns the only npm project.

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

## Workflow

- Work on `main`; push to trigger Hexlet CI.
- When the API changes, update the TypeSpec contract first, regenerate
  `openapi/openapi.yaml` (`npm run build`), and keep `spec.md` in sync.
