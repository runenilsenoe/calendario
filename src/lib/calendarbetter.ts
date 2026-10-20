export type EventRow = {
  id: string;
  user_id: string;
  name: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  logo_url: string | null;
  accent_color: string;
  is_public: boolean;
  public_slug: string;
  /** Saved export design (see ExportOptions), applied to previews and the public link. */
  poster_options: Record<string, string | number | boolean>;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  event_id: string;
  name: string;
  color: string;
  icon: string | null;
  text_color: string | null;
};

export type ElementRow = {
  id: string;
  event_id: string;
  category_id: string | null;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  subtitle: string | null;
  notes: string | null;
};

/* ---------- date helpers (all local time) ---------- */

export const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateKeyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function eventDayKeys(event: Pick<EventRow, "start_date" | "end_date">): string[] {
  const start = dateKeyToDate(event.start_date);
  const end = dateKeyToDate(event.end_date);
  const keys: string[] = [];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 120) {
    keys.push(toLocalDateKey(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return keys;
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeRange(el: ElementRow) {
  return `${formatTime(el.start_datetime)}–${formatTime(el.end_datetime)}`;
}

export function weekdayName(key: string, locale = "en-GB") {
  return dateKeyToDate(key).toLocaleDateString(locale, { weekday: "long" });
}

export function weekdayNameShort(key: string, locale = "en-GB") {
  return dateKeyToDate(key).toLocaleDateString(locale, { weekday: "short" }).replace(/\.$/, "");
}

export function dateLabel(key: string, locale = "en-GB") {
  return dateKeyToDate(key).toLocaleDateString(locale, { day: "numeric", month: "long" });
}

export function shortDateLabel(key: string, locale = "en-GB") {
  return dateKeyToDate(key).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** Local datetime string for <input type="datetime-local"> */
export function toInputValue(iso: string) {
  const d = new Date(iso);
  return `${toLocalDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromInputValue(value: string) {
  return new Date(value).toISOString();
}

export function groupByDay(elements: ElementRow[]) {
  const map = new Map<string, ElementRow[]>();
  for (const el of elements) {
    const key = toLocalDateKey(new Date(el.start_datetime));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(el);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime() ||
        a.title.localeCompare(b.title),
    );
  }
  return map;
}

/** Readable text color for a category swatch. */
export function readableOn(hex: string, override?: string | null) {
  if (override) return override;
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1712" : "#ffffff";
}

/* ---------- proportional timeline layout (overlap aware) ---------- */

export type TimelineBlock = {
  el: ElementRow;
  lane: number;
  lanes: number;
  /** position in layout units from the top of the timeline */
  top: number;
  /** length in layout units, proportional to the item duration */
  height: number;
  overlapping: boolean;
};

export type DayTimeline = {
  blocks: TimelineBlock[];
  ticks: { label: string; pos: number }[];
  total: number;
  hasOverlap: boolean;
};

/** Minutes from midnight of `dayKey`, clamped to that day. */
function minutesIn(iso: string, dayKey: string) {
  const d = new Date(iso);
  const base = dateKeyToDate(dayKey).getTime();
  return Math.max(0, Math.min(1440, Math.round((d.getTime() - base) / 60000)));
}

const MIN_SLOT = 35; // layout minutes so short items stay readable
const MAX_GAP = 26; // empty time is compressed to this many layout minutes

/**
 * Lays program items out on a compressed time axis: block length is
 * proportional to duration, and overlapping items are split into side-by-side
 * lanes so nothing is hidden.
 */
export function buildDayTimeline(items: ElementRow[], dayKey: string): DayTimeline {
  if (items.length === 0) return { blocks: [], ticks: [], total: 0, hasOverlap: false };

  const raw = items
    .map((el) => {
      const s = minutesIn(el.start_datetime, dayKey);
      const e = Math.max(minutesIn(el.end_datetime, dayKey), s + 5);
      return { el, s, e: Math.max(e, s + MIN_SLOT), realEnd: e };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const dayStart = raw[0]!.s;
  const dayEnd = Math.max(...raw.map((r) => r.e));

  // Compress stretches of empty time so long breaks don't dominate.
  const points = new Set<number>([dayStart, dayEnd]);
  for (const r of raw) {
    points.add(r.s);
    points.add(r.e);
  }
  for (let h = Math.ceil(dayStart / 60) * 60; h < dayEnd; h += 60) points.add(h);
  const sorted = [...points].sort((a, b) => a - b);

  const map = new Map<number, number>();
  let acc = 0;
  map.set(sorted[0]!, 0);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    const covered = raw.some((r) => r.s < b && r.e > a);
    acc += covered ? b - a : Math.min(b - a, MAX_GAP);
    map.set(b, acc);
  }
  const at = (m: number) => map.get(m) ?? 0;

  // Greedy lane assignment per overlap cluster.
  const blocks: TimelineBlock[] = [];
  let cluster: typeof raw = [];
  let clusterEnd = -1;
  let hasOverlap = false;

  const flush = () => {
    if (cluster.length === 0) return;
    // lanes are decided on real times, so a back-to-back item never looks overlapping
    const laneEnds: number[] = [];
    const assigned = cluster.map((r) => {
      let lane = laneEnds.findIndex((end) => end <= r.s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(r.realEnd);
      } else {
        laneEnds[lane] = r.realEnd;
      }
      return { r, lane };
    });
    const lanes = laneEnds.length;
    if (lanes > 1) hasOverlap = true;
    const made: TimelineBlock[] = assigned.map(({ r, lane }) => ({
      el: r.el,
      lane,
      lanes,
      top: at(r.s),
      height: Math.max(at(r.e) - at(r.s), MIN_SLOT / 2),
      overlapping: lanes > 1,
    }));
    blocks.push(...made);
    cluster = [];
  };

  for (const r of raw) {
    if (cluster.length > 0 && r.s >= clusterEnd) flush();
    cluster.push(r);
    clusterEnd = cluster.length === 1 ? r.realEnd : Math.max(clusterEnd, r.realEnd);
  }
  flush();

  const ticks: { label: string; pos: number }[] = [];
  for (let h = Math.ceil(dayStart / 60) * 60; h <= dayEnd; h += 60) {
    ticks.push({ label: `${pad(Math.floor(h / 60))}:00`, pos: at(h) });
  }

  return { blocks, ticks, total: acc, hasOverlap };
}

/** True when any two items on the same day overlap in time. */
export function hasOverlaps(items: ElementRow[]) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime(),
  );
  for (let i = 1; i < sorted.length; i++) {
    if (new Date(sorted[i]!.start_datetime) < new Date(sorted[i - 1]!.end_datetime)) return true;
  }
  return false;
}

/**
 * Converts timeline blocks into pixel boxes, guaranteeing each block is tall
 * enough to show its text and pushing later blocks in the same lane down when
 * a short item had to be enlarged.
 */
export function placeBlocks(
  blocks: TimelineBlock[],
  pxPerUnit: number,
  minPx: number,
  gap: number,
  minPxFor?: (b: TimelineBlock) => number,
) {
  const laneBottom: number[] = [];
  const placed = new Map<string, { top: number; height: number }>();
  for (const b of [...blocks].sort((a, b2) => a.top - b2.top)) {
    let top = b.top * pxPerUnit;
    const minH = Math.max(minPx, minPxFor?.(b) ?? 0);
    const height = Math.max(b.height * pxPerUnit - gap, minH);
    const floor = laneBottom[b.lane] ?? -Infinity;
    if (top < floor) top = floor;
    laneBottom[b.lane] = top + height + gap;
    placed.set(b.el.id, { top, height });
  }
  return placed;
}

/* ---------- sharing ---------- */

export type CollaboratorRow = {
  id: string;
  event_id: string;
  identifier: string;
  role: "viewer" | "editor";
  created_at: string;
};

export function shareUrl(slug: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/p/${slug}`;
}

/* ------------------------------------------------------------------ */
/* Aligned multi-day timeline (used by the full program poster)        */
/* ------------------------------------------------------------------ */

type RawItem = { el: ElementRow; s: number; e: number; realEnd: number };

function rawDayItems(items: ElementRow[], dayKey: string): RawItem[] {
  return items
    .map((el) => {
      const s = minutesIn(el.start_datetime, dayKey);
      // Real times only — minimum readable height is handled in pixel space.
      const e = Math.max(minutesIn(el.end_datetime, dayKey), s + 5);
      return { el, s, e, realEnd: e };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);
}

/** Greedy lane assignment per overlap cluster, based on real end times. */
function assignLanes(raw: RawItem[]) {
  const out: { r: RawItem; lane: number; lanes: number }[] = [];
  let cluster: RawItem[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned = cluster.map((r) => {
      let lane = laneEnds.findIndex((end) => end <= r.s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(r.realEnd);
      } else {
        laneEnds[lane] = r.realEnd;
      }
      return { r, lane };
    });
    for (const a of assigned) out.push({ ...a, lanes: laneEnds.length });
    cluster = [];
  };

  for (const r of raw) {
    if (cluster.length > 0 && r.s >= clusterEnd) flush();
    cluster.push(r);
    clusterEnd = cluster.length === 1 ? r.realEnd : Math.max(clusterEnd, r.realEnd);
  }
  flush();
  return out;
}

export type AlignedBlock = {
  el: ElementRow;
  lane: number;
  lanes: number;
  top: number;
  height: number;
  /** Index of the overlap group this block belongs to (unique per day). */
  clusterId: number;
  /** Number of items running in parallel in that group. */
  clusterSize: number;
  /** Position of this block within its group. */
  indexInCluster: number;
  clusterTop: number;
  clusterBottom: number;
  /** True time position of the item on the shared axis (before cascading). */
  timeTop: number;
  timeBottom: number;
};

export type AlignedTimelines = {
  ticks: { label: string; pos: number }[];
  totalPx: number;
  perDay: Map<string, AlignedBlock[]>;
};

/**
 * Builds one shared, compressed time axis for every day of the event, so a
 * given clock time sits at the same vertical position in every day column.
 * Positions and heights are returned in pixels.
 */
export function buildAlignedTimelines(
  days: string[],
  byDay: Map<string, ElementRow[]>,
  opts: {
    targetPx: number;
    maxPxPerMinute: number;
    minPx: number;
    gap: number;
    /** Optional per-item minimum height (e.g. estimated from its text). */
    minPxFor?: (el: ElementRow, lanes: number) => number;
  },
): AlignedTimelines {
  const perDayRaw = new Map(days.map((d) => [d, rawDayItems(byDay.get(d) ?? [], d)]));
  const all = [...perDayRaw.values()].flat();
  const empty: AlignedTimelines = {
    ticks: [],
    totalPx: 0,
    perDay: new Map(days.map((d) => [d, []])),
  };
  if (all.length === 0) return empty;

  const start = Math.min(...all.map((r) => r.s));
  const end = Math.max(...all.map((r) => r.e));

  const points = new Set<number>([start, end]);
  for (const r of all) {
    points.add(r.s);
    points.add(r.e);
  }
  for (let h = Math.ceil(start / 60) * 60; h < end; h += 60) points.add(h);
  const sorted = [...points].sort((a, b) => a - b);

  // Segment lengths in layout minutes; empty stretches (empty on *every* day)
  // are compressed so long breaks don't dominate.
  const segUnits: number[] = [];
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    const covered = all.some((r) => r.s < b && r.e > a);
    const len = covered ? b - a : Math.min(b - a, MAX_GAP);
    segUnits.push(len);
    total += len;
  }

  const pxPerUnit = Math.min(opts.targetPx / Math.max(1, total), opts.maxPxPerMinute);
  const segPx = segUnits.map((u) => u * pxPerUnit);

  const idxOf = new Map(sorted.map((m, i) => [m, i]));
  const span = (s: number, e: number) => {
    let sum = 0;
    for (let i = idxOf.get(s)!; i < idxOf.get(e)!; i++) sum += segPx[i]!;
    return sum;
  };

  // Overlapping activities keep full width but cascade downwards: the later
  // item sits underneath the earlier one, with room for its own text. A side
  // line (rendered by the poster) marks the parallel group.
  type Cluster = { day: string; items: RawItem[]; s: number; e: number };
  const clusters: Cluster[] = [];
  for (const d of days) {
    let cur: Cluster | null = null;
    for (const r of perDayRaw.get(d)!) {
      if (cur && r.s < cur.e) {
        cur.items.push(r);
        cur.e = Math.max(cur.e, r.realEnd);
      } else {
        cur = { day: d, items: [r], s: r.s, e: r.realEnd };
        clusters.push(cur);
      }
    }
  }

  const minFor = (r: RawItem, lanes = 1) => Math.max(opts.minPx, opts.minPxFor?.(r.el, lanes) ?? 0);
  // Exactly two parallel items render side by side; three or more stack.
  const isPair = (c: Cluster) => c.items.length === 2;

  // Grow the shared axis so every item has room for its text at its own true
  // time position. No cascading, no pushing down: cards always match the clock.
  const posAt = (m: number) => {
    let sum = 0;
    for (let i = 0; i < idxOf.get(m)!; i++) sum += segPx[i]!;
    return sum;
  };
  // The next distinct start time after this item, within its cluster.
  const nextStartOf = (c: Cluster, i: number) => {
    for (let j = i + 1; j < c.items.length; j++) {
      if (c.items[j]!.s > c.items[i]!.s) return c.items[j]!.s;
    }
    return null;
  };
  // Start of the following cluster on the same day, so a cascading stack never
  // grows down into the next activity.
  const nextClusterStart = new Map<Cluster, number | null>();
  for (const d of days) {
    const list = clusters.filter((c) => c.day === d);
    list.forEach((c, i) => nextClusterStart.set(c, list[i + 1]?.s ?? null));
  }
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const c of clusters) {
      for (let i = 0; i < c.items.length; i++) {
        const r = c.items[i]!;
        const top = posAt(r.s);
        let need: number;
        let anchor: number;
        if (isPair(c)) {
          need = minFor(r, 2) + opts.gap;
          anchor = r.e;
        } else {
          // Items starting at the exact same time must stack, so reserve room
          // for all of them before the next distinct start.
          const sameStart = c.items.filter((o) => o.s === r.s);
          need = sameStart.reduce((sum, o) => sum + minFor(o) + opts.gap, 0);
          const after = nextStartOf(c, i);
          anchor = after ?? nextClusterStart.get(c) ?? r.e;
        }

        if (anchor <= r.s) continue;
        const deficit = need - (posAt(anchor) - top);
        if (deficit > 0.5) {
          const si = idxOf.get(anchor)! - 1;
          segPx[si] = segPx[si]! + deficit;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const posPx: number[] = [0];
  for (let i = 0; i < segPx.length; i++) posPx.push(posPx[i]! + segPx[i]!);
  const at = (m: number) => posPx[idxOf.get(m) ?? 0] ?? 0;

  const perDay = new Map<string, AlignedBlock[]>(days.map((d) => [d, []]));
  clusters.forEach((c, clusterId) => {
    const clusterTop = at(c.s);
    const clusterBottom = at(c.e);
    const pair = isPair(c);
    let cursor = -Infinity;
    const placed: AlignedBlock[] = c.items.map((r, i) => {
      const timeTop = at(r.s);
      const top = pair ? timeTop : Math.max(timeTop, cursor);
      const lanes = pair ? 2 : 1;
      let height = Math.max(at(r.e) - top - opts.gap, minFor(r, lanes));
      if (!pair) {
        const ns = nextStartOf(c, i) ?? nextClusterStart.get(c) ?? null;
        if (ns !== null && ns > r.s) {
          const limit = at(ns) - top - opts.gap;
          if (limit >= minFor(r)) height = Math.min(height, limit);
        }
        cursor = top + height + opts.gap;
      }

      return {
        el: r.el,
        lane: pair ? i : 0,
        lanes,
        top,
        height,
        clusterId,
        clusterSize: c.items.length,
        indexInCluster: i,
        clusterTop,
        clusterBottom,
        timeTop,
        timeBottom: at(r.e),
      };
    });
    perDay.get(c.day)!.push(...placed);
  });

  // Safety net: nothing may visually overlap within a lane, even if the axis
  // could not grow enough (e.g. zero-length items at the very end of a day).
  for (const d of days) {
    const list = perDay.get(d)!.sort((a, b) => a.top - b.top || a.lane - b.lane);
    const laneBottom = new Map<number, number>();
    for (const b of list) {
      // A full-width block must clear every lane; a lane block only its own.
      const keys = b.lanes === 1 ? [...laneBottom.keys(), 0] : [b.lane];
      const prev = Math.max(...keys.map((k) => laneBottom.get(k) ?? -Infinity), -Infinity);
      if (prev > b.top) b.top = prev;
      const bottom = b.top + b.height + opts.gap;
      if (b.lanes === 1)
        for (const k of new Set([...laneBottom.keys(), 0, 1])) laneBottom.set(k, bottom);
      else laneBottom.set(b.lane, bottom);
    }
  }

  let maxBottom = at(end);
  for (const d of days) {
    const list = perDay.get(d)!.sort((a, b) => a.top - b.top);
    for (const b of list) maxBottom = Math.max(maxBottom, b.top + b.height);
  }

  const ticks: { label: string; pos: number }[] = [];
  for (let h = Math.ceil(start / 60) * 60; h <= end; h += 60) {
    ticks.push({ label: `${pad(Math.floor(h / 60))}:00`, pos: at(h) });
  }

  return { ticks, totalPx: maxBottom, perDay };
}
