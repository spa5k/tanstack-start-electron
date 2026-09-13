.DEFAULT_GOAL := help

.PHONY: help install dev build build_web build_electron typecheck smoke dist dist_dir clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (pnpm)
	pnpm install

dev: ## Run Vite and Electron together with HMR
	pnpm dev

build: ## Build the SSR bundle and the Electron main process
	pnpm build

build_web: ## Build the TanStack Start SSR bundle (.output/)
	pnpm build:web

build_electron: ## Bundle the Electron main/preload scripts (build/)
	pnpm build:electron

typecheck: ## Type-check the renderer, the server and the Electron code
	pnpm typecheck

smoke: ## Build and run the end-to-end smoke test inside Electron
	pnpm smoke

dist: ## Package the app for the current platform (dmg/zip, nsis, AppImage/deb)
	pnpm dist

dist_dir: ## Package an unpacked app directory (fast, for testing)
	pnpm dist:dir

clean: ## Remove build artifacts
	rm -rf build .output .nitro release node_modules/.vite
