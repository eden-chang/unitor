# Unitor — developer convenience targets.
#
# Run from the repo root: `make <target>`. The targets are thin wrappers
# around `uv run …` (backend) and `npm run …` (frontend) so we don't
# spread tool incantations across CI, docs, and developer memory.

.PHONY: help \
        be-install be-dev be-lint be-format be-test be-typecheck be-migrate be-seed \
        fe-install fe-dev fe-build fe-lint fe-typecheck \
        check fix \
        sql-conn

help:
	@echo "Backend:"
	@echo "  be-install     uv sync --all-groups"
	@echo "  be-dev         uvicorn app.main:app --reload"
	@echo "  be-lint        ruff check ."
	@echo "  be-format      ruff format ."
	@echo "  be-test        pytest tests/unit/"
	@echo "  be-typecheck   mypy app"
	@echo "  be-migrate     alembic upgrade head"
	@echo "  be-seed        seed UofT + CSC318 + classmates"
	@echo ""
	@echo "Frontend:"
	@echo "  fe-install     npm ci"
	@echo "  fe-dev         vite"
	@echo "  fe-build       vite build"
	@echo "  fe-lint        eslint ."
	@echo "  fe-typecheck   tsc --noEmit"
	@echo ""
	@echo "Cross:"
	@echo "  check          lint + typecheck + test (both sides)"
	@echo "  fix            ruff fix + format + prettier (both sides)"

# --- Backend ----------------------------------------------------------------

be-install:
	cd backend && uv sync --all-groups

be-dev:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

be-lint:
	cd backend && uv run ruff check .

be-format:
	cd backend && uv run ruff format .

be-test:
	cd backend && uv run pytest tests/unit/ -q

be-typecheck:
	cd backend && uv run mypy app

be-migrate:
	cd backend && uv run alembic upgrade head

be-seed:
	cd backend && uv run python -m scripts.seed_dev

# --- Frontend ---------------------------------------------------------------

fe-install:
	cd frontend && npm ci

fe-dev:
	cd frontend && npm run dev

fe-build:
	cd frontend && npm run build

fe-lint:
	cd frontend && npm run lint

fe-typecheck:
	cd frontend && npm run typecheck

# --- Cross ------------------------------------------------------------------

check: be-lint be-typecheck be-test fe-lint fe-typecheck

fix:
	cd backend && uv run ruff check --fix . && uv run ruff format .

# --- Misc -------------------------------------------------------------------

# Open a psql shell against the database. Reads DATABASE_DIRECT_URL from
# backend/.env. Requires `psql` on PATH.
sql-conn:
	@cd backend && set -a && . ./.env && set +a && \
	  psql "$$(echo "$$DATABASE_DIRECT_URL" | sed 's|+asyncpg||')"
