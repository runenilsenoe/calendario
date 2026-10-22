import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ME_KEY, useAuth } from "@/hooks/useAuth";
import { createEvent, fetchEvents, signOut } from "@/lib/api";
import { dateLabel } from "@/lib/calendarbetter";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Your events — CalendarBetter" },
      {
        name: "description",
        content: "All the event programs you are building in CalendarBetter.",
      },
      { property: "og:title", content: "Your events — CalendarBetter" },
      { property: "og:description", content: "Manage your CalendarBetter event programs." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const events = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchEvents(),
    enabled: !loading,
  });

  const create = useMutation({
    mutationFn: (values: EventFormValues) =>
      createEvent({
        data: {
          name: values.name,
          subtitle: values.subtitle || null,
          start_date: values.start_date,
          end_date: values.end_date,
          location: values.location || null,
          logo_url: values.logo_url || null,
          accent_color: values.accent_color,
        },
      }),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ME_KEY });
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      toast.success("Event created");
      navigate({ to: "/events/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
          CalendarBetter
        </Link>
        {user && !user.is_guest ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              qc.clear();
              qc.setQueryData(ME_KEY, null);
              navigate({ to: "/" });
            }}
          >
            Sign out
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-4xl">Your events</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New event</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create event</DialogTitle>
              </DialogHeader>
              <EventForm
                submitLabel="Create event"
                busy={create.isPending}
                onSubmit={(v) => create.mutate(v)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {!loading && (!user || user.is_guest) && (
          <p className="mt-4 text-sm text-muted-foreground">
            No account needed. Guest events stay accessible in this browser for 30 days. Keep your
            browser cookies, or{" "}
            <Link to="/auth" className="underline">
              sign in
            </Link>{" "}
            to save them to your account and access them on other devices.
          </p>
        )}

        <div className="mt-8 space-y-3">
          {events.isLoading || loading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : events.error ? (
            <p className="text-sm text-destructive">Could not load events. Please refresh.</p>
          ) : (events.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="font-display text-2xl">No events yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first event to start building the program.
              </p>
            </div>
          ) : (
            events.data!.map((ev) => (
              <Link
                key={ev.id}
                to="/events/$id"
                params={{ id: ev.id }}
                className="block rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-primary" aria-hidden />

                  <h2 className="text-2xl">
                    {ev.name}{" "}
                    {ev.subtitle ? (
                      <span className="text-muted-foreground">{ev.subtitle}</span>
                    ) : null}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {dateLabel(ev.start_date)} – {dateLabel(ev.end_date)}
                  {ev.location ? ` · ${ev.location}` : ""}
                </p>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
