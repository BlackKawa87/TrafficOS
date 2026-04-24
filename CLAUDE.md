# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript check + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test framework is configured.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **React Router DOM v7** for client-side routing
- **Tailwind CSS** (via `@tailwindcss/vite` plugin) — import in `src/index.css`
- **localStorage** for all data persistence (no backend)

## Architecture

### Entry & Routing
`index.html` → `src/main.tsx` → `src/App.tsx` (routing).

Two route trees:
- `/` → `Home.tsx` (landing page)
- `/crm/*` → `Layout.tsx` (sidebar) + nested CRM pages

### CRM Module (`src/pages/`)
| Route | File | Purpose |
|---|---|---|
| `/crm` | `CRMDashboard.tsx` | Stats, top requests/players, top matches |
| `/crm/pedidos` | `Pedidos.tsx` | Request list with filters |
| `/crm/pedidos/:id` | `DetalPedido.tsx` | Detail + matches + shortlist tabs |
| `/crm/pedidos/novo` & `/:id/editar` | `PedidoForm.tsx` | 4-section form |
| `/crm/jogadores` | `Jogadores.tsx` | Player list with filters |
| `/crm/jogadores/:id` | `DetalJogador.tsx` | Profile + compatible requests tabs |
| `/crm/jogadores/novo` & `/:id/editar` | `JogadorForm.tsx` | 6-section form |
| `/crm/matches` | `Matches.tsx` | All matches with filters + score sliders |
| `/crm/pipeline` | `Pipeline.tsx` | Kanban for requests and players |
| `/crm/buscar` | `BuscarJogadores.tsx` | Search with auto-filled filters from request |

### Data Layer (`src/store/storage.ts`)
All persistence via `db` object exposing typed CRUD for: `requests`, `players`, `matches`, `logs`, `shortlists`. Direct `localStorage` reads/writes, no external state management.

### Match Algorithm (`src/utils/matching.ts`)
Three exported functions:
- `computeMatch(request, player)` → `RequestPlayerMatch` with 4 sub-scores
- `runMatchesForRequest(request, players[])` → sorted matches for one request
- `runMatchesForPlayer(player, requests[])` → sorted matches for one player

Score formula: `sports×0.30 + financial×0.25 + commercial×0.25 + strategic×0.20`. Risk: baixo ≥70, medio ≥45, alto <45.

Match IDs are deterministic: `${requestId}_${playerId}`. Matches are auto-saved after every form save.

### Shared Components
- `Layout.tsx` — fixed 224px sidebar + `<Outlet />`
- `StatusBadge.tsx` — colored badges for status/priority/risk/relation/squad/availability
- `ScoreMeter.tsx` — progress bar for 0–100 scores, color-coded green/amber/red

### Helpers (`src/utils/helpers.ts`)
`generateId()`, `now()`, `formatDate()`, `formatCurrency()`, label maps for all enum types, POSITIONS list, CURRENCIES list.

## TypeScript Config

Strict mode on. `noUnusedLocals` and `noUnusedParameters` enforced — unused imports cause build failures.

## Design Tokens

Dark theme throughout: `bg-gray-950` main background, `bg-gray-900` cards/sidebar, `bg-gray-800` inputs. Accent: `emerald-400/500/600`. No icon library — emoji and inline SVG only.
