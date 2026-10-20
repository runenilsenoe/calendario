import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteCategory as deleteCategoryFn,
  deleteElement as deleteElementFn,
  fetchCategories,
  fetchElements,
  fetchEvent,
  saveCategory as saveCategoryFn,
  saveElement as saveElementFn,
  updateEvent,
} from "@/lib/api";
import {
  dateLabel,
  eventDayKeys,
  fromInputValue,
  groupByDay,
  readableOn,
  timeRange,
  toLocalDateKey,
  weekdayName,
  type CategoryRow,
  type ElementRow,
} from "@/lib/programio";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { CategoryDialog, type CategoryValues } from "@/components/CategoryDialog";
import { ElementDialog, type ElementValues } from "@/components/ElementDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/events/$id/")({
  head: () => ({
    meta: [
      { title: "Event dashboard — Programio" },
      { name: "description", content: "Manage program elements, categories and event details." },
      { property: "og:title", content: "Event dashboard — Programio" },
      { property: "og:description", content: "Manage your event program in Programio." },
    ],
  }),
  component: EventDashboard,
});

function EventDashboard() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const eventQ = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent({ data: id }),
    enabled: !!user,
  });
  const catsQ = useQuery({
    queryKey: ["categories", id],
    queryFn: () => fetchCategories({ data: id }),
    enabled: !!user,
  });
  const elsQ = useQuery({
    queryKey: ["elements", id],
    queryFn: () => fetchElements({ data: id }),
    enabled: !!user,
  });

  const [editEvent, setEditEvent] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<CategoryRow | null>(null);
  const [elOpen, setElOpen] = useState(false);
  const [elEditing, setElEditing] = useState<ElementRow | null>(null);
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [addDay, setAddDay] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const event = eventQ.data;
  const categories = catsQ.data ?? [];
  const elements = useMemo(() => elsQ.data ?? [], [elsQ.data]);
  const days = event ? eventDayKeys(event) : [];
  const byDay = useMemo(() => groupByDay(elements), [elements]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["event", id] });
    qc.invalidateQueries({ queryKey: ["categories", id] });
    qc.invalidateQueries({ queryKey: ["elements", id] });
  };

  const saveEvent = useMutation({
    mutationFn: (v: EventFormValues) =>
      updateEvent({
        data: {
          id,
          values: {
            name: v.name,
            subtitle: v.subtitle || null,
            start_date: v.start_date,
            end_date: v.end_date,
            location: v.location || null,
            logo_url: v.logo_url || null,
            accent_color: v.accent_color,
          },
        },
      }),
    onSuccess: () => {
      invalidate();
      setEditEvent(false);
      toast.success("Event updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCategory = useMutation({
    mutationFn: (v: CategoryValues) =>
      saveCategoryFn({
        data: {
          eventId: id,
          id: catEditing?.id ?? null,
          values: {
            name: v.name,
            color: v.color,
            icon: v.icon || null,
            text_color: v.text_color || null,
          },
        },
      }),
    onSuccess: () => {
      invalidate();
      setCatOpen(false);
      setCatEditing(null);
      toast.success("Category saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (catId: string) => {
      const inUse = elements.filter((el) => el.category_id === catId).length;
      if (inUse > 0) {
        throw new Error(
          `${inUse} program item${inUse === 1 ? "" : "s"} still use this category. Reassign them first.`,
        );
      }
      await deleteCategoryFn({ data: { eventId: id, id: catId } });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Category deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveElement = useMutation({
    mutationFn: (v: ElementValues) =>
      saveElementFn({
        data: {
          eventId: id,
          id: elEditing?.id ?? null,
          values: {
            title: v.title,
            start_datetime: fromInputValue(v.start),
            end_datetime: fromInputValue(v.end),
            category_id: v.category_id || null,
            location: v.location || null,
            subtitle: v.subtitle || null,
            notes: v.notes || null,
          },
        },
      }),
    onSuccess: () => {
      invalidate();
      setElOpen(false);
      setElEditing(null);
      toast.success("Program element saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteElement = useMutation({
    mutationFn: (elId: string) => deleteElementFn({ data: { eventId: id, id: elId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Program element deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!loading && !user) {
    return (
      <CenteredMessage>
        <p className="text-muted-foreground">Sign in to manage this event.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </CenteredMessage>
    );
  }

  if (eventQ.isLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-16">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (eventQ.error) {
    return <CenteredMessage>Could not load this event. Please refresh.</CenteredMessage>;
  }

  if (!event) {
    return (
      <CenteredMessage>
        <p className="text-muted-foreground">This event does not exist.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/events">Back to events</Link>
        </Button>
      </CenteredMessage>
    );
  }

  const visibleDays = dayFilter === "all" ? days : [dayFilter];
  const orphanDays = [...byDay.keys()].filter((k) => !days.includes(k)).sort();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between sm:px-6 sm:py-4">
          <Link
            to="/events"
            className="truncate text-sm text-muted-foreground hover:text-foreground"
          >
            ← Events
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => {
                setElEditing(null);
                setElOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add program element
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Share</span>
            </Button>
            <Button asChild size="sm">
              <Link to="/events/$id/preview" params={{ id }}>
                Preview &amp; export
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <ShareDialog
        event={event}
        open={shareOpen}
        onOpenChange={setShareOpen}
        isOwner={event.user_id === user?.id}
      />

      <main className="mx-auto max-w-4xl px-4 pb-28 sm:px-6">
        <section className="pt-8">
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-5xl">
                {event.name}{" "}
                {event.subtitle ? (
                  <span className="text-muted-foreground">{event.subtitle}</span>
                ) : null}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {dateLabel(event.start_date)} – {dateLabel(event.end_date)}
                {event.location ? ` · ${event.location}` : ""} · {days.length} days ·{" "}
                {elements.length} items
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => setEditEvent(true)}
            >
              Edit event
            </Button>
          </div>
        </section>

        {orphanDays.length > 0 ? (
          <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {orphanDays.length} day(s) of program items fall outside the event date range and will
            not appear in exports. Adjust the dates or move those items.
          </p>
        ) : null}

        <Tabs defaultValue="program" className="mt-8">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="program" className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={dayFilter === "all"} onClick={() => setDayFilter("all")}>
                All days
              </FilterChip>
              {days.map((d) => (
                <FilterChip key={d} active={dayFilter === d} onClick={() => setDayFilter(d)}>
                  {weekdayName(d).slice(0, 3)} {dateLabel(d)}
                </FilterChip>
              ))}
            </div>

            <div className="mt-6 space-y-8">
              {visibleDays.map((dayKey) => {
                const items = byDay.get(dayKey) ?? [];
                return (
                  <div key={dayKey}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl">
                        {weekdayName(dayKey)}{" "}
                        <span className="text-muted-foreground">{dateLabel(dayKey)}</span>
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setElEditing(null);
                          setAddDay(dayKey);
                          setElOpen(true);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add
                      </Button>
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Nothing planned yet.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {items.map((el) => {
                          const cat = categories.find((c) => c.id === el.category_id);
                          return (
                            <li
                              key={el.id}
                              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                            >
                              <span
                                className="mt-1 h-full min-h-10 w-1 rounded-full"
                                style={{ backgroundColor: cat?.color ?? "#8A8F98" }}
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs tabular-nums text-muted-foreground">
                                  {timeRange(el)}
                                </div>
                                <div className="break-words text-base">{el.title}</div>
                                {el.subtitle ? (
                                  <div className="text-sm text-muted-foreground">{el.subtitle}</div>
                                ) : null}
                                {el.location ? (
                                  <div className="text-sm text-muted-foreground">
                                    ◦ {el.location}
                                  </div>
                                ) : null}
                                {cat ? (
                                  <span
                                    className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs"
                                    style={{
                                      backgroundColor: cat.color,
                                      color: readableOn(cat.color, cat.text_color),
                                    }}
                                  >
                                    {cat.icon ? `${cat.icon} ` : ""}
                                    {cat.name}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Edit ${el.title}`}
                                  onClick={() => {
                                    setElEditing(el);
                                    setElOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Delete ${el.title}`}
                                  onClick={() => deleteElement.mutate(el.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Categories</h2>
              <Button
                size="sm"
                onClick={() => {
                  setCatEditing(null);
                  setCatOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> New
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No categories yet. Categories drive the colors in your exports.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {categories.map((c) => {
                  const used = elements.filter((e) => e.category_id === c.id).length;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <span
                        className="h-8 w-8 rounded-lg"
                        style={{ backgroundColor: c.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div>
                          {c.icon ? `${c.icon} ` : ""}
                          {c.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {used} item{used === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => {
                          setCatEditing(c);
                          setCatOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => deleteCategory.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur sm:hidden">
        <Button
          className="w-full"
          onClick={() => {
            setElEditing(null);
            setElOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add program element
        </Button>
      </div>

      <Dialog open={editEvent} onOpenChange={setEditEvent}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
          </DialogHeader>
          <EventForm
            initial={event}
            submitLabel="Save event"
            busy={saveEvent.isPending}
            onSubmit={(v) => saveEvent.mutate(v)}
          />
        </DialogContent>
      </Dialog>

      <CategoryDialog
        open={catOpen}
        onOpenChange={(v) => {
          setCatOpen(v);
          if (!v) setCatEditing(null);
        }}
        initial={catEditing}
        busy={saveCategory.isPending}
        onSubmit={(v) => saveCategory.mutate(v)}
      />

      <ElementDialog
        open={elOpen}
        onOpenChange={(v) => {
          setElOpen(v);
          if (!v) {
            setElEditing(null);
            setAddDay(null);
          }
        }}
        initial={elEditing}
        categories={categories}
        defaultDay={
          addDay ?? (dayFilter !== "all" ? dayFilter : (days[0] ?? toLocalDateKey(new Date())))
        }
        busy={saveElement.isPending}
        onSubmit={(v) => saveElement.mutate(v)}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">{children}</div>
    </div>
  );
}
