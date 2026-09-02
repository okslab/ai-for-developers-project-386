# Integration test scenarios (E2E)

This document captures the user scenarios that the Playwright integration tests
verify in a real browser, together with the backend and frontend running against
the shared OpenAPI contract. Scenarios map to the functional requirements in
[`../spec.md`](../spec.md).

The suite runs against one shared backend instance (the backend uses an in-memory
store that is reset when the suite restarts). Tests run serially with one worker,
create their own event types through the owner UI and select distinct intervals
where needed so that state from an earlier scenario does not make a later one
non-deterministic.

## Scenario S1 — Owner creates an event type (FR-1)

Steps:

1. Owner opens the "Event types" admin page (`/owner`).
2. Owner fills in name, description and duration (minutes).
3. Owner submits the form.
4. The new event type appears in the list of existing event types.

Result: the event type is created and becomes available to guests on the booking
kinds page.

## Scenario S2 — Guest books a free slot (FR-3, FR-4, FR-5)

Steps:

1. Guest opens the booking kinds page (`/`).
2. Guest sees the event type (name, description, duration).
3. Guest selects the event type.
4. The calendar shows free slots within the 14-day booking window.
5. Guest picks a free slot and enters name + email.
6. Guest confirms the booking.
7. A confirmation page ("You're booked!") is shown.

Result: the booking is created and confirmed.

## Scenario S3 — Owner sees the upcoming meeting (FR-2)

Steps:

1. A guest completes a booking for a slot (as in S2).
2. Owner opens the upcoming meetings page (`/owner/bookings`).
3. The booked meeting appears in the list, enriched with the event type name and
   the guest's name and email.

Result: the owner sees the newly booked meeting in the upcoming list.

## Scenario S4 — Booking the same slot twice is rejected (FR-6)

Steps:

1. Two browser pages open the same event type and both select the same free
   slot (the slot is still shown as free on both, since neither has booked yet).
2. The first page confirms the booking and sees the confirmation page.
3. The second page confirms the same slot.
4. The occupancy rule is enforced server-side: the second attempt returns a
   `409` conflict and the UI shows the error message "This time has just been
   taken — please pick another slot."

Result: overlapping bookings are rejected and the conflict is surfaced to the
guest.

## Scenario S5 — Overlap between different event types is rejected (FR-6)

Steps:

1. The owner creates a 60-minute event type and a separate 30-minute event type.
2. Two browser pages load free slots for the two types before either page books.
3. The pages select slots with different start times whose intervals overlap.
4. The first page confirms its booking and sees the confirmation page.
5. The second page tries to confirm its stale, overlapping slot.
6. The server returns `409`, the UI displays the conflict message and refreshes
   the second event type's availability.
7. The refreshed slot list no longer contains intervals overlapping the booking.

Result: the owner's occupancy is global across event types and is enforced both
when creating a booking and when listing free slots.

## Mapping to functional requirements

| Scenario | FR covered | API endpoints exercised via the UI |
|---|---|---|
| S1 | FR-1 | `POST /api/owner/event-types`, `GET /api/owner/event-types` |
| S2 | FR-3, FR-4, FR-5 | `GET /api/event-types`, `GET /api/event-types/{id}`, `GET /api/event-types/{id}/slots`, `POST /api/bookings` |
| S3 | FR-2 | `GET /api/owner/bookings` |
| S4 | FR-6 | `POST /api/bookings` → `409` |
| S5 | FR-6 | `GET /api/event-types/{id}/slots`, `POST /api/bookings` → `201`, `409` |

## Running locally

See `README.md` in this directory for prerequisites and commands.
