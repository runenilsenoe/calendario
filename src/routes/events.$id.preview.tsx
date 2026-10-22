import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { eventDayKeys, type EventRow } from "@/lib/calendarbetter";
import { fetchCategories, fetchElements, fetchEvent, savePosterOptions } from "@/lib/api";
import type { ExportOptions } from "@/components/exports/DayPoster";
import { DayExport, FullExport, savedExportOptions } from "@/components/exports/ProgramPoster";
import { PdfProgram } from "@/components/exports/PdfProgram";
import { exportNodeToImage, exportNodeToPdf, slugify } from "@/lib/export-image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraphicsSettings } from "@/components/GraphicsSettings";
import { ArrowLeft, Share2, Settings2 } from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomStage } from "@/components/ZoomStage";
import { DaySelector } from "@/components/DaySelector";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/events/$id/preview")({
  head: () => ({
    meta: [
      { title: "Preview & export — CalendarBetter" },
      {
        name: "description",
        content:
          "Preview your event program and export it as a vertical day poster or a wide overview.",
      },
      { property: "og:title", content: "Preview & export — CalendarBetter" },
      { property: "og:description", content: "Export polished event schedule images." },
    ],
  }),
  component: PreviewPage,
});

type PosterView = "day" | "full" | "pdf";

function PreviewPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const dayRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<PosterView>("day");

  // Unsaved edits; null until the user changes something, so the saved design shows first.
  const [draft, setDraft] = useState<ExportOptions | null>(null);
  const qc = useQueryClient();
  const { mutate: persistOptions } = useMutation({
    mutationFn: (o: ExportOptions) =>
      savePosterOptions({ data: { eventId: id, options: o as EventRow["poster_options"] } }),
    onSuccess: (_, o) =>
      qc.setQueryData<EventRow | null>(["event", id], (old) =>
        old ? { ...old, poster_options: o as EventRow["poster_options"] } : old,
      ),
    // Viewers can still try designs for their own downloads; only editors can save them.
    onError: () => {},
  });
  useEffect(() => {
    if (!draft) return;
    const timer = setTimeout(() => persistOptions(draft), 600);
    return () => clearTimeout(timer);
  }, [draft, persistOptions]);

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

  if (!loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-muted-foreground">Sign in to preview this event.</p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (eventQ.isLoading || catsQ.isLoading || elsQ.isLoading || loading) {
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
        <div>
          <p className="text-muted-foreground">This event does not exist.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/events">Back to events</Link>
          </Button>
        </div>
      </div>
    );
  }

  const categories = catsQ.data ?? [];
  const elements = elsQ.data ?? [];
  const days = eventDayKeys(event);
  const activeDay = dayKey && days.includes(dayKey) ? dayKey : days[0]!;

  const posterOptions: ExportOptions = draft ?? savedExportOptions(event);

  async function download(kind: PosterView) {
    const node =
      kind === "day" ? dayRef.current : kind === "full" ? fullRef.current : pdfRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const result =
        kind === "pdf"
          ? await exportNodeToPdf(node, `${slugify(event!.name)}-program`)
          : await exportNodeToImage(
              node,
              kind === "day"
                ? `${slugify(event!.name)}-${activeDay}`
                : `${slugify(event!.name)}-full-program`,
            );
      if (result === "shared") toast.success("Bildet er delt/lagret");
      else if (result === "downloaded")
        toast.success(kind === "pdf" ? "PDF lastet ned" : "JPG lastet ned");
      else if (result === "manual") toast.info("Hold inne bildet og velg «Lagre bilde»");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/events/$id" params={{ id }}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                <span className="max-w-[9rem] truncate sm:max-w-none">{event.name}</span>
              </Link>
            </Button>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:gap-3">
              <Tabs value={view} onValueChange={(v) => setView(v as PosterView)} className="w-auto">
                <TabsList className="h-8 sm:h-9">
                  <TabsTrigger value="day" className="px-2 text-xs sm:px-3 sm:text-sm">
                    Day poster
                  </TabsTrigger>
                  <TabsTrigger value="full" className="px-2 text-xs sm:px-3 sm:text-sm">
                    Full program
                  </TabsTrigger>
                  <TabsTrigger value="pdf" className="px-2 text-xs sm:px-3 sm:text-sm">
                    PDF
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => download(view)}
                  disabled={busy}
                  className="hidden sm:inline-flex"
                >
                  {busy ? "Rendering…" : view === "pdf" ? "Download PDF" : "Download JPG"}
                </Button>

                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="lg:hidden">
                    <Settings2 className="h-4 w-4" />
                    <span className="sr-only">Innstillinger</span>
                  </Button>
                </SheetTrigger>

                <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4 sm:mr-1" />
                  <span className="sr-only sm:not-sr-only">Share</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <ShareDialog
          event={event}
          open={shareOpen}
          onOpenChange={setShareOpen}
          isOwner={event.user_id === user?.id}
        />

        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 sm:pt-4 lg:hidden">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/events/$id" params={{ id }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake til {event.name}
            </Link>
          </Button>
        </div>

        <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SheetContent side="right" className="w-[85vw] p-0 sm:max-w-md lg:hidden">
            <div className="h-full overflow-y-auto p-6 pt-4">
              <SheetHeader className="mb-4 pr-8 text-left">
                <SheetTitle>Innstillinger</SheetTitle>
              </SheetHeader>
              <GraphicsSettings options={posterOptions} onChange={setDraft} />
            </div>
          </SheetContent>

          <div className="mt-5 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
              <GraphicsSettings options={posterOptions} onChange={setDraft} />
            </div>

            <div className="min-w-0">
              <Tabs value={view} onValueChange={(v) => setView(v as PosterView)}>
                <TabsContent value="day" className="mt-4">
                  <DaySelector
                    days={days}
                    activeDay={activeDay}
                    onSelect={setDayKey}
                    locale={posterOptions.locale ?? "nb-NO"}
                  />

                  <Button
                    className="mt-3 w-full sm:w-auto"
                    onClick={() => download("day")}
                    disabled={busy}
                  >
                    {busy ? "Rendering…" : "Download day JPG (1080×1920)"}
                  </Button>

                  <div className="mt-4">
                    <ZoomStage measureKey={`day-${activeDay}-${JSON.stringify(posterOptions)}`}>
                      <DayExport
                        ref={dayRef}
                        event={event}
                        categories={categories}
                        elements={elements}
                        dayKey={activeDay}
                        options={posterOptions}
                      />
                    </ZoomStage>
                  </div>
                </TabsContent>

                <TabsContent value="full" className="mt-4">
                  <div className="mt-4">
                    <ZoomStage
                      measureKey={`full-${elements.length}-${JSON.stringify(posterOptions)}`}
                    >
                      <FullExport
                        ref={fullRef}
                        event={event}
                        categories={categories}
                        elements={elements}
                        options={posterOptions}
                      />
                    </ZoomStage>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    På PC tilpassar plakaten seg heile vindauget som standard — bruk knappane eller
                    knip for å zoome, og dra for å flytte. Tofingerscroll rullar sida.
                  </p>
                </TabsContent>

                <TabsContent value="pdf" className="mt-4">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => download("pdf")}
                    disabled={busy}
                  >
                    {busy ? "Rendering…" : "Last ned PDF (A4)"}
                  </Button>
                  <div className="mt-4">
                    <ZoomStage
                      measureKey={`pdf-${elements.length}-${JSON.stringify(posterOptions)}`}
                    >
                      <PdfProgram
                        ref={pdfRef}
                        event={event}
                        categories={categories}
                        elements={elements}
                        options={posterOptions}
                      />
                    </ZoomStage>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Dagsplan i A4-format med alle dagane under kvarandre — passar til utskrift og
                    deling som PDF.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </Sheet>
  );
}
