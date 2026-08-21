import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { apiMessage, isConflict, isNotFound } from "@/lib/errors";
import { formatSlotDate, formatTime } from "@/lib/format";
import { useApiQuery } from "@/lib/use-api-query";
import { cn } from "@/lib/utils";
import { createBooking, getEventType, listSlots, type Booking, type EventType, type Slot } from "@/api";
import { BookingForm } from "./BookingForm";
import { ConfirmationView } from "./ConfirmationView";

interface DayGroup {
  key: string;
  label: string;
  slots: Slot[];
}

function groupSlotsByDay(slots: Slot[]): DayGroup[] {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = new Date(slot.startsAt).toDateString();
    const bucket = groups.get(key) ?? [];
    bucket.push(slot);
    groups.set(key, bucket);
  }
  return [...groups.entries()]
    .map(([key, bucket]) => ({
      key,
      label: formatSlotDate(bucket[0].startsAt),
      slots: [...bucket].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function SlotsCalendarPage() {
  const { eventTypeId } = useParams<{ eventTypeId: string }>();
  const eventTypeIdKey = useMemo(() => eventTypeId ?? "", [eventTypeId]);

  const eventTypeQuery = useApiQuery<EventType>(() => getEventType(eventTypeIdKey), [eventTypeIdKey]);
  const slotsQuery = useApiQuery<Slot[]>(() => listSlots(eventTypeIdKey), [eventTypeIdKey]);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const eventType = eventTypeQuery.data;
  const eventTypeNotFound = Boolean(eventTypeQuery.error) && isNotFound(eventTypeQuery.error) && !eventTypeQuery.loading;

  useEffect(() => {
    if (selectedSlot) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSlot]);

  useEffect(() => {
    setSelectedSlot(null);
    setCreatedBooking(null);
    setBookingError(null);
  }, [eventTypeId]);

  if (eventTypeNotFound) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Event type not found</h1>
          <p className="text-muted-foreground">
            This event type does not exist or is no longer available.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft /> Back to event types
          </Link>
        </Button>
      </div>
    );
  }

  if (createdBooking) {
    return <ConfirmationView booking={createdBooking} eventType={eventType} />;
  }

  const dayGroups = groupSlotsByDay(slotsQuery.data ?? []);
  const slotError = slotsQuery.error;
  const slotNotFound =
    Boolean(slotError) && isNotFound(slotError) && !slotsQuery.loading;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1">
          <Link to="/">
            <ArrowLeft /> All event types
          </Link>
        </Button>
        {eventTypeQuery.loading && <Skeleton className="h-8 w-56" />}
        {eventType && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{eventType.name}</h1>
            <p className="text-muted-foreground">{eventType.description}</p>
          </>
        )}
      </div>

      {slotsQuery.loading && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      )}

      {!slotsQuery.loading && slotNotFound && (
        <ErrorAlert message="This event type is no longer available." />
      )}

      {!slotsQuery.loading && Boolean(slotError) && !slotNotFound && (
        <ErrorAlert message={apiMessage(slotError, "Could not load available slots.")} />
      )}

      {!slotsQuery.loading && !slotError && dayGroups.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No free slots in the next 14 days.
        </div>
      )}

      {!slotsQuery.loading && !slotError && dayGroups.length > 0 && (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <CalendarDays className="size-4 text-muted-foreground" />
                {group.label}
              </div>
              <div className="flex flex-wrap gap-3">
                {group.slots.map((slot) => {
                  const isSelected = selectedSlot?.startsAt === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => setSelectedSlot(isSelected ? null : slot)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                    >
                      {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={formRef} className="scroll-mt-6">
        {selectedSlot && (
          <div className="space-y-4 rounded-xl border p-6 max-w-xl">
            <div>
              <h2 className="text-lg font-semibold">Enter your details</h2>
              <p className="text-sm text-muted-foreground">
                {eventType?.description}
              </p>
            </div>
            {bookingError && <ErrorAlert message={bookingError} />}
            <BookingForm
              key={selectedSlot.startsAt}
              slot={selectedSlot}
              eventTypeName={eventType?.name ?? "Meeting"}
              submitting={submitting}
              onSubmitRequest={handleBookingSubmit}
            />
          </div>
        )}
      </div>
    </div>
  );

  async function handleBookingSubmit(name: string, email: string) {
    if (!selectedSlot) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      const { data, error } = await createBooking({
        eventTypeId: eventTypeIdKey,
        startsAt: selectedSlot.startsAt,
        guestName: name,
        guestEmail: email,
      });
      if (data) {
        setCreatedBooking(data);
        return;
      }
      if (isConflict(error)) {
        setBookingError("This time has just been taken — please pick another slot.");
        setSelectedSlot(null);
        slotsQuery.refetch();
        return;
      }
      if (isNotFound(error)) {
        setBookingError("This event type is no longer available.");
        setSelectedSlot(null);
        slotsQuery.refetch();
        eventTypeQuery.refetch();
        return;
      }
      setBookingError(apiMessage(error, "Could not create the booking. Please try again."));
    } catch (err) {
      setBookingError(apiMessage(err, "Something went wrong while creating the booking."));
    } finally {
      setSubmitting(false);
    }
  }
}
