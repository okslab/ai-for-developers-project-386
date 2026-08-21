const DEFAULT_LOCALE: Intl.LocalesArgument = undefined;

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const shortWeekdayFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatSlotDate(iso: string): string {
  return shortWeekdayFormatter.format(new Date(iso));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}
