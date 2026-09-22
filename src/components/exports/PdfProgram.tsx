import { forwardRef, useMemo } from "react";
import {
  dateLabel,
  eventDayKeys,
  groupByDay,
  timeRange,
  weekdayName,
  type CategoryRow,
  type ElementRow,
  type EventRow,
} from "@/lib/programio";
import { accentColorFor, paletteColorFor, posterTheme } from "@/lib/poster-style";
import type { ExportOptions } from "@/components/exports/DayPoster";

type Props = {
  event: EventRow;
  categories: CategoryRow[];
  elements: ElementRow[];
  options: ExportOptions;
};

/** A4 portrait at 150 dpi. */
export const PDF_WIDTH = 1240;
const PAD_X = 96;
const PAD_Y = 96;

export const PdfProgram = forwardRef<HTMLDivElement, Props>(function PdfProgram(
  { event, categories, elements, options },
  ref,
) {
  const byDay = useMemo(() => groupByDay(elements), [elements]);
  const days = eventDayKeys(event);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catIndex = new Map(categories.map((c, i) => [c.id, i]));
  const theme = posterTheme(options.backgroundColor ?? "#14120f");
  const accent = options.accentColor ?? accentColorFor(options.palette, categories);
  const f = options.fontScale ?? 1;
  const locale = options.locale ?? "nb-NO";
  const showFooter = options.includeFooter !== false;

  return (
    <div
      ref={ref}
      style={{
        width: PDF_WIDTH,
        minHeight: 1754,
        background: theme.bg,
        color: theme.text,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        padding: `${PAD_Y}px ${PAD_X}px`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 32,
          borderBottom: `2px solid ${accent}`,
          paddingBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16 * f,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            Program
          </div>
          <div
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 56 * f,
              lineHeight: 1.05,
              marginTop: 10,
            }}
          >
            {event.name}
          </div>
          {options.includeSubtitle && event.subtitle ? (
            <div style={{ fontSize: 22 * f, color: theme.muted, marginTop: 8 }}>{event.subtitle}</div>
          ) : null}
          {options.includeLocation && event.location ? (
            <div style={{ fontSize: 20 * f, color: theme.muted, marginTop: 4 }}>{event.location}</div>
          ) : null}
        </div>
        {options.includeLogo && event.logo_url ? (
          <img
            src={event.logo_url}
            alt=""
            crossOrigin="anonymous"
            style={{ width: 120, height: 120, objectFit: "contain" }}
          />
        ) : null}
      </header>

      <main style={{ flex: 1, marginTop: 40, display: "flex", flexDirection: "column", gap: 40 }}>
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          return (
            <section key={day} style={{ breakInside: "avoid" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${theme.line}`,
                }}
              >
                <div style={{ fontSize: 30 * f, fontFamily: '"Instrument Serif", Georgia, serif' }}>
                  {weekdayName(day, locale)}
                </div>
                <div style={{ fontSize: 19 * f, color: theme.muted }}>{dateLabel(day, locale)}</div>
              </div>

              {items.length === 0 ? (
                <div style={{ fontSize: 19 * f, color: theme.muted, padding: "16px 0" }}>
                  {locale.startsWith("nb") ? "Ingen program denne dagen." : "No program this day."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {items.map((el) => {
                    const cat = el.category_id ? catById.get(el.category_id) : undefined;
                    const color = paletteColorFor(
                      options.palette,
                      cat ? (catIndex.get(cat.id) ?? 0) : 0,
                      cat?.color ?? theme.muted,
                    );
                    return (
                      <div
                        key={el.id}
                        style={{
                          display: "flex",
                          gap: 24,
                          padding: "14px 0",
                          borderBottom: `1px solid ${theme.line}`,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 190,
                            flexShrink: 0,
                            fontSize: 20 * f,
                            color: theme.muted,
                            fontVariantNumeric: "tabular-nums",
                            paddingTop: 2,
                          }}
                        >
                          {timeRange(el)}
                        </div>
                        <div
                          style={{
                            width: 6,
                            alignSelf: "stretch",
                            borderRadius: 3,
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 24 * f, lineHeight: 1.25 }}>{el.title}</div>
                          {options.includeSubtitle && el.subtitle ? (
                            <div style={{ fontSize: 19 * f, color: theme.muted, marginTop: 3 }}>{el.subtitle}</div>
                          ) : null}
                          {options.includeLocation && el.location ? (
                            <div style={{ fontSize: 18 * f, color: theme.muted, marginTop: 3 }}>◦ {el.location}</div>
                          ) : null}
                        </div>
                        {cat ? (
                          <div
                            style={{
                              fontSize: 17 * f,
                              color: color,
                              flexShrink: 0,
                              paddingTop: 4,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cat.icon ? `${cat.icon} ` : ""}
                            {cat.name}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>

      {showFooter ? (
        <footer
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop: `1px solid ${theme.line}`,
            display: "flex",
            justifyContent: "space-between",
            color: theme.muted,
            fontSize: 17 * f,
          }}
        >
          <span>{options.includeLocation && event.location ? event.location : ""}</span>
          <span style={{ letterSpacing: "0.24em", textTransform: "uppercase" }}>Programio</span>
        </footer>
      ) : null}
    </div>
  );
});
