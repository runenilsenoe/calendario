import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { dateLabel, eventDayKeys, fetchCategories, fetchElements, fetchEventBySlug } from "@/lib/programio";
import { DayPoster } from "@/components/exports/DayPoster";
import { FullPoster } from "@/components/exports/FullPoster";
import { exportNodeToImage, slugify } from "@/lib/export-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomStage } from "@/components/ZoomStage";
import { DaySelector } from "@/components/DaySelector";

export const Route = createFileRoute("/p/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Event program — Programio" },
      {
        name: "description",
        content: "A shared event program: every day, hour by hour, in one view.",
      },
      { property: "og:title", content: "Event program — Programio" },
      { property: "og:description", content: "A shared event program built with Programio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicProgram,
});

const options = { includeSubtitle: true, includeLocation: true, includeLogo: true, locale: "nb-NO", fontScale: 1.15 };

function PublicProgram() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dayRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);

  const eventQ = useQuery({ queryKey: ["public-event", slug], queryFn: () => fetchEventBySlug(slug) });
  const eventId = eventQ.data?.id;
  const catsQ = useQuery({
    queryKey: ["public-categories", eventId],
    queryFn: () => fetchCategories(eventId!),
    enabled: !!eventId,
  });
  const elsQ = useQuery({
    queryKey: ["public-elements", eventId],
    queryFn: () => fetchElements(eventId!),
    enabled: !!eventId,
  });

  if (eventQ.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-16">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const event = eventQ.data;
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">
          This program is not available. The link may have been turned off.
        </p>
      </div>
    );
  }

  const days = eventDayKeys(event);
  const activeDay = dayKey && days.includes(dayKey) ? dayKey : days[0]!;
  const categories = catsQ.data ?? [];
  const elements = elsQ.data ?? [];

  async function download(kind: "day" | "full") {
    const node = kind === "day" ? dayRef.current : fullRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const result = await exportNodeToImage(
        node,
        kind === "day"
          ? `${slugify(event!.name)}-${activeDay}`
          : `${slugify(event!.name)}-full-program`,
      );
      if (result === "shared") toast.success("Bildet er delt/lagret");
      else if (result === "downloaded") toast.success("JPG lastet ned");
      else if (result === "manual")
        toast.info("Hold inne bildet og velg «Lagre bilde»");

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  const isOwner = user?.id === event.user_id;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {isOwner && (
          <Button asChild variant="outline" size="sm" className="mb-3 w-full sm:w-auto">
            <Link to="/events/$id" params={{ id: event.id }}>
              ← Back to event
            </Link>
          </Button>
        )}
        <h1 className="font-display text-3xl sm:text-4xl">{event.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dateLabel(event.start_date)} – {dateLabel(event.end_date)}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        <Tabs defaultValue="day" className="mt-5">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="day">Single day</TabsTrigger>
            <TabsTrigger value="full">Full program</TabsTrigger>
          </TabsList>

          <TabsContent value="day" className="mt-4 min-w-0">
            <DaySelector
              days={days}
              activeDay={activeDay}
              onSelect={setDayKey}
              locale={options.locale}
            />
            <Button className="mt-3 w-full sm:w-auto" onClick={() => download("day")} disabled={busy}>
              {busy ? "Rendering…" : "Download day JPG (1080×1920)"}
            </Button>

            <div className="mt-4 min-w-0">
              <ZoomStage measureKey={`day-${activeDay}`}>
                <DayPoster
                  ref={dayRef}
                  event={event}
                  categories={categories}
                  elements={elements}
                  dayKey={activeDay}
                  options={options}
                />
              </ZoomStage>
            </div>
          </TabsContent>

          <TabsContent value="full" className="mt-4 min-w-0">
            <Button className="w-full sm:w-auto" onClick={() => download("full")} disabled={busy}>
              {busy ? "Rendering…" : "Download full program JPG"}
            </Button>

            <div className="mt-4 min-w-0">
              <ZoomStage measureKey={`full-${elements.length}`}>
                <FullPoster
                  ref={fullRef}
                  event={event}
                  categories={categories}
                  elements={elements}
                  options={options}
                />
              </ZoomStage>
            </div>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-xs text-muted-foreground">Shared with Programio</p>
      </main>
    </div>
  );
}
