import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, CalendarDays, Download, MapPin, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type ProgramItem = { time: string; title: string; detail: string; category: number };
type Example = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  location: string;
  color: string;
  paper: string;
  categories: string[];
  days: { label: string; date: string; items: ProgramItem[] }[];
};

const examples: Example[] = [
  {
    id: "firmatur",
    label: "Firmatur",
    title: "Sammen om neste steg",
    subtitle: "Fem dager med nye ideer, felles opplevelser og tid til å bli bedre kjent.",
    description: "Fem dager med fag, utflukter og god tid sammen.",
    location: "Fjellhotellet · Geilo",
    color: "#365f61",
    paper: "#e6efeb",
    categories: ["Felles & reise", "Faglig", "Mat & pauser", "Opplevelser"],
    days: [
      {
        label: "Mandag",
        date: "7. september",
        items: [
          {
            time: "08:30–10:00",
            title: "Felles buss til fjells",
            detail: "Hovedinngangen · Avreise presis 08:30",
            category: 0,
          },
          {
            time: "10:00–10:30",
            title: "Velkommen & innsjekk",
            detail: "Resepsjonen · Bagasje og romfordeling",
            category: 0,
          },
          {
            time: "11:00–12:00",
            title: "Hvor skal vi sammen?",
            detail: "Panoramasalen · Mål for uken",
            category: 1,
          },
          {
            time: "12:00–13:00",
            title: "Lunsj",
            detail: "Restauranten · Felles buffet",
            category: 2,
          },
          {
            time: "13:00–14:30",
            title: "Samarbeid på tvers",
            detail: "Panoramasalen · Workshop i blandede lag",
            category: 1,
          },
          {
            time: "15:00–17:00",
            title: "Bli kjent med området",
            detail: "Tunet · Lagvis natursti og små utfordringer",
            category: 3,
          },
          {
            time: "18:30–20:00",
            title: "Velkomstmiddag",
            detail: "Restauranten · Lokale smaker",
            category: 2,
          },
          {
            time: "20:00–21:30",
            title: "Historiene bak kollegene",
            detail: "Peisestuen · Quiz og uformell prat",
            category: 3,
          },
        ],
      },
      {
        label: "Tirsdag",
        date: "8. september",
        items: [
          {
            time: "07:45–08:45",
            title: "Frokost",
            detail: "Restauranten · En god start på dagen",
            category: 2,
          },
          {
            time: "09:20–10:30",
            title: "Kunden i sentrum",
            detail: "Panoramasalen · Felles fagøkt",
            category: 1,
          },
          {
            time: "10:50–12:00",
            title: "Fra innsikt til handling",
            detail: "Sal A · Workshop for produkt og utvikling",
            category: 1,
          },
          {
            time: "10:50–12:00",
            title: "Relasjoner som varer",
            detail: "Sal B · Parallelt spor for salg og kunde",
            category: 1,
          },
          { time: "12:00–13:00", title: "Lunsj", detail: "Restauranten", category: 2 },
          {
            time: "13:00–14:30",
            title: "Vi løser det sammen",
            detail: "Grupperommene · Tverrfaglig case",
            category: 1,
          },
          {
            time: "15:00–17:00",
            title: "Lagkamp i det fri",
            detail: "Aktivitetsområdet · Samarbeid og mestring",
            category: 3,
          },
          {
            time: "18:30–20:00",
            title: "Middag",
            detail: "Restauranten · Bord på tvers av avdelingene",
            category: 2,
          },
          {
            time: "20:00–22:00",
            title: "Spillkveld",
            detail: "Salongen · Brettspill og uhøytidelig turnering",
            category: 3,
          },
        ],
      },
      {
        label: "Onsdag",
        date: "9. september",
        items: [
          {
            time: "07:30–08:30",
            title: "Frokost & turmat",
            detail: "Restauranten · Smør en matpakke",
            category: 2,
          },
          {
            time: "09:00–10:30",
            title: "På vei mot utsikten",
            detail: "Tunet · Guidet tur i rolig tempo",
            category: 3,
          },
          {
            time: "12:00–13:00",
            title: "Lunsj ute",
            detail: "Gapahuken · Matpakke og bålpanne",
            category: 2,
          },
          {
            time: "13:00–14:30",
            title: "Kanotur",
            detail: "Brygga · Gruppe 1 med instruktør",
            category: 3,
          },
          {
            time: "13:00–14:30",
            title: "Fotojakt & natursti",
            detail: "Gapahuken · Alternativ på land",
            category: 3,
          },
          {
            time: "15:00–16:00",
            title: "Tilbake til hotellet",
            detail: "Felles retur · Kort oppsummering underveis",
            category: 0,
          },
          {
            time: "18:30–20:00",
            title: "Middag med lokale råvarer",
            detail: "Restauranten",
            category: 2,
          },
          {
            time: "20:00–21:30",
            title: "Bålkveld",
            detail: "Bålplassen · Historier og varm drikke",
            category: 3,
          },
        ],
      },
      {
        label: "Torsdag",
        date: "10. september",
        items: [
          { time: "07:45–08:45", title: "Frokost", detail: "Restauranten", category: 2 },
          {
            time: "09:15–10:30",
            title: "Neste kapittel",
            detail: "Panoramasalen · Strategi og prioriteringer",
            category: 1,
          },
          {
            time: "10:50–12:00",
            title: "Ideverksted",
            detail: "Grupperommene · Fra mulighet til konkret forslag",
            category: 1,
          },
          { time: "12:00–13:00", title: "Lunsj", detail: "Restauranten", category: 2 },
          {
            time: "13:00–14:30",
            title: "Bygg & prøv",
            detail: "Grupperommene · Lagene utvikler løsningene",
            category: 1,
          },
          {
            time: "15:00–16:30",
            title: "Fem minutter på scenen",
            detail: "Panoramasalen · Lagpresentasjoner og tilbakemeldinger",
            category: 1,
          },
          {
            time: "18:30–19:00",
            title: "Velkomst i salongen",
            detail: "Salongen · Aperitiff og felles bilde",
            category: 0,
          },
          {
            time: "19:00–21:00",
            title: "Festmiddag & gode ord",
            detail: "Festsalen · Tre retter og heder til kollegene",
            category: 2,
          },
          {
            time: "21:00–23:00",
            title: "Musikk & dansegulv",
            detail: "Festsalen · Vi feirer uken sammen",
            category: 3,
          },
        ],
      },
      {
        label: "Fredag",
        date: "11. september",
        items: [
          {
            time: "07:30–08:30",
            title: "Frokost",
            detail: "Restauranten · Siste frokost sammen",
            category: 2,
          },
          {
            time: "08:30–09:00",
            title: "Pakking & utsjekk",
            detail: "Resepsjonen · Bagasje i bagasjerommet",
            category: 0,
          },
          {
            time: "09:30–10:30",
            title: "Hva tar vi med hjem?",
            detail: "Grupperommene · Konkret plan for hvert team",
            category: 1,
          },
          {
            time: "11:45–12:15",
            title: "Takk for turen",
            detail: "Panoramasalen · Felles avslutning",
            category: 0,
          },
          { time: "12:15–13:15", title: "Avskjedslunsj", detail: "Restauranten", category: 2 },
          {
            time: "13:30–15:00",
            title: "Felles hjemreise",
            detail: "Buss · Tilbake til utgangspunktet",
            category: 0,
          },
        ],
      },
    ],
  },
  {
    id: "konferanse",
    label: "Konferanse",
    title: "Nye perspektiver",
    subtitle: "To dager med ideer som tar oss videre.",
    description: "Felles foredrag, parallelle spor og gode pauser.",
    location: "Kulturhuset · Oslo",
    color: "#324d73",
    paper: "#eaf0f6",
    categories: ["Felles", "Faglig", "Pause"],
    days: [
      {
        label: "Torsdag",
        date: "12. november",
        items: [
          {
            time: "09:00–09:30",
            title: "Kaffe & registrering",
            detail: "Foajeen · Finn en kopp og en ny bekjent",
            category: 2,
          },
          {
            time: "09:30–10:30",
            title: "Ideene vi trenger nå",
            detail: "Hovedsalen · Åpningsforedrag",
            category: 0,
          },
          {
            time: "10:45–12:00",
            title: "Fra idé til handling",
            detail: "Sal A · Praktisk workshop",
            category: 1,
          },
          {
            time: "10:45–12:00",
            title: "Design for flere",
            detail: "Sal B · Parallelt fagspor",
            category: 1,
          },
          {
            time: "12:00–13:00",
            title: "Lunsj & nye forbindelser",
            detail: "Restauranten · Tid til å snakke sammen",
            category: 2,
          },
          {
            time: "13:00–14:00",
            title: "Hva tar vi med oss videre?",
            detail: "Hovedsalen · Panelsamtale",
            category: 0,
          },
        ],
      },
      {
        label: "Fredag",
        date: "13. november",
        items: [
          {
            time: "09:00–09:30",
            title: "God morgen, igjen",
            detail: "Foajeen · Kaffe og oppsummering",
            category: 2,
          },
          {
            time: "09:30–11:00",
            title: "Bygg noe sammen",
            detail: "Sal A · Workshop i små grupper",
            category: 1,
          },
          {
            time: "11:15–12:00",
            title: "Små forsøk, store endringer",
            detail: "Hovedsalen · Tre korte foredrag",
            category: 0,
          },
          { time: "12:00–13:00", title: "Lunsj", detail: "Restauranten", category: 2 },
          {
            time: "13:00–14:00",
            title: "Neste kapittel",
            detail: "Hovedsalen · Felles avslutning",
            category: 0,
          },
        ],
      },
    ],
  },
  {
    id: "bryllup",
    label: "Bryllup",
    title: "Anna & Emil",
    subtitle: "En helg vi vil huske. Med dere vi er glade i.",
    description: "Fra velkomstmiddag til siste dans og søndagsbrunsj.",
    location: "Hagegården · Drøbak",
    color: "#6a7150",
    paper: "#f0f0e5",
    categories: ["Sammen", "Feiring", "Mat & drikke"],
    days: [
      {
        label: "Fredag",
        date: "18. juni",
        items: [
          {
            time: "16:00–18:00",
            title: "Velkommen til gården",
            detail: "Gjestehuset · Innsjekk og en rolig start",
            category: 0,
          },
          {
            time: "18:00–21:00",
            title: "Langbord i hagen",
            detail: "Eplehagen · Uformell velkomstmiddag",
            category: 2,
          },
        ],
      },
      {
        label: "Lørdag",
        date: "19. juni",
        items: [
          {
            time: "14:00–14:45",
            title: "Vi sier ja",
            detail: "Hagen · Finn plassen din litt før",
            category: 1,
          },
          {
            time: "15:00–16:30",
            title: "Bobler & hageprat",
            detail: "Terrassen · Små biter og store smil",
            category: 2,
          },
          {
            time: "17:00–20:30",
            title: "Til bords",
            detail: "Låven · Middag, taler og gode historier",
            category: 2,
          },
          {
            time: "21:00–21:30",
            title: "Kake & kaffe",
            detail: "Låven · Noe søtt før dansegulvet",
            category: 2,
          },
          {
            time: "21:30–02:00",
            title: "Bare én dans til",
            detail: "Låven · Vi feirer langt ut i natten",
            category: 1,
          },
        ],
      },
      {
        label: "Søndag",
        date: "20. juni",
        items: [
          {
            time: "10:00–12:00",
            title: "En langsom søndag",
            detail: "Hovedhuset · Brunsj og helgens historier",
            category: 2,
          },
          {
            time: "12:00–13:00",
            title: "Takk for oss",
            detail: "Gårdsplassen · Klemmer før hjemreise",
            category: 0,
          },
        ],
      },
    ],
  },
  {
    id: "leir",
    label: "Leir & tur",
    title: "Ut av hverdagen",
    subtitle: "Tre dager ute. Plass til både fart og stillhet.",
    description: "Aktiviteter, måltider og turer gjennom hele helgen.",
    location: "Skogstun · Nordmarka",
    color: "#975c36",
    paper: "#f5eade",
    categories: ["Felles", "Aktivitet", "Mat & pause"],
    days: [
      {
        label: "Fredag",
        date: "20. august",
        items: [
          {
            time: "17:00–18:00",
            title: "Finn hytta di",
            detail: "Tunet · Ankomst og innkvartering",
            category: 0,
          },
          {
            time: "18:00–19:00",
            title: "Middag sammen",
            detail: "Spisesalen · Varm suppe og ferskt brød",
            category: 2,
          },
          {
            time: "19:30–21:00",
            title: "Bli kjent rundt bålet",
            detail: "Bålplassen · Ta med en varm genser",
            category: 0,
          },
        ],
      },
      {
        label: "Lørdag",
        date: "21. august",
        items: [
          {
            time: "08:00–09:00",
            title: "Frokost",
            detail: "Spisesalen · Smør en matpakke",
            category: 2,
          },
          {
            time: "09:30–12:00",
            title: "På stien mot toppen",
            detail: "Tunet · Fellestur med utsikt",
            category: 1,
          },
          {
            time: "12:00–13:00",
            title: "Matpakke i det fri",
            detail: "Utsiktspunktet · En velfortjent pause",
            category: 2,
          },
          {
            time: "14:00–16:00",
            title: "Kano på vannet",
            detail: "Brygga · Gruppe 1",
            category: 1,
          },
          { time: "14:00–16:00", title: "Naturverksted", detail: "Tunet · Gruppe 2", category: 1 },
          {
            time: "19:00–21:00",
            title: "Bålkveld & pinnebrød",
            detail: "Bålplassen · Alle er med",
            category: 0,
          },
        ],
      },
      {
        label: "Søndag",
        date: "22. august",
        items: [
          { time: "09:00–10:00", title: "Frokost i ro og mak", detail: "Spisesalen", category: 2 },
          {
            time: "10:30–12:00",
            title: "En siste runde ute",
            detail: "Tunet · Natursti i lag",
            category: 1,
          },
          {
            time: "12:00–13:00",
            title: "Lunsj & hjemreise",
            detail: "Spisesalen · Takk for turen",
            category: 0,
          },
        ],
      },
    ],
  },
  {
    id: "festival",
    label: "Festival",
    title: "Sensommer",
    subtitle: "Musikk, mennesker og en kveld som varer litt til.",
    description: "Flere scener, konserter og mat mellom slagene.",
    location: "Byparken · Bergen",
    color: "#78475e",
    paper: "#f3e8ee",
    categories: ["Felles", "Musikk", "Mat & pause"],
    days: [
      {
        label: "Fredag",
        date: "27. august",
        items: [
          {
            time: "16:00–17:00",
            title: "Portene åpner",
            detail: "Byparken · Finn festivalfølelsen",
            category: 0,
          },
          {
            time: "17:00–18:00",
            title: "Nye stemmer",
            detail: "Parkscenen · Akustisk åpningskonsert",
            category: 1,
          },
          {
            time: "18:00–19:30",
            title: "Smaken av sensommer",
            detail: "Matgata · Lokale matboder",
            category: 2,
          },
          {
            time: "19:30–21:00",
            title: "Under åpen himmel",
            detail: "Hovedscenen · Kveldens første headliner",
            category: 1,
          },
          {
            time: "21:30–23:00",
            title: "Lys i natten",
            detail: "Hovedscenen · Siste konsert",
            category: 1,
          },
        ],
      },
      {
        label: "Lørdag",
        date: "28. august",
        items: [
          {
            time: "13:00–14:00",
            title: "Parken våkner",
            detail: "Parkscenen · Musikk for hele familien",
            category: 0,
          },
          {
            time: "15:00–16:00",
            title: "Unge lyder",
            detail: "Parkscenen · Morgendagens artister",
            category: 1,
          },
          {
            time: "15:00–16:00",
            title: "Bak låtene",
            detail: "Teltet · Samtale og minikonsert",
            category: 1,
          },
          {
            time: "17:00–18:30",
            title: "Middag i parken",
            detail: "Matgata · Finn din favoritt",
            category: 2,
          },
          {
            time: "20:00–22:00",
            title: "En siste sommerkveld",
            detail: "Hovedscenen · Festivalavslutning",
            category: 1,
          },
        ],
      },
    ],
  },
];

function categoryColor(example: Example, index: number) {
  return [example.color, "#a794b5", "#c6a46a", "#6b8a79"][index] ?? example.color;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CalendarBetter — Gi gode opplevelser et godt program" },
      {
        name: "description",
        content:
          "Lag programmer for firmaturer, bryllup, konferanser, leir og festivaler. Utforsk eksempler og lag ditt eget program uten innlogging.",
      },
      { property: "og:title", content: "CalendarBetter — Gi gode opplevelser et godt program" },
      {
        property: "og:description",
        content:
          "Fra den første kaffen til den siste dansen. Planlegg, tilpass og del programmet ditt.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const [exampleIndex, setExampleIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [showAllDays, setShowAllDays] = useState(true);
  const example = examples[exampleIndex]!;
  const day = example.days[dayIndex]!;

  return (
    <div className="min-h-screen bg-background" lang="nb">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link to="/" aria-label="CalendarBetter – forsiden" className="flex items-center gap-2.5">
          <CalendarDays className="size-5" strokeWidth={1.5} />
          <span className="text-sm font-medium tracking-[0.16em]">CALENDARBETTER</span>
        </Link>
        <nav aria-label="Hovedmeny" className="flex items-center gap-3 sm:gap-6">
          <a
            href="#eksempler"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Se eksempler
          </a>
          {!loading && (
            <Button asChild variant="ghost" size="sm">
              <Link to={user ? "/events" : "/auth"}>{user ? "Mine programmer" : "Logg inn"}</Link>
            </Button>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-12 sm:px-10 sm:pb-24 sm:pt-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Små øyeblikk. Store opplevelser.
            </p>
            <h1 className="mt-6 max-w-xl text-6xl leading-[1.03] tracking-tight sm:text-7xl">
              Alt som skal skje.
              <br />
              <span className="italic text-[#777b55]">Fint samlet.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Den første kaffen. Et nytt perspektiv. Den siste dansen. Lag et oversiktlig program
              som gjør det lett å være med.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-12 rounded-full px-6">
                <Link to="/events">
                  Lag ditt eget program <ArrowRight />
                </Link>
              </Button>
              <a
                href="#eksempler"
                className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
              >
                Finn inspirasjon <ArrowDown className="size-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Kom i gang uten konto. Logg inn når du vil ta vare på programmet.
            </p>
          </div>

          <div
            className="relative isolate mx-auto w-full max-w-[480px] py-5 pl-4 pr-6 sm:pl-7 sm:pr-10"
            aria-label="Eksempler på programplakater"
          >
            <div className="absolute inset-0 -z-10 rounded-[45%] bg-[#e9e7da]/60" />
            <div className="absolute right-0 top-0 z-10 rotate-6 rounded-full border border-[#d6d4c4] bg-[#f4f2e7] px-4 py-2 text-[11px] tracking-wide">
              Ditt program. Din stil.
            </div>
            <div className="ml-auto w-[77%] rotate-6 rounded-sm bg-[#324d73] p-6 pb-10 text-[#f4f4ec] shadow-xl sm:p-8">
              <p className="text-[9px] uppercase tracking-[0.25em]">
                Konferanse · 12.–13. november
              </p>
              <p className="mt-5 font-display text-4xl leading-none">
                Nye
                <br />
                perspektiver
              </p>
              <p className="mt-4 border-t border-white/25 pt-3 text-[10px]">
                09:30 &nbsp; Ideene vi trenger nå
              </p>
              <p className="mt-3 text-[10px]">10:45 &nbsp; Fra idé til handling</p>
            </div>
            <div className="relative -mt-12 w-[79%] -rotate-6 rounded-sm border border-[#dedfcf] bg-[#f2f1e6] p-6 text-[#4d573e] shadow-xl sm:p-8">
              <p className="text-[9px] uppercase tracking-[0.25em]">Hagegården · 19. juni</p>
              <p className="mt-4 font-display text-5xl italic">Anna & Emil</p>
              <p className="mt-2 text-[10px]">En dag for kjærligheten.</p>
              <div className="mt-5 space-y-3 border-t border-[#4d573e]/25 pt-4 text-[11px]">
                <p>
                  <span className="mr-4 font-medium">14:00</span>Vi sier ja
                </p>
                <p>
                  <span className="mr-4 font-medium">17:00</span>Til bords
                </p>
                <p>
                  <span className="mr-4 font-medium">21:30</span>Bare én dans til
                </p>
              </div>
              <p className="mt-6 text-[8px] uppercase tracking-[0.25em]">
                Laget med CalendarBetter
              </p>
            </div>
          </div>
        </section>

        <div className="border-y border-border bg-[#efeee6]/50">
          <div className="mx-auto grid max-w-6xl gap-5 px-6 py-6 sm:grid-cols-3 sm:px-10">
            {[
              {
                icon: CalendarDays,
                title: "Én dag eller en hel uke",
                text: "Samle tider, steder og aktiviteter.",
              },
              {
                icon: Palette,
                title: "Sett ditt eget preg",
                text: "Tilpass farger, kategorier og logo.",
              },
              {
                icon: Download,
                title: "Klart til å deles",
                text: "Del en lenke, last ned bilde eller PDF.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-[#777b55]" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section
          id="eksempler"
          className="mx-auto max-w-6xl scroll-mt-8 px-6 py-16 sm:px-10 sm:py-24"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Litt inspirasjon på veien
              </p>
              <h2 className="mt-3 text-4xl sm:text-5xl">Ulike anledninger. Samme oversikt.</h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Velg en anledning og bla gjennom dagene. Dette er eksempler på hva du kan lage.
            </p>
          </div>

          <div
            role="group"
            aria-label="Velg eksempelprogram"
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {examples.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={index === exampleIndex}
                aria-controls="programvisning"
                onClick={() => {
                  setExampleIndex(index);
                  setShowAllDays(item.id === "firmatur");
                  setDayIndex(item.id === "bryllup" || item.id === "leir" ? 1 : 0);
                }}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${index === exampleIndex ? "border-foreground bg-white shadow-sm" : "border-border hover:border-foreground/40 hover:bg-white/50"}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <ArrowRight className="size-4" />
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              </button>
            ))}
          </div>

          <div
            id="programvisning"
            role="region"
            aria-label={`Eksempelprogram: ${example.label}`}
            className={`mt-6 overflow-hidden rounded-2xl border border-border bg-card ${showAllDays ? "" : "lg:grid lg:grid-cols-[0.8fr_1.2fr]"}`}
          >
            <div
              className={`flex flex-col justify-between gap-6 p-6 ${showAllDays ? "lg:flex-row lg:items-end" : "sm:p-10"}`}
              style={{ background: example.paper }}
            >
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: example.color }}
                >
                  Eksempel · {example.label}
                </p>
                <h3
                  className={`font-display leading-[1.05] ${showAllDays ? "mt-3 text-4xl" : "mt-8 text-5xl sm:text-6xl"}`}
                  style={{ color: example.color }}
                >
                  {example.title}
                </h3>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/75">
                  {example.subtitle}
                </p>
                <p className="mt-6 flex items-center gap-2 text-xs text-foreground/65">
                  <MapPin className="size-3.5" />
                  {example.location}
                </p>
                <p className="mt-3 text-xs text-foreground/65">
                  {example.days.length} dager ·{" "}
                  {example.days.reduce((total, item) => total + item.items.length, 0)}{" "}
                  programpunkter
                </p>
              </div>
              <div className="mt-10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                  Programmet dag for dag
                </p>
                <div role="group" aria-label="Velg dag" className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={showAllDays}
                    onClick={() => setShowAllDays(true)}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${showAllDays ? "border-foreground bg-foreground text-background" : "border-foreground/20 hover:bg-white/60"}`}
                  >
                    Hele programmet
                  </button>
                  {example.days.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      aria-pressed={!showAllDays && dayIndex === index}
                      onClick={() => {
                        setDayIndex(index);
                        setShowAllDays(false);
                      }}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${!showAllDays && dayIndex === index ? "border-foreground bg-foreground text-background" : "border-foreground/20 hover:bg-white/60"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-10" aria-live="polite" aria-atomic="true">
              {showAllDays && (
                <p className="mb-4 text-xs text-muted-foreground">
                  Hele oppholdet, dag for dag. På små skjermer kan du bla sidelengs for å se alle
                  dagene.
                </p>
              )}
              <div
                className={showAllDays ? "overflow-x-auto rounded-lg border border-border" : ""}
                tabIndex={showAllDays ? 0 : undefined}
                role={showAllDays ? "region" : undefined}
                aria-label={showAllDays ? "Alle programdager, bla sidelengs" : undefined}
              >
                <div
                  className={showAllDays ? "grid divide-x divide-border" : ""}
                  style={
                    showAllDays
                      ? {
                          gridTemplateColumns: `repeat(${example.days.length}, minmax(180px, 1fr))`,
                        }
                      : undefined
                  }
                >
                  {(showAllDays ? example.days : [day]).map((programDay) => (
                    <div key={programDay.label} className={showAllDays ? "p-4" : ""}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-5">
                        <h4 className="font-display text-3xl">{programDay.label}</h4>
                        <p className="text-xs text-muted-foreground">{programDay.date}</p>
                      </div>
                      <ol className="divide-y divide-border/70">
                        {programDay.items.map((item) => (
                          <li
                            key={`${item.time}-${item.title}`}
                            className={
                              showAllDays
                                ? "space-y-2 py-4"
                                : "grid grid-cols-[76px_1fr] gap-3 py-4 sm:grid-cols-[88px_1fr]"
                            }
                          >
                            <span className="pt-0.5 text-[11px] tabular-nums text-muted-foreground">
                              {item.time}
                            </span>
                            <div
                              className="border-l-[3px] pl-3"
                              style={{ borderColor: categoryColor(example, item.category) }}
                            >
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {item.detail}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4">
                {example.categories.map((category, index) => (
                  <span
                    key={category}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        background: categoryColor(example, index),
                      }}
                    />
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Fiktive arrangementer, ekte muligheter. Lag ditt eget innhold og uttrykk i
            redigeringsverktøyet.
          </p>
        </section>

        <section className="mx-4 mb-8 rounded-2xl bg-[#293c32] px-6 py-14 text-[#f3f1e5] sm:mx-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c4c9ab]">
              Fra første idé til ferdig program
            </p>
            <h2 className="mt-4 text-4xl sm:text-6xl">Hva skal dere finne på?</h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#d3d8cc]">
              Start med navn og datoer. Legg til det som skal skje. Gi programmet ditt et uttrykk
              som passer anledningen.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 rounded-full bg-[#f3f1e5] px-6 text-[#293c32] hover:bg-white"
            >
              <Link to="/events">
                Lag ditt første program <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-[#c4c9ab]">Ingen innlogging nødvendig.</p>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 pb-8 pt-2 text-xs text-muted-foreground sm:px-10">
        <span className="tracking-[0.15em]">CALENDARBETTER</span>
        <span>Gode opplevelser begynner med en god plan.</span>
      </footer>
    </div>
  );
}
