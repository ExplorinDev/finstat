# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (port 3000, Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npx prisma migrate dev --name <name>  # Create DB migration
npx prisma generate                   # Regenerate Prisma client after schema changes
npx prisma studio                     # Browse database GUI
```

Node.js is managed via nvm (v24). Source nvm before running commands:
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

## Architecture

Czech company registry search app using ARES API with SQLite cache.

### Data Flow

1. **Search** (`POST /api/search`): User query → ARES general search API → returns basic company list → results cached to SQLite (fire-and-forget)
2. **Detail** (`GET /api/company?ico=...`): Click to expand → checks DB cache (24h TTL) → if miss, fetches from ARES VR API → saves statutory members & shareholders → returns full detail

### Two ARES Endpoints

- **General search** (`/ekonomicke-subjekty/vyhledat`): POST with `obchodniJmeno` or `ico[]`. Returns name, IČO, address. Used for search results list.
- **VR detail** (`/ekonomicke-subjekty-vr/{ico}`): GET by IČO. Returns statutory bodies (`statutarniOrgany`), shareholders (`spolecnici`), historical records. Used for expanded card detail.

ARES VR responses contain historical records — filter by absence of `datumVymazu` to get current data only.

### Key Files

- `src/lib/ares.ts` — ARES API client, response type definitions, and mapping logic (ARES → DB models)
- `src/lib/db.ts` — Prisma client singleton
- `src/app/api/search/route.ts` — Search endpoint (proxies ARES, caches results)
- `src/app/api/company/route.ts` — Detail endpoint (cache-first, falls back to ARES VR)
- `src/app/page.tsx` — Single-page UI (client component, manages all state)

### Database

SQLite via Prisma 6. Three models: `Company`, `StatutoryMember`, `Shareholder`. Schema in `prisma/schema.prisma`. DB file at `prisma/dev.db`.

### UI

All on one page: search bar top, sídlo filter sidebar left, expandable company cards. Czech language UI. Built with shadcn/ui components (base-nova style), Tailwind CSS v4. All components are client components (`"use client"`).

## ARES API

Rate limit: 500 requests/minute. Base URL: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest`
