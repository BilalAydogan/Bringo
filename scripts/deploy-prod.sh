#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  echo "Copy .env.prod.example to .env.prod and fill production values first." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T php-fpm \
  php bin/console doctrine:migrations:migrate --no-interaction

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T php-fpm \
  php bin/console cache:clear --env=prod

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
