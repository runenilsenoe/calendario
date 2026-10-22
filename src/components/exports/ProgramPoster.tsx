import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  dateLabel,
  eventDayKeys,
  formatTime,
  groupByDay,
  readableOn,
  timeRange,
  weekdayName,
  type CategoryRow,
  type ElementRow,
  type EventRow,
} from "@/lib/calendarbetter";
import { hexToRgba, mixHex, paletteColorFor, type PosterLayout } from "@/lib/poster-style";
import { DayPoster, type ExportOptions } from "./DayPoster";
import { FullPoster } from "./FullPoster";

type Props = {
  event: EventRow;
  categories: CategoryRow[];
  elements: ElementRow[];
  options: ExportOptions;
};

type ListLayout = Exclude<PosterLayout, "timeline">;

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  layout: "timeline",
  includeSubtitle: true,
  includeLocation: true,
  includeLogo: true,
  includeGrid: true,
  cardStyle: "paper",
  cardOpacity: 1,
  palette: "category",
  locale: "nb-NO",
  fontScale: 1.15,
};

/** The event's saved export design on top of the defaults. */
export function savedExportOptions(event: EventRow): ExportOptions {
  return { ...DEFAULT_EXPORT_OPTIONS, ...(event.poster_options as Partial<ExportOptions>) };
}

/** Day poster in the layout chosen in the export options. */
export const DayExport = forwardRef<HTMLDivElement, Props & { dayKey: string }>(
  function DayExport(props, ref) {
    const layout = props.options.layout ?? "timeline";
    return layout === "timeline" ? (
      <DayPoster ref={ref} {...props} />
    ) : (
      <ProgramPoster ref={ref} {...props} layout={layout} />
    );
  },
);

/** Full-program poster in the layout chosen in the export options. */
export const FullExport = forwardRef<HTMLDivElement, Props>(function FullExport(props, ref) {
  const layout = props.options.layout ?? "timeline";
  return layout === "timeline" ? (
    <FullPoster ref={ref} {...props} />
  ) : (
    <ProgramPoster ref={ref} {...props} layout={layout} />
  );
});

const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = '"Space Grotesk", system-ui, sans-serif';
const DAY_W = 1080;
const DAY_H = 1920;

type Theme = {
  page: string;
  panel: string;
  title: string;
  text: string;
  muted: string;
  line: string;
};

function layoutTheme(layout: ListLayout, accent: string): Theme {
  if (layout === "bold") {
    const text = readableOn(accent) === "#ffffff" ? "#f6f4ec" : "#1a1712";
    return {
      page: accent,
      panel: accent,
      title: text,
      text,
      muted: hexToRgba(text, 0.72),
      line: hexToRgba(text, 0.28),
    };
  }
  if (layout === "elegant") {
    const paper = mixHex(accent, "#f7f5ec", 0.88);
    const ink = mixHex(accent, "#1a1712", 0.35);
    return {
      page: paper,
      panel: paper,
      title: ink,
      text: ink,
      muted: hexToRgba(ink, 0.7),
      line: hexToRgba(ink, 0.22),
    };
  }
  return {
    page: "#fbfaf6",
    panel: mixHex(accent, "#ffffff", 0.86),
    title: accent,
    text: "#1a1712",
    muted: hexToRgba("#1a1712", 0.6),
    line: hexToRgba("#1a1712", 0.12),
  };
}

function copy(locale: string) {
  return locale.startsWith("nb")
    ? { madeWith: "Laget med CalendarBetter", empty: "Ingen programpunkter denne dagen." }
    : { madeWith: "Made with CalendarBetter", empty: "Nothing planned this day." };
}

/**
 * Scales a fixed-size poster's content down until it fits, re-flowing the
 * text at the wider width each pass so it stays as large as possible.
 */
function useFitScale(width: number, height: number, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fontsReady, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    document.fonts?.ready.then(bump).catch(() => {});
  }, []);

  // Runs after every render: any prop can change the content height. The pass is
  // deterministic, so it settles after at most one extra render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const minHeight = el.style.minHeight;
    el.style.minHeight = "0";
    let s = 1;
    for (let i = 0; i < 6; i++) {
      el.style.width = `${width / s}px`;
      const next = Math.min(1, height / el.offsetHeight);
      if (Math.abs(next - s) < 0.004) break;
      s = next;
    }
    el.style.width = `${width / s}px`;
    if (el.offsetHeight * s > height) s = height / el.offsetHeight;
    el.style.width = `${width / s}px`;
    el.style.minHeight = minHeight;
    if (Math.abs(s - scale) > 0.001) setScale(s);
  });

  return { ref, scale: enabled ? scale : 1, fontsReady };
}

const ProgramPoster = forwardRef<HTMLDivElement, Props & { layout: ListLayout; dayKey?: string }>(
  function ProgramPoster({ event, categories, elements, options, layout, dayKey }, ref) {
    const f = options.fontScale ?? 1;
    const locale = options.locale ?? "nb-NO";
    const text = copy(locale);
    const accent =
      options.accentColor ??
      (!options.palette || options.palette === "category"
        ? event.accent_color
        : paletteColorFor(options.palette, 0, event.accent_color));
    const theme = layoutTheme(layout, accent);
    const single = dayKey !== undefined;
    const days = single ? [dayKey] : eventDayKeys(event);
    const byDay = useMemo(() => groupByDay(elements), [elements]);
    const catById = new Map(categories.map((c, i) => [c.id, { ...c, index: i }]));
    const colorOf = (el: ElementRow) => {
      const cat = el.category_id ? catById.get(el.category_id) : undefined;
      return cat ? paletteColorFor(options.palette, cat.index, cat.color) : theme.muted;
    };
    const usedCategories = categories.filter((c) =>
      days.some((d) => (byDay.get(d) ?? []).some((el) => el.category_id === c.id)),
    );

    const range =
      event.start_date === event.end_date
        ? dateLabel(event.start_date, locale)
        : `${dateLabel(event.start_date, locale)} – ${dateLabel(event.end_date, locale)}`;
    const kicker =
      single && layout !== "list"
        ? `${weekdayName(dayKey, locale)} · ${dateLabel(dayKey, locale)}`
        : layout === "elegant" && options.includeLocation && event.location
          ? `${event.location} · ${range}`
          : range;

    const fit = useFitScale(DAY_W, DAY_H, single);
    const pad = single ? 80 : 72;
    const width = single ? DAY_W : Math.max(1600, pad * 2 + days.length * 420);
    const compact = !single;

    const detailOf = (el: ElementRow) =>
      [options.includeLocation ? el.location : null, options.includeSubtitle ? el.subtitle : null]
        .filter(Boolean)
        .join(" · ");

    const header = (
      <header
        style={{
          background: theme.panel,
          margin: `-${pad}px -${pad}px 0`,
          padding: `${pad}px ${pad}px ${layout === "list" ? pad : 24}px`,
          display: "flex",
          justifyContent: "space-between",
          gap: 32,
          textAlign: layout === "elegant" ? "center" : "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 24 * f,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: layout === "list" ? theme.title : theme.muted,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: layout === "elegant" ? "italic" : "normal",
              fontSize: (layout === "elegant" ? 132 : 112) * f * (compact ? 0.8 : 1),
              lineHeight: 1.02,
              marginTop: 28,
              color: theme.title,
              wordBreak: "break-word",
            }}
          >
            {event.name}
          </div>
          {options.includeSubtitle && event.subtitle ? (
            <div style={{ fontSize: 34 * f, color: theme.muted, marginTop: 20 }}>
              {event.subtitle}
            </div>
          ) : null}
          {layout !== "elegant" && options.includeLocation && event.location ? (
            <div style={{ fontSize: 28 * f, color: theme.muted, marginTop: 20 }}>
              ◦ {event.location}
            </div>
          ) : null}
        </div>
        {options.includeLogo && event.logo_url && layout !== "elegant" ? (
          <img
            src={event.logo_url}
            alt=""
            crossOrigin="anonymous"
            style={{ width: 120, height: 120, objectFit: "contain", flexShrink: 0 }}
          />
        ) : null}
      </header>
    );

    const row = (el: ElementRow) => {
      const detail = detailOf(el);
      const color = colorOf(el);
      const time = layout === "list" ? timeRange(el) : formatTime(el.start_datetime);
      const timeStyle: React.CSSProperties = {
        fontSize: (compact ? 24 : layout === "list" ? 32 : 36) * f,
        color: layout === "list" ? theme.muted : theme.text,
        fontWeight: layout === "list" ? 400 : 600,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      };
      const body = (
        <div
          style={{
            minWidth: 0,
            flex: 1,
            ...(layout === "list" ? { borderLeft: `8px solid ${color}`, paddingLeft: 22 } : {}),
          }}
        >
          <div
            style={{
              fontSize: (compact ? 32 : 44) * f,
              lineHeight: 1.18,
              fontWeight: 500,
              display: "flex",
              alignItems: "baseline",
              gap: 14,
            }}
          >
            {layout === "bold" ? (
              <span
                style={{
                  width: 14 * f,
                  height: 14 * f,
                  borderRadius: 999,
                  background: color,
                  boxShadow: `0 0 0 2px ${theme.line}`,
                  flexShrink: 0,
                  transform: "translateY(-0.15em)",
                }}
              />
            ) : null}
            <span style={{ wordBreak: "break-word" }}>{el.title}</span>
          </div>
          {detail ? (
            <div
              style={{
                fontSize: (compact ? 22 : 32) * f,
                color: theme.muted,
                marginTop: 6,
                fontStyle: layout === "elegant" ? "italic" : "normal",
              }}
            >
              {detail}
            </div>
          ) : null}
        </div>
      );
      return (
        <li
          key={el.id}
          style={{
            display: "flex",
            flexDirection: compact ? "column" : "row",
            gap: compact ? 10 : 28,
            padding: `${compact ? 20 : layout === "elegant" ? 18 : 26}px 0`,
            borderTop: layout === "elegant" ? "none" : `1px solid ${theme.line}`,
          }}
        >
          <span
            style={{ ...timeStyle, width: compact ? "auto" : (layout === "list" ? 200 : 130) * f }}
          >
            {time}
          </span>
          {body}
        </li>
      );
    };

    const dayBlock = (key: string) => {
      const items = byDay.get(key) ?? [];
      const showHeading = !single || layout === "list";
      return (
        <section key={key} style={{ minWidth: 0 }}>
          {showHeading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
                paddingBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: (compact ? 52 : 64) * f,
                  lineHeight: 1,
                  textTransform: "capitalize",
                }}
              >
                {weekdayName(key, locale)}
              </span>
              <span style={{ fontSize: 24 * f, color: theme.muted }}>{dateLabel(key, locale)}</span>
            </div>
          ) : null}
          {items.length === 0 ? (
            <p
              style={{
                fontFamily: SERIF,
                fontSize: 40 * f,
                color: theme.muted,
                borderTop: `1px solid ${theme.line}`,
                paddingTop: 28,
                margin: 0,
              }}
            >
              {text.empty}
            </p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>{items.map(row)}</ol>
          )}
        </section>
      );
    };

    const footer =
      options.includeFooter === false ? null : (
        <footer
          style={{
            marginTop: "auto",
            paddingTop: 40,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            alignItems: layout === "elegant" ? "center" : "stretch",
          }}
        >
          {layout !== "elegant" && usedCategories.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px 32px",
                borderTop: `1px solid ${theme.line}`,
                paddingTop: 24,
                fontSize: 22 * f,
                color: theme.muted,
              }}
            >
              {usedCategories.map((c) => (
                <span key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 12 * f,
                      height: 12 * f,
                      borderRadius: 999,
                      background: paletteColorFor(options.palette, categories.indexOf(c), c.color),
                    }}
                  />
                  {c.name}
                </span>
              ))}
            </div>
          ) : null}
          <span
            style={{
              fontSize: 18 * f,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: theme.muted,
            }}
          >
            {text.madeWith}
          </span>
        </footer>
      );

    const content = (
      <div
        ref={single ? fit.ref : undefined}
        style={{
          width: single ? DAY_W / fit.scale : width,
          minHeight: single ? DAY_H / fit.scale : undefined,
          transform: single ? `scale(${fit.scale})` : undefined,
          transformOrigin: "top left",
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          textAlign: layout === "elegant" && !single ? "left" : undefined,
        }}
      >
        {header}
        <div
          style={
            single
              ? { marginTop: layout === "list" ? 56 : 40 }
              : {
                  marginTop: layout === "list" ? 56 : 40,
                  display: "grid",
                  gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                  columnGap: 48,
                }
          }
        >
          {days.map(dayBlock)}
        </div>
        {footer}
      </div>
    );

    return (
      <div
        ref={ref}
        data-fonts={fit.fontsReady}
        style={{
          width: single ? DAY_W : width,
          height: single ? DAY_H : undefined,
          overflow: "hidden",
          background: theme.page,
          color: theme.text,
          fontFamily: SANS,
          boxSizing: "border-box",
        }}
      >
        {content}
      </div>
    );
  },
);
