import postgres from "postgres";

const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL is not set");

// Return DATE as "YYYY-MM-DD" and timestamps as ISO strings, matching the
// shapes the UI works with.
const client = postgres(url, {
  types: {
    date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
    timestamptz: {
      to: 1184,
      from: [1184],
      serialize: (v: string) => v,
      parse: (v: string) => new Date(v).toISOString(),
    },
  },
});

// Migrations are bundled into the server build and applied in filename order.
const migrations = import.meta.glob<string>("../../db/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

async function migrate() {
  await client.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    const applied = new Set((await tx`SELECT name FROM schema_migrations`).map((r) => r["name"]));
    for (const [path, source] of Object.entries(migrations).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const name = path.split("/").pop()!;
      if (applied.has(name)) continue;
      await tx.unsafe(source);
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
      console.log(`[db] applied migration ${name}`);
    }
  });
}

let ready: Promise<void> | undefined;

/** Returns the SQL client once pending migrations have been applied. */
export async function db() {
  ready ??= migrate().catch((e) => {
    ready = undefined;
    throw e;
  });
  await ready;
  return client;
}
