# Backend — Appointment Booking API

FastAPI implementation of the API contract in `contract/openapi/openapi.yaml`
(single source of truth: `contract/` TypeSpec). Uses **in-memory storage** — data is
reset on restart (intentional for this step).

## Stack

- Python 3.12+, FastAPI, Pydantic v2
- No database; a thread-safe in-memory store (`app/storage.py`)

## Run

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Docs (Swagger UI): http://localhost:8000/api/docs
- OpenAPI: http://localhost:8000/api/openapi.json
- Health: http://localhost:8000/api/health

`GET /api/health` reads the source revision from `APP_REVISION`. When the variable is
unset or empty, the endpoint reports `unknown`, which keeps local development working
without deployment metadata.

Point the frontend at the backend by setting
`VITE_API_BASE_URL=http://localhost:8000` in `frontend/.env`.

## Test

The backend API suite uses a fresh in-memory store for every test:

```bash
.venv/bin/pip install -r requirements-test.txt
.venv/bin/python -m unittest discover -s tests -v
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Health status and deployed Git revision |
| POST | `/api/owner/event-types` | Create event type → `201` |
| GET | `/api/owner/event-types` | List event types (admin) |
| GET | `/api/owner/bookings` | Upcoming meetings (`endsAt >= from`, optional `from`) |
| GET | `/api/event-types` | Booking-kinds page |
| GET | `/api/event-types/{id}` | Single event type; `404` if missing |
| GET | `/api/event-types/{id}/slots` | Free slots in 14-day window (`from`/`to` clamped) |
| POST | `/api/bookings` | Create booking; `201`/`404`/`409`/`422` |

## Business rules

- **Occupancy rule:** no two bookings may overlap in time, even across event types;
  enforced server-side at creation (`409` on overlap) and reflected in slot listings.
- **Booking window:** slots generated on a 30-minute grid for 14 calendar days from
  server "now" (UTC); `POST /api/bookings` rejects start times outside the window (`422`).
- **Timestamps:** client-supplied date-times must include a timezone designator or numeric
  offset; timezone-less values are rejected with `422`.
- **Duration** always comes from the event type; `endsAt` is derived server-side.
- **Expected errors** use a top-level JSON object with string `code` and `message` fields.
