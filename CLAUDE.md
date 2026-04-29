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
- **Anthropic SDK** (`@anthropic-ai/sdk`) — all AI calls go through `api/*.ts` Vercel Edge Functions
- **Vercel** for deployment (SPA rewrites + Edge Functions in `vercel.json`)

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
  components/   Layout.tsx (collapsible grouped sidebar + language toggle)
  i18n/         index.tsx  (PT/EN translations via LanguageProvider context)
  pages/        One file per route (see table below)
  store/        storage.ts (all localStorage CRUD via tosDb)
  types/        index.ts   (all TypeScript interfaces and enums)
  utils/        helpers.ts (formatters, label maps, color helpers)
                landingHtmlBuilder.ts (landing page HTML generator)
api/            Vercel Edge Functions (one per AI feature)
```

### Route table

| Route | Page file | Purpose |
|---|---|---|
| `/` | `Dashboard.tsx` | KPI overview, active pipelines widget, compliance/report widgets |
| `/pipeline/:productId` | `Pipeline.tsx` | **Core:** automated AI pipeline (diagnosis → campaign → creatives → compliance → plan → launch) |
| `/guia` | `Guia.tsx` | Usage guide — 15 steps across 6 sections with action buttons |
| `/command-center` | `CommandCenter.tsx` | 360° operational control panel with live alerts |
| `/produtos` | `Produtos.tsx` | Product list |
| `/produtos/novo` | `ProdutoForm.tsx` | Create product → **redirects to `/pipeline/:id` on new product** |
| `/produtos/:id/editar` | `ProdutoForm.tsx` | Edit product → redirects to product detail |
| `/produtos/:id` | `ProdutoDetalhe.tsx` | Product detail + offer score |
| `/oferta/:produtoId` | `DiagnosticoOferta.tsx` | AI offer diagnosis (standalone) |
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
| `/landing-publisher` | `LandingPublisher.tsx` | AI landing page builder (full HTML) |
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

---

## Pipeline IA — Core Feature

The Pipeline is the central feature. Registering a new product **automatically redirects** to `/pipeline/:productId`, which orchestrates:

```
Produto (manual) → Diagnóstico → Campanha → Criativos → Compliance → Plano → Aprovação Final
```

### Pipeline stages

| Stage ID | API called | What it generates |
|---|---|---|
| `diagnostico` | `POST /api/diagnose` | Offer score (0–10), 7 dimensions, executive summary |
| `campanha` | `POST /api/campaign` | Campaign name, hypothesis, audience, copies, metrics |
| `criativos` | `POST /api/creative` × 3 | 3 creatives with hooks, copy, creative direction |
| `compliance` | `POST /api/compliance-analyze` | Risk score per platform (Meta/TikTok/Google) |
| `plano` | `POST /api/plano` | Prioritised tasks for the first 3 days |
| `lancamento` | (no API) | Summary screen — always requires manual approval |

### Pipeline modes

- **`semi_auto`**: After each stage completes, show results and wait for user to click "Aprovar e Continuar"
- **`full_auto`**: Auto-approve every stage (1 second delay between), only stops at `lancamento`

### Pipeline state machine

```
pending → running → awaiting_approval → approved
                 ↘ error (retry available)
```

State is persisted in `tosDb.pipelines`. The pipeline is resumable — navigating away and back restores the current state.

### Key implementation details (`Pipeline.tsx`)

```ts
const runningRef = useRef(false)   // prevents double-execution

// Auto-start first pending stage on load
useEffect(() => {
  const nextStage = getNextPendingStage(pipeline)
  if (nextStage) runStage(pipeline, nextStage)
}, [pipeline?.id])

// In full_auto: after API resolves, auto-approve and chain to next stage
if (mode === 'full_auto' && stageId !== 'lancamento') {
  const next = getNextPendingStage(updated)
  if (next) setTimeout(() => runStage(updated, next), 800)
}
```

---

## Data layer (`src/traffic/store/storage.ts`)

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

| Collection | Type | Notes |
|---|---|---|
| `products` | `Product[]` | Core entity — all pipelines reference a product |
| `pipelines` | `Pipeline[]` | Automated workflow state per product |
| `diagnoses` | `OfferDiagnosis[]` | Manual offer diagnoses |
| `aiDiagnoses` | `AIOfferDiagnosis[]` | AI-generated offer diagnoses |
| `aiCampaigns` | `AICampaign[]` | AI-generated campaign strategies |
| `aiCreatives` | `AICreative[]` | AI-generated creatives with performance metrics |
| `campaigns` | `Campaign[]` | Manual campaign records |
| `creatives` | `Creative[]` | Manual creative records |
| `metrics` | `Metric[]` | Performance metrics (manual or CSV import) |
| `decisions` | `AIDecision[]` | AI decisions |
| `insights` | `PerformanceInsight[]` | Performance insights |
| `dailyPlans` | `DailyPlan[]` | Daily action plans |
| `landingPages` | `LandingPage[]` | Landing page records |
| `scaleOpportunities` | `ScaleOpportunity[]` | Scale opportunities |
| `remarketingStrategies` | `RemarketingStrategy[]` | Remarketing strategies |
| `expansaoPlans` | `ExpansaoPlan[]` | Expansion / multi-channel plans |
| `emailSequences` | `EmailSequence[]` | Email sequences |
| `whatsappFlows` | `WhatsappFlow[]` | WhatsApp flows |
| `vslScripts` | `VslScript[]` | VSL scripts |
| `learningPatterns` | `LearningPattern[]` | AI learning patterns |
| `intelligenceReports` | `IntelligenceReport[]` | Intelligence reports |
| `autoPilotSessions` | `AutoPilotSession[]` | Auto-pilot sessions |
| `autoTestSessions` | `AutoTestSession[]` | A/B test sessions |
| `multiProductSessions` | `MultiProductSession[]` | Multi-product sessions |
| `fullAutoSessions` | `FullAutoSession[]` | Full-auto sessions |
| `videoAiVideos` | `VideoAIVideo[]` | Video AI scripts |
| `landingPublisherPages` | `LandingPublisherPage[]` | Published landing pages (full HTML) |
| `complianceChecks` | `ComplianceCheck[]` | Compliance analysis results |
| `relatorios` | `Relatorio[]` | Executive reports |
| `prompts` | `PromptTemplate[]` | Saved prompt templates |

Special pipeline helpers:
```ts
tosDb.pipelines.getActiveByProduct(productId)  // latest non-completed pipeline for a product
tosDb.pipelines.getByProduct(productId)         // all pipelines for a product
```

Also: `tosDb.exportAll()` → JSON string, `tosDb.importAll(json)` → restore, `tosDb.clearAll()` → wipe all.

---

## API endpoints (`api/*.ts`)

All API files are **Vercel Edge Functions**. Pattern:

```ts
import Anthropic from '@anthropic-ai/sdk'

export const config = { runtime: 'edge' }  // ← required for Edge Function (NOT runtime = 'edge')
export const maxDuration = 60

const client = new Anthropic()  // picks up ANTHROPIC_API_KEY from env

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const { myField } = (await req.json()) as { myField: string }
  const message = await client.messages.create({ model: 'claude-sonnet-4-6', ... })
  // parse and return JSON
}
```

**CRITICAL**: Use `export const config = { runtime: 'edge' }` — NOT `export const runtime = 'edge'` (Next.js-only). Without this, Vercel counts each file as a Serverless Function and exceeds the 12-function Hobby plan limit.

**For query params** in Edge Functions (no `req.query`):
```ts
const url = new URL(req.url)
const action = url.searchParams.get('action')
```

**All endpoints:**

| File | Body fields | Purpose |
|---|---|---|
| `diagnose.ts` | `{ productData: string }` | AI offer diagnosis (score + 14 sections) |
| `campaign.ts` | `{ campaignData: string }` | Full campaign strategy |
| `creative.ts` | `{ creativeData: string }` | Creative brief + copy + hooks |
| `decision.ts` | `{ decisionData: string }` | AI decisions from metrics (max 6) |
| `scale.ts` | `{ contextData: string }` | Scale opportunities (5–10) |
| `insights.ts` | `{ metricsData: string }` | Performance insights |
| `compliance-analyze.ts` | `{ copy_text, headline, offer_description, landing_url, claims[], niche, platforms[], product_name }` | Compliance check (5 platforms) |
| `relatorio-generate.ts` | `{ reportData: string }` | Executive report content |
| `plano.ts` | `{ planData: string }` | Daily action plan (max 15 tasks) |
| `remarketing.ts` | `{ remarketingData: string }` | Remarketing strategy |
| `expansao.ts` | `{ expansaoData: string }` | Expansion / multi-channel plan |
| `landingpage.ts` | `{ landingData: string }` | Landing page content |
| `landing-publisher-generate.ts` | `{ publisherData: string }` | Full HTML landing page |
| `video-ai-generate.ts` | `{ videoData: string }` | Video script |
| `vsl.ts` | `{ vslData: string }` | VSL script |
| `email.ts` | `{ emailData: string }` | Email sequence |
| `whatsapp.ts` | `{ whatsappData: string }` | WhatsApp flow |
| `inteligencia.ts` | `{ inteligenciaData: string }` | Intelligence report |
| `autopilot-decision.ts` | `{ autopilotData: string }` | Auto-pilot decisions |
| `auto-testing.ts` | `{ testingData: string }` | A/B test automation |
| `full-auto-strategy.ts` | `{ strategyData: string }` | Full automation strategy |
| `multi-produto-analyze.ts` | `{ portfolioData: string }` | Multi-product portfolio analysis |
| `ai-core-train.ts` | `{ trainingData: string }` | AI core model training |
| `ai-core-predict.ts` | `{ predictionData: string }` | AI core predictions |
| `meta-sync.ts` | `{ access_token, ad_account_id }` | Sync Meta Ads data |
| `meta-create.ts` | `{ access_token, ad_account_id, name, objective, daily_budget_cents, status? }` + `?action=adset` for ad sets | Create Meta campaign or ad set |
| `tiktok-sync.ts` | `{ access_token, advertiser_id }` | Sync TikTok Ads data |
| `tiktok-create.ts` | `{ access_token, advertiser_id, name, objective, budget }` + `?action=adgroup` for ad groups | Create TikTok campaign or ad group |
| `import.ts` | `{ type: 'pdf'\|'image'\|'text', content: string, mimeType? }` | Extract structured data from uploaded documents |

---

## Sidebar (`src/traffic/components/Layout.tsx`)

The sidebar uses **collapsible groups** — not a flat list. Groups are defined in `NAV_GROUPS`:

```ts
type NavGroup = { id: string; label: string; labelEn: string; icon: string; items: NavItem[] }
```

**Current groups:**

| Group ID | Label | Items |
|---|---|---|
| `overview` | Visão Geral | Dashboard, Command Center, Plano Diário, Relatórios |
| `pipeline` | ⚡ Pipeline IA | Novo Pipeline, Produtos Ativos |
| `traffic` | Tráfego | Produtos, Campanhas, Criativos, Métricas |
| `ia` | IA & Otimização | Decisões IA, Escala, Remarketing, Multi-Canal, Inteligência, Multi-Produto |
| `content` | Conteúdo & Copy | Email, WhatsApp, VSL, Video AI, Landing Pages, LP Publisher |
| `auto` | Automação | Auto-Pilot, Auto-Testing, AI Core, Full Auto |
| `system` | Sistema | Compliance, Integrações, Cloud Ops, Prompt Center, Configurações |

**Group open state** is persisted in `localStorage` under key `tos_nav_open`. Groups auto-expand when a child route becomes active. Pipeline group auto-expands on `/pipeline/*` routes.

**"Guia de Uso" link** is always visible at the top of the nav (above groups), styled in violet.

### Adding a nav item to an existing group

Edit the `NAV_GROUPS` array in `Layout.tsx` — add to the appropriate group's `items` array. No i18n keys needed since labels are hardcoded strings in the Layout (unlike the old flat nav).

---

## AI generation pattern (animation + API race)

Pages with AI generation use refs to prevent stale closures in `setInterval` callbacks:

```ts
const genStepRef   = useRef(0)        // current animation step (ref, not state)
const apiDoneRef   = useRef(false)    // API finished?
const apiResultRef = useRef<T | null>(null)  // API result

// Animation interval increments genStepRef.current and calls setGenStep() for display
// API call sets apiResultRef.current + apiDoneRef.current = true
// Whichever finishes LAST calls finalizeReport() — checked in both interval callback and .then()
```

The Pipeline page uses a different pattern — `runningRef` prevents double-execution of async stage runners:

```ts
const runningRef = useRef(false)
// Set to true at start of runStage(), back to false on completion or error
```

---

## i18n

```ts
import { useLanguage } from '../i18n'
const { t, lang, setLang } = useLanguage()
// Usage: t('nav.dashboard'), t('sett.title'), etc.
```

All new nav items **do not need i18n keys** — the sidebar now uses hardcoded `label`/`labelEn` strings directly in `NAV_GROUPS`. For page-level content, add keys to both `pt` and `en` blocks in `src/traffic/i18n/index.tsx`.

---

## Helpers (`src/traffic/utils/helpers.ts`)

- **Formatters:** `formatCurrency(n, currency?)`, `formatDate(iso)`, `formatDateTime(iso)`, `formatNumber(n)`, `formatPercent(n)`
- **Status colors:** `getStatusColor(status)` → Tailwind class string
- **Label maps:** `CHANNEL_LABELS`, `OBJECTIVE_LABELS`, `PHASE_LABELS`, `AI_CAMPAIGN_STATUS_LABELS`, `AI_CREATIVE_STATUS_LABELS`, `CREATIVE_CHANNEL_LABELS`, `CREATIVE_TYPE_LABELS`, `CREATIVE_OBJECTIVE_LABELS`, `DECISION_TYPE_LABELS`, `PRIORITY_LABELS`, `DAILY_PLAN_STATUS_LABELS`
- **Compliance:** `COMPLIANCE_PLATFORM_LABELS`, `COMPLIANCE_PLATFORM_ICONS`, `COMPLIANCE_STATUS_LABELS`, `COMPLIANCE_STATUS_COLORS`, `COMPLIANCE_ISSUE_TYPE_LABELS`, `COMPLIANCE_SEVERITY_COLORS`, `COMPLIANCE_RISK_COLORS(score)` (function), `COMPLIANCE_RISK_STROKE(score)` (function → hex), `COMPLIANCE_RISK_LEVEL_COLORS`
- **Reports:** `RELATORIO_TYPE_LABELS`, `RELATORIO_TYPE_ICONS`, `RELATORIO_TYPE_DESCS`

---

## TypeScript Config

Strict mode. `noUnusedLocals` and `noUnusedParameters` are **on** — any unused import or variable breaks `npm run build`. Always clean up imports when removing code.

The `Pipeline.tsx` file uses `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for dynamic AI response shapes — this is intentional since API responses vary.

---

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

---

## Environment Variables (Vercel)

```
ANTHROPIC_API_KEY=sk-ant-...
```

Set in Vercel project settings → Environment Variables. Required for all AI endpoints.

---

## Adding a new module

1. Create `src/traffic/pages/MyPage.tsx`
2. Add route in `src/App.tsx`: import + `<Route path="my-page" element={<MyPage />} />`
3. Add to the appropriate group in `NAV_GROUPS` in `src/traffic/components/Layout.tsx`
4. If AI-powered: create `api/my-feature.ts` with `export const config = { runtime: 'edge' }` + `export const maxDuration = 60`
5. Run `npm run build` — fix any TypeScript errors before committing

## Adding a new Pipeline stage

1. Add stage ID to `PipelineStageId` union type in `src/traffic/types/index.ts`
2. Add entry to `STAGE_DEFS` array in `Pipeline.tsx`
3. Add API caller function (async, takes product + previous results)
4. Add the call in the `if (stageId === '...')` block inside `runStage()`
5. Add a result renderer component and wire it in the JSX render block
