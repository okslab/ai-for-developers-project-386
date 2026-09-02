# Appointment Booking — Functional Specification

## Overview

The application is a single-owner appointment/calendar booking service (Calendly-like).
There is **no registration and no authentication**: the calendar owner is a single
pre-defined profile that is used by default in the admin part, and guests book slots
without creating an account or logging in.

The project follows a **Design First** approach. This document defines the functional
behaviour of the system; the exact API contract that frontend and backend agree on is the
TypeSpec specification in [`contract/`](./contract/), which compiles to OpenAPI
(`contract/openapi/openapi.yaml`). `spec.md` is the source of truth for *behaviour*,
the TypeSpec contract is the source of truth for the *API surface*.

## Roles

### Owner (calendar owner)

A single, pre-configured profile. Used implicitly by the admin section of the application.
No identification or login is required to use owner endpoints — this is an explicit
out-of-scope simplification (see [Out of scope](#out-of-scope)).

The owner can:

- Create event types. For each event type the owner provides: id, name, description and
  duration in minutes.
- View an upcoming meetings page that shows bookings of **all** event types in one list.

### Guest

An anonymous user. Does not register and does not log in.

The guest can:

- View the booking-kinds page, which shows, for each event type: name, description and
  duration.
- Pick an event type, open the calendar and select a free slot within the next 14 days.
- Create a booking for the selected slot.

## Booking window (default)

- Available slots are generated for a window of **14 calendar days** starting with the
  current date (server time).
- A guest may only book a free slot that falls inside this window.
- The booking window is computed server-side using the server timezone (default: UTC).
  All timestamps in the API are ISO 8601 in UTC (`utcDateTime`).
- Every timestamp supplied by a client must include a timezone designator or numeric
  offset. Timezone-less timestamps are rejected with a structured `422` response.

## Occupancy rule

- **No two bookings may overlap in time, even if they belong to different event types.**
- The occupancy check applies to time intervals: a booking of event type `E` starting at
  `T` occupies `[T, T + duration(E))`. A candidate slot of any other event type is free
  only if its interval does not intersect any existing booking interval.
- The rule is enforced authoritatively on the server at booking creation time
  (protected against race conditions), and is reflected in the slot listings.

## Slot grid (default behaviour)

- Candidate slots are generated on a fixed grid of **30-minute** steps inside the booking
  window.
- A slot of event type `E` starting at `T` is available if `[T, T + duration(E))` does not
  overlap any existing booking.
- Slot start times are validated by the server; a client cannot create bookings of an
  arbitrary duration (duration always comes from the event type).

## Domain entities

| Entity | Fields | Notes |
|--------|--------|-------|
| `EventType` | `id`, `name`, `description`, `durationMinutes` | Duration is a positive number of minutes. `id` is server-generated (UUID). |
| `Slot` | `eventTypeId`, `startsAt`, `endsAt` | A free interval for one event type; `endsAt = startsAt + durationMinutes`. |
| `Booking` | `id`, `eventTypeId`, `startsAt`, `endsAt`, `guestName`, `guestEmail`, `createdAt` | Server derives `endsAt` from the event type duration. |
| `BookingWithEventType` | all `Booking` fields + `eventTypeName`, `eventTypeDescription` | Owner's upcoming meetings view. |

## Functional requirements

### FR-1 — Owner: create event type

Given the owner provides a name, description and duration in minutes,
the system creates an event type with a server-generated id.
The created event type is available to guests on the booking-kinds page.

API: `POST /api/owner/event-types`.

### FR-2 — Owner: view upcoming meetings

Given there are bookings of one or more event types, the owner sees a single list of
upcoming meetings (only bookings whose `endsAt` is in the future), each enriched with its
event type name and description.

API: `GET /api/owner/bookings`.

### FR-3 — Guest: view booking kinds

Given one or more event types exist, the guest sees a list with the event type name,
description and duration.

API: `GET /api/event-types`.

### FR-4 — Guest: pick event type and browse free slots

Given the guest selects an event type, the system shows the calendar of free slots for the
next 14 days (default booking window). Slot list is computed with the occupancy rule
FR-6 applied across all event types.

API: `GET /api/event-types/{eventTypeId}/slots` (optional `from`/`to` query params clamped to
the 14-day window).

### FR-5 — Guest: create a booking

Given the guest chooses a free slot and provides a name and email, the system creates a
booking for the slot.

- Success: `201`, the created booking.
- `404`: event type does not exist.
- `409` (conflict): the slot time is already taken by any booking (intervals overlap).
- `422`: request validation failed or the requested start is outside the booking window.

All expected domain and validation errors use a top-level `{ code, message }` JSON object.
The TypeSpec contract declares the status code and body for each expected `404`, `409`
and `422`.

API: `POST /api/bookings`.

### FR-6 — Occupancy rule

No two bookings may overlap in time, even for different event types.
Enforced server-side (see [Occupancy rule](#occupancy-rule)).

### FR-7 — Booking window

Free slots are formed for 14 calendar days starting from the current date
(see [Booking window (default)](#booking-window-default)).

## API Contract Coverage

| Requirement | Endpoint |
|---|---|
| FR-1 — Owner: create event type (id, name, description, durationMinutes) | `POST /api/owner/event-types` (payload `EventTypeCreate`) |
| FR-2 — Owner: upcoming meetings across all event types | `GET /api/owner/bookings` (`endsAt >= now`; returns `BookingWithEventType[]`) |
| FR-3 — Guest: booking-kinds page (name, description, duration) | `GET /api/event-types` |
| FR-4 — Guest: calendar of free slots in the 14-day window | `GET /api/event-types/{eventTypeId}/slots` (default `from = now`, `to = now + 13 days`) |
| FR-5 — Guest: create a booking for a selected slot | `POST /api/bookings` → `201`; errors `404`, `409`, `422` |
| FR-6 — Occupancy rule (no overlaps across event types) | `POST /api/bookings` → `409` on overlap; slot listing excludes busy times |
| FR-7 — Booking window (14 days from current date) | `GET /api/event-types/{eventTypeId}/slots` window; `POST /api/bookings` validates `startsAt` inside the window |
| No registration / no authentication | No auth headers, tokens or fields anywhere in the contract |

Coverage: **all owner and guest scenarios map to endpoints; see table above.**

## Out of scope

- Registration, authentication and authorization (the fixed owner profile is assumed).
- Booking cancellation and rescheduling.
- Working-hours / business-hours restrictions on the slot grid.
- Email notifications to the owner or the guest.
- Multi-calendar or multi-owner support.

## References

- TypeSpec contract: `contract/` (`main.tsp`, `models.tsp`, `guest.tsp`, `owner.tsp`).
- Generated OpenAPI: `contract/openapi/openapi.yaml`.
