import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { eventDayKeys } from "@/lib/programio";
import { fetchCategories, fetchElements, fetchEvent } from "@/lib/api";
import { DayPoster, type ExportOptions } from "@/components/exports/DayPoster";
import { FullPoster } from "@/components/exports/FullPoster";
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
      { title: "Preview & export — Programio" },
      {
        name: "description",
        content:
          "Preview your event program and export it as a vertical day poster or a wide overview.",
      },
      { property: "og:title", content: "Preview & export — Programio" },
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

  const [options, setOptions] = useState<ExportOptions>({
    includeSubtitle: true,
    includeLocation: true,
    includeLogo: true,
    includeGrid: true,
    cardStyle: "paper",
    cardOpacity: 1,
    palette: "category",
    locale: "nb-NO",
    fontScale: 1.15,
  });

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

  const posterOptions: ExportOptions = options;

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
                  <Share2 className="mr-1 h-4 w-4" /> Share
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
            <div className="h-full overflow-y-auto p-6">
              <SheetHeader className="sr-only">
                <SheetTitle>Innstillinger</SheetTitle>
              </SheetHeader>
              <GraphicsSettings options={options} onChange={setOptions} />
            </div>
          </SheetContent>

          <div className="mt-5 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
              <GraphicsSettings options={options} onChange={setOptions} />
            </div>

            <div className="min-w-0">
              <Tabs value={view} onValueChange={(v) => setView(v as PosterView)}>
                <TabsContent value="day" className="mt-4">
                  <DaySelector
                    days={days}
                    activeDay={activeDay}
                    onSelect={setDayKey}
                    locale={options.locale ?? "nb-NO"}
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
                      <DayPoster
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
                      <FullPoster
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
