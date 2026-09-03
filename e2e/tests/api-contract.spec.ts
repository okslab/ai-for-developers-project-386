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

interface ErrorResponse {
  code: string;
  message: string;
}

interface OpenApiParameter {
  name: string;
  in: string;
}

interface OpenApiOperation {
  parameters?: OpenApiParameter[];
  responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  paths: Record<
    string,
    {
      get?: OpenApiOperation;
      post?: OpenApiOperation;
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

test("slot availability starts at or after the requested grid boundary", async ({ request }) => {
  const createEventTypeResponse = await request.post(`${apiBaseUrl}/api/owner/event-types`, {
    data: {
      name: "Slot grid rounding regression",
      description: "Verifies that availability never starts before the lower bound.",
      durationMinutes: 30,
    },
  });
  expect(createEventTypeResponse.status()).toBe(201);
  const eventType = (await createEventTypeResponse.json()) as EventTypeResponse;

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(14, 11, 39, 0);

  const roundedBoundary = new Date(tomorrow);
  roundedBoundary.setUTCHours(14, 30, 0, 0);

  const rangeEnd = new Date(tomorrow);
  rangeEnd.setUTCHours(16, 0, 0, 0);

  const roundedResponse = await request.get(
    `${apiBaseUrl}/api/event-types/${eventType.id}/slots`,
    { params: { from: tomorrow.toISOString(), to: rangeEnd.toISOString() } },
  );
  expect(roundedResponse.ok()).toBeTruthy();
  const roundedSlots = (await roundedResponse.json()) as SlotResponse[];
  expect(roundedSlots.length).toBeGreaterThan(0);
  expect(Date.parse(roundedSlots[0].startsAt)).toBe(roundedBoundary.getTime());
  expect(
    roundedSlots.every((slot) => Date.parse(slot.startsAt) >= tomorrow.getTime()),
  ).toBeTruthy();

  const exactBoundaryResponse = await request.get(
    `${apiBaseUrl}/api/event-types/${eventType.id}/slots`,
    { params: { from: roundedBoundary.toISOString(), to: rangeEnd.toISOString() } },
  );
  expect(exactBoundaryResponse.ok()).toBeTruthy();
  const exactBoundarySlots = (await exactBoundaryResponse.json()) as SlotResponse[];
  expect(exactBoundarySlots.length).toBeGreaterThan(0);
  expect(Date.parse(exactBoundarySlots[0].startsAt)).toBe(roundedBoundary.getTime());
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

test("timezone-less datetime inputs return structured 422 responses", async ({ request }) => {
  const createEventTypeResponse = await request.post(`${apiBaseUrl}/api/owner/event-types`, {
    data: {
      name: "Aware datetime regression",
      description: "Rejects timestamps without timezone information.",
      durationMinutes: 30,
    },
  });
  expect(createEventTypeResponse.status()).toBe(201);
  const eventType = (await createEventTypeResponse.json()) as EventTypeResponse;

  const responses = [
    await request.post(`${apiBaseUrl}/api/bookings`, {
      data: {
        eventTypeId: eventType.id,
        startsAt: "2099-01-01T10:00:00",
        guestName: "Timezone Guest",
        guestEmail: "timezone@example.com",
      },
    }),
    await request.get(`${apiBaseUrl}/api/event-types/${eventType.id}/slots`, {
      params: { from: "2099-01-01T10:00:00" },
    }),
    await request.get(`${apiBaseUrl}/api/event-types/${eventType.id}/slots`, {
      params: { to: "2099-01-01T10:00:00" },
    }),
    await request.get(`${apiBaseUrl}/api/owner/bookings`, {
      params: { from: "2099-01-01T10:00:00" },
    }),
  ];

  for (const response of responses) {
    expect(response.status()).toBe(422);
    const error = (await response.json()) as ErrorResponse;
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toEqual(expect.any(String));
    expect(error.message.length).toBeGreaterThan(0);
    expect(Object.keys(error).sort()).toEqual(["code", "message"]);
  }
});

test("FastAPI OpenAPI declares expected error status codes", async ({ request }) => {
  const response = await request.get(`${apiBaseUrl}/api/openapi.json`);
  expect(response.ok()).toBeTruthy();
  const document = (await response.json()) as OpenApiDocument;

  const eventTypeDetail = Object.entries(document.paths).find(([path]) =>
    /^\/api\/event-types\/\{[^}]+\}$/.test(path),
  )?.[1];
  const slots = Object.entries(document.paths).find(([path]) =>
    /^\/api\/event-types\/\{[^}]+\}\/slots$/.test(path),
  )?.[1];

  expect(Object.keys(eventTypeDetail?.get?.responses ?? {})).toEqual(
    expect.arrayContaining(["200", "404"]),
  );
  expect(Object.keys(slots?.get?.responses ?? {})).toEqual(
    expect.arrayContaining(["200", "404", "422"]),
  );
  expect(Object.keys(document.paths["/api/bookings"]?.post?.responses ?? {})).toEqual(
    expect.arrayContaining(["201", "404", "409", "422"]),
  );
  expect(Object.keys(document.paths["/api/owner/event-types"]?.post?.responses ?? {})).toEqual(
    expect.arrayContaining(["201", "422"]),
  );
  expect(Object.keys(document.paths["/api/owner/bookings"]?.get?.responses ?? {})).toEqual(
    expect.arrayContaining(["200", "422"]),
  );
});
