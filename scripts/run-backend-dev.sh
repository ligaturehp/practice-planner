#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

export DATABASE_URL="${DATABASE_URL:-postgres://josephstich@localhost:5432/practice_planner_dev?sslmode=disable}"
export SESSION_SECRET="${SESSION_SECRET:-dev-session-secret-32-characters!!}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:4200,http://127.0.0.1:4200,http://127.0.0.1:4201,http://127.0.0.1:4302}"
export PORT="${PORT:-8080}"

go run ./cmd/api
