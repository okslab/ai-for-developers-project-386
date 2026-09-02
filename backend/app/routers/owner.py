from fastapi import APIRouter, Depends, Query
from pydantic import AwareDatetime

from ..models import BookingWithEventType, ErrorBody, EventType, EventTypeCreate
from ..storage import Store
from .deps import get_store

router = APIRouter(tags=["Owner"])


@router.post(
    "/owner/event-types",
    status_code=201,
    response_model=EventType,
    responses={422: {"model": ErrorBody}},
)
def create_event_type(body: EventTypeCreate, store: Store = Depends(get_store)):
    return store.create_event_type(body)


@router.get("/owner/event-types", response_model=list[EventType])
def list_event_types(store: Store = Depends(get_store)):
    return store.list_event_types()


@router.get(
    "/owner/bookings",
    response_model=list[BookingWithEventType],
    responses={422: {"model": ErrorBody}},
)
def list_upcoming(
    from_: AwareDatetime | None = Query(default=None, alias="from"),
    store: Store = Depends(get_store),
):
    return store.list_upcoming(from_)
