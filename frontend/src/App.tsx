import { BrowserRouter, Link, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { CalendarCheck, CalendarDays, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingKindsPage } from "@/pages/guest/BookingKindsPage";
import { SlotsCalendarPage } from "@/pages/guest/SlotsCalendarPage";
import { EventTypesAdminPage } from "@/pages/owner/EventTypesAdminPage";
import { UpcomingMeetingsPage } from "@/pages/owner/UpcomingMeetingsPage";

function NavLinks() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav className="flex flex-wrap items-center gap-1">
      <NavLink to="/" end className={linkClass}>
        <CalendarDays className="size-4" />
        Book a meeting
      </NavLink>
      <span className="mx-2 hidden h-5 w-px bg-border sm:inline-block" aria-hidden />
      <NavLink to="/owner" end className={linkClass}>
        <CalendarCheck className="size-4" />
        Event types
      </NavLink>
      <NavLink to="/owner/bookings" className={linkClass}>
        <LayoutList className="size-4" />
        Upcoming
      </NavLink>
    </nav>
  );
}

function NotFoundPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">Back to booking</Link>
      </Button>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <CalendarDays className="size-5" />
            Appointment Booking
          </Link>
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<BookingKindsPage />} />
          <Route path="event-types/:eventTypeId" element={<SlotsCalendarPage />} />
          <Route path="owner" element={<EventTypesAdminPage />} />
          <Route path="owner/bookings" element={<UpcomingMeetingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
