import { CalendarClock, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { apiMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useApiQuery } from "@/lib/use-api-query";
import { listOwnerUpcoming, type BookingWithEventType } from "@/api";

function MeetingCard({ meeting }: { meeting: BookingWithEventType }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{meeting.eventTypeName}</CardTitle>
          <Badge variant="secondary">
            <CalendarClock className="size-3 shrink-0" />
            {formatDateTime(meeting.startsAt)}
          </Badge>
        </div>
        <CardDescription>{meeting.eventTypeDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" />
            <span className="font-medium text-foreground">Ends</span>
          </div>
          <dd className="sm:pt-0.5">{formatDateTime(meeting.endsAt)}</dd>

          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4 shrink-0" />
            <span className="font-medium text-foreground">Guest</span>
          </div>
          <dd className="flex flex-wrap items-center gap-x-2 sm:pt-0.5">
            <span>{meeting.guestName}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Mail className="size-3.5" />
              {meeting.guestEmail}
            </span>
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export function UpcomingMeetingsPage() {
  const { data: meetings, error, loading } = useApiQuery(listOwnerUpcoming, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Upcoming meetings</h1>
        <p className="text-muted-foreground">
          All booked meetings across every event type, newest scheduled first.
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!loading && Boolean(error) && (
        <ErrorAlert message={apiMessage(error, "Could not load upcoming meetings.")} />
      )}

      {!loading && !error && meetings && meetings.length === 0 && (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No upcoming meetings. Once guests book a slot, it will show up here.
        </p>
      )}

      {!loading && !error && meetings && meetings.length > 0 && (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}
