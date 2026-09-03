from datetime import datetime, timedelta
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    revision: str


class EventTypeCreate(BaseModel):
    name: str
    description: str
    durationMinutes: int = Field(gt=0)


class EventType(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    durationMinutes: int


class Slot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    eventTypeId: str
    startsAt: datetime
    endsAt: datetime


class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    eventTypeId: str
    startsAt: AwareDatetime
    guestName: str
    guestEmail: str


class Booking(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    eventTypeId: str
    startsAt: datetime
    endsAt: datetime
    guestName: str
    guestEmail: str
    createdAt: datetime


class BookingWithEventType(Booking):
    eventTypeName: str
    eventTypeDescription: str


class ErrorBody(BaseModel):
    code: str
    message: str
