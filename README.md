# Bringo

## Production Docker

Production stack is defined in [docker-compose.prod.yml](/home/bilal/Masaüstü/Bringo/docker-compose.prod.yml).

### Required environment variables

Use [.env.prod.example](/home/bilal/Masaüstü/Bringo/.env.prod.example) as the template for your production `.env` file.

Required backend/runtime values:

* `APP_SECRET`
* `DEFAULT_URI`
* `DATABASE_URL`
* `REDIS_URL`
* `MAILER_DSN`
* `JWT_SECRET_KEY`
* `JWT_PUBLIC_KEY`
* `JWT_PASSPHRASE`

Required database/frontend values:

* `POSTGRES_USER`
* `POSTGRES_PASSWORD`
* `POSTGRES_DB`
* `VITE_API_URL`
* `FRONTEND_PORT`

### JWT keys

The production backend expects readable JWT key files inside the container. The current compose file passes file paths through environment variables, so you should either:

* bake production keys into the image as part of your release process, or
* mount the key pair into the container and point `JWT_SECRET_KEY` / `JWT_PUBLIC_KEY` to those mounted paths.

Do not reuse the committed development keys in production.

### Build and run

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Or use the deployment helper:

```bash
./scripts/deploy-prod.sh
```

The frontend serves the SPA through Nginx and proxies `/api` requests to the backend Nginx container, so production traffic stays same-origin.

## Backup Strategy

Bringo currently ships a simple PostgreSQL backup and restore flow for the production Docker stack.

Scripts:

* [scripts/backup-postgres.sh](/home/bilal/Masaüstü/Bringo/scripts/backup-postgres.sh)
* [scripts/restore-postgres.sh](/home/bilal/Masaüstü/Bringo/scripts/restore-postgres.sh)

Expected setup:

* copy [.env.prod.example](/home/bilal/Masaüstü/Bringo/.env.prod.example) to `.env.prod`
* keep production values there
* keep JWT key files backed up outside the app host as well

Create a database backup:

```bash
./scripts/backup-postgres.sh
```

Restore a backup:

```bash
./scripts/restore-postgres.sh ./backups/postgres-app-YYYYMMDD-HHMMSS.dump
```

Notes:

* backups are written to `./backups/`
* restore recreates the target database, so it is destructive by design
* database dumps alone are not enough for full recovery; production `.env` values and JWT key files must be stored securely in a separate secret backup process
