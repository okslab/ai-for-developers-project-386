import "@typespec/http";

using TypeSpec.Http;

namespace AppointmentBooking.Guest;

@route("/event-types")
@tag("Guest")
@doc("Booking-kinds page for guests: name, description and duration of every event type.")
namespace EventTypes {
  @doc("List all bookable event types shown on the guest booking-kinds page.")
  @get
  op list(): EventType[];

  @doc("Get a single event type by id.")
  @get
  op get(@path eventTypeId: string): EventType | NotFoundError;
}

@route("/event-types/{eventTypeId}/slots")
@tag("Guest")
@doc("List free slots for an event type within the 14-day booking window (from/to optional, clamped to the window).")
@get
op listSlots(
  @path eventTypeId: string,
  @query from?: utcDateTime,
  @query to?: utcDateTime,
): Slot[] | NotFoundError | ValidationError;

@route("/bookings")
@tag("Guest")
@doc("Create a booking for a free slot. 201 on success, 409 on overlap with any event type, 404 if the event type does not exist, 422 for validation errors such as a start time outside the 14-day window.")
namespace Bookings {
  @post
  op create(
    @body body: BookingCreate,
  ): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | NotFoundError | ConflictError | ValidationError;
}
