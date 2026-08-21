import { Link } from "react-router-dom";
import { CheckCircle2, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { Booking, EventType } from "@/api";

interface ConfirmationViewProps {
  booking: Booking;
  eventType: EventType | undefined;
}

export function ConfirmationView({ booking, eventType }: ConfirmationViewProps) {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">You're booked!</h2>
          <p className="text-muted-foreground">Your meeting is confirmed. See you there.</p>
        </div>
      </div>

      <div className="rounded-xl border p-6">
        <dl className="grid gap-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Event</dt>
            <dd className="font-medium">
              {eventType ? eventType.name : booking.eventTypeId}
              {eventType && (
                <span className="ml-2 text-muted-foreground font-normal">
                  {formatDuration(eventType.durationMinutes)}
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">When</dt>
            <dd className="font-medium">{formatDateTime(booking.startsAt)}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Ends</dt>
            <dd className="font-medium">{formatDateTime(booking.endsAt)}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Guest</dt>
            <dd className="flex flex-col items-end gap-1 text-right">
              <span className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                {booking.guestName}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" />
                {booking.guestEmail}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex justify-center">
        <Button asChild variant="outline">
          <Link to="/">Book another meeting</Link>
        </Button>
      </div>
    </div>
  );
}
