.PHONY: dev test lint build up down logs

# ── Local development (no Docker) ────────────────────────────────────────────
dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	cd backend && pytest --tb=short -q

test-verbose:
	cd backend && pytest -v

# ── Linting ───────────────────────────────────────────────────────────────────
lint-backend:
	cd backend && ruff check app/ tests/

lint-frontend:
	cd frontend && npm run lint

lint: lint-backend lint-frontend

# ── Docker ────────────────────────────────────────────────────────────────────
build:
	docker compose build

up:
	docker compose up

up-detached:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# ── Setup ─────────────────────────────────────────────────────────────────────
install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm ci

install: install-backend install-frontend

setup:
	cp .env.example .env
	cp backend/.env.example backend/.env
	@echo "Edit .env and backend/.env with your ANTHROPIC_API_KEY, then run 'make up'"
