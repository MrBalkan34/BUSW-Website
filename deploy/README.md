# Deploying the Balkan Universal Account server

These files are templates. **Nothing here has been run, deployed or paid for, and the Docker files could not be tested** (no Docker on the
machine they were written on). Read them, adapt them, and test on a throwaway server first. The full checklist is
`apps/server/docs/RELEASE-CHECKLIST.md`.

What runs: one container with the server and the web app it serves (builder, account pages, dashboard, administration), behind a
reverse proxy that provides https. Everything it stores lives in one volume (`/data`): the SQLite database and the private images.

| File | Purpose |
| --- | --- |
| `Dockerfile` | Builds the web app, then the server image. Build from the repository root. |
| `docker-compose.example.yml` | The server plus Caddy (automatic https), with a persistent volume. |
| `Caddyfile.example` | The proxy configuration. Put your real hostname in. |
| `../apps/server/.env.example` | Every setting, with comments. Copy to `apps/server/.env` and fill in. Never commit it. |

## Steps

1. Choose a machine with a persistent disk (a small VPS is enough) and point a hostname at it, for example `account.<your domain>`.
2. Copy `apps/server/.env.example` to `apps/server/.env`. Set `APP_ORIGIN` to that hostname with `https://`, `TRUSTED_ORIGINS` to the
   marketing site, a long random `BETTER_AUTH_SECRET`, `SMTP_URL` and `EMAIL_FROM` (see the email notes in `apps/server/docs/BU-ACCOUNT.md`).
3. Copy `docker-compose.example.yml` to `docker-compose.yml` and `Caddyfile.example` to `Caddyfile` in this folder. Edit the hostname.
4. `docker compose up -d --build`. The server refuses to start in production if the secret, https address or email settings are
   missing, and says which.
5. Register the founder's account in the browser and verify the email. Then provision the owner **inside the container**:

   ```bash
   docker compose exec account npm run find-user -- --email <address>
   docker compose exec account npm run bootstrap-owner -- --user-id <id>
   ```

   Sign in, turn on two-step verification in Security, and keep the backup codes.
6. Put the same address in each marketing page's `<meta name="bu-account-origin" content="...">` so the account link appears, and redeploy the site.
7. Schedule backups (below) and test a restore before real clients arrive.

## Backups

```bash
docker compose exec account npm run backup -- --to /data/backups
```

This writes a dated, point-in-time copy of the database and images (safe while the server runs). Copy it off the machine regularly.
To restore: stop the container, replace `bu-account.sqlite` and `assets/` in the volume with the backup's, start it. Do this once on
a spare machine to prove it works.

## Updating and rolling back

`git pull` then `docker compose up -d --build`. Migrations only add and run at start-up. Take a backup first. To roll back, redeploy the
previous commit; because migrations only add, an older version still reads the newer database.

## Things that will bite

- `BETTER_AUTH_SECRET` signs links and protects two-step secrets. Store it in a password manager. Changing it signs everyone out and
  breaks two-step verification for everyone.
- One server instance only (SQLite, in-memory rate limits). Do not run two copies against one volume.
- `TRUST_PROXY=true` is correct only behind a proxy that sets `X-Forwarded-For` itself (Caddy above does). Never expose the container's
  port directly with it on.
