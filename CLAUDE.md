# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (port 3000, Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npm run sync     # Import companies from ČSÚ RES CSV into SQLite
npx prisma migrate dev --name <name>  # Create DB migration
npx prisma generate                   # Regenerate Prisma client after schema changes
npx prisma studio                     # Browse database GUI
```

Node.js is managed via nvm (v24). Source nvm before running commands:
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

## Architecture

Czech company registry browser. All ~604k active companies (s.r.o., a.s., k.s., v.o.s.) are stored locally in SQLite, imported from the ČSÚ RES open data CSV. Company details (statutory members, shareholders) are fetched on demand from ARES VR API and cached for 24h.

### Data Flow

1. **Browse** (`GET /api/browse`): Page load / city filter → queries local SQLite DB → returns companies sorted A-Z, filtered by legal form
2. **Search** (`POST /api/search`): User query → ARES general search API → returns results → cached to SQLite (fire-and-forget)
3. **Detail** (`GET /api/company?ico=...`): Click to expand → checks DB cache (24h TTL) → if miss, fetches from ARES VR API → saves statutory members & shareholders → returns full detail

### Two ARES Endpoints

- **General search** (`/ekonomicke-subjekty/vyhledat`): POST with `obchodniJmeno` or `ico[]`. Returns name, IČO, address. Used for search results list.
- **VR detail** (`/ekonomicke-subjekty-vr/{ico}`): GET by IČO. Returns statutory bodies (`statutarniOrgany`), shareholders (`spolecnici`), historical records. Used for expanded card detail.

ARES VR responses contain historical records — filter by absence of `datumVymazu` to get current data only.

### Key Files

- `src/lib/ares.ts` — ARES API client, response type definitions, mapping logic, and `searchByPrefix()` for sync
- `src/lib/db.ts` — Prisma client singleton
- `src/app/api/browse/route.ts` — Browse endpoint (queries local DB, sort A-Z, legal form filter)
- `src/app/api/search/route.ts` — Search endpoint (proxies ARES, caches results)
- `src/app/api/company/route.ts` — Detail endpoint (cache-first, falls back to ARES VR)
- `src/app/page.tsx` — Single-page UI (client component, manages all state)
- `scripts/sync.ts` — Bulk import script (downloads ČSÚ RES CSV, imports 604k companies)

### Database

SQLite via Prisma 6. Three models: `Company`, `StatutoryMember`, `Shareholder`. Schema in `prisma/schema.prisma`. DB file at `prisma/dev.db` (tracked via Git LFS, 122 MB, 604k companies).

Indexes on `Company`: `name`, `legalForm`, `city`.

Legal form codes: `112` = s.r.o., `121` = a.s., `118` = k.s., `117` = v.o.s.

### Data Sources

- **ČSÚ RES CSV** — `https://opendata.csu.gov.cz/soubory/od/od_org03/res_data.csv` — full company list (~3.6M records, updated 2x/month). Filtered to 4 legal forms = 604k active companies. Run `npm run sync` to refresh.
- **ARES VR API** — `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest` — on-demand detail (statutory members, shareholders). Rate limit: 500 req/min.

### UI

Two modes on one page:
- **Browse mode** (default): shows all DB companies A-Z, city filter via sidebar
- **Search mode**: triggered by search bar, queries ARES API directly

Search bar top, sídlo filter sidebar left (always visible), expandable company cards. Czech language UI. Built with shadcn/ui components (base-nova style), Tailwind CSS v4. All components are client components (`"use client"`).

## Deployment

Docker + Google Cloud Run. DB is baked into the image via Git LFS (no sync needed at build time).

```bash
# Build image locally (optional test)
docker build -t finstat .

# Deploy via Cloud Run GitHub integration
# Push to main branch → automatic redeploy
```

Git LFS is required to clone the full repo with the DB:
```bash
git lfs pull  # if dev.db is missing after clone
```
