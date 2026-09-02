import { expect, test } from "@playwright/test";

interface EventTypeResponse {
  id: string;
}

interface SlotResponse {
  startsAt: string;
}

interface BookingResponse {
  id: string;
}

interface OpenApiParameter {
  name: string;
  in: string;
}

interface OpenApiDocument {
  paths: Record<
    string,
    {
      get?: {
        parameters?: OpenApiParameter[];
      };
    }
  >;
}

const externalBaseUrl = process.env.E2E_EXTERNAL_BASE_URL?.replace(/\/$/, "");
const apiBaseUrl =
  externalBaseUrl ??
  process.env.E2E_API_URL ??
  `http://${process.env.E2E_API_HOST ?? "127.0.0.1"}:${process.env.E2E_API_PORT ?? "8000"}`;

test("contracted from query filters slots and owner bookings", async ({ request }) => {
  const createEventTypeResponse = await request.post(`${apiBaseUrl}/api/owner/event-types`, {
    data: {
      name: "Query filter regression",
      description: "Verifies the external from query parameter.",
      durationMinutes: 30,
    },
  });
  expect(createEventTypeResponse.status()).toBe(201);
  const eventType = (await createEventTypeResponse.json()) as EventTypeResponse;

  const slotsResponse = await request.get(
    `${apiBaseUrl}/api/event-types/${eventType.id}/slots`,
  );
  expect(slotsResponse.ok()).toBeTruthy();
  const slots = (await slotsResponse.json()) as SlotResponse[];
  const bookableSlot = slots.find((slot) => Date.parse(slot.startsAt) > Date.now() + 60_000);
  expect(bookableSlot, "expected a slot safely in the future").toBeDefined();
  if (!bookableSlot) return;

  const createBookingResponse = await request.post(`${apiBaseUrl}/api/bookings`, {
    data: {
      eventTypeId: eventType.id,
      startsAt: bookableSlot.startsAt,
      guestName: "Filter Guest",
      guestEmail: "filter@example.com",
    },
  });
  expect(createBookingResponse.status()).toBe(201);
  const booking = (await createBookingResponse.json()) as BookingResponse;

  const ownerBookingsResponse = await request.get(`${apiBaseUrl}/api/owner/bookings`);
  expect(ownerBookingsResponse.ok()).toBeTruthy();
  const ownerBookings = (await ownerBookingsResponse.json()) as BookingResponse[];
  expect(ownerBookings.some((candidate) => candidate.id === booking.id)).toBeTruthy();

  const futureFrom = "2099-01-01T00:00:00Z";
  const filteredSlotsResponse = await request.get(
    `${apiBaseUrl}/api/event-types/${eventType.id}/slots`,
    { params: { from: futureFrom } },
  );
  expect(filteredSlotsResponse.ok()).toBeTruthy();
  expect(await filteredSlotsResponse.json()).toEqual([]);

  const filteredOwnerBookingsResponse = await request.get(
    `${apiBaseUrl}/api/owner/bookings`,
    { params: { from: futureFrom } },
  );
  expect(filteredOwnerBookingsResponse.ok()).toBeTruthy();
  expect(await filteredOwnerBookingsResponse.json()).toEqual([]);
});

test("FastAPI OpenAPI publishes from instead of from_", async ({ request }) => {
  const response = await request.get(`${apiBaseUrl}/api/openapi.json`);
  expect(response.ok()).toBeTruthy();
  const document = (await response.json()) as OpenApiDocument;

  const slotsPath = Object.entries(document.paths).find(([path]) =>
    /^\/api\/event-types\/\{[^}]+\}\/slots$/.test(path),
  )?.[1];
  const ownerBookingsPath = document.paths["/api/owner/bookings"];

  for (const operation of [slotsPath?.get, ownerBookingsPath?.get]) {
    expect(operation, "expected GET operation in FastAPI OpenAPI").toBeDefined();
    const queryParameterNames =
      operation?.parameters
        ?.filter((parameter) => parameter.in === "query")
        .map((parameter) => parameter.name) ?? [];
    expect(queryParameterNames).toContain("from");
    expect(queryParameterNames).not.toContain("from_");
  }
});
