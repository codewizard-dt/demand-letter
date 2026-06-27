.PHONY: ci install typecheck lint format-check test-e2e

ci: install typecheck lint format-check

install:
	pnpm install --frozen-lockfile

typecheck:
	pnpm typecheck

lint:
	pnpm lint

format-check:
	pnpm format:check

# Run the full Playwright E2E suite against a live local stack.
# Builds the API, starts Postgres + SAM local, runs tests, then tears down SAM.
test-e2e:
	pnpm --filter @demand-letter/api build
	docker compose up -d
	@pkill -f 'sam local start-api' 2>/dev/null || true; \
	sam local start-api --port 3000 & \
	SAM_PID=$$!; \
	echo "Waiting for SAM local API on :3000…"; \
	until curl -s --connect-timeout 2 http://localhost:3000 > /dev/null 2>&1; do sleep 3; done; \
	echo "SAM ready — running E2E tests…"; \
	pnpm --filter @demand-letter/web test:e2e; \
	TEST_EXIT=$$?; \
	kill $$SAM_PID 2>/dev/null || true; \
	exit $$TEST_EXIT
