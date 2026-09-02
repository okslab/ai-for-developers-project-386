import { expect, test, type Page } from "@playwright/test";

interface SlotResponse {
  eventTypeId: string;
  startsAt: string;
  endsAt: string;
}

async function createEventType(
  page: Page,
  name: string,
  description: string,
  durationMinutes: number,
): Promise<void> {
  await page.goto("/owner");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Duration (minutes)").fill(String(durationMinutes));
  await page.getByRole("button", { name: "Create event type" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

// Picks a free slot by its index in the rendered grid. Index 0 is skipped
// because the backend aligns the grid to 30-minute boundaries and the first
// slot may already be in the past (which would make booking return 422).
// Using distinct indexes per test also avoids cross-event-type occupancy
// conflicts, since the tests share one backend instance.
async function selectSlot(
  page: Page,
  eventTypeName: string,
  slotIndex: number,
): Promise<void> {
  await page.goto("/");
  await page.getByText(eventTypeName, { exact: true }).click();
  await expect(page.getByRole("heading", { name: eventTypeName })).toBeVisible();

  const slot = page.getByRole("button", { name: /–/ }).nth(slotIndex);
  await expect(slot).toBeVisible();
  await slot.click();
}

async function openEventTypeAndReadSlots(
  page: Page,
  eventTypeName: string,
): Promise<SlotResponse[]> {
  await page.goto("/");
  const slotsResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/event-types\/[^/]+\/slots$/.test(new URL(response.url()).pathname),
  );
  await page.getByText(eventTypeName, { exact: true }).click();
  await expect(page.getByRole("heading", { name: eventTypeName })).toBeVisible();

  const slotsResponse = await slotsResponsePromise;
  expect(slotsResponse.ok()).toBeTruthy();
  return slotsResponse.json() as Promise<SlotResponse[]>;
}

function intervalsOverlap(first: SlotResponse, second: SlotResponse): boolean {
  return (
    Date.parse(first.startsAt) < Date.parse(second.endsAt) &&
    Date.parse(second.startsAt) < Date.parse(first.endsAt)
  );
}

async function selectExactSlot(page: Page, slot: SlotResponse): Promise<void> {
  const labels = await page.evaluate(({ startsAt, endsAt }) => {
    const dayFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
    return {
      day: dayFormatter.format(new Date(startsAt)),
      interval: `${timeFormatter.format(new Date(startsAt))} – ${timeFormatter.format(new Date(endsAt))}`,
    };
  }, slot);

  const dayGroup = page.getByText(labels.day, { exact: true }).locator("..");
  const slotButton = dayGroup.getByRole("button", { name: labels.interval, exact: true });
  await expect(slotButton).toBeVisible();
  await slotButton.click();
}

async function bookSlot(
  page: Page,
  eventTypeName: string,
  guestName: string,
  guestEmail: string,
  slotIndex: number,
): Promise<void> {
  await selectSlot(page, eventTypeName, slotIndex);
  await page.getByLabel("Your name").fill(guestName);
  await page.getByLabel("Your email").fill(guestEmail);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "You're booked!" })).toBeVisible();
}

test("S1: owner creates an event type and it appears in the list", async ({ page }) => {
  await createEventType(page, "Team sync", "A short team sync.", 30);
  await expect(page.getByText("Team sync", { exact: true })).toBeVisible();
  await expect(page.getByText("30 min")).toBeVisible();
});

test("S2: guest books a free slot and sees a confirmation", async ({ page }) => {
  await createEventType(page, "Intro call", "A 30-minute intro call.", 30);
  await bookSlot(page, "Intro call", "Jane Doe", "jane@example.com", 2);

  await expect(page.getByRole("heading", { name: "You're booked!" })).toBeVisible();
  await expect(page.getByText("Jane Doe", { exact: true })).toBeVisible();
  await expect(page.getByText("jane@example.com", { exact: true })).toBeVisible();
});

test("S3: owner sees the booked meeting on the upcoming page", async ({ page }) => {
  await createEventType(page, "Consultation", "A 45-minute consultation.", 45);
  await bookSlot(page, "Consultation", "John Smith", "john@example.com", 4);

  await page.goto("/owner/bookings");
  await expect(page.getByRole("heading", { name: "Upcoming meetings" })).toBeVisible();
  await expect(page.getByText("Consultation", { exact: true })).toBeVisible();
  await expect(page.getByText("John Smith", { exact: true })).toBeVisible();
  await expect(page.getByText("john@example.com", { exact: true })).toBeVisible();
});

// Books the same slot from two browser pages at once. Both pages render the
// slot as free before either books, so the second confirmation hits the
// occupancy rule server-side (FR-6) and the UI must surface the 409 message.
test("S4: booking the same slot twice surfaces a conflict (409)", async ({ page }) => {
  await createEventType(page, "One-on-one", "A 30-minute one-on-one.", 30);
  const secondPage = await page.context().newPage();
  try {
    await selectSlot(page, "One-on-one", 2);
    await selectSlot(secondPage, "One-on-one", 2);

    await page.getByLabel("Your name").fill("Alice");
    await page.getByLabel("Your email").fill("alice@example.com");
    await secondPage.getByLabel("Your name").fill("Bob");
    await secondPage.getByLabel("Your email").fill("bob@example.com");

    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { name: "You're booked!" })).toBeVisible();

    await secondPage.getByRole("button", { name: "Confirm booking" }).click();
    await expect(
      secondPage.getByText("This time has just been taken — please pick another slot."),
    ).toBeVisible();
  } finally {
    await secondPage.close();
  }
});

// Uses different durations and deliberately selects slots with different start
// times whose intervals overlap. Both pages load availability before the first
// booking so that the second page submits a stale, previously free slot.
test("S5: overlapping slots from different event types conflict (409)", async ({ page }) => {
  await createEventType(page, "Deep dive", "A one-hour deep dive.", 60);
  await createEventType(page, "Quick check-in", "A 30-minute check-in.", 30);

  const secondPage = await page.context().newPage();
  try {
    const firstSlots = await openEventTypeAndReadSlots(page, "Deep dive");
    const secondSlots = await openEventTypeAndReadSlots(secondPage, "Quick check-in");
    const safelyFuture = Date.now() + 60_000;

    const pair = firstSlots
      .map((firstSlot) => ({
        firstSlot,
        secondIndex: secondSlots.findIndex(
          (secondSlot) =>
            Date.parse(secondSlot.startsAt) > safelyFuture &&
            secondSlot.startsAt !== firstSlot.startsAt &&
            intervalsOverlap(firstSlot, secondSlot),
        ),
      }))
      .find(
        ({ firstSlot, secondIndex }) =>
          Date.parse(firstSlot.startsAt) > safelyFuture && secondIndex >= 0,
      );

    expect(pair, "expected free slots with different, overlapping intervals").toBeDefined();
    if (!pair) return;

    const secondSlot = secondSlots[pair.secondIndex];
    await selectExactSlot(page, pair.firstSlot);
    await selectExactSlot(secondPage, secondSlot);

    await page.getByLabel("Your name").fill("Carol");
    await page.getByLabel("Your email").fill("carol@example.com");
    await secondPage.getByLabel("Your name").fill("Dave");
    await secondPage.getByLabel("Your email").fill("dave@example.com");

    const firstBookingResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/bookings",
    );
    await page.getByRole("button", { name: "Confirm booking" }).click();
    expect((await firstBookingResponsePromise).status()).toBe(201);
    await expect(page.getByRole("heading", { name: "You're booked!" })).toBeVisible();

    const conflictResponsePromise = secondPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/bookings",
    );
    const refreshedSlotsResponsePromise = secondPage.waitForResponse(async (response) => {
      if (
        response.request().method() !== "GET" ||
        !/\/event-types\/[^/]+\/slots$/.test(new URL(response.url()).pathname) ||
        !response.ok()
      ) {
        return false;
      }
      const slots = (await response.json()) as SlotResponse[];
      return !slots.some((slot) => intervalsOverlap(pair.firstSlot, slot));
    });
    await secondPage.getByRole("button", { name: "Confirm booking" }).click();

    expect((await conflictResponsePromise).status()).toBe(409);
    await expect(
      secondPage.getByText("This time has just been taken — please pick another slot."),
    ).toBeVisible();

    const refreshedSlotsResponse = await refreshedSlotsResponsePromise;
    expect(refreshedSlotsResponse.ok()).toBeTruthy();
    const refreshedSlots = (await refreshedSlotsResponse.json()) as SlotResponse[];
    expect(refreshedSlots.some((slot) => slot.startsAt === secondSlot.startsAt)).toBeFalsy();
    expect(refreshedSlots.some((slot) => intervalsOverlap(pair.firstSlot, slot))).toBeFalsy();
  } finally {
    await secondPage.close();
  }
});
