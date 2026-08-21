import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { apiMessage } from "@/lib/errors";
import { formatDuration } from "@/lib/format";
import { useApiQuery } from "@/lib/use-api-query";
import { createOwnerEventType, listOwnerEventTypes, type EventType } from "@/api";

interface FormValues {
  name: string;
  description: string;
  durationMinutes: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  durationMinutes?: string;
}

const EMPTY_FORM: FormValues = { name: "", description: "", durationMinutes: "" };

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }
  if (!values.description.trim()) {
    errors.description = "Description is required.";
  }
  const duration = Number(values.durationMinutes);
  if (values.durationMinutes.trim() === "") {
    errors.durationMinutes = "Duration is required.";
  } else if (!Number.isInteger(duration) || duration <= 0) {
    errors.durationMinutes = "Duration must be a positive whole number of minutes.";
  }
  return errors;
}

function EventTypeRow({ eventType }: { eventType: EventType }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">{eventType.name}</CardTitle>
          <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {formatDuration(eventType.durationMinutes)}
          </span>
        </div>
        <CardDescription>{eventType.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function EventTypesAdminPage() {
  const { data: eventTypes, error, loading, refetch } = useApiQuery(listOwnerEventTypes, []);

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data, error: requestError } = await createOwnerEventType({
        name: values.name.trim(),
        description: values.description.trim(),
        durationMinutes: Number(values.durationMinutes),
      });
      if (requestError) {
        setSubmitError(apiMessage(requestError, "Could not create the event type."));
        return;
      }
      if (data) {
        setValues(EMPTY_FORM);
        refetch();
      }
    } catch (err) {
      setSubmitError(apiMessage(err, "Something went wrong while creating the event type."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Event types</h1>
        <p className="text-muted-foreground">
          Manage the meeting types guests can book. Changes are visible to guests immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" /> New event type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {submitError && <ErrorAlert message={submitError} />}

            <div className="space-y-1.5">
              <Label htmlFor="eventTypeName">Name</Label>
              <Input
                id="eventTypeName"
                value={values.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Intro call"
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eventTypeDescription">Description</Label>
              <Textarea
                id="eventTypeDescription"
                value={values.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="A short intro call with the team."
                aria-invalid={Boolean(fieldErrors.description)}
              />
              {fieldErrors.description && (
                <p className="text-sm text-destructive">{fieldErrors.description}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eventTypeDuration">Duration (minutes)</Label>
              <Input
                id="eventTypeDuration"
                type="number"
                min={1}
                step={1}
                value={values.durationMinutes}
                onChange={(event) => handleChange("durationMinutes", event.target.value)}
                placeholder="30"
                aria-invalid={Boolean(fieldErrors.durationMinutes)}
              />
              {fieldErrors.durationMinutes && (
                <p className="text-sm text-destructive">{fieldErrors.durationMinutes}</p>
              )}
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create event type"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Existing event types</h2>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        )}

        {!loading && Boolean(error) && (
          <ErrorAlert message={apiMessage(error, "Could not load event types.")} />
        )}

        {!loading && !error && eventTypes && eventTypes.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No event types yet. Create your first one above.
          </p>
        )}

        {!loading && !error && eventTypes && eventTypes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventTypes.map((eventType) => (
              <EventTypeRow key={eventType.id} eventType={eventType} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
