import { useEffect, useRef, useState } from "react";
import { dateLabel, shortDateLabel, weekdayName, weekdayNameShort } from "@/lib/calendarbetter";

type Props = {
  days: string[];
  activeDay: string;
  onSelect: (day: string) => void;
  locale?: string;
  className?: string;
};

export function DaySelector({ days, activeDay, onSelect, locale = "nb-NO", className }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    const m = measureRef.current;
    if (!el || !m) return;

    // Measure a hidden row that always renders the FULL labels, so the
    // decision never depends on the current (compact) rendering — that
    // feedback loop made the selector flip back and forth.
    const update = () => {
      const rowWidth = el.getBoundingClientRect().width;
      if (rowWidth === 0) return;
      const needed = m.scrollWidth;
      setCompact(needed > rowWidth + 1);
    };

    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [days.join(","), locale]);

  return (
    <div className={`relative min-w-0 max-w-full ${className ?? ""}`}>
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 flex h-0 gap-2 overflow-hidden opacity-0"
      >
        {days.map((d) => (
          <span key={d} className="whitespace-nowrap rounded-full border px-3 py-1.5 text-sm">
            {`${weekdayName(d, locale)} ${dateLabel(d, locale)}`}
          </span>
        ))}
      </div>

      <div ref={rowRef} className="flex min-w-0 max-w-full flex-wrap gap-2">
        {days.map((d) => {
          const active = d === activeDay;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {compact
                ? `${weekdayNameShort(d, locale)} ${shortDateLabel(d, locale)}`
                : `${weekdayName(d, locale)} ${dateLabel(d, locale)}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
