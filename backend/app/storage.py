import threading
import uuid
from datetime import datetime, timedelta, timezone

from .models import Booking, BookingCreate, BookingWithEventType, EventType, EventTypeCreate, Slot

GRID_STEP_MINUTES = 30
DEFAULT_WINDOW_DAYS = 14


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


class Store:
    """Thread-safe in-memory store. Data is lost on restart (intentional for this step)."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._event_types: dict[str, EventType] = {}
        self._bookings: dict[str, Booking] = {}

    def create_event_type(self, payload: EventTypeCreate) -> EventType:
        with self._lock:
            event_type = EventType(
                id=str(uuid.uuid4()),
                name=payload.name,
                description=payload.description,
                durationMinutes=payload.durationMinutes,
            )
            self._event_types[event_type.id] = event_type
            return event_type

    def list_event_types(self) -> list[EventType]:
        with self._lock:
            return list(self._event_types.values())

    def get_event_type(self, event_type_id: str) -> EventType | None:
        with self._lock:
            return self._event_types.get(event_type_id)

    def _is_interval_free(
        self, start: datetime, end: datetime, *, exclude_booking_id: str | None = None
    ) -> bool:
        for booking in self._bookings.values():
            if exclude_booking_id is not None and booking.id == exclude_booking_id:
                continue
            if _overlaps(start, end, booking.startsAt, booking.endsAt):
                return False
        return True

    def list_slots(
        self, event_type: EventType, from_dt: datetime, to_dt: datetime
    ) -> list[Slot]:
        """Generate free slots on a 30-minute grid inside [from_dt, to_dt]."""
        with self._lock:
            slots: list[Slot] = []
            step = timedelta(minutes=GRID_STEP_MINUTES)
            start = from_dt
            # Align the first grid step to the fixed 30-minute boundaries.
            start = datetime.fromtimestamp(
                int(start.timestamp()) // (GRID_STEP_MINUTES * 60) * GRID_STEP_MINUTES * 60,
                tz=timezone.utc,
            )
            duration = timedelta(minutes=event_type.durationMinutes)
            t = start
            while t + duration <= to_dt:
                if self._is_interval_free(t, t + duration):
                    slots.append(
                        Slot(eventTypeId=event_type.id, startsAt=t, endsAt=t + duration)
                    )
                t += step
            return slots

    def create_booking(self, payload: BookingCreate) -> Booking:
        with self._lock:
            event_type = self._event_types.get(payload.eventTypeId)
            if event_type is None:
                return None  # signal: event type not found (404)
            now = utcnow()
            starts_at = payload.startsAt
            if starts_at < now or starts_at > now + timedelta(
                days=DEFAULT_WINDOW_DAYS
            ):
                return "OUTSIDE_WINDOW"
            ends_at = starts_at + timedelta(minutes=event_type.durationMinutes)
            if not self._is_interval_free(starts_at, ends_at):
                return "CONFLICT"
            booking = Booking(
                id=str(uuid.uuid4()),
                eventTypeId=event_type.id,
                startsAt=starts_at,
                endsAt=ends_at,
                guestName=payload.guestName,
                guestEmail=payload.guestEmail,
                createdAt=now,
            )
            self._bookings[booking.id] = booking
            return booking

    def list_upcoming(self, from_dt: datetime | None) -> list[BookingWithEventType]:
        with self._lock:
            now = utcnow()
            cutoff = from_dt if from_dt is not None else now
            upcoming: list[BookingWithEventType] = []
            for booking in self._bookings.values():
                if booking.endsAt < cutoff:
                    continue
                event_type = self._event_types.get(booking.eventTypeId)
                if event_type is None:
                    continue
                upcoming.append(
                    BookingWithEventType(
                        **booking.model_dump(),
                        eventTypeName=event_type.name,
                        eventTypeDescription=event_type.description,
                    )
                )
            upcoming.sort(key=lambda b: b.startsAt)
            return upcoming
