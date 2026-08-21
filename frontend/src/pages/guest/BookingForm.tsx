import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/format";
import type { Slot } from "@/api";

interface FormErrors {
  name?: string;
  email?: string;
}

function validate(name: string, email: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) {
    errors.name = "Name is required.";
  }
  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

interface BookingFormProps {
  slot: Slot;
  eventTypeName: string;
  submitting: boolean;
  onSubmitRequest(name: string, email: string): void;
}

export function BookingForm({ slot, eventTypeName, submitting, onSubmitRequest }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(name, email);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onSubmitRequest(name.trim(), email.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="guestName">Your name</Label>
        <Input
          id="guestName"
          name="guestName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          placeholder="Jane Doe"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="guestEmail">Your email</Label>
        <Input
          id="guestEmail"
          name="guestEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="jane@example.com"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <p className="text-sm text-muted-foreground">
        {eventTypeName} · {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
      </p>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Booking…" : "Confirm booking"}
      </Button>
    </form>
  );
}
