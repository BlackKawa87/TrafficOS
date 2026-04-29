# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR (port 5173)
npm run build     # TypeScript check + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test framework is configured. Always run `npm run build` after changes to catch TypeScript errors (`noUnusedLocals` and `noUnusedParameters` are enforced — unused imports will break the build).

## Stack

- **React 18** + **TypeScript** (strict mode) + **Vite**
- **React Router DOM v7** for client-side routing
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) — imported in `src/index.css`
- **localStorage** for all data persistence — no external database or auth
- **Anthropic SDK** (`@anthropic-ai/sdk`) — all AI calls go through `api/*.ts` Vercel serverless functions
- **Vercel** for deployment (SPA rewrites configured in `vercel.json`)

## Architecture

### Entry & Routing

```
index.html → src/main.tsx → src/App.tsx (React Router)
```

All routes live under a single `<Layout />` shell (sidebar + `<Outlet />`).  
Layout is at `src/traffic/components/Layout.tsx`.

### Module structure

```
src/traffic/
  components/   Layout.tsx (sidebar nav + language toggle)
  i18n/         index.tsx  (PT/EN translations via LanguageProvider context)
  pages/        One file per route (see table below)
  store/        storage.ts (all localStorage CRUD via tosDb)
  types/        index.ts   (all TypeScript interfaces and enums)
  utils/        helpers.ts (formatters, label maps, color helpers)
                landingHtmlBuilder.ts (landing page HTML generator)
api/            Vercel serverless functions (one per AI feature)
```

### Route table

| Route | Page file | Purpose |
|---|---|---|
| `/` | `Dashboard.tsx` | KPI overview, compliance widget, latest report, quick actions |
| `/command-center` | `CommandCenter.tsx` | 360° operational control panel with live alerts |
| `/produtos` | `Produtos.tsx` | Product list |
| `/produtos/novo` | `ProdutoForm.tsx` | Create / edit product |
| `/produtos/:id` | `ProdutoDetalhe.tsx` | Product detail + offer score |
| `/oferta/:produtoId` | `DiagnosticoOferta.tsx` | AI offer diagnosis |
| `/campanhas` | `Campanhas.tsx` | Campaign list |
| `/campanhas/nova` | `NovaCampanha.tsx` | AI campaign generator |
| `/campanhas/:id` | `CampanhaDetalhe.tsx` | Campaign detail |
| `/criativos` | `Criativos.tsx` | Creative list with performance metrics |
| `/criativos/mix` | `GerarMixCriativo.tsx` | Generate 6-creative mix in one shot |
| `/criativos/novo` | `NovoCriativo.tsx` | AI creative generator |
| `/criativos/:id` | `CriativoDetalhe.tsx` | Creative detail + metrics |
| `/metricas` | `Metricas.tsx` | Metrics dashboard, rankings, AI insights |
| `/metricas/novo` | `NovaMetrica.tsx` | Manual metric entry |
| `/metricas/importar` | `ImportarMetricas.tsx` | Bulk CSV import from Meta/Google/TikTok |
| `/decisoes` | `DecisoesIA.tsx` | AI decision generator |
| `/decisoes/:id` | `DecisoesDetalhe.tsx` | Decision detail |
| `/plano-diario` | `PlanoDiario.tsx` | AI daily action plan |
| `/plano-diario/:id` | `PlanoDetalhe.tsx` | Plan detail |
| `/escala` | `Escala.tsx` | Scale opportunities |
| `/escala/:id` | `EscalaDetalhe.tsx` | Scale detail |
| `/remarketing` | `Remarketing.tsx` | Remarketing strategies |
| `/remarketing/:id` | `RemarketingDetalhe.tsx` | Remarketing detail |
| `/expansao` | `Expansao.tsx` | Expansion plans (new markets/channels) |
| `/expansao/:id` | `ExpansaoDetalhe.tsx` | Expansion detail |
| `/email` | `Email.tsx` | Email sequence generator |
| `/email/:id` | `EmailDetalhe.tsx` | Email sequence detail |
| `/whatsapp` | `Whatsapp.tsx` | WhatsApp flow generator |
| `/whatsapp/:id` | `WhatsappDetalhe.tsx` | WhatsApp flow detail |
| `/vsl` | `Vsl.tsx` | VSL script generator |
| `/vsl/:id` | `VslDetalhe.tsx` | VSL detail |
| `/landing-page` | `LandingPages.tsx` | Landing page list |
| `/landing-page/:id` | `LandingPageDetalhe.tsx` | Landing page detail + preview |
| `/landing-publisher` | `LandingPublisher.tsx` | AI landing page builder |
| `/video-ai` | `VideoAI.tsx` | AI video script generator |
| `/compliance` | `Compliance.tsx` | Ad compliance analyzer (Meta/TikTok/Google/YouTube/Native) |
| `/relatorios` | `Relatorios.tsx` | Executive report generator — PDF/TXT/CSV export |
| `/integracoes` | `Integracoes.tsx` | Platform integrations (Meta, TikTok credentials) |
| `/inteligencia` | `Inteligencia.tsx` | Intelligence reports |
| `/autopilot` | `Autopilot.tsx` | Auto-pilot optimization sessions |
| `/auto-testing` | `AutoTesting.tsx` | A/B test automation |
| `/ai-core` | `AiCore.tsx` | AI model training & predictions |
| `/multi-produto` | `MultiProduto.tsx` | Multi-product portfolio analysis |
| `/full-auto` | `FullAuto.tsx` | Full automation strategy |
| `/cloud-ops` | `CloudOps.tsx` | Infrastructure & monitoring |
| `/prompt-center` | `PromptCenter.tsx` | Saved AI prompt templates |
| `/configuracoes` | `Configuracoes.tsx` | Settings, data export/import, language, currency |

### Data layer (`src/traffic/store/storage.ts`)

All data lives in `localStorage`. Every entity type has its own key (`tos_*`).  
Export the single `tosDb` object — use it for all reads and writes:

```ts
import { tosDb, generateId, now } from '../store/storage'

// Read
const products = tosDb.products.getAll()
const p        = tosDb.products.getById(id)

// Write
tosDb.products.save({ ...product, updated_at: now() })
tosDb.products.delete(id)
```

**Available collections on `tosDb`:**
`products`, `diagnoses`, `aiDiagnoses`, `aiCampaigns`, `aiCreatives`, `campaigns`, `creatives`, `metrics`, `decisions`, `insights`, `prompts`, `dailyPlans`, `landingPages`, `scaleOpportunities`, `remarketingStrategies`, `expansaoPlans`, `emailSequences`, `whatsappFlows`, `vslScripts`, `learningPatterns`, `intelligenceReports`, `autoPilotSessions`, `autoTestSessions`, `multiProductSessions`, `fullAutoSessions`, `videoAiVideos`, `landingPublisherPages`, `complianceChecks`, `relatorios`

Also: `tosDb.exportAll()` → JSON string, `tosDb.importAll(json)` → restore, `tosDb.clearAll()` → wipe all.

### API endpoints (`api/*.ts`)

Vercel serverless functions. All use `new Anthropic()` (picks up `ANTHROPIC_API_KEY` from env).  
Each returns JSON. All accept `POST` only. Pattern:

```ts
import Anthropic from '@anthropic-ai/sdk'
export const maxDuration = 60

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { ...fields } = await req.json()
  const client = new Anthropic()
  const message = await client.messages.create({ model: 'claude-sonnet-4-6', ... })
  // parse and return JSON
}
```

**Key endpoints:**
| File | Purpose |
|---|---|
| `campaign.ts` | Generate full campaign strategy |
| `creative.ts` | Generate creative brief + copy |
| `decision.ts` | Generate AI decisions from metrics |
| `diagnose.ts` | AI offer diagnosis |
| `insights.ts` | Performance insights from metrics |
| `compliance-analyze.ts` | Ad compliance check (5 platforms) |
| `relatorio-generate.ts` | Executive report content generation |
| `plano.ts` | Daily action plan |
| `scale.ts` | Scale opportunity analysis |
| `remarketing.ts` | Remarketing strategy |
| `expansao.ts` | Expansion plan |
| `landingpage.ts` | Landing page content |
| `landing-publisher-generate.ts` | Full HTML landing page |
| `video-ai-generate.ts` | Video script |
| `vsl.ts` | VSL script |
| `email.ts` | Email sequence |
| `whatsapp.ts` | WhatsApp flow |
| `inteligencia.ts` | Intelligence report |
| `autopilot-decision.ts` | Auto-pilot decisions |
| `auto-testing.ts` | A/B test automation |
| `full-auto-strategy.ts` | Full automation strategy |
| `multi-produto-analyze.ts` | Multi-product portfolio analysis |
| `ai-core-train.ts` / `ai-core-predict.ts` | AI core model |
| `meta-sync.ts` / `meta-create.ts` | Meta Ads integration |
| `tiktok-sync.ts` / `tiktok-create.ts` | TikTok Ads integration |

### AI generation pattern (animation + API race)

Pages with AI generation use refs to prevent stale closures in `setInterval` callbacks:

```ts
const genStepRef   = useRef(0)        // current animation step (ref, not state)
const apiDoneRef   = useRef(false)    // API finished?
const apiResultRef = useRef<T | null>(null)  // API result

// Animation interval increments genStepRef.current and calls setGenStep() for display
// API call sets apiResultRef.current + apiDoneRef.current = true
// Whichever finishes LAST calls finalizeReport() — checked in both interval callback and .then()
```

### i18n

```ts
import { useLanguage } from '../i18n'
const { t, lang, setLang } = useLanguage()
// Usage: t('nav.dashboard'), t('sett.title'), etc.
```

All new nav items need keys added to **both** `pt` and `en` blocks in `src/traffic/i18n/index.tsx`.

### Helpers (`src/traffic/utils/helpers.ts`)

- **Formatters:** `formatCurrency(n, currency?)`, `formatDate(iso)`, `formatDateTime(iso)`, `formatNumber(n)`, `formatPercent(n)`
- **Status colors:** `getStatusColor(status)` → Tailwind class string
- **Label maps:** `CHANNEL_LABELS`, `OBJECTIVE_LABELS`, `PHASE_LABELS`, `AI_CAMPAIGN_STATUS_LABELS`, `AI_CREATIVE_STATUS_LABELS`, `CREATIVE_CHANNEL_LABELS`, `CREATIVE_TYPE_LABELS`, `CREATIVE_OBJECTIVE_LABELS`, `DECISION_TYPE_LABELS`, `PRIORITY_LABELS`, `DAILY_PLAN_STATUS_LABELS`
- **Compliance:** `COMPLIANCE_PLATFORM_LABELS`, `COMPLIANCE_PLATFORM_ICONS`, `COMPLIANCE_STATUS_LABELS`, `COMPLIANCE_STATUS_COLORS`, `COMPLIANCE_ISSUE_TYPE_LABELS`, `COMPLIANCE_SEVERITY_COLORS`, `COMPLIANCE_RISK_COLORS(score)` (function), `COMPLIANCE_RISK_STROKE(score)` (function → hex), `COMPLIANCE_RISK_LEVEL_COLORS`
- **Reports:** `RELATORIO_TYPE_LABELS`, `RELATORIO_TYPE_ICONS`, `RELATORIO_TYPE_DESCS`

## TypeScript Config

Strict mode. `noUnusedLocals` and `noUnusedParameters` are **on** — any unused import or variable breaks `npm run build`. Always clean up imports when removing code.

## Design Tokens

| Token | Value |
|---|---|
| Main background | `bg-gray-950` |
| Cards / sidebar | `bg-gray-900` |
| Inputs / secondary | `bg-gray-800` |
| Borders | `border-gray-800` (cards), `border-gray-700` (inputs) |
| Primary accent | `violet-600` (buttons, active states) |
| Success | `emerald-400/500` |
| Warning | `amber-400` |
| Danger | `red-400` |
| Text primary | `text-white` |
| Text secondary | `text-gray-400` |
| Text muted | `text-gray-500` / `text-gray-600` |

No icon library — emoji and inline SVG only.

## Environment Variables (Vercel)

```
ANTHROPIC_API_KEY=sk-ant-...
```

Set in Vercel project settings → Environment Variables. Required for all AI endpoints.

## Adding a new module

1. Create `src/traffic/pages/MyPage.tsx`
2. Add route in `src/App.tsx`: import + `<Route path="my-page" element={<MyPage />} />`
3. Add nav entry in `src/traffic/components/Layout.tsx` NAV_ITEMS array
4. Add i18n key `nav.myPage` to both `pt` and `en` blocks in `src/traffic/i18n/index.tsx`
5. If AI-powered: create `api/my-feature.ts` with `export const maxDuration = 60`
6. Run `npm run build` — fix any TypeScript errors before committing
