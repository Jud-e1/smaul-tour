.PHONY: help install dev build test lint format clean docker-up docker-down docker-reset

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	npm install

dev: ## Start development servers (backend + web)
	npm run dev

dev-backend: ## Start backend development server
	npm run dev:backend

dev-web: ## Start web development server
	npm run dev:web

build: ## Build all packages
	npm run build

test: ## Run all tests
	npm test

test-backend: ## Run backend tests
	npm test --workspace=packages/backend

test-web: ## Run web tests
	npm test --workspace=packages/web

lint: ## Lint all packages
	npm run lint

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

clean: ## Clean build artifacts and dependencies
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/.next
	rm -rf packages/*/build

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-reset: ## Reset Docker services (removes volumes)
	docker-compose down -v
	docker-compose up -d

docker-logs: ## View Docker logs
	docker-compose logs -f

migrate: ## Run database migrations
	npm run migrate --workspace=packages/backend

migrate-revert: ## Revert last database migration
	npm run migrate:revert --workspace=packages/backend
