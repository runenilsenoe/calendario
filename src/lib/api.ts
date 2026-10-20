import { createServerFn } from "@tanstack/react-start";
import { db } from "@/server/db.server";
import {
  claimGuestEvents,
  currentUser,
  ensureEventOwner,
  endSession,
  hashPassword,
  normalizeIdentifier,
  requireEventAccess,
  startSession,
  verifyPassword,
} from "@/server/auth.server";
import type { CategoryRow, CollaboratorRow, ElementRow, EventRow } from "@/lib/programio";

type Role = "viewer" | "editor";

export type EventInput = Pick<
  EventRow,
  "name" | "subtitle" | "start_date" | "end_date" | "location" | "logo_url" | "accent_color"
>;
export type CategoryInput = Pick<CategoryRow, "name" | "color" | "icon" | "text_color">;
export type ElementInput = Omit<ElementRow, "id" | "event_id">;

const DEFAULT_CATEGORIES = [
  { name: "Meal", color: "#C9A227", icon: "🍽️" },
  { name: "Activity", color: "#3E7CB1", icon: "⚡" },
  { name: "Meeting", color: "#6B6F76", icon: "💬" },
  { name: "Celebration", color: "#7B5EA7", icon: "✨" },
];

const pass = <T>(d: T) => d;

/* ---------- auth ---------- */

export const getMe = createServerFn().handler(() => currentUser());

export const signUp = createServerFn({ method: "POST" })
  .validator(pass<{ identifier: string; password: string }>)
  .handler(async ({ data }) => {
    if (process.env["ALLOW_SIGNUP"] === "false") throw new Error("Sign-up is disabled");
    const identifier = normalizeIdentifier(data.identifier);
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters");
    const sql = await db();
    const [user] = await sql<{ id: string }[]>`
      INSERT INTO users (identifier, password_hash)
      VALUES (${identifier}, ${await hashPassword(data.password)})
      ON CONFLICT (identifier) DO NOTHING
      RETURNING id`;
    if (!user) throw new Error("An account with that email or phone number already exists");
    await claimGuestEvents(user.id);
    await startSession(user.id);
    return { id: user.id, identifier, is_guest: false };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(pass<{ identifier: string; password: string }>)
  .handler(async ({ data }) => {
    const identifier = normalizeIdentifier(data.identifier);
    const sql = await db();
    const [user] = await sql<{ id: string; password_hash: string }[]>`
      SELECT id, password_hash FROM users WHERE identifier = ${identifier}`;
    if (!user || !(await verifyPassword(data.password, user.password_hash))) {
      throw new Error("Wrong email/phone or password");
    }
    await claimGuestEvents(user.id);
    await startSession(user.id);
    return { id: user.id, identifier, is_guest: false };
  });

export const signOut = createServerFn({ method: "POST" }).handler(() => endSession());

/* ---------- events ---------- */

export const fetchEvents = createServerFn().handler(async () => {
  const user = await currentUser();
  if (!user) return [];
  const sql = await db();
  return sql<EventRow[]>`
    SELECT * FROM events e
    WHERE e.user_id = ${user.id}
       OR EXISTS (SELECT 1 FROM event_collaborators c
                  WHERE c.event_id = e.id AND c.identifier = ${user.identifier})
    ORDER BY start_date DESC`;
});

export const fetchEvent = createServerFn()
  .validator(pass<string>)
  .handler(async ({ data: id }) => {
    await requireEventAccess(id, "view");
    const sql = await db();
    const [event] = await sql<EventRow[]>`SELECT * FROM events WHERE id = ${id}`;
    return event ?? null;
  });

export const fetchEventBySlug = createServerFn()
  .validator(pass<string>)
  .handler(async ({ data: slug }) => {
    const sql = await db();
    const [event] = await sql<EventRow[]>`
      SELECT * FROM events WHERE public_slug = ${slug} AND is_public`;
    return event ?? null;
  });

export const createEvent = createServerFn({ method: "POST" })
  .validator(pass<EventInput>)
  .handler(async ({ data: v }) => {
    const user = await ensureEventOwner();
    const sql = await db();
    return sql.begin(async (tx) => {
      const [event] = await tx<EventRow[]>`
        INSERT INTO events (user_id, name, subtitle, start_date, end_date, location, logo_url, accent_color)
        VALUES (${user.id}, ${v.name}, ${v.subtitle}, ${v.start_date}, ${v.end_date},
                ${v.location}, ${v.logo_url}, ${v.accent_color})
        RETURNING *`;
      for (const c of DEFAULT_CATEGORIES) {
        await tx`INSERT INTO categories (event_id, name, color, icon)
                 VALUES (${event!.id}, ${c.name}, ${c.color}, ${c.icon})`;
      }
      return event!;
    });
  });

export const updateEvent = createServerFn({ method: "POST" })
  .validator(pass<{ id: string; values: EventInput }>)
  .handler(async ({ data: { id, values: v } }) => {
    await requireEventAccess(id, "edit");
    const sql = await db();
    await sql`
      UPDATE events SET name = ${v.name}, subtitle = ${v.subtitle}, start_date = ${v.start_date},
        end_date = ${v.end_date}, location = ${v.location}, logo_url = ${v.logo_url},
        accent_color = ${v.accent_color}, updated_at = now()
      WHERE id = ${id}`;
  });

export const setEventPublic = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; isPublic: boolean }>)
  .handler(async ({ data }) => {
    await requireEventAccess(data.eventId, "owner");
    const sql = await db();
    await sql`UPDATE events SET is_public = ${data.isPublic}, updated_at = now()
              WHERE id = ${data.eventId}`;
  });

/* ---------- categories & program elements ---------- */

export const fetchCategories = createServerFn()
  .validator(pass<string>)
  .handler(async ({ data: eventId }) => {
    await requireEventAccess(eventId, "view");
    const sql = await db();
    return sql<CategoryRow[]>`
      SELECT id, event_id, name, color, icon, text_color FROM categories
      WHERE event_id = ${eventId} ORDER BY created_at`;
  });

export const fetchElements = createServerFn()
  .validator(pass<string>)
  .handler(async ({ data: eventId }) => {
    await requireEventAccess(eventId, "view");
    const sql = await db();
    return sql<ElementRow[]>`
      SELECT id, event_id, category_id, title, start_datetime, end_datetime, location, subtitle, notes
      FROM program_elements WHERE event_id = ${eventId} ORDER BY start_datetime`;
  });

export const saveCategory = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; id: string | null; values: CategoryInput }>)
  .handler(async ({ data: { eventId, id, values: v } }) => {
    await requireEventAccess(eventId, "edit");
    const sql = await db();
    if (id) {
      await sql`UPDATE categories SET name = ${v.name}, color = ${v.color}, icon = ${v.icon},
                  text_color = ${v.text_color}, updated_at = now()
                WHERE id = ${id} AND event_id = ${eventId}`;
    } else {
      await sql`INSERT INTO categories (event_id, name, color, icon, text_color)
                VALUES (${eventId}, ${v.name}, ${v.color}, ${v.icon}, ${v.text_color})`;
    }
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; id: string }>)
  .handler(async ({ data }) => {
    await requireEventAccess(data.eventId, "edit");
    const sql = await db();
    await sql`DELETE FROM categories WHERE id = ${data.id} AND event_id = ${data.eventId}`;
  });

export const saveElement = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; id: string | null; values: ElementInput }>)
  .handler(async ({ data: { eventId, id, values: v } }) => {
    await requireEventAccess(eventId, "edit");
    const sql = await db();
    if (id) {
      await sql`UPDATE program_elements SET title = ${v.title}, start_datetime = ${v.start_datetime},
                  end_datetime = ${v.end_datetime}, category_id = ${v.category_id},
                  location = ${v.location}, subtitle = ${v.subtitle}, notes = ${v.notes},
                  updated_at = now()
                WHERE id = ${id} AND event_id = ${eventId}`;
    } else {
      await sql`INSERT INTO program_elements
                  (event_id, category_id, title, start_datetime, end_datetime, location, subtitle, notes)
                VALUES (${eventId}, ${v.category_id}, ${v.title}, ${v.start_datetime},
                        ${v.end_datetime}, ${v.location}, ${v.subtitle}, ${v.notes})`;
    }
  });

export const deleteElement = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; id: string }>)
  .handler(async ({ data }) => {
    await requireEventAccess(data.eventId, "edit");
    const sql = await db();
    await sql`DELETE FROM program_elements WHERE id = ${data.id} AND event_id = ${data.eventId}`;
  });

/* ---------- sharing ---------- */

export const fetchCollaborators = createServerFn()
  .validator(pass<string>)
  .handler(async ({ data: eventId }) => {
    const user = await requireEventAccess(eventId, "view");
    const sql = await db();
    const rows = await sql<CollaboratorRow[]>`
      SELECT id, event_id, identifier, role, created_at FROM event_collaborators
      WHERE event_id = ${eventId} ORDER BY created_at`;
    const [event] = await sql<
      { user_id: string }[]
    >`SELECT user_id FROM events WHERE id = ${eventId}`;
    // Only the owner sees the full list; collaborators see their own invitation.
    return event?.user_id === user?.id
      ? rows
      : rows.filter((r) => r.identifier === user?.identifier);
  });

export const addCollaborator = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; identifier: string; role: Role }>)
  .handler(async ({ data }) => {
    await requireEventAccess(data.eventId, "owner");
    const identifier = normalizeIdentifier(data.identifier);
    const sql = await db();
    const [row] = await sql`
      INSERT INTO event_collaborators (event_id, identifier, role)
      VALUES (${data.eventId}, ${identifier}, ${data.role})
      ON CONFLICT (event_id, identifier) DO NOTHING RETURNING id`;
    if (!row) throw new Error("That person is already invited.");
  });

export const updateCollaboratorRole = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; id: string; role: Role }>)
  .handler(async ({ data }) => {
    await requireEventAccess(data.eventId, "owner");
    const sql = await db();
    await sql`UPDATE event_collaborators SET role = ${data.role}
              WHERE id = ${data.id} AND event_id = ${data.eventId}`;
  });

export const removeCollaborator = createServerFn({ method: "POST" })
  .validator(pass<{ eventId: string; id: string }>)
  .handler(async ({ data }) => {
    await requireEventAccess(data.eventId, "owner");
    const sql = await db();
    await sql`DELETE FROM event_collaborators WHERE id = ${data.id} AND event_id = ${data.eventId}`;
  });
