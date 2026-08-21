import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { apiMessage } from "@/lib/errors";
import { formatDuration } from "@/lib/format";
import { useApiQuery } from "@/lib/use-api-query";
import { listEventTypes, type EventType } from "@/api";

function EventTypeCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-16" />
      </CardContent>
    </Card>
  );
}

function EventTypeCard({ eventType }: { eventType: EventType }) {
  return (
    <Link
      to={`/event-types/${eventType.id}`}
      className="block transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-lg">{eventType.name}</CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {formatDuration(eventType.durationMinutes)}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">{eventType.description}</CardDescription>
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            Choose a time
            <ChevronRight className="size-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function BookingKindsPage() {
  const { data: eventTypes, error, loading } = useApiQuery(listEventTypes, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Book a meeting</h1>
        <p className="text-muted-foreground">
          Pick an event type to see available times in the next 14 days.
        </p>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <EventTypeCardSkeleton />
          <EventTypeCardSkeleton />
          <EventTypeCardSkeleton />
        </div>
      )}

      {!loading && Boolean(error) && (
        <ErrorAlert message={apiMessage(error, "Could not load event types.")} />
      )}

      {!loading && !error && eventTypes && eventTypes.length === 0 && (
        <div className={cn("rounded-lg border border-dashed p-10 text-center text-muted-foreground")}>
          No event types available yet. Please check back later.
        </div>
      )}

      {!loading && !error && eventTypes && eventTypes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventTypes.map((eventType) => (
            <EventTypeCard key={eventType.id} eventType={eventType} />
          ))}
        </div>
      )}
    </div>
  );
}
