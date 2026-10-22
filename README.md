# CalendarBetter

Event program builder: plan multi-day programs, color-code categories, and export
day posters, full-program posters and PDFs. Built with TanStack Start (React SSR),
Tailwind CSS and Postgres.

## Architecture

- `src/routes/` – pages (file-based routing; `routeTree.gen.ts` is generated)
- `src/lib/api.ts` – server functions: auth, events, categories, program elements, sharing
- `src/server/` – server-only code: Postgres client and migration runner, sessions/passwords
- `db/migrations/` – SQL migrations, applied automatically on first request after startup
- `src/lib/calendarbetter.ts` – date helpers and timeline layout used by the posters

Visitors can create, edit, share and export events without registering. A private guest
session keeps their events accessible in the same browser for 30 days; clearing cookies
removes that access. Signing in or signing up transfers guest events to the account.

Users sign in with an email address **or** a phone number plus a password. Sessions are
httpOnly cookies backed by the `sessions` table. Events can be shared with collaborators
(viewer/editor) by their email or phone number, or published at a public `/p/<slug>` link.

## Local development

Requires Node 22+ and a Postgres database.

```bash
docker run -d --name calendarbetter-db -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:17-alpine
```

```bash
npm install
```

```bash
DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres npm run dev
```

The app runs at http://localhost:3000.

## Configuration

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (set automatically by docker-compose) |
| `DEFAULT_PHONE_PREFIX` | Country code added to phone numbers entered without one, e.g. `+47` |
| `ALLOW_SIGNUP` | `false` disables creating new accounts |
| `PORT` / `HOST` | Listen address of the Node server (default `3000` / `0.0.0.0` in Docker) |

## Deploying to a Google Cloud VM

`docker-compose.yml` runs three containers: the app, Postgres (data in the `pgdata`
volume) and Caddy, which terminates HTTPS with an automatic Let's Encrypt certificate.

1. Create a VM (e.g. `e2-small`, Debian 12) and allow HTTP/HTTPS traffic:

   ```bash
   gcloud compute instances create calendarbetter --machine-type=e2-small --image-family=debian-12 --image-project=debian-cloud --tags=http-server,https-server
   ```

   ```bash
   gcloud compute firewall-rules create allow-web --allow=tcp:80,tcp:443 --target-tags=http-server,https-server
   ```

2. Reserve a static IP for the VM and point your domain's DNS `A` record at it.

3. SSH in and install Docker:

   ```bash
   curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER
   ```

4. Copy the project to the VM (`git clone` or `gcloud compute scp --recurse`), then create
   `.env` from the example and fill in `DOMAIN` and `POSTGRES_PASSWORD`:

   ```bash
   cp .env.example .env
   ```

5. Start it:

   ```bash
   docker compose up -d --build
   ```

To update, pull the new code and run the same `docker compose up -d --build` again.
Migrations run automatically.

### Backups

```bash
docker compose exec db pg_dump -U calendarbetter calendarbetter > backup-$(date +%F).sql
```

Restore into a fresh stack with:

```bash
docker compose exec -T db psql -U calendarbetter calendarbetter < backup.sql
```

## Guest access regression test

Build and start the app against a disposable Postgres database, then run:

```bash
TEST_BASE_URL=http://localhost:3000 node tests/guest-events.mjs
```

The test creates events and a test account. It checks guest creation and editing,
private access between browser sessions, public sharing, and transfer to an account
on signup and sign-in. Use the same build for the running server and the test.
