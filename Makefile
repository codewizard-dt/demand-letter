.PHONY: ci install typecheck lint format-check prisma-generate dev dev-api dev-web prepare-sam-local test-e2e docker-clean-sam docker-compose-up docker-compose-down clean-playwright-artifacts

# Canonical local stack commands:
#   make dev
#   make dev-api
#   make dev-web
#   make test-e2e
#   make docker-clean-sam
#   make clean-playwright-artifacts

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
REPO_ROOT := $(shell pwd)

ci: install typecheck lint format-check

install:
	pnpm install --frozen-lockfile

typecheck:
	pnpm typecheck

lint:
	pnpm lint

format-check:
	pnpm format:check

prisma-generate:
	pnpm --filter @demand-letter/db db:generate

prepare-sam-local:
	pnpm --filter @demand-letter/db build
	pnpm --filter @demand-letter/db lambda-layer
	pnpm --filter @demand-letter/server build
	node scripts/prepare-sam-local-build.mjs

dev-api: docker-compose-up
	API_PID=$$!; \
	cleanup() { \
	  kill $$API_PID 2>/dev/null || true; \
	  $(MAKE) docker-compose-down; \
	}; \
	trap cleanup EXIT; \
	trap 'cleanup; exit 130' INT TERM; \
	wait $$API_PID

dev-web:
	pnpm --filter @demand-letter/web dev

dev: prisma-generate
	@$(MAKE) docker-compose-up
	pnpm --filter @demand-letter/server dev & \
	echo "Express API ready at http://localhost:3000"; \
	pnpm --filter @demand-letter/web dev

# Run the full Playwright E2E suite against a live local stack.
# Starts Postgres + the Express API, runs tests, then tears down the compose stack.
test-e2e:
	@$(MAKE) docker-compose-up
	AWS_EC2_METADATA_DISABLED=true AWS_SDK_LOAD_CONFIG=1 \
	  pnpm --filter @demand-letter/server dev & \
	API_PID=$$!; \
	cleanup() { \
	  kill $$API_PID 2>/dev/null || true; \
	  $(MAKE) docker-compose-down; \
	}; \
	trap cleanup EXIT; \
	trap 'cleanup; exit 130' INT TERM; \
	echo "Waiting for Express API on :3000..."; \
	READY=0; \
	for attempt in $$(seq 1 120); do \
	  if curl -fsS --connect-timeout 2 --max-time 10 http://localhost:3000/jobs > /dev/null 2>&1; then \
	    READY=1; \
	    break; \
	  fi; \
	  echo "waiting for http://localhost:3000/jobs"; \
	  sleep 1; \
	done; \
	if [ "$$READY" -ne 1 ]; then \
	  echo "Express API did not become healthy at http://localhost:3000/jobs"; \
	  exit 1; \
	fi; \
	echo "Express API ready -- running E2E tests..."; \
	if pnpm --filter @demand-letter/web test:e2e; then \
	  TEST_EXIT=0; \
	else \
	  TEST_EXIT=$$?; \
	fi; \
	exit $$TEST_EXIT

docker-clean-sam:
	@sam_lambda_containers="$$(docker ps -aq --filter 'label=sam.cli.container.type=lambda')"; \
	if [ -n "$$sam_lambda_containers" ]; then \
	  echo "Removing stale SAM Lambda containers..."; \
	  printf '%s\n' "$$sam_lambda_containers" | xargs docker rm -f; \
	else \
	  echo "No SAM Lambda containers to remove."; \
	fi

docker-compose-up:
	docker compose up -d postgres

docker-compose-down:
	docker compose down

clean-playwright-artifacts:
	rm -rf app/frontend/test-results app/frontend/playwright-report

# Wipe local app data (DB + S3) for a fresh state
DATABASE_URL ?= postgresql://postgres@localhost:5430/demand_letter_dev
S3_BUCKET ?= dev-demand-letter-docs-429842292480
S3_RM_ARGS ?=

.PHONY: reset-local-state
reset-local-state:
	@echo "Resetting local data state..."
	@psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f scripts/reset-local-db.sql
	@bash scripts/reset-local-s3.sh $(S3_BUCKET) $(S3_RM_ARGS)
