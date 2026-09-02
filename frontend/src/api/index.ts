import { apiClient } from "./client";
import type { components } from "./generated/schema";

export type EventType = components["schemas"]["EventType"];
export type EventTypeCreate = components["schemas"]["EventTypeCreate"];
export type Booking = components["schemas"]["Booking"];
export type BookingCreate = components["schemas"]["BookingCreate"];
export type BookingWithEventType = components["schemas"]["BookingWithEventType"];
export type Slot = components["schemas"]["Slot"];
export type ConflictError = components["schemas"]["ConflictError"];
export type NotFoundError = components["schemas"]["NotFoundError"];

export function listEventTypes() {
  return apiClient.GET("/api/event-types");
}

export function getEventType(eventTypeId: string) {
  return apiClient.GET("/api/event-types/{eventTypeId}", {
    params: { path: { eventTypeId } },
  });
}

export function listSlots(eventTypeId: string) {
  return apiClient.GET("/api/event-types/{eventTypeId}/slots", {
    params: { path: { eventTypeId } },
  });
}

export function createBooking(body: BookingCreate) {
  return apiClient.POST("/api/bookings", { body });
}

export function listOwnerEventTypes() {
  return apiClient.GET("/api/owner/event-types");
}

export function createOwnerEventType(body: EventTypeCreate) {
  return apiClient.POST("/api/owner/event-types", { body });
}

export function listOwnerUpcoming() {
  return apiClient.GET("/api/owner/bookings");
}
