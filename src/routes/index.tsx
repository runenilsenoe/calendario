import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Programio — Beautiful event program graphics" },
      {
        name: "description",
        content:
          "Plan multi-day event programs, color-code categories and export polished schedule images for phone and print.",
      },
      { property: "og:title", content: "Programio — Beautiful event program graphics" },
      {
        property: "og:description",
        content: "A lightweight event program builder with premium image exports.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Programio</span>
        {!loading && (
          <Button asChild variant="ghost" size="sm">
            <Link to={user ? "/events" : "/auth"}>{user ? "My events" : "Sign in"}</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="pt-16 sm:pt-24">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Event program builder
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] sm:text-7xl">
            Make the schedule
            <br />
            worth sharing.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Set your dates, add program elements, group them in color-coded categories — then export a
            phone-friendly day poster or a full multi-day overview as a crisp PNG.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={user ? "/events" : "/auth"}>Create an event</Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-10 sm:grid-cols-3">
          {[
            { t: "Plan fast", d: "Days, times and categories. Nothing else to configure." },
            { t: "Color-coded", d: "Meals, activities, ceremonies — each with its own color." },
            { t: "Export beautifully", d: "9:16 day poster and a wide multi-day overview." },
          ].map((f) => (
            <div key={f.t} className="border-t border-border pt-5">
              <h2 className="text-xl">{f.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 overflow-hidden rounded-2xl bg-ink p-10 text-ink-foreground">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Preview style</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { day: "Wednesday", items: ["07:30 Frokost", "09:00 Aktiviteter", "17:00 Nyttårsaften"] },
              { day: "Thursday", items: ["08:00 Frokost", "11:00 Turnering", "19:00 Galla"] },
              { day: "Friday", items: ["09:00 Brunsj", "13:00 Avreise"] },
            ].map((c) => (
              <div key={c.day}>
                <div className="text-xs uppercase tracking-[0.25em] text-gold">{c.day}</div>
                <div className="mt-3 space-y-2">
                  {c.items.map((i) => (
                    <div key={i} className="rounded-xl bg-white/5 px-4 py-3 text-sm">
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
