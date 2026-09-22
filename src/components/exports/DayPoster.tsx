import { forwardRef, useMemo } from "react";
import {
  buildAlignedTimelines,
  dateLabel,
  groupByDay,
  timeRange,
  weekdayName,
  type CategoryRow,
  type ElementRow,
  type EventRow,
} from "@/lib/programio";
import { accentColorFor, cardVisual, paletteColorFor, posterTheme, spacedTicks, type CardStyle, type PaletteKey } from "@/lib/poster-style";

export type ExportOptions = {
  includeSubtitle: boolean;
  includeLocation: boolean;
  includeLogo: boolean;
  /** Hour grid lines behind the program cards. */
  includeGrid?: boolean;
  /** Footer strip at the bottom of the poster. */
  includeFooter?: boolean;
  /** Card fill treatment. */
  cardStyle?: CardStyle;
  /** Card opacity, 0.15 - 1. */
  cardOpacity?: number;
  /** Colour palette override for categories. */
  palette?: PaletteKey;
  /** Accent colour override for the event. */
  accentColor?: string;
  /** Poster background colour. */
  backgroundColor?: string;
  /** Language used for weekday and date labels. */
  locale?: string;
  /** Text size multiplier for all poster text, 0.8 - 1.8. */
  fontScale?: number;
};

type Props = {
  event: EventRow;
  categories: CategoryRow[];
  elements: ElementRow[];
  dayKey: string;
  options: ExportOptions;
};

const BG = "#14120f";

const POSTER_H = 1920;
const PAD_Y = 36;
const AXIS = 150;
const GUTTER = 16;

/** Text never scales below this, so cards stay readable on a phone screen. */
const MIN_TEXT_SCALE = 0.75;
const ts = (s: number, fontScale = 1) => Math.max(s, MIN_TEXT_SCALE) * fontScale;

export function wrapLines(text: string, fontSize: number, width: number) {
  const charW = fontSize * 0.58;
  const perLine = Math.max(4, Math.floor(width / charW));
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let cur = 0;
  for (const w of words) {
    const need = cur === 0 ? w.length : cur + 1 + w.length;
    if (need > perLine && cur > 0) {
      lines += Math.ceil(w.length / perLine);
      cur = w.length % perLine || perLine;
    } else {
      cur = need;
    }
  }
  return Math.max(1, lines);
}

function estimateMinHeight(
  el: ElementRow,
  lanes: number,
  options: ExportOptions,
  dense: boolean,
  trackWidth: number,
  scale: number,
) {
  const f = options.fontScale ?? 1;
  const laneW = (trackWidth - GUTTER * (lanes - 1)) / lanes;
  const tight = lanes > 1;
  const padV = tight ? 28 : 40;
  const padH = tight ? 40 : 52;
  const inner = Math.max(80, laneW - padH);
  const timeRow = (tight ? 36 : 42) * ts(scale, f) * 1.25;
  const titleSize = (tight ? 40 : dense ? 46 : 54) * ts(scale, f);
  const titleHeight = wrapLines(el.title, titleSize, inner) * titleSize * 1.18;

  let subtitleHeight = 0;
  if (options.includeSubtitle && el.subtitle) {
    const size = (tight ? 28 : 32) * ts(scale, f);
    subtitleHeight = 6 + wrapLines(el.subtitle, size, inner) * size * 1.25;
  }

  let locationHeight = 0;
  if (options.includeLocation && el.location) {
    const size = (tight ? 26 : 30) * ts(scale, f);
    locationHeight = 6 + wrapLines(el.location, size, inner) * size * 1.25;
  }

  return Math.ceil(padV + timeRow + titleHeight + subtitleHeight + locationHeight + 8 * scale);
}

export const DayPoster = forwardRef<HTMLDivElement, Props>(function DayPoster(
  { event, categories, elements, dayKey, options },
  ref,
) {
  const byDay = useMemo(() => groupByDay(elements), [elements]);
  const items = byDay.get(dayKey) ?? [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const accent = options.accentColor ?? accentColorFor(options.palette, categories);
  const theme = posterTheme(options.backgroundColor ?? BG);
  const TEXT = theme.text;
  const MUTED = theme.muted;
  const PAPER = theme.surface;
  const catIndex = new Map(categories.map((c, i) => [c.id, i]));
  const dense = items.length > 11;
  const f = options.fontScale ?? 1;
  const axis = options.includeGrid === false ? 0 : AXIS;
  const showFooter = options.includeFooter !== false;
  // Measured chrome so the timeline never grows underneath header/footer.
  const headerH = 20 * f * 1.2 + 12 + 72 * f + 4 + 30 * f * 1.2 + 18 + 1;
  // Keep breathing room at the bottom even when the footer text is hidden.
  const footerH = showFooter ? 14 + 22 * f * 1.35 + 1 : 28;
  const AVAILABLE = Math.max(400, POSTER_H - PAD_Y * 2 - headerH - footerH - 18);
  // Poster padding is 48px per side, so the card track must fill exactly the
  // remaining width — otherwise the right margin ends up wider than the left.
  const track = 1080 - 96 - axis;

  const { aligned, scale } = useMemo(() => {
    if (items.length === 0) return { aligned: null, scale: 1 };
    // Two passes: the poster is scaled down to fit, so the minimum heights must
    // be inflated by 1/scale to keep room for subtitle and location text.
    const build = (s: number) =>
      buildAlignedTimelines([dayKey], byDay, {
        targetPx: AVAILABLE,
        maxPxPerMinute: 6,
        minPx: 96 / s,
        gap: 8 / s,
        minPxFor: (el, lanes) => estimateMinHeight(el, lanes, options, dense, track, 1) / s,
      });
    let a = build(1);
    let s = Math.min(1, AVAILABLE / a.totalPx);
    for (let i = 0; i < 3 && s < 0.999; i++) {
      a = build(s);
      const next = Math.min(1, AVAILABLE / a.totalPx);
      if (Math.abs(next - s) < 0.01) {
        s = next;
        break;
      }
      s = next;
    }
    return { aligned: a, scale: s };
  }, [items.length, dayKey, byDay, options, dense, track, AVAILABLE]);

  const contentHeight = aligned ? aligned.totalPx * scale : 0;

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: theme.bg,
        color: TEXT,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        padding: `${PAD_Y}px 48px`,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(1200px 600px at 80% -10%, ${accent}22, transparent 70%)`,
        }}
      />
      <header style={{ position: "relative", borderBottom: `1px solid ${theme.line}`, paddingBottom: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20 * f,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {event.name}
              {options.includeSubtitle && event.subtitle ? ` · ${event.subtitle}` : ""}
            </div>
            <div
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: 72 * f,
                lineHeight: 1,
                marginTop: 12,
              }}
            >
              {weekdayName(dayKey, options.locale)}
            </div>
            <div style={{ fontSize: 30 * f, color: MUTED, marginTop: 4 }}>{dateLabel(dayKey, options.locale)}</div>
          </div>
          {options.includeLogo && event.logo_url ? (
            <img
              src={event.logo_url}
              alt=""
              crossOrigin="anonymous"
              style={{ width: 110, height: 110, objectFit: "contain", opacity: 0.95 }}
            />
          ) : null}
        </div>
      </header>

      <main
        style={{
          position: "relative",
          flex: 1,
          marginTop: 18,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: MUTED,
              fontSize: 40,
              fontFamily: '"Instrument Serif", Georgia, serif',
            }}
          >
            No program this day — free time.
          </div>
        ) : aligned ? (
          <div
            style={{
              position: "relative",
              height: contentHeight,
            }}
          >
            {/* hour grid */}
            {options.includeGrid !== false &&
              spacedTicks(aligned.ticks, scale, 34 * ts(scale, f)).map((t) => (
                <div
                  key={t.label}
                  style={{
                    position: "absolute",
                    top: t.pos * scale,
                    left: 0,
                    right: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                  }}
                >
                  <span
                    style={{
                      width: AXIS - 18,
                      fontSize: 30 * ts(scale, f),
                      color: MUTED,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: theme.line,
                    }}
                  />
                </div>
              ))}

            {(aligned.perDay.get(dayKey) ?? []).map((b) => {
              const el = b.el;
              const cat = el.category_id ? catById.get(el.category_id) : undefined;
              const baseColor = cat?.color ?? "#8A8F98";
              const color = paletteColorFor(
                options.palette,
                cat ? (catIndex.get(cat.id) ?? 0) : 0,
                baseColor,
              );
              const visual = cardVisual({
                color,
                style: options.cardStyle ?? "paper",
                opacity: options.cardOpacity ?? 1,
                surface: PAPER,
                text: TEXT,
                textColor: cat?.text_color,
                barWidth: 10,
                dark: theme.dark,
              });
              const laneW = (track - GUTTER * (b.lanes - 1)) / b.lanes;
              const h = b.height * scale;
              const tight = h < 130 || b.lanes > 1;
              return (
                <div
                  key={el.id}
                  style={{
                    position: "absolute",
                    top: b.top * scale,
                    left: axis + b.lane * (laneW + GUTTER),
                    width: laneW,
                    height: h,
                    ...visual,
                    borderRadius: 24,
                    padding: tight ? "14px 20px" : "20px 26px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: (tight ? 30 : 34) * ts(scale, f),
                      opacity: 0.75,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {timeRange(el)}
                    {cat ? (
                      <span style={{ marginLeft: 14 }}>
                        {cat.icon ? `${cat.icon} ` : "• "}
                        {cat.name}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: (tight ? 40 : dense ? 46 : 54) * ts(scale, f),
                      lineHeight: 1.14,
                      wordBreak: "break-word",
                    }}
                  >
                    {el.title}
                  </div>
                  {options.includeSubtitle && el.subtitle ? (
                    <div style={{ fontSize: (tight ? 28 : 32) * ts(scale, f), opacity: 0.78 }}>{el.subtitle}</div>
                  ) : null}
                  {options.includeLocation && el.location ? (
                    <div style={{ fontSize: (tight ? 26 : 30) * ts(scale, f), opacity: 0.72 }}>◦ {el.location}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </main>

      {showFooter ? (
      <footer
        style={{
          position: "relative",
          paddingTop: 14,
          borderTop: `1px solid ${theme.line}`,
          display: "flex",
          justifyContent: "space-between",
          color: MUTED,
          fontSize: 22 * f,
        }}
      >
        <span>{options.includeLocation && event.location ? event.location : ""}</span>
        <span style={{ letterSpacing: "0.24em", textTransform: "uppercase" }}>Programio</span>
      </footer>
      ) : null}
    </div>
  );
});
