import { readableOn } from "@/lib/programio";

export type CardStyle = "filled" | "outline" | "paper" | "glass";
export type PaletteKey =
  | "category"
  | "sand"
  | "ocean"
  | "forest"
  | "sunset"
  | "mono";

export const PALETTES: { key: PaletteKey; label: string; colors: string[] }[] = [
  { key: "category", label: "Kategorifarger", colors: ["#C9A227", "#7BA05B", "#4F8FBF", "#C4654A"] },
  { key: "sand", label: "Varm sand", colors: ["#C9A227", "#D9A566", "#B4795A", "#8B6F5E", "#E0C79A", "#A0522D"] },
  { key: "ocean", label: "Hav", colors: ["#5CBDB9", "#2D8A9E", "#4F8FBF", "#1A4A6E", "#8FD3E8", "#3B6FA0"] },
  { key: "forest", label: "Skog", colors: ["#7BA05B", "#4A6741", "#A0C49D", "#2D5A3D", "#C6D8A8", "#5A8A5C"] },
  { key: "sunset", label: "Solnedgang", colors: ["#E8843A", "#E05C61", "#C44569", "#F2B84B", "#B4508A", "#F27E63"] },
  { key: "mono", label: "Monokrom", colors: ["#E7E3DA", "#B9B3A7", "#8F887B", "#6A6459", "#D2CCC0", "#4E4940"] },
];

export function paletteColorFor(
  palette: PaletteKey | undefined,
  index: number,
  fallback: string,
) {
  if (!palette || palette === "category") return fallback;
  const p = PALETTES.find((x) => x.key === palette);
  if (!p) return fallback;
  const i = index < 0 ? 0 : index;
  return p.colors[i % p.colors.length]!;
}

/**
 * Accent colour used for headings/labels.
 * With the "category" palette we follow the first category colour instead of
 * the legacy event accent field.
 */
export function accentColorFor(
  palette: PaletteKey | undefined,
  categories: { color: string }[],
) {
  const paletteDefault = PALETTES[0]!.colors[0]!;
  if (!palette || palette === "category") return categories[0]?.color || paletteDefault;
  return paletteColorFor(palette, 0, paletteDefault);
}

function clampHex(hex: string) {
  const h = (hex || "#888888").replace("#", "");
  return h.length === 3
    ? h
        .split("")
        .map((c) => c + c)
        .join("")
    : h.padEnd(6, "8").slice(0, 6);
}

export function hexToRgba(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  const raw = (hex || "").trim();
  // Already an rgb/rgba colour: re-apply the alpha instead of misreading it as hex.
  const m = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1]!.split(",").map((p) => p.trim());
    const [r = "0", g = "0", b = "0"] = parts;
    const base = parts[3] ? Number(parts[3]) : 1;
    return `rgba(${r}, ${g}, ${b}, ${a * (Number.isFinite(base) ? base : 1)})`;
  }
  const h = clampHex(raw);
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}


export const BACKGROUNDS: { key: string; label: string; hex: string }[] = [
  { key: "ink", label: "Mørk", hex: "#14120f" },
  { key: "night", label: "Natt", hex: "#0f1524" },
  { key: "forest", label: "Skog", hex: "#12211a" },
  { key: "plum", label: "Plomme", hex: "#1b1220" },
  { key: "paper", label: "Papir", hex: "#f4f1ea" },
  { key: "sand", label: "Sand", hex: "#e9e0d1" },
  { key: "mist", label: "Dis", hex: "#e6ecf2" },
];

export type PosterTheme = {
  bg: string;
  text: string;
  muted: string;
  surface: string;
  line: string;
  dark: boolean;
};

/** Derives readable poster colours from any background colour. */
export function posterTheme(bgHex: string): PosterTheme {
  const bg = bgHex || "#14120f";
  const text = readableOn(bg);
  const dark = text === "#ffffff";
  return {
    bg,
    text: dark ? "#f4f1ea" : "#1a1712",
    muted: dark ? hexToRgba("#f4f1ea", 0.62) : hexToRgba("#1a1712", 0.6),
    surface: dark ? hexToRgba("#ffffff", 0.07) : hexToRgba("#ffffff", 0.72),
    line: dark ? hexToRgba("#ffffff", 0.12) : hexToRgba("#1a1712", 0.12),
    dark,
  };
}

type VisualArgs = {
  /** Category (or palette) colour for the card. */
  color: string;
  style?: CardStyle;
  /** 0.15 – 1 */
  opacity?: number;
  /** Neutral surface used for paper/outline styles. */
  surface: string;
  /** Default light text colour of the poster. */
  text: string;
  /** Optional explicit text colour from the category. */
  textColor?: string | null | undefined;
  /** Left accent bar width for the paper style. */
  barWidth?: number;
  /** Light backgrounds need darker strokes. */
  dark?: boolean;
};

export function cardVisual({
  color,
  style = "filled",
  opacity = 1,
  surface,
  text,
  textColor,
  barWidth = 8,
  dark = true,
}: VisualArgs): React.CSSProperties {
  const a = Math.max(0.15, Math.min(1, opacity));
  if (style === "outline") {
    return {
      background: hexToRgba(color, a * 0.14),
      color: text,
      border: `2px solid ${hexToRgba(color, Math.max(0.5, a))}`,
    };
  }
  if (style === "glass") {
    return {
      background: hexToRgba(color, a * 0.3),
      color: text,
      border: `1px solid ${hexToRgba(dark ? "#ffffff" : "#1a1712", 0.28)}`,
      backdropFilter: "blur(18px) saturate(140%)",
      boxShadow: `inset 0 1px 0 ${hexToRgba(dark ? "#ffffff" : "#ffffff", 0.35)}, 0 10px 24px rgba(0,0,0,0.28)`,
    };
  }
  if (style === "paper") {
    return {
      background: `linear-gradient(${hexToRgba(color, a * 0.14)}, ${hexToRgba(color, a * 0.14)}), ${hexToRgba(surface, a)}`,
      color: text,
      border: "none",
      borderLeft: `${barWidth}px solid ${hexToRgba(color, Math.max(0.6, a))}`,
    };
  }
  return {
    background: hexToRgba(color, a),
    color: a < 0.55 ? text : readableOn(color, textColor),
    border: "none",
  };
}

/** Drops timeline ticks that would collide with the previous kept tick. */
export function spacedTicks<T extends { pos: number }>(
  ticks: T[],
  scale: number,
  minGap: number,
): T[] {
  const out: T[] = [];
  let last = Number.NEGATIVE_INFINITY;
  for (const t of ticks) {
    const y = t.pos * scale;
    if (y - last < minGap) continue;
    out.push(t);
    last = y;
  }
  return out;
}
