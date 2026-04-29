import { useState, useEffect, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  MULTI_PRODUCT_ENTRY_STATUS_LABELS,
  MULTI_PRODUCT_ENTRY_STATUS_COLORS,
  MULTI_PRODUCT_ACTION_ICONS,
  MULTI_PRODUCT_CHANNEL_LABELS,
} from '../utils/helpers'
import type {
  Product,
  MultiProductSession,
  MultiProductEntry,
  MultiProductAction,
  MultiProductChannel,
} from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jitter(base: number, pct: number): number {
  return Math.max(0, base + base * pct * (Math.random() * 2 - 1))
}

function makeEntry(product: Product, sessionId: string, budget: number): MultiProductEntry {
  return {
    id: generateId(),
    session_id: sessionId,
    product_id: product.id,
    product_name: product.name,
    product_niche: product.niche,
    status: 'iniciando',
    daily_budget: budget,
    budget_pct: 0,
    spend: 0,
    revenue: 0,
    roas: 0,
    cpa: 0,
    ctr: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    sim_health: 30 + Math.random() * 55,
    rank: 0,
    created_at: now(),
    updated_at: now(),
  }
}

// ─── AI Analysis type ─────────────────────────────────────────────────────────

interface PortfolioAnalysis {
  ranking_commentary: string
  winner_analysis: string
  loser_analysis: string
  budget_recommendation: string
  next_actions: { product_name: string; action: string; reasoning: string }[]
  overall_strategy: string
  predicted_winner: string
  estimated_timeline: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className={`absolute inset-0 rounded-full ${color} animate-ping opacity-60`} />
    </span>
  )
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-4 ${highlight ? 'bg-yellow-900/10 border-yellow-700/40' : 'bg-gray-900 border-gray-800'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-yellow-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function RankBadge({ rank, isWinner }: { rank: number; isWinner: boolean }) {
  if (isWinner) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-900/50 text-base">
        🏆
      </span>
    )
  }
  const styles: Record<number, string> = {
    1: 'bg-violet-900/50 text-violet-200',
    2: 'bg-gray-700 text-gray-200',
    3: 'bg-amber-900/30 text-amber-300',
  }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${styles[rank] ?? 'bg-gray-800 text-gray-500'}`}>
      {rank}
    </span>
  )
}

function EntryRow({ entry, rank, currency }: { entry: MultiProductEntry; rank: number; currency: string }) {
  const statusClass = MULTI_PRODUCT_ENTRY_STATUS_COLORS[entry.status] ?? 'bg-gray-800 text-gray-400'
  const statusLabel = MULTI_PRODUCT_ENTRY_STATUS_LABELS[entry.status] ?? entry.status
  const isWinner = entry.status === 'vencedor'
  const isPaused = entry.status === 'pausado'

  return (
    <tr className={`border-b border-gray-800/60 transition-all ${
      isWinner ? 'bg-yellow-900/10' : isPaused ? 'opacity-40' : 'hover:bg-gray-800/30'
    }`}>
      <td className="px-4 py-3">
        <RankBadge rank={rank} isWinner={isWinner} />
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-white text-sm">{entry.product_name}</div>
        <div className="text-xs text-gray-500">{entry.product_niche}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-200">{formatCurrency(entry.daily_budget, currency)}</div>
        <div className="text-xs text-gray-600">{entry.budget_pct.toFixed(0)}% do total</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${
          entry.roas >= 3.5 ? 'text-emerald-400' :
          entry.roas >= 2 ? 'text-green-400' :
          entry.roas >= 1 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {entry.roas > 0 ? `${entry.roas.toFixed(2)}x` : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {entry.cpa > 0 ? formatCurrency(entry.cpa, currency) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {entry.ctr > 0 ? `${entry.ctr.toFixed(2)}%` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-200">
        {formatCurrency(entry.revenue, currency)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {formatCurrency(entry.spend, currency)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {formatNumber(entry.impressions)}
      </td>
    </tr>
  )
}

function ProductCard({
  product,
  selected,
  onToggle,
  disabled,
}: {
  product: Product
  selected: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !selected}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-violet-500 bg-violet-900/20'
          : disabled
          ? 'border-gray-800 bg-gray-900/40 opacity-40 cursor-not-allowed'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{product.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{product.niche}</div>
          <div className="text-xs text-gray-600 mt-1">{formatCurrency(product.price, product.currency)}</div>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
          selected ? 'border-violet-500 bg-violet-500' : 'border-gray-600'
        }`}>
          {selected && <span className="text-white text-[10px] font-bold">✓</span>}
        </div>
      </div>
    </button>
  )
}

function ActivityItem({ action }: { action: MultiProductAction }) {
  const icon = MULTI_PRODUCT_ACTION_ICONS[action.action_type] ?? '•'
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-800/50 last:border-0">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-200 leading-snug">{action.description}</div>
        {action.reasoning && (
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{action.reasoning}</div>
        )}
        <div className="text-[10px] text-gray-600 mt-0.5">{formatDateTime(action.created_at)}</div>
      </div>
    </div>
  )
}

// ─── Budget bar ───────────────────────────────────────────────────────────────

const BAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
]
const TEXT_COLORS = [
  'text-violet-400', 'text-blue-400', 'text-emerald-400',
  'text-amber-400', 'text-rose-400', 'text-cyan-400',
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function MultiProduto() {
  const [session, setSessionState] = useState<MultiProductSession | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [totalBudget, setTotalBudget] = useState(300)
  const [channel, setChannel] = useState<MultiProductChannel>('meta')
  const [currency, setCurrency] = useState('USD')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<'ranking' | 'analysis'>('ranking')

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickCount = useRef(0)
  const sessionRef = useRef<MultiProductSession | null>(null)

  useEffect(() => {
    setProducts(tosDb.products.getAll())
    const active = tosDb.multiProductSessions.getActive()
    if (active) {
      setSessionState(active)
      sessionRef.current = active
    }
  }, [])

  const setSession = (s: MultiProductSession | null) => {
    setSessionState(s)
    sessionRef.current = s
    if (s) tosDb.multiProductSessions.save(s)
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  const runTick = () => {
    const s = sessionRef.current
    if (!s || s.status !== 'running') return
    tickCount.current += 1
    const n = now()
    const updated: MultiProductSession = JSON.parse(JSON.stringify(s))

    // Update metrics per entry
    updated.entries = updated.entries.map(entry => {
      if (entry.status === 'pausado') return entry

      const h = entry.sim_health / 100
      const newHealth = Math.max(5, Math.min(98, entry.sim_health + (Math.random() - 0.48) * 3))

      const imp = jitter(h * 700 + 150, 0.3)
      const ctrBase = h * 2.8 + 0.3
      const clicks = imp * (ctrBase / 100)
      const convRate = h * 0.065 + 0.004
      const convs = clicks * convRate
      const spend = clicks * jitter(h * 0.9 + 0.25, 0.2)
      const revenue = convs * jitter(entry.daily_budget * 2.8 * h, 0.25)

      const newImp = entry.impressions + Math.round(imp)
      const newClicks = entry.clicks + Math.round(clicks)
      const newConvs = entry.conversions + convs
      const newSpend = entry.spend + spend
      const newRevenue = entry.revenue + revenue
      const newCtr = newImp > 0 ? (newClicks / newImp) * 100 : 0
      const newCpa = newConvs > 0 ? newSpend / newConvs : 0
      const newRoas = newSpend > 0 ? newRevenue / newSpend : 0

      const nextStatus: MultiProductEntry['status'] =
        entry.status === 'iniciando' && newImp > 500 ? 'ativo' : entry.status

      return {
        ...entry,
        impressions: newImp,
        clicks: newClicks,
        conversions: newConvs,
        spend: newSpend,
        revenue: newRevenue,
        ctr: newCtr,
        cpa: newCpa,
        roas: newRoas,
        sim_health: newHealth,
        status: nextStatus,
        updated_at: n,
      }
    })

    // ── Decisions every 4 ticks ────────────────────────────────────────────
    if (tickCount.current % 4 === 0) {
      const newActions: MultiProductAction[] = []

      updated.entries = updated.entries.map(entry => {
        if (entry.status === 'pausado') return entry

        // Declare winner
        if (entry.roas >= 4.0 && entry.conversions >= 5 && entry.status !== 'vencedor') {
          newActions.push({
            id: generateId(),
            session_id: updated.id,
            action_type: 'produto_vencedor',
            description: `${entry.product_name} declarado VENCEDOR`,
            product_id: entry.product_id,
            product_name: entry.product_name,
            reasoning: `ROAS ${entry.roas.toFixed(2)}x · ${Math.round(entry.conversions)} conversões`,
            created_at: n,
          })
          return { ...entry, status: 'vencedor' as const, decision_reason: `ROAS ${entry.roas.toFixed(2)}x`, updated_at: n }
        }

        // Scale
        if (entry.roas >= 2.8 && entry.conversions >= 3 && entry.status === 'ativo') {
          const newBudget = Math.min(entry.daily_budget * 1.3, updated.total_daily_budget * 0.65)
          newActions.push({
            id: generateId(),
            session_id: updated.id,
            action_type: 'produto_escalado',
            description: `${entry.product_name} escalado`,
            product_id: entry.product_id,
            product_name: entry.product_name,
            reasoning: `ROAS ${entry.roas.toFixed(2)}x — budget +30%`,
            before_value: entry.daily_budget,
            after_value: newBudget,
            created_at: n,
          })
          return { ...entry, status: 'escalando' as const, daily_budget: newBudget, sim_health: Math.min(98, entry.sim_health + 5), updated_at: n }
        }

        // Reduce
        if (entry.roas < 1.0 && entry.impressions > 2500 && entry.status !== 'reduzindo') {
          const newBudget = entry.daily_budget * 0.55
          newActions.push({
            id: generateId(),
            session_id: updated.id,
            action_type: 'produto_reduzido',
            description: `${entry.product_name} com budget reduzido`,
            product_id: entry.product_id,
            product_name: entry.product_name,
            reasoning: `ROAS ${entry.roas.toFixed(2)}x abaixo de 1x — redução de 45%`,
            before_value: entry.daily_budget,
            after_value: newBudget,
            created_at: n,
          })
          return { ...entry, status: 'reduzindo' as const, daily_budget: newBudget, updated_at: n }
        }

        // Pause
        if (entry.roas < 0.5 && entry.impressions > 4500) {
          newActions.push({
            id: generateId(),
            session_id: updated.id,
            action_type: 'produto_pausado',
            description: `${entry.product_name} pausado`,
            product_id: entry.product_id,
            product_name: entry.product_name,
            reasoning: `ROAS ${entry.roas.toFixed(2)}x — CPA insustentável`,
            created_at: n,
          })
          return { ...entry, status: 'pausado' as const, daily_budget: 0, updated_at: n }
        }

        return entry
      })

      if (newActions.length > 0) {
        updated.actions = [...newActions, ...updated.actions].slice(0, 60)
      }
    }

    // Re-rank by ROAS
    const sorted = [...updated.entries].sort((a, b) => b.roas - a.roas)
    const totalAlloc = updated.entries.reduce((s, e) => s + e.daily_budget, 0)
    updated.entries = updated.entries.map(e => ({
      ...e,
      rank: sorted.findIndex(x => x.id === e.id) + 1,
      budget_pct: totalAlloc > 0 ? (e.daily_budget / totalAlloc) * 100 : 0,
    }))

    // Totals
    updated.total_spend = updated.entries.reduce((s, e) => s + e.spend, 0)
    updated.total_revenue = updated.entries.reduce((s, e) => s + e.revenue, 0)
    updated.winner_id = updated.entries.find(e => e.status === 'vencedor')?.product_id
    updated.updated_at = n

    setSession(updated)
  }

  // Tick effect
  useEffect(() => {
    if (!session || session.status !== 'running') {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    const ms = session.channel === 'google' ? 7000 : 6000
    tickRef.current = setInterval(runTick, ms)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.channel])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = () => {
    if (selectedIds.length < 2) return
    const selected = products.filter(p => selectedIds.includes(p.id))
    const share = totalBudget / selected.length
    const sessionId = generateId()

    const entries = selected.map(p => makeEntry(p, sessionId, share))
    const totalAlloc = entries.reduce((s, e) => s + e.daily_budget, 0)
    entries.forEach(e => { e.budget_pct = totalAlloc > 0 ? (e.daily_budget / totalAlloc) * 100 : 0 })

    const startAction: MultiProductAction = {
      id: generateId(),
      session_id: sessionId,
      action_type: 'sessao_iniciada',
      description: `Sistema iniciado com ${selected.length} produtos`,
      reasoning: `Budget total: ${formatCurrency(totalBudget, currency)} | Canal: ${MULTI_PRODUCT_CHANNEL_LABELS[channel]}`,
      created_at: now(),
    }

    const newSession: MultiProductSession = {
      id: sessionId,
      status: 'running',
      total_daily_budget: totalBudget,
      currency,
      channel,
      entries,
      actions: [startAction],
      total_spend: 0,
      total_revenue: 0,
      started_at: now(),
      updated_at: now(),
    }

    setSession(newSession)
    tickCount.current = 0
  }

  const handlePause = () => {
    if (!session) return
    const action: MultiProductAction = {
      id: generateId(), session_id: session.id,
      action_type: 'sessao_pausada', description: 'Sistema pausado', created_at: now(),
    }
    setSession({ ...session, status: 'paused', paused_at: now(), updated_at: now(), actions: [action, ...session.actions].slice(0, 60) })
  }

  const handleResume = () => {
    if (!session) return
    const action: MultiProductAction = {
      id: generateId(), session_id: session.id,
      action_type: 'sessao_retomada', description: 'Sistema retomado', created_at: now(),
    }
    setSession({ ...session, status: 'running', updated_at: now(), actions: [action, ...session.actions].slice(0, 60) })
  }

  const handleStop = () => {
    if (!session) return
    const action: MultiProductAction = {
      id: generateId(), session_id: session.id,
      action_type: 'sessao_encerrada', description: 'Sistema encerrado pelo usuário', created_at: now(),
    }
    setSession({ ...session, status: 'concluido', concluded_at: now(), updated_at: now(), actions: [action, ...session.actions].slice(0, 60) })
  }

  const handleNewSession = () => {
    setSessionState(null)
    sessionRef.current = null
    setSelectedIds([])
    setAnalysis(null)
    setActiveTab('ranking')
  }

  const handleAnalyze = async () => {
    if (!session) return
    setIsAnalyzing(true)
    setActiveTab('analysis')

    try {
      const sortedEntries = [...session.entries].sort((a, b) => b.roas - a.roas)
      const sessionData = [
        `SESSÃO MULTI-PRODUTO — ${session.channel.toUpperCase()}`,
        `Canal: ${MULTI_PRODUCT_CHANNEL_LABELS[session.channel]}`,
        `Budget Total Diário: ${formatCurrency(session.total_daily_budget, session.currency)}`,
        `Iniciado em: ${formatDateTime(session.started_at)}`,
        `Total Gasto: ${formatCurrency(session.total_spend, session.currency)}`,
        `Total Receita: ${formatCurrency(session.total_revenue, session.currency)}`,
        '',
        'PRODUTOS EM EXECUÇÃO (ordenados por ROAS):',
        ...sortedEntries.map((e, i) => [
          `${i + 1}. ${e.product_name} (${e.product_niche})`,
          `   Status: ${MULTI_PRODUCT_ENTRY_STATUS_LABELS[e.status] ?? e.status}`,
          `   Budget/dia: ${formatCurrency(e.daily_budget, session.currency)} (${e.budget_pct.toFixed(0)}% do total)`,
          `   ROAS: ${e.roas.toFixed(2)}x | CPA: ${e.cpa > 0 ? formatCurrency(e.cpa, session.currency) : 'N/A'} | CTR: ${e.ctr.toFixed(2)}%`,
          `   Gasto: ${formatCurrency(e.spend, session.currency)} | Receita: ${formatCurrency(e.revenue, session.currency)}`,
          `   Impressões: ${formatNumber(e.impressions)} | Conversões: ${Math.round(e.conversions)}`,
        ].join('\n')),
      ].join('\n')

      const res = await fetch('/api/multi-produto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionData }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json() as PortfolioAnalysis
      setAnalysis(data)

      const action: MultiProductAction = {
        id: generateId(), session_id: session.id,
        action_type: 'ai_analysis',
        description: 'Análise de portfólio gerada pela IA',
        reasoning: `Vencedor previsto: ${data.predicted_winner}`,
        created_at: now(),
      }
      setSession({ ...session, updated_at: now(), actions: [action, ...session.actions].slice(0, 60) })
    } catch (e) {
      console.error('Multi-produto analyze error:', e)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const sortedEntries = session ? [...session.entries].sort((a, b) => b.roas - a.roas) : []
  const totalRoas = session && session.total_spend > 0 ? session.total_revenue / session.total_spend : 0
  const winnerEntry = session?.entries.find(e => e.status === 'vencedor')
  const winnersCount = session?.entries.filter(e => e.status === 'vencedor').length ?? 0
  const activeCount = session?.entries.filter(e => e.status !== 'pausado').length ?? 0

  const isRunning = session?.status === 'running'
  const isPaused = session?.status === 'paused'
  const isConcluded = session?.status === 'concluido'
  const hasSession = !!session && (isRunning || isPaused || isConcluded)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🏆</span>
            <h1 className="text-2xl font-bold text-white">Sistema Multi-Produto</h1>
            {hasSession && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${
                isRunning ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' :
                isPaused  ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' :
                            'bg-gray-800 border-gray-700 text-gray-400'
              }`}>
                {isRunning && <PulsingDot color="bg-emerald-500" />}
                {isRunning ? 'Rodando' : isPaused ? 'Pausado' : 'Encerrado'}
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Rode múltiplos produtos simultaneamente — a IA identifica e escala o vencedor automaticamente
          </p>
        </div>

        {hasSession && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-600/40 text-violet-300 hover:bg-violet-600/30 text-sm font-medium transition-all disabled:opacity-50"
            >
              <span className={isAnalyzing ? 'animate-spin inline-block' : ''}>🧠</span>
              {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
            </button>
            {isRunning && (
              <button onClick={handlePause} className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-all">
                ⏸ Pausar
              </button>
            )}
            {isPaused && (
              <button onClick={handleResume} className="px-4 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50 text-sm font-medium transition-all">
                ▶ Retomar
              </button>
            )}
            {!isConcluded && (
              <button onClick={handleStop} className="px-4 py-2 rounded-lg bg-red-900/20 border border-red-700/40 text-red-400 hover:bg-red-900/30 text-sm font-medium transition-all">
                ⏹ Encerrar
              </button>
            )}
            {isConcluded && (
              <button onClick={handleNewSession} className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 text-sm font-medium transition-all">
                ✨ Nova Sessão
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Config screen (no session) ─────────────────────────────────────── */}
      {!hasSession && (
        <div className="space-y-5">

          {/* Product picker */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Selecionar Produtos</h2>
                <p className="text-xs text-gray-500 mt-0.5">Escolha entre 2 e 6 produtos para comparar simultaneamente</p>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
                selectedIds.length < 2
                  ? 'bg-gray-800 border-gray-700 text-gray-500'
                  : 'bg-violet-900/30 border-violet-700/50 text-violet-300'
              }`}>
                {selectedIds.length} / 6 selecionados
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-14">
                <div className="text-5xl mb-3">📦</div>
                <div className="text-sm text-gray-400">Nenhum produto cadastrado</div>
                <div className="text-xs text-gray-600 mt-1">
                  Crie produtos em <span className="text-violet-400">/produtos</span> para começar
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    selected={selectedIds.includes(p.id)}
                    onToggle={() =>
                      setSelectedIds(prev =>
                        prev.includes(p.id)
                          ? prev.filter(id => id !== p.id)
                          : prev.length < 6 ? [...prev, p.id] : prev
                      )
                    }
                    disabled={selectedIds.length >= 6 && !selectedIds.includes(p.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Config */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Configuração da Sessão</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Budget Total Diário</label>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={e => setTotalBudget(Number(e.target.value))}
                  min={50}
                  step={50}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                />
                {selectedIds.length >= 2 && (
                  <div className="text-xs text-gray-500 mt-1">
                    ≈ {formatCurrency(totalBudget / selectedIds.length, currency)} por produto
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Canal</label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value as MultiProductChannel)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="meta">Meta Ads</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="google">Google Ads</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Moeda</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="USD">USD — Dólar</option>
                  <option value="BRL">BRL — Real</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🚀', title: 'Inicia campanhas', desc: 'Budget dividido igualmente entre os produtos' },
              { icon: '📊', title: 'Monitora métricas', desc: 'ROAS, CPA e CTR atualizados em tempo real' },
              { icon: '🤖', title: 'Toma decisões', desc: 'Escala vencedores, reduz e pausa perdedores' },
              { icon: '🏆', title: 'Declara vencedor', desc: 'ROAS ≥ 4x com 5+ conversões = produto escalado' },
            ].map(item => (
              <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Start button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleStart}
              disabled={selectedIds.length < 2}
              className="flex items-center gap-3 px-10 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30"
            >
              <span className="text-xl">🚀</span>
              {selectedIds.length < 2
                ? `Selecione pelo menos 2 produtos (${selectedIds.length}/2)`
                : `Iniciar Sistema com ${selectedIds.length} Produtos`}
            </button>
          </div>
        </div>
      )}

      {/* ── Active session ─────────────────────────────────────────────────── */}
      {hasSession && session && (
        <div className="space-y-5">

          {/* Winner banner */}
          {winnerEntry && (
            <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/20 border border-yellow-700/50 rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl shrink-0">🏆</span>
              <div>
                <div className="text-yellow-300 font-bold text-base">Vencedor Identificado!</div>
                <div className="text-yellow-200/70 text-sm mt-0.5">
                  <span className="font-semibold">{winnerEntry.product_name}</span>
                  {' — '}ROAS {winnerEntry.roas.toFixed(2)}x &middot; {Math.round(winnerEntry.conversions)} conversões &middot; {formatCurrency(winnerEntry.revenue, session.currency)} receita
                </div>
              </div>
              <div className="ml-auto text-right shrink-0">
                <div className="text-xs text-yellow-400/60">Produto a escalar</div>
                <div className="text-sm text-yellow-300 font-medium mt-0.5">
                  {formatCurrency(winnerEntry.daily_budget, session.currency)}/dia
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Gasto Total" value={formatCurrency(session.total_spend, session.currency)} sub="acumulado" />
            <StatCard label="Receita Total" value={formatCurrency(session.total_revenue, session.currency)} sub="acumulado" />
            <StatCard
              label="ROAS do Portfólio"
              value={totalRoas > 0 ? `${totalRoas.toFixed(2)}x` : '—'}
              sub="geral"
              highlight={totalRoas >= 2.5}
            />
            <StatCard
              label="Ativos / Total"
              value={`${activeCount} / ${session.entries.length}`}
              sub={winnersCount > 0 ? `${winnersCount} vencedor${winnersCount > 1 ? 'es' : ''}` : 'em comparação'}
            />
          </div>

          {/* Budget distribution bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Distribuição de Budget</div>
            <div className="flex h-3 rounded-full overflow-hidden gap-px bg-gray-800">
              {sortedEntries.filter(e => e.budget_pct > 0).map((e, i) => (
                <div
                  key={e.id}
                  style={{ width: `${e.budget_pct}%` }}
                  className={`${BAR_COLORS[i % BAR_COLORS.length]} transition-all duration-1000`}
                  title={`${e.product_name}: ${e.budget_pct.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
              {sortedEntries.map((e, i) => (
                <div key={e.id} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                  <span className={TEXT_COLORS[i % TEXT_COLORS.length]}>{e.product_name}</span>
                  <span className="text-gray-600">{e.budget_pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1 w-fit border border-gray-800">
            {(['ranking', 'analysis'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'ranking' ? '📊 Ranking' : '🧠 Análise IA'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

            {/* Main panel */}
            <div>
              {activeTab === 'ranking' ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Ranking de Produtos</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {isRunning && <PulsingDot color="bg-emerald-500" />}
                      {isRunning ? 'Atualizando...' : 'Pausado'} · {MULTI_PRODUCT_CHANNEL_LABELS[session.channel]}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          {['#', 'Produto', 'Status', 'Budget/dia', 'ROAS', 'CPA', 'CTR', 'Receita', 'Gasto', 'Impressões'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium uppercase tracking-wide whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEntries.map((entry, idx) => (
                          <EntryRow key={entry.id} entry={entry} rank={idx + 1} currency={session.currency} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* AI Analysis tab */
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  {isAnalyzing && (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4 animate-pulse">🧠</div>
                      <div className="text-white font-semibold mb-2">Analisando portfólio...</div>
                      <div className="text-gray-400 text-sm">A IA está avaliando todos os produtos e suas métricas</div>
                    </div>
                  )}

                  {!isAnalyzing && !analysis && (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">🤖</div>
                      <div className="text-white font-semibold mb-2">Análise não gerada ainda</div>
                      <div className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                        Clique em "Analisar com IA" para obter insights estratégicos sobre o desempenho do seu portfólio
                      </div>
                      <button
                        onClick={handleAnalyze}
                        className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all"
                      >
                        🧠 Analisar Agora
                      </button>
                    </div>
                  )}

                  {!isAnalyzing && analysis && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
                        <span className="text-xl">🧠</span>
                        <h3 className="text-base font-bold text-white">Análise de Portfólio</h3>
                        <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">claude AI</span>
                      </div>

                      {/* Predicted winner */}
                      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
                        <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-1">🏆 Vencedor Previsto</div>
                        <div className="text-white font-bold text-lg mb-1">{analysis.predicted_winner}</div>
                        <div className="text-xs text-yellow-200/60">{analysis.estimated_timeline}</div>
                      </div>

                      {/* Situation */}
                      <div>
                        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">📊 Situação Atual</div>
                        <p className="text-sm text-gray-300 leading-relaxed">{analysis.ranking_commentary}</p>
                      </div>

                      {/* Win / Lose */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-emerald-900/10 border border-emerald-700/30 rounded-xl p-4">
                          <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-2">✅ Produtos Fortes</div>
                          <p className="text-sm text-gray-300 leading-relaxed">{analysis.winner_analysis}</p>
                        </div>
                        <div className="bg-red-900/10 border border-red-700/30 rounded-xl p-4">
                          <div className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-2">❌ Produtos Fracos</div>
                          <p className="text-sm text-gray-300 leading-relaxed">{analysis.loser_analysis}</p>
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="bg-violet-900/10 border border-violet-700/30 rounded-xl p-4">
                        <div className="text-xs text-violet-400 font-semibold uppercase tracking-wide mb-2">💰 Redistribuição de Budget</div>
                        <p className="text-sm text-gray-300 leading-relaxed">{analysis.budget_recommendation}</p>
                      </div>

                      {/* Next actions */}
                      {analysis.next_actions.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">⚡ Próximas Ações</div>
                          <div className="space-y-2">
                            {analysis.next_actions.map((a, i) => (
                              <div key={i} className="flex items-start gap-3 bg-gray-800/60 rounded-lg p-3">
                                <span className="text-violet-400 font-bold text-sm shrink-0 mt-0.5">{i + 1}.</span>
                                <div>
                                  <div className="text-sm font-semibold text-white">{a.product_name}</div>
                                  <div className="text-sm text-gray-300">{a.action}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{a.reasoning}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strategy */}
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">🎯 Estratégia Geral</div>
                        <p className="text-sm text-gray-300 leading-relaxed">{analysis.overall_strategy}</p>
                      </div>

                      <button
                        onClick={handleAnalyze}
                        className="w-full py-2.5 rounded-lg border border-violet-600/40 text-violet-400 hover:bg-violet-900/20 text-sm font-medium transition-all"
                      >
                        🔄 Atualizar Análise
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-1">Atividade</h2>
              <p className="text-xs text-gray-600 mb-4">Decisões automáticas em tempo real</p>
              {session.actions.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-8">Nenhuma ação ainda</div>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  {session.actions.map(action => (
                    <ActivityItem key={action.id} action={action} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
