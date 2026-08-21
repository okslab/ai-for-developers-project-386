# Integration test scenarios (E2E)

This document captures the user scenarios that the Playwright integration tests
verify in a real browser, together with the backend and frontend running against
the shared OpenAPI contract. Scenarios map to the functional requirements in
[`../spec.md`](../spec.md).

Each scenario runs against a fresh backend instance (the backend uses an
in-memory store that is reset on restart), so tests are self-contained and
deterministic. Where a scenario needs an event type, the test creates it through
the owner UI first.

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

## Mapping to functional requirements

| Scenario | FR covered | API endpoints exercised via the UI |
|---|---|---|
| S1 | FR-1 | `POST /owner/event-types`, `GET /owner/event-types` |
| S2 | FR-3, FR-4, FR-5 | `GET /event-types`, `GET /event-types/{id}`, `GET /event-types/{id}/slots`, `POST /bookings` |
| S3 | FR-2 | `GET /owner/bookings` |
| S4 | FR-6 | `POST /bookings` → `409` |

## Running locally

See `README.md` in this directory for prerequisites and commands.
