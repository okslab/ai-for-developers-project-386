import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from app import storage
from app.main import app
from app.routers import guest
from app.routers.deps import get_store
from app.storage import Store


FIXED_NOW = datetime(2026, 9, 3, 10, 7, tzinfo=timezone.utc)


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.storage_now = patch.object(storage, "utcnow", return_value=FIXED_NOW)
        self.guest_now = patch.object(guest, "utcnow", return_value=FIXED_NOW)
        self.storage_now.start()
        self.guest_now.start()

        test_store = Store()
        app.dependency_overrides[get_store] = lambda: test_store
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.guest_now.stop()
        self.storage_now.stop()

    def create_event_type(
        self,
        *,
        name: str = "Consultation",
        duration_minutes: int = 30,
    ) -> dict:
        response = self.client.post(
            "/api/owner/event-types",
            json={
                "name": name,
                "description": f"{name} description",
                "durationMinutes": duration_minutes,
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    def booking_payload(
        self,
        event_type_id: str,
        starts_at: str,
        *,
        guest_name: str = "Jane",
    ) -> dict:
        return {
            "eventTypeId": event_type_id,
            "startsAt": starts_at,
            "guestName": guest_name,
            "guestEmail": f"{guest_name.lower()}@example.com",
        }

    def test_event_type_create_list_detail_and_not_found(self):
        event_type = self.create_event_type()

        self.assertEqual(self.client.get("/api/event-types").json(), [event_type])
        self.assertEqual(self.client.get("/api/owner/event-types").json(), [event_type])
        self.assertEqual(
            self.client.get(f"/api/event-types/{event_type['id']}").json(),
            event_type,
        )

        missing = self.client.get("/api/event-types/missing")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(
            missing.json(),
            {
                "code": "NOT_FOUND",
                "message": "Event type missing not found",
            },
        )

    def test_health_reports_injected_revision(self):
        with patch.dict(os.environ, {"APP_REVISION": "test-revision"}):
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "revision": "test-revision"},
        )

    def test_health_uses_unknown_when_revision_is_absent(self):
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "revision": "unknown"})

    def test_slots_round_up_and_honor_contracted_from_filter(self):
        event_type = self.create_event_type()

        response = self.client.get(f"/api/event-types/{event_type['id']}/slots")
        self.assertEqual(response.status_code, 200)
        slots = response.json()
        self.assertEqual(slots[0]["startsAt"], "2026-09-03T10:30:00Z")
        self.assertTrue(
            all(datetime.fromisoformat(slot["startsAt"]) >= FIXED_NOW for slot in slots)
        )

        filtered = self.client.get(
            f"/api/event-types/{event_type['id']}/slots",
            params={
                "from": "2026-09-03T11:11:39Z",
                "to": "2026-09-03T13:00:00Z",
            },
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.json()[0]["startsAt"], "2026-09-03T11:30:00Z")

    def test_booking_normalizes_offset_and_appears_in_owner_list(self):
        event_type = self.create_event_type()

        response = self.client.post(
            "/api/bookings",
            json=self.booking_payload(
                event_type["id"],
                "2026-09-03T13:30:00+03:00",
            ),
        )
        self.assertEqual(response.status_code, 201)
        booking = response.json()
        self.assertEqual(booking["startsAt"], "2026-09-03T10:30:00Z")
        self.assertEqual(booking["endsAt"], "2026-09-03T11:00:00Z")

        owner_bookings = self.client.get("/api/owner/bookings")
        self.assertEqual(owner_bookings.status_code, 200)
        self.assertEqual(
            owner_bookings.json(),
            [
                {
                    **booking,
                    "eventTypeName": event_type["name"],
                    "eventTypeDescription": event_type["description"],
                }
            ],
        )

        filtered = self.client.get(
            "/api/owner/bookings",
            params={"from": "2026-09-03T11:00:01Z"},
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.json(), [])

    def test_booking_rejects_off_grid_start(self):
        event_type = self.create_event_type()
        off_grid_starts = [
            "2026-09-03T10:37:00Z",
            "2026-09-03T11:00:12Z",
            "2026-09-03T11:00:00.100Z",
        ]

        for starts_at in off_grid_starts:
            with self.subTest(starts_at=starts_at):
                response = self.client.post(
                    "/api/bookings",
                    json=self.booking_payload(event_type["id"], starts_at),
                )
                self.assertEqual(response.status_code, 422)
                self.assertEqual(
                    response.json(),
                    {
                        "code": "VALIDATION_ERROR",
                        "message": (
                            "Slot start time must align to a 30-minute UTC grid boundary"
                        ),
                    },
                )

    def test_booking_rejects_timezone_less_start_with_structured_error(self):
        event_type = self.create_event_type()

        response = self.client.post(
            "/api/bookings",
            json=self.booking_payload(event_type["id"], "2026-09-03T10:30:00"),
        )
        self.assertEqual(response.status_code, 422)
        error = response.json()
        self.assertEqual(error["code"], "VALIDATION_ERROR")
        self.assertIn("startsAt", error["message"])
        self.assertEqual(set(error), {"code", "message"})

    def test_booking_rejects_interval_ending_after_window(self):
        event_type = self.create_event_type(duration_minutes=60)
        last_grid_start_inside_window = FIXED_NOW + timedelta(days=14)
        last_grid_start_inside_window = last_grid_start_inside_window.replace(
            minute=0,
            second=0,
            microsecond=0,
        )

        response = self.client.post(
            "/api/bookings",
            json=self.booking_payload(
                event_type["id"],
                last_grid_start_inside_window.isoformat(),
            ),
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json(),
            {
                "code": "OUTSIDE_WINDOW",
                "message": (
                    "The complete booking interval must fit inside the 14-day booking window"
                ),
            },
        )

    def test_overlapping_bookings_across_event_types_return_conflict(self):
        long_event = self.create_event_type(name="Deep dive", duration_minutes=60)
        short_event = self.create_event_type(name="Quick check-in", duration_minutes=30)

        first = self.client.post(
            "/api/bookings",
            json=self.booking_payload(
                long_event["id"],
                "2026-09-03T10:30:00Z",
                guest_name="Alice",
            ),
        )
        self.assertEqual(first.status_code, 201)

        conflict = self.client.post(
            "/api/bookings",
            json=self.booking_payload(
                short_event["id"],
                "2026-09-03T11:00:00Z",
                guest_name="Bob",
            ),
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(
            conflict.json(),
            {
                "code": "CONFLICT",
                "message": "Selected slot is already booked",
            },
        )

        slots = self.client.get(f"/api/event-types/{short_event['id']}/slots").json()
        self.assertNotIn(
            "2026-09-03T11:00:00Z",
            {slot["startsAt"] for slot in slots},
        )

    def test_fastapi_openapi_exposes_contracted_parameters_and_errors(self):
        document = self.client.get("/api/openapi.json").json()
        health_operation = document["paths"]["/api/health"]["get"]
        health_response = health_operation["responses"]["200"]["content"][
            "application/json"
        ]["schema"]
        self.assertEqual(
            health_response,
            {"$ref": "#/components/schemas/HealthResponse"},
        )

        slots_operation = document["paths"][
            "/api/event-types/{event_type_id}/slots"
        ]["get"]
        query_names = {
            parameter["name"]
            for parameter in slots_operation["parameters"]
            if parameter["in"] == "query"
        }
        self.assertEqual(query_names, {"from", "to"})

        booking_responses = document["paths"]["/api/bookings"]["post"]["responses"]
        self.assertLessEqual({"201", "404", "409", "422"}, set(booking_responses))


if __name__ == "__main__":
    unittest.main()
