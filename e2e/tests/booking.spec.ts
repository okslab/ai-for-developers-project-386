import { expect, test, type Page } from "@playwright/test";

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
