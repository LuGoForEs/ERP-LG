#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACKS=(database backend frontend)

color() { printf "\033[1;36m[erp]\033[0m %s\n" "$*"; }
err()   { printf "\033[1;31m[erp]\033[0m %s\n" "$*" >&2; }

docker_running() { docker info >/dev/null 2>&1; }

start_docker() {
  color "Docker no responde, intentando arrancarlo..."
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      local dd="/c/Program Files/Docker/Docker/Docker Desktop.exe"
      if [[ ! -f "$dd" ]]; then
        err "Docker Desktop no encontrado en: $dd"
        err "Arrancalo manualmente y reintenta."
        exit 1
      fi
      "$dd" &
      ;;
    Darwin)
      open -a Docker
      ;;
    Linux)
      if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start docker
      else
        err "No se como arrancar Docker en este Linux. Hacelo manual."
        exit 1
      fi
      ;;
    *)
      err "OS no reconocido. Arranca Docker manualmente."
      exit 1
      ;;
  esac

  color "esperando a que el daemon responda (hasta 90s)..."
  for _ in {1..45}; do
    if docker_running; then
      color "Docker listo"
      return 0
    fi
    sleep 2
  done
  err "Docker no respondio en 90s"
  exit 1
}

ensure_docker() {
  if docker_running; then return 0; fi
  start_docker
}

wait_db_healthy() {
  color "esperando a que MariaDB este healthy..."
  local cid
  cid="$(docker compose -f "$ROOT/database/docker-compose.yml" ps -q | head -n1 || true)"
  if [[ -z "$cid" ]]; then
    err "no se encontro container de database"
    exit 1
  fi
  for _ in {1..60}; do
    local status
    status="$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "starting")"
    if [[ "$status" == "healthy" ]]; then
      color "DB healthy"
      return 0
    fi
    sleep 2
  done
  err "DB no llego a healthy en 120s"
  exit 1
}

up() {
  ensure_docker
  color "1/3 levantando database..."
  docker compose -f "$ROOT/database/docker-compose.yml" up -d
  wait_db_healthy

  color "2/3 levantando backend..."
  docker compose -f "$ROOT/backend/docker-compose.yml" up --build -d

  color "3/3 levantando frontend..."
  docker compose -f "$ROOT/frontend/docker-compose.yml" up --build -d

  color "listo → http://localhost:5173  ·  http://localhost:8000/docs"
}

down() {
  ensure_docker
  color "bajando stacks en orden inverso..."
  for stack in frontend backend database; do
    docker compose -f "$ROOT/$stack/docker-compose.yml" down
  done
}

restart() { down; up; }

status() {
  ensure_docker
  for stack in "${STACKS[@]}"; do
    color "== $stack =="
    docker compose -f "$ROOT/$stack/docker-compose.yml" ps
  done
}

logs() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    err "uso: ./erp.sh logs <database|backend|frontend>"
    exit 1
  fi
  ensure_docker
  docker compose -f "$ROOT/$target/docker-compose.yml" logs -f
}

usage() {
  cat <<EOF
Uso: ./erp.sh <comando>

Comandos:
  up         Levanta database → backend → frontend (espera DB healthy)
  down       Baja todo en orden inverso
  restart    down + up
  status     docker compose ps de cada stack
  logs <s>   Sigue logs de un stack (database|backend|frontend)
EOF
}

cmd="${1:-}"
case "$cmd" in
  up) up ;;
  down) down ;;
  restart) restart ;;
  status) status ;;
  logs) shift; logs "${1:-}" ;;
  ""|-h|--help) usage ;;
  *) err "comando desconocido: $cmd"; usage; exit 1 ;;
esac
