import "@typespec/http";

using TypeSpec.Http;

namespace AppointmentBooking.Owner;

@route("/owner/event-types")
@tag("Owner")
@doc("Owner-only event type management. No authentication: the single fixed owner profile is assumed.")
namespace OwnerEventTypes {
  @doc("Create a new event type.")
  @post
  op create(
    @body body: EventTypeCreate,
  ): {
    @statusCode statusCode: 201;
    @body body: EventType;
  } | ValidationError;

  @doc("List all event types for the admin panel.")
  @get
  op list(): EventType[];
}

@route("/owner/bookings")
@tag("Owner")
@doc("List upcoming meetings across all event types (only bookings with endsAt >= now), enriched with event type name and description.")
@get
op listUpcoming(@query from?: utcDateTime): BookingWithEventType[] | ValidationError;
