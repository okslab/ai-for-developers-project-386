import "@typespec/http";
import "@typespec/openapi";

import "./models.tsp";
import "./guest.tsp";
import "./owner.tsp";
import "./system.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Appointment Booking API" })
@info(#{ version: "1.0.0" })
@doc("Single-owner appointment booking API. Guests browse event types, pick a free slot within a 14-day booking window and create bookings; the fixed owner profile manages event types and views upcoming meetings. No authentication.")
@server("", "Local development server; the backend host is configured at runtime.")
@route("/api")
namespace AppointmentBooking;
