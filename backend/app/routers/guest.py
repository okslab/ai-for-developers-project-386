from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import AwareDatetime

from ..models import Booking, BookingCreate, ErrorBody, EventType, Slot
from ..storage import Store, utcnow
from .deps import get_store

router = APIRouter(tags=["Guest"])

WINDOW_DAYS = 14


def _error(status_code: int, code: str, message: str):
    raise HTTPException(
        status_code=status_code, detail={"code": code, "message": message}
    )


@router.get("/event-types", response_model=list[EventType])
def list_event_types(store: Store = Depends(get_store)):
    return store.list_event_types()


@router.get(
    "/event-types/{event_type_id}",
    response_model=EventType,
    responses={404: {"model": ErrorBody}},
)
def get_event_type(event_type_id: str, store: Store = Depends(get_store)):
    event_type = store.get_event_type(event_type_id)
    if event_type is None:
        _error(404, "NOT_FOUND", f"Event type {event_type_id} not found")
    return event_type


@router.get(
    "/event-types/{event_type_id}/slots",
    response_model=list[Slot],
    responses={404: {"model": ErrorBody}, 422: {"model": ErrorBody}},
)
def list_slots(
    event_type_id: str,
    from_: AwareDatetime | None = Query(default=None, alias="from"),
    to: AwareDatetime | None = None,
    store: Store = Depends(get_store),
):
    event_type = store.get_event_type(event_type_id)
    if event_type is None:
        _error(404, "NOT_FOUND", f"Event type {event_type_id} not found")

    now = utcnow()
    window_end = now + timedelta(days=WINDOW_DAYS)
    from_dt = max(from_, now) if from_ is not None else now
    to_dt = min(to, window_end) if to is not None else window_end

    if from_dt >= to_dt:
        return []

    return store.list_slots(event_type, from_dt, to_dt)


@router.post(
    "/bookings",
    status_code=201,
    response_model=Booking,
    responses={
        404: {"model": ErrorBody},
        409: {"model": ErrorBody},
        422: {"model": ErrorBody},
    },
)
def create_booking(body: BookingCreate, store: Store = Depends(get_store)):
    result = store.create_booking(body)
    if result is None:
        _error(404, "NOT_FOUND", f"Event type {body.eventTypeId} not found")
    if result == "OFF_GRID":
        _error(
            422,
            "VALIDATION_ERROR",
            "Slot start time must align to a 30-minute UTC grid boundary",
        )
    if result == "OUTSIDE_WINDOW":
        _error(
            422,
            "OUTSIDE_WINDOW",
            "The complete booking interval must fit inside the 14-day booking window",
        )
    if result == "CONFLICT":
        _error(409, "CONFLICT", "Selected slot is already booked")
    return result
