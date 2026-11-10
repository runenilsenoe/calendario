import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchAdminOverview } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — CalendarBetter" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: () => fetchAdminOverview(),
  staleTime: 0,
  gcTime: 0,
  component: AdminPage,
  errorComponent: () => (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-4xl">Administrasjonen er ikke tilgjengelig</h1>
      <p className="mt-4 text-muted-foreground">
        Du må være logget inn med en administratorkonto. Dersom du allerede er det, prøv igjen
        senere.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Til forsiden</Link>
      </Button>
    </main>
  ),
});

function AdminPage() {
  const { stats, users, events } = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10" lang="nb">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">CalendarBetter</p>
          <h1 className="mt-2 text-4xl">Administrasjon</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/events">Mine arrangementer</Link>
        </Button>
      </header>
      <p className="mt-4 text-sm text-muted-foreground">
        Oversikt over brukere og arrangementer. Visningen er kun for lesing.
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Registrerte brukere", stats.registered_users],
          ["Gjester", stats.guests],
          ["Arrangementer", stats.events],
          ["Offentlige arrangementer", stats.public_events],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-3xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-10" aria-labelledby="admin-users">
        <h2 id="admin-users" className="text-3xl">
          Brukere
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          De 100 nyeste brukerne, inkludert gjester.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-4">Bruker</th>
                <th className="p-4">Type</th>
                <th className="p-4">Arrangementer</th>
                <th className="p-4">Opprettet</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-4">{user.identifier ?? "Gjest"}</td>
                  <td className="p-4">{user.is_guest ? "Gjest" : "Registrert"}</td>
                  <td className="p-4 tabular-nums">{user.event_count}</td>
                  <td className="whitespace-nowrap p-4">{user.created_at.slice(0, 10)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-muted-foreground">
                    Ingen brukere ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-10" aria-labelledby="admin-events">
        <h2 id="admin-events" className="text-3xl">
          Arrangementer
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">De 100 nyeste arrangementene.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-4">Navn</th>
                <th className="p-4">Eier</th>
                <th className="p-4">Datoer</th>
                <th className="p-4">Synlighet</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="p-4">{event.name}</td>
                  <td className="p-4">{event.owner_identifier ?? "Gjest"}</td>
                  <td className="whitespace-nowrap p-4">
                    {event.start_date} – {event.end_date}
                  </td>
                  <td className="p-4">{event.is_public ? "Offentlig" : "Privat"}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-muted-foreground">
                    Ingen arrangementer ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
