import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { db } from "./db.server";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "programio_session";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; identifier: string };

/**
 * Normalizes a sign-in identifier: emails are lowercased, phone numbers are
 * reduced to "+<digits>". Numbers without a country code get
 * DEFAULT_PHONE_PREFIX (e.g. "+47") when it is set.
 */
export function normalizeIdentifier(input: string) {
  const value = input.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");
    return email;
  }
  let phone = value.replace(/[\s\-().]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (!phone.startsWith("+")) phone = `${process.env["DEFAULT_PHONE_PREFIX"] ?? "+"}${phone}`;
  if (!/^\+\d{6,15}$/.test(phone)) throw new Error("Enter a valid email address or phone number");
  return phone;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function startSession(userId: string) {
  const sql = await db();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (${sha256(token)}, ${userId}, ${expires.toISOString()})`;
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestProtocol({ xForwardedProto: true }) === "https",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const token = getCookie(COOKIE);
  if (token) {
    const sql = await db();
    await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
  }
  deleteCookie(COOKIE, { path: "/" });
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const sql = await db();
  const [user] = await sql<SessionUser[]>`
    SELECT u.id, u.identifier FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256(token)} AND s.expires_at > now()`;
  return user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("You need to sign in");
  return user;
}

type Access = "owner" | "editor" | "viewer" | "public" | null;

/** Resolves what the current user may do with an event. */
export async function eventAccess(eventId: string, user: SessionUser | null): Promise<Access> {
  const sql = await db();
  const [row] = await sql<{ user_id: string; is_public: boolean; role: string | null }[]>`
    SELECT e.user_id, e.is_public, c.role
    FROM events e
    LEFT JOIN event_collaborators c ON c.event_id = e.id AND c.identifier = ${user?.identifier ?? ""}
    WHERE e.id = ${eventId}`;
  if (!row) return null;
  if (user && row.user_id === user.id) return "owner";
  if (row.role === "editor" || row.role === "viewer") return row.role;
  return row.is_public ? "public" : null;
}

const RANK: Record<Exclude<Access, null>, number> = { public: 0, viewer: 1, editor: 2, owner: 3 };

/** Throws unless the current user has at least `level` access to the event. */
export async function requireEventAccess(eventId: string, level: "view" | "edit" | "owner") {
  const user = level === "view" ? await currentUser() : await requireUser();
  const access = await eventAccess(eventId, user);
  const needed = level === "view" ? 0 : level === "edit" ? 2 : 3;
  if (!access || RANK[access] < needed) throw new Error("You don't have access to this event");
  return user;
}
