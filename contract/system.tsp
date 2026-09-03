import "@typespec/http";

using TypeSpec.Http;

namespace AppointmentBooking.System;

@route("/health")
@tag("System")
@doc("Report service health and the source revision running in this deployment.")
@get
op getHealth(): HealthResponse;
