.PHONY: ci install typecheck lint format-check

ci: install typecheck lint format-check

install:
	pnpm install --frozen-lockfile

typecheck:
	pnpm typecheck

lint:
	pnpm lint

format-check:
	pnpm format:check
