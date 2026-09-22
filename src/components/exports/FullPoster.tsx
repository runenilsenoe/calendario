import { forwardRef, useEffect, useRef, useState } from "react";
import {
  buildAlignedTimelines,
  dateLabel,
  eventDayKeys,
  groupByDay,
  timeRange,
  weekdayName,
  type CategoryRow,
  type ElementRow,
  type EventRow,
} from "@/lib/programio";
import type { ExportOptions } from "./DayPoster";
import { accentColorFor, cardVisual, paletteColorFor, posterTheme, spacedTicks } from "@/lib/poster-style";
import { wrapLines } from "@/components/exports/DayPoster";

type Props = {
  event: EventRow;
  categories: CategoryRow[];
  elements: ElementRow[];
  options: ExportOptions;
};

const BG = "#14120f";

const WIDTH = 1920;
const HEIGHT = 1440;
const PAD_X = 48;
const PAD_Y = 36;
const COL_GAP = 24;
const AXIS = 50;
const GUTTER = 10;
const TARGET_PX = 900;

export const FullPoster = forwardRef<HTMLDivElement, Props>(function FullPoster(
  { event, categories, elements, options },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);

  const setRefs = (node: HTMLDivElement | null) => {

    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const days = eventDayKeys(event);
  const byDay = groupByDay(elements);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catIndex = new Map(categories.map((c, i) => [c.id, i]));
  const accent = options.accentColor ?? accentColorFor(options.palette, categories);
  const f = options.fontScale ?? 1;
  const theme = posterTheme(options.backgroundColor ?? BG);
  const TEXT = theme.text;
  const MUTED = theme.muted;
  const CARD = theme.surface;
  const axis = options.includeGrid === false ? 0 : AXIS;

  const colW = (WIDTH - PAD_X * 2 - (days.length - 1) * COL_GAP) / days.length;
  const track = colW - axis;

  const estimateHeight = (el: ElementRow, lanes = 1) => {
    const padX = 16;
    const padY = 12;
    const laneW = (track - (GUTTER + 4) - (lanes - 1) * 10) / lanes;
    const inner = Math.max(60, laneW - padX * 2);
    const titleFs = 28 * f;
    let h = padY * 2 + 19 * f * 1.3 + 4 + wrapLines(el.title, titleFs, inner) * titleFs * 1.18;
    if (options.includeSubtitle && el.subtitle)
      h += 6 + wrapLines(el.subtitle, 18 * f, inner) * 18 * f * 1.25;
    if (options.includeLocation && el.location)
      h += 6 + wrapLines(el.location, 17 * f, inner) * 17 * f * 1.25;
    return Math.ceil(h + 8);
  };

  const dayHeadH = 12 + 22 + 30 * f * 1.2;
  // Measure the real chrome so the grid area matches the canvas instead of a
  // hardcoded guess (which let cards spill outside the image).
  const headerH = 18 + 48 * f * 1.05 + 6 + 20 * f * 1.3;
  const showFooter = options.includeFooter !== false;
  // Keep breathing room at the bottom even when the footer text is hidden.
  const footerH = showFooter ? 14 + 18 * f * 1.35 + 1 : 24;
  const chromeH = PAD_Y * 2 + headerH + footerH;
  const availableHeight = Math.max(200, HEIGHT - chromeH - dayHeadH);
  const aligned = (() => {
    const build = (s: number) =>
      buildAlignedTimelines(days, byDay, {
        targetPx: TARGET_PX,
        maxPxPerMinute: 4,
        minPx: 64 / s,
        gap: 10 / s,
        minPxFor: (el, lanes) => estimateHeight(el, lanes) / s,
      });
    let s = 1;
    let a = build(s);
    for (let i = 0; i < 6; i++) {
      const next = Math.min(1, availableHeight / Math.max(1, a.totalPx));
      if (Math.abs(next - s) < 0.005) break;
      s = next;
      a = build(s);
    }
    // Use exactly the scale the layout was built with: scaling down further
    // would shrink cards below their text height and make them collide.
    return { ...a, scale: s };
  })();

  const scale = aligned.scale;
  const gridHeight = aligned.totalPx * scale + dayHeadH;
  // Keep the standard 4:3 canvas, but grow it if the content genuinely needs
  // more room rather than letting cards run off the poster.
  const canvasHeight = Math.max(HEIGHT, Math.ceil(chromeH + gridHeight));



  return (
    <div
      ref={setRefs}
      style={{
        width: WIDTH,
        height: canvasHeight,
        background: theme.bg,
        color: TEXT,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        padding: `${PAD_Y}px ${PAD_X}px`,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(1200px 600px at 8% -20%, ${accent}22, transparent 65%)`,
        }}
      />
      <header
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          paddingBottom: 18,
          borderBottom: `1px solid ${theme.line}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 48 * f,
              lineHeight: 1.05,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {event.name}
            {options.includeSubtitle && event.subtitle ? (
              <span style={{ color: accent }}> {event.subtitle}</span>
            ) : null}
          </div>
          <div style={{ fontSize: 20 * f, color: MUTED, marginTop: 6 }}>
            {dateLabel(days[0]!, options.locale)} – {dateLabel(days[days.length - 1]!, options.locale)}
            {options.includeLocation && event.location ? ` · ${event.location}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 420, justifyContent: "flex-end" }}>
            {categories.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, color: MUTED }}>
                <span
                  style={{ width: 12, height: 12, borderRadius: 4, background: paletteColorFor(options.palette, i, c.color), display: "inline-block" }}
                />
                {c.name}
              </div>
            ))}
          </div>
          {options.includeLogo && event.logo_url ? (
            <img
              src={event.logo_url}
              alt=""
              crossOrigin="anonymous"
              style={{ width: 72, height: 72, objectFit: "contain" }}
            />
          ) : null}
        </div>
      </header>

      <main
        style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}
      >

        <div style={{ position: "relative", width: "100%", height: gridHeight }}>

          {days.map((key) => {
            const items = byDay.get(key) ?? [];
            const blocks = aligned.perDay.get(key) ?? [];
            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: (colW + COL_GAP) * days.indexOf(key),
                  width: colW,
                  height: gridHeight,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ paddingBottom: 12, flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 17,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: accent,
                    }}
                  >
                    {weekdayName(key, options.locale)}
                  </div>
                  <div
                    style={{
                      fontFamily: '"Instrument Serif", Georgia, serif',
                      fontSize: 30 * f,
                      marginTop: 2,
                    }}
                  >
                    {dateLabel(key, options.locale)}
                  </div>
                </div>
                {items.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      border: `1px dashed ${theme.line}`,
                      borderRadius: 18,
                      padding: "24px 18px",
                      textAlign: "center",
                      color: MUTED,
                      fontSize: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    Free day
                  </div>
                ) : (
                  <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
                    {(options.includeGrid === false ? [] : spacedTicks(aligned.ticks, scale, 22)).map((t) => (
                      <div
                        key={t.label}
                        style={{
                          position: "absolute",
                          top: t.pos * scale,
                          left: 0,
                          right: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: axis - 8,
                            fontSize: 16,
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
                            background: options.includeGrid === false ? "transparent" : theme.line,
                          }}
                        />
                      </div>
                    ))}

                    {blocks.map((b) => {
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
                        style: options.cardStyle ?? "filled",
                        opacity: options.cardOpacity ?? 1,
                        surface: CARD,
                        text: TEXT,
                        textColor: cat?.text_color,
                        dark: theme.dark,
                      });
                      const h = b.height * scale;
                      const offset = GUTTER + 4;
                      const laneGap = 8;
                      const w = (track - offset - (b.lanes - 1) * laneGap) / b.lanes;
                      const tight = h < 130 || b.lanes > 1;
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: "absolute",
                            top: b.top * scale,
                            left: axis + offset + b.lane * (w + laneGap),
                            width: w,
                            height: h,
                            ...visual,
                            borderRadius: 16,
                            padding: tight ? "8px 12px" : "12px 16px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: (tight ? 16 : 19) * f,
                              opacity: 0.75,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {timeRange(el)}
                          </div>
                          <div
                            style={{
                              fontSize: (tight ? 22 : 28) * f,
                              lineHeight: 1.15,
                              marginTop: 3,
                              wordBreak: "break-word",
                            }}
                          >
                            {el.title}
                          </div>
                          {options.includeSubtitle && el.subtitle ? (
                            <div style={{ fontSize: (tight ? 16 : 18) * f, opacity: 0.75, marginTop: 3 }}>
                              {el.subtitle}
                            </div>
                          ) : null}
                          {options.includeLocation && el.location ? (
                            <div style={{ fontSize: (tight ? 15 : 17) * f, opacity: 0.7, marginTop: 3 }}>
                              ◦ {el.location}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {showFooter ? (
      <div
        style={{
          position: "relative",
          marginTop: "auto",
          paddingTop: 14,
          borderTop: `1px solid ${theme.line}`,
          display: "flex",
          justifyContent: "space-between",
          color: MUTED,
          fontSize: 18 * f,
        }}
      >
        <span>{days.length} days · {elements.length} program items</span>
        <span style={{ letterSpacing: "0.22em", textTransform: "uppercase" }}>Programio</span>
      </div>
      ) : null}
    </div>
  );
});
