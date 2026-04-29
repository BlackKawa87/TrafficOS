import { useState, useEffect, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  FULL_AUTO_RISK_LABELS,
  FULL_AUTO_RISK_COLORS,
  FULL_AUTO_CAMPAIGN_STATUS_LABELS,
  FULL_AUTO_CAMPAIGN_STATUS_COLORS,
  FULL_AUTO_ACTION_ICONS,
  FULL_AUTO_CHANNEL_ICONS,
} from '../utils/helpers'
import type {
  FullAutoSession,
  FullAutoCampaign,
  FullAutoAction,
  FullAutoRisk,
  FullAutoChannel,
  FullAutoCampaignStatus,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVES = ['Conversão', 'Tráfego', 'Leads', 'TOFU', 'Retargeting']
const CREATIVE_TYPES = ['Vídeo UGC', 'Imagem Estática', 'Carrossel', 'Vídeo Curto', 'Story']
const HOOKS = ['Dor do Problema', 'Prova Social', 'Curiosidade', 'Urgência', 'Autoridade', 'Transformação']

const RISK_CFG: Record<FullAutoRisk, { healthRange: [number, number]; scaleRoas: number; pauseRoas: number; budgetVariance: number }> = {
  conservador: { healthRange: [35, 78], scaleRoas: 3.5, pauseRoas: 0.6, budgetVariance: 0.1 },
  moderado:    { healthRange: [28, 85], scaleRoas: 2.8, pauseRoas: 0.5, budgetVariance: 0.2 },
  agressivo:   { healthRange: [20, 92], scaleRoas: 2.2, pauseRoas: 0.4, budgetVariance: 0.3 },
}

const DEMO_PRODUCTS = [
  { id: 'fa_p1', name: 'Curso de Copy', niche: 'Marketing Digital' },
  { id: 'fa_p2', name: 'Suplemento X', niche: 'Saúde & Bem-estar' },
  { id: 'fa_p3', name: 'eBook Finanças', niche: 'Finanças Pessoais' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jitter(base: number, pct: number): number {
  return Math.max(0, base + base * pct * (Math.random() * 2 - 1))
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function makeCampaign(session: FullAutoSession, products: { id: string; name: string; niche: string }[]): FullAutoCampaign {
  const risk = RISK_CFG[session.config.risk_level]
  const channel = pick(session.config.channels)
  const product = products.length > 0 ? pick(products) : DEMO_PRODUCTS[0]
  const budgetShare = session.config.max_daily_budget / session.config.max_active_campaigns

  return {
    id: generateId(),
    session_id: session.id,
    product_id: product.id,
    product_name: product.name,
    channel,
    objective: pick(OBJECTIVES),
    creative_type: pick(CREATIVE_TYPES),
    hook: pick(HOOKS),
    status: 'criando',
    daily_budget: jitter(budgetShare, risk.budgetVariance),
    spend: 0, revenue: 0, roas: 0, cpa: 0, ctr: 0,
    impressions: 0, clicks: 0, conversions: 0,
    sim_health: risk.healthRange[0] + Math.random() * (risk.healthRange[1] - risk.healthRange[0]),
    phase_tick: 0,
    created_at: now(),
    updated_at: now(),
  }
}

function calcHealthScore(session: FullAutoSession): number {
  const campaigns = session.campaigns
  const active = campaigns.filter(c => c.status !== 'pausada' && c.status !== 'encerrada')
  if (active.length === 0 && campaigns.length === 0) return 50

  const avgRoas = active.length > 0
    ? active.reduce((s, c) => s + c.roas, 0) / active.length
    : 0

  const winRate = campaigns.length > 0
    ? campaigns.filter(c => c.roas >= 2.5).length / campaigns.length
    : 0

  const roasScore = Math.min(40, avgRoas * 11)
  const winScore = winRate * 30
  const profitScore = session.metrics.profit_loss >= 0 ? 20 : Math.max(0, 20 + session.metrics.profit_loss / (session.config.max_daily_budget * 0.5) * 10)
  const activityScore = Math.min(10, active.length * 2)

  return Math.round(Math.max(0, Math.min(100, roasScore + winScore + profitScore + activityScore)))
}

// ─── AI Strategy type ─────────────────────────────────────────────────────────

interface AIStrategy {
  assessment: string
  next_action: string
  target_campaign: string
  reasoning: string
  risk_alert: string | null
  budget_directive: string
  focus_product: string
  focus_channel: string
  insights: string[]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex items-center">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className={`absolute inset-0 rounded-full ${color} animate-ping opacity-60`} />
    </span>
  )
}

function HealthRing({ score }: { score: number }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const trackColor = score >= 70 ? '#065f46' : score >= 40 ? '#78350f' : '#7f1d1d'

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke={trackColor} strokeWidth="9" opacity="0.4" />
      <circle
        cx="55" cy="55" r={r}
        fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="55" y="52" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold">{score}</text>
      <text x="55" y="67" textAnchor="middle" fill="#6b7280" fontSize="9" letterSpacing="1">SAÚDE</text>
    </svg>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function CampaignCard({ campaign, currency }: { campaign: FullAutoCampaign; currency: string }) {
  const statusClass = FULL_AUTO_CAMPAIGN_STATUS_COLORS[campaign.status] ?? 'bg-gray-800 text-gray-400'
  const statusLabel = FULL_AUTO_CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status
  const channelIcon = FULL_AUTO_CHANNEL_ICONS[campaign.channel] ?? '📡'
  const isActive = !['pausada', 'encerrada'].includes(campaign.status)
  const isGenerating = campaign.status === 'criando' || campaign.status === 'publicando'

  const roasColor = campaign.roas >= 3 ? 'text-emerald-400' : campaign.roas >= 1.5 ? 'text-amber-400' : campaign.roas > 0 ? 'text-red-400' : 'text-gray-500'

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 transition-all ${
      campaign.status === 'escalando' ? 'border-green-700/50 bg-green-900/5' :
      campaign.status === 'pausada' ? 'border-gray-800 opacity-50' :
      'border-gray-800 hover:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">{channelIcon}</span>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{campaign.channel}</div>
          </div>
          <div className="text-sm font-semibold text-white truncate">{campaign.product_name}</div>
          <div className="text-xs text-gray-500 truncate">{campaign.creative_type} · {campaign.hook}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass}`}>
          {isGenerating && <span className="animate-pulse">⟳ </span>}
          {statusLabel}
        </span>
      </div>

      {/* Metrics */}
      {isActive && campaign.impressions > 0 ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className={`text-sm font-bold ${roasColor}`}>{campaign.roas.toFixed(2)}x</div>
            <div className="text-[10px] text-gray-600">ROAS</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-200">{campaign.ctr.toFixed(1)}%</div>
            <div className="text-[10px] text-gray-600">CTR</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-200">{formatCurrency(campaign.spend, currency)}</div>
            <div className="text-[10px] text-gray-600">Gasto</div>
          </div>
        </div>
      ) : (
        <div className="h-10 flex items-center justify-center mb-3">
          {isGenerating ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="animate-spin inline-block">⟳</span>
              {campaign.status === 'criando' ? 'Gerando campanha...' : 'Publicando anúncio...'}
            </div>
          ) : (
            <div className="text-xs text-gray-600">Coletando dados...</div>
          )}
        </div>
      )}

      {/* Budget bar */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
          <span>{formatCurrency(campaign.revenue, currency)} receita</span>
          <span>{formatCurrency(campaign.daily_budget, currency)}/dia</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              campaign.roas >= 3 ? 'bg-emerald-500' : campaign.roas >= 1.5 ? 'bg-amber-500' : campaign.roas > 0 ? 'bg-red-500' : 'bg-gray-700'
            }`}
            style={{ width: `${Math.min(100, campaign.roas > 0 ? campaign.roas * 25 : 10)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function ActionItem({ action }: { action: FullAutoAction }) {
  const icon = FULL_AUTO_ACTION_ICONS[action.action_type] ?? '•'
  const isAlert = action.action_type === 'alerta_prejuizo' || action.action_type === 'emergencia_ativada'

  return (
    <div className={`flex items-start gap-2.5 py-2.5 border-b border-gray-800/50 last:border-0 ${isAlert ? 'bg-red-900/10 -mx-3 px-3 rounded' : ''}`}>
      <span className="text-sm shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium leading-snug ${isAlert ? 'text-red-300' : 'text-gray-200'}`}>{action.title}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-snug">{action.description}</div>
        {action.reasoning && <div className="text-xs text-gray-600 mt-0.5 italic">{action.reasoning}</div>}
        <div className="text-[10px] text-gray-700 mt-0.5">{formatDateTime(action.created_at)}</div>
      </div>
    </div>
  )
}

function RiskButton({ value, current, onSelect }: { value: FullAutoRisk; current: FullAutoRisk; onSelect: (v: FullAutoRisk) => void }) {
  const isActive = value === current
  const baseClass = FULL_AUTO_RISK_COLORS[value] ?? ''
  const icons: Record<FullAutoRisk, string> = { conservador: '🛡', moderado: '⚖️', agressivo: '🔥' }
  const descs: Record<FullAutoRisk, string> = {
    conservador: 'Escala lenta, menos risco',
    moderado: 'Equilíbrio ideal',
    agressivo: 'Escala rápida, mais risco',
  }

  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex-1 p-3 rounded-xl border text-left transition-all ${isActive ? baseClass : 'border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-700'}`}
    >
      <div className="text-base mb-1">{icons[value]}</div>
      <div className="text-xs font-semibold">{FULL_AUTO_RISK_LABELS[value]}</div>
      <div className="text-[10px] mt-0.5 opacity-70">{descs[value]}</div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FullAuto() {
  const [session, setSessionState] = useState<FullAutoSession | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string; niche: string }[]>([])

  // Config state
  const [maxBudget, setMaxBudget] = useState(500)
  const [risk, setRisk] = useState<FullAutoRisk>('moderado')
  const [cpaTarget, setCpaTarget] = useState(25)
  const [roasTarget, setRoasTarget] = useState(2.5)
  const [maxCampaigns, setMaxCampaigns] = useState(6)
  const [currency, setCurrency] = useState('USD')
  const [channels, setChannels] = useState<FullAutoChannel[]>(['meta', 'tiktok'])

  // UI state
  const [activeTab, setActiveTab] = useState<'campanhas' | 'acoes' | 'insights'>('campanhas')
  const [isStrategyLoading, setIsStrategyLoading] = useState(false)
  const [aiStrategy, setAiStrategy] = useState<AIStrategy | null>(null)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickCount = useRef(0)
  const sessionRef = useRef<FullAutoSession | null>(null)

  useEffect(() => {
    const prods = tosDb.products.getAll().map(p => ({ id: p.id, name: p.name, niche: p.niche }))
    setProducts(prods.length > 0 ? prods : DEMO_PRODUCTS)

    const active = tosDb.fullAutoSessions.getActive()
    if (active) {
      setSessionState(active)
      sessionRef.current = active
    }
  }, [])

  const setSession = (s: FullAutoSession | null) => {
    setSessionState(s)
    sessionRef.current = s
    if (s) tosDb.fullAutoSessions.save(s)
  }

  // ── Toggle channel ────────────────────────────────────────────────────────
  const toggleChannel = (ch: FullAutoChannel) => {
    setChannels(prev =>
      prev.includes(ch)
        ? prev.length > 1 ? prev.filter(c => c !== ch) : prev
        : [...prev, ch]
    )
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  const runTick = () => {
    const s = sessionRef.current
    if (!s || s.status !== 'running') return
    tickCount.current += 1
    const n = now()
    const updated: FullAutoSession = JSON.parse(JSON.stringify(s))
    const risk = RISK_CFG[updated.config.risk_level]

    // ── Phase transitions ─────────────────────────────────────────────────
    updated.campaigns = updated.campaigns.map(c => {
      if (c.status === 'pausada' || c.status === 'encerrada') return c

      const newPhase = c.phase_tick + 1
      let nextStatus: FullAutoCampaignStatus = c.status

      // criando → publicando after 1 tick
      if (c.status === 'criando' && newPhase >= 1) nextStatus = 'publicando'
      // publicando → ativa after 2 ticks total
      if (c.status === 'publicando' && newPhase >= 2) nextStatus = 'ativa'

      return { ...c, status: nextStatus, phase_tick: newPhase, updated_at: n }
    })

    // ── Update metrics for active campaigns ───────────────────────────────
    updated.campaigns = updated.campaigns.map(c => {
      if (c.status !== 'ativa' && c.status !== 'otimizando' && c.status !== 'escalando') return c

      const h = c.sim_health / 100
      const newHealth = Math.max(5, Math.min(98, c.sim_health + (Math.random() - 0.48) * 4))
      const scaleBoost = c.status === 'escalando' ? 1.4 : 1

      const imp = jitter((h * 600 + 100) * scaleBoost, 0.3)
      const ctrBase = h * 2.6 + 0.3
      const clicks = imp * (ctrBase / 100)
      const convRate = h * 0.06 + 0.004
      const convs = clicks * convRate
      const spend = clicks * jitter(h * 0.85 + 0.2, 0.2)
      const revenue = convs * jitter(c.daily_budget * 3 * h * scaleBoost, 0.25)

      const newImp = c.impressions + Math.round(imp)
      const newClicks = c.clicks + Math.round(clicks)
      const newConvs = c.conversions + convs
      const newSpend = c.spend + spend
      const newRevenue = c.revenue + revenue
      const newCtr = newImp > 0 ? (newClicks / newImp) * 100 : 0
      const newCpa = newConvs > 0 ? newSpend / newConvs : 0
      const newRoas = newSpend > 0 ? newRevenue / newSpend : 0

      return {
        ...c,
        impressions: newImp, clicks: newClicks, conversions: newConvs,
        spend: newSpend, revenue: newRevenue,
        ctr: newCtr, cpa: newCpa, roas: newRoas,
        sim_health: newHealth,
        updated_at: n,
      }
    })

    // ── Decisions every 4 ticks ───────────────────────────────────────────
    if (tickCount.current % 4 === 0) {
      const newActions: FullAutoAction[] = []

      updated.campaigns = updated.campaigns.map(c => {
        if (c.status !== 'ativa' && c.status !== 'otimizando') return c

        // Declare winner / scale
        if (c.roas >= risk.scaleRoas && c.conversions >= 4) {
          newActions.push({
            id: generateId(), session_id: updated.id,
            action_type: 'campanha_escalada',
            title: `${c.product_name} · ${c.channel} escalada`,
            description: `ROAS ${c.roas.toFixed(2)}x — budget aumentado em 35%`,
            campaign_id: c.id,
            reasoning: `${Math.round(c.conversions)} conversões confirmadas`,
            created_at: n,
          })
          updated.metrics.campaigns_scaled += 1
          return { ...c, status: 'escalando' as const, daily_budget: c.daily_budget * 1.35, updated_at: n }
        }

        // Create variation if strong CTR
        if (c.roas >= 1.8 && c.ctr >= 1.5 && c.status === 'ativa' && Math.random() < 0.3) {
          newActions.push({
            id: generateId(), session_id: updated.id,
            action_type: 'variacao_criada',
            title: `Variação criada de "${c.product_name} · ${c.channel}"`,
            description: `Testando novo hook: ${pick(HOOKS)}`,
            campaign_id: c.id,
            reasoning: `CTR ${c.ctr.toFixed(2)}% — potencial de variação confirmado`,
            created_at: n,
          })
          return { ...c, status: 'otimizando' as const, updated_at: n }
        }

        // Pause weak
        if (c.roas < risk.pauseRoas && c.impressions > 3500) {
          newActions.push({
            id: generateId(), session_id: updated.id,
            action_type: 'campanha_pausada',
            title: `Campanha pausada: ${c.product_name} · ${c.channel}`,
            description: `ROAS ${c.roas.toFixed(2)}x após ${formatNumber(c.impressions)} impressões`,
            campaign_id: c.id,
            reasoning: 'Desempenho abaixo do mínimo — budget realocado',
            created_at: n,
          })
          updated.metrics.campaigns_paused += 1
          return { ...c, status: 'pausada' as const, daily_budget: 0, updated_at: n }
        }

        return c
      })

      // Auto-create new campaign if slots available
      const activeCampaigns = updated.campaigns.filter(c => !['pausada', 'encerrada'].includes(c.status))
      const totalBudgetUsed = activeCampaigns.reduce((s, c) => s + c.daily_budget, 0)
      const budgetAvailable = updated.config.max_daily_budget - totalBudgetUsed

      if (
        activeCampaigns.length < updated.config.max_active_campaigns &&
        budgetAvailable > updated.config.max_daily_budget * 0.15
      ) {
        const newCamp = makeCampaign(updated, products.length > 0 ? products : DEMO_PRODUCTS)
        updated.campaigns.push(newCamp)
        updated.metrics.campaigns_created += 1
        newActions.push({
          id: generateId(), session_id: updated.id,
          action_type: 'campanha_criada',
          title: `Nova campanha: ${newCamp.product_name} · ${newCamp.channel}`,
          description: `${newCamp.creative_type} · ${newCamp.objective} · Hook: ${newCamp.hook}`,
          campaign_id: newCamp.id,
          reasoning: `${activeCampaigns.length}/${updated.config.max_active_campaigns} slots usados`,
          created_at: n,
        })
      }

      if (newActions.length > 0) {
        updated.actions = [...newActions, ...updated.actions].slice(0, 80)
      }
    }

    // ── Update metrics ─────────────────────────────────────────────────────
    const totalSpend = updated.campaigns.reduce((s, c) => s + c.spend, 0)
    const totalRevenue = updated.campaigns.reduce((s, c) => s + c.revenue, 0)
    updated.metrics.total_spend = totalSpend
    updated.metrics.total_revenue = totalRevenue
    updated.metrics.profit_loss = totalRevenue - totalSpend
    updated.metrics.winners_count = updated.campaigns.filter(c => c.roas >= 3).length

    // ── Health score ───────────────────────────────────────────────────────
    updated.health_score = calcHealthScore(updated)

    // ── Emergency stop check ───────────────────────────────────────────────
    const lossThreshold = -(updated.config.max_daily_budget * 0.4)
    if (updated.metrics.profit_loss < lossThreshold && totalSpend > updated.config.max_daily_budget * 0.3) {
      updated.status = 'emergency_stop'
      updated.campaigns = updated.campaigns.map(c =>
        ['ativa', 'escalando', 'otimizando'].includes(c.status)
          ? { ...c, status: 'pausada' as const, updated_at: n }
          : c
      )
      const emergencyAction: FullAutoAction = {
        id: generateId(), session_id: updated.id,
        action_type: 'emergencia_ativada',
        title: '🚨 PAUSA DE EMERGÊNCIA ATIVADA',
        description: `Prejuízo de ${formatCurrency(Math.abs(updated.metrics.profit_loss), updated.config.currency)} detectado — todas as campanhas pausadas`,
        reasoning: 'Limite de segurança atingido. Revise a estratégia antes de reativar.',
        created_at: n,
      }
      updated.actions = [emergencyAction, ...updated.actions].slice(0, 80)
    }

    updated.updated_at = n
    setSession(updated)
  }

  // Tick effect
  useEffect(() => {
    if (!session || session.status !== 'running') {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    tickRef.current = setInterval(runTick, 5000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleActivate = () => {
    if (channels.length === 0) return
    const sessionId = generateId()
    const prods = products.length > 0 ? products : DEMO_PRODUCTS

    // Start with 2 initial campaigns
    const initialCampaigns: FullAutoCampaign[] = []
    const draftSession: FullAutoSession = {
      id: sessionId,
      config: { max_daily_budget: maxBudget, risk_level: risk, cpa_target: cpaTarget, roas_target: roasTarget, max_active_campaigns: maxCampaigns, channels, currency },
      status: 'running',
      campaigns: [],
      actions: [],
      metrics: { total_spend: 0, total_revenue: 0, profit_loss: 0, campaigns_created: 0, campaigns_paused: 0, campaigns_scaled: 0, winners_count: 0 },
      health_score: 50,
      started_at: now(),
      updated_at: now(),
    }

    for (let i = 0; i < Math.min(2, maxCampaigns); i++) {
      initialCampaigns.push(makeCampaign(draftSession, prods))
    }
    draftSession.campaigns = initialCampaigns
    draftSession.metrics.campaigns_created = initialCampaigns.length

    const startAction: FullAutoAction = {
      id: generateId(), session_id: sessionId,
      action_type: 'sistema_ativado',
      title: 'Full Auto Mode ativado',
      description: `Budget: ${formatCurrency(maxBudget, currency)}/dia · Risco: ${FULL_AUTO_RISK_LABELS[risk]} · ${channels.length} canal(is) · Máx ${maxCampaigns} campanhas`,
      reasoning: `${initialCampaigns.length} campanhas iniciais criadas automaticamente`,
      created_at: now(),
    }
    draftSession.actions = [startAction]

    setSession(draftSession)
    tickCount.current = 0
    setActiveTab('campanhas')
  }

  const handlePause = () => {
    if (!session) return
    const action: FullAutoAction = {
      id: generateId(), session_id: session.id,
      action_type: 'sistema_pausado', title: 'Sistema pausado pelo usuário',
      description: 'Todas as campanhas mantêm status atual', created_at: now(),
    }
    setSession({ ...session, status: 'paused', paused_at: now(), updated_at: now(), actions: [action, ...session.actions].slice(0, 80) })
  }

  const handleResume = () => {
    if (!session) return
    const action: FullAutoAction = {
      id: generateId(), session_id: session.id,
      action_type: 'sistema_retomado', title: 'Sistema retomado',
      description: 'Modo autônomo reativado', created_at: now(),
    }
    setSession({ ...session, status: 'running', updated_at: now(), actions: [action, ...session.actions].slice(0, 80) })
  }

  const handleStop = () => {
    if (!session) return
    const action: FullAutoAction = {
      id: generateId(), session_id: session.id,
      action_type: 'sistema_parado', title: 'Sistema encerrado',
      description: 'Full Auto Mode desligado pelo usuário', created_at: now(),
    }
    setSession({ ...session, status: 'concluido' as const, updated_at: now(), actions: [action, ...session.actions].slice(0, 80) })
  }

  const handleNewSession = () => {
    setSessionState(null)
    sessionRef.current = null
    setAiStrategy(null)
    setActiveTab('campanhas')
  }

  const handleAiStrategy = async () => {
    if (!session) return
    setIsStrategyLoading(true)
    setActiveTab('insights')

    try {
      const activeCampaigns = session.campaigns.filter(c => !['pausada', 'encerrada'].includes(c.status))
      const summary = [
        `FULL AUTO MODE — Estado Atual`,
        `Status: ${session.status} | Risco: ${FULL_AUTO_RISK_LABELS[session.config.risk_level]}`,
        `Budget Máx: ${formatCurrency(session.config.max_daily_budget, session.config.currency)}/dia`,
        `CPA Alvo: ${formatCurrency(session.config.cpa_target, session.config.currency)} | ROAS Alvo: ${session.config.roas_target}x`,
        `Health Score: ${session.health_score}/100`,
        ``,
        `MÉTRICAS GLOBAIS:`,
        `Gasto Total: ${formatCurrency(session.metrics.total_spend, session.config.currency)}`,
        `Receita Total: ${formatCurrency(session.metrics.total_revenue, session.config.currency)}`,
        `P&L: ${formatCurrency(session.metrics.profit_loss, session.config.currency)}`,
        `Campanhas criadas: ${session.metrics.campaigns_created} | Pausadas: ${session.metrics.campaigns_paused} | Escaladas: ${session.metrics.campaigns_scaled}`,
        ``,
        `CAMPANHAS ATIVAS (${activeCampaigns.length}):`,
        ...activeCampaigns.sort((a, b) => b.roas - a.roas).map((c, i) =>
          `${i + 1}. ${c.product_name} · ${c.channel} — ROAS: ${c.roas.toFixed(2)}x | CPA: ${c.cpa > 0 ? formatCurrency(c.cpa, session.config.currency) : 'N/A'} | CTR: ${c.ctr.toFixed(2)}% | Gasto: ${formatCurrency(c.spend, session.config.currency)} | Status: ${FULL_AUTO_CAMPAIGN_STATUS_LABELS[c.status]}`
        ),
      ].join('\n')

      const res = await fetch('/api/full-auto-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionSummary: summary }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json() as AIStrategy
      setAiStrategy(data)

      const action: FullAutoAction = {
        id: generateId(), session_id: session.id,
        action_type: 'ai_strategy',
        title: 'Estratégia gerada pela IA',
        description: data.assessment,
        reasoning: `Próxima ação: ${data.next_action}`,
        created_at: now(),
      }
      setSession({ ...session, ai_last_insight: data.assessment, updated_at: now(), actions: [action, ...session.actions].slice(0, 80) })
    } catch (e) {
      console.error('Full auto strategy error:', e)
    } finally {
      setIsStrategyLoading(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const isRunning = session?.status === 'running'
  const isPaused = session?.status === 'paused'
  const isEmergency = session?.status === 'emergency_stop'
  const isConcluded = (session?.status as string) === 'concluido'
  const hasSession = !!session && !isConcluded

  const activeCampaigns = session?.campaigns.filter(c => !['pausada', 'encerrada'].includes(c.status)) ?? []
  const pausedCampaigns = session?.campaigns.filter(c => c.status === 'pausada') ?? []
  const totalRoas = session && session.metrics.total_spend > 0
    ? session.metrics.total_revenue / session.metrics.total_spend : 0
  const isProfitable = (session?.metrics.profit_loss ?? 0) >= 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🤖</span>
            <h1 className="text-2xl font-bold text-white">Full Auto Mode</h1>
            {hasSession && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${
                isEmergency ? 'bg-red-900/40 border-red-700/60 text-red-300' :
                isRunning   ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' :
                isPaused    ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' :
                              'bg-gray-800 border-gray-700 text-gray-400'
              }`}>
                {isRunning && <PulsingDot color="bg-emerald-500" />}
                {isEmergency && <span>🚨</span>}
                {isEmergency ? 'EMERGÊNCIA' : isRunning ? 'Operando' : isPaused ? 'Pausado' : 'Encerrado'}
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Gestor de tráfego 100% autônomo — cria, testa, otimiza e escala sem intervenção humana
          </p>
        </div>

        {hasSession && (
          <div className="flex items-center gap-2 shrink-0">
            {(isRunning || isPaused || isEmergency) && (
              <button
                onClick={handleAiStrategy}
                disabled={isStrategyLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-600/40 text-violet-300 hover:bg-violet-600/30 text-sm font-medium transition-all disabled:opacity-50"
              >
                <span className={isStrategyLoading ? 'animate-spin inline-block' : ''}>🧠</span>
                {isStrategyLoading ? 'Analisando...' : 'Estratégia IA'}
              </button>
            )}
            {isRunning && (
              <button onClick={handlePause} className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-all">
                ⏸ Pausar
              </button>
            )}
            {(isPaused || isEmergency) && (
              <button onClick={handleResume} className="px-4 py-2 rounded-lg bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50 text-sm font-medium transition-all">
                ▶ {isEmergency ? 'Reativar' : 'Retomar'}
              </button>
            )}
            {!isConcluded && (
              <button onClick={handleStop} className="px-4 py-2 rounded-lg bg-red-900/20 border border-red-700/40 text-red-400 hover:bg-red-900/30 text-sm font-medium transition-all">
                ⏹ Desligar
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

      {/* ── Emergency alert ────────────────────────────────────────────────── */}
      {isEmergency && (
        <div className="bg-red-900/30 border border-red-700/60 rounded-xl p-4 mb-5 flex items-center gap-4">
          <span className="text-3xl shrink-0">🚨</span>
          <div className="flex-1">
            <div className="text-red-300 font-bold text-base">Pausa de Emergência Automática</div>
            <div className="text-red-200/70 text-sm mt-0.5">
              O sistema detectou prejuízo acima do limite de segurança e pausou todas as campanhas automaticamente.
              Revise a estratégia e o nível de risco antes de reativar.
            </div>
          </div>
          <button onClick={handleResume} className="shrink-0 px-4 py-2 rounded-lg bg-red-600/30 border border-red-600/50 text-red-300 hover:bg-red-600/50 text-sm font-semibold transition-all">
            Reativar com cuidado
          </button>
        </div>
      )}

      {/* ── Config screen ──────────────────────────────────────────────────── */}
      {!hasSession && (
        <div className="space-y-5">

          {/* Hero */}
          <div className="bg-gradient-to-br from-violet-900/30 to-gray-900 border border-violet-700/30 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-2">Piloto Automático Total</h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">
              Configure os limites e o sistema opera 100% sozinho — escolhe produtos, cria campanhas, testa criativos, otimiza e escala vencedores automaticamente.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-left">
              {[
                { icon: '✨', text: 'Cria campanhas automaticamente' },
                { icon: '🧪', text: 'Testa variações de criativos' },
                { icon: '📈', text: 'Escala vencedores sem parar' },
                { icon: '⏸', text: 'Pausa perdedores em tempo real' },
                { icon: '🛡', text: 'Para em prejuízo contínuo' },
                { icon: '🧠', text: 'IA decide baseado em dados' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{item.icon}</span><span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Config */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Configuração do Sistema</h2>

            {/* Risk level */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Nível de Risco</label>
              <div className="flex gap-2">
                {(['conservador', 'moderado', 'agressivo'] as FullAutoRisk[]).map(r => (
                  <RiskButton key={r} value={r} current={risk} onSelect={setRisk} />
                ))}
              </div>
            </div>

            {/* Budget + CPA + ROAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Budget Máximo Diário</label>
                <input type="number" value={maxBudget} onChange={e => setMaxBudget(Number(e.target.value))} min={100} step={50}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">CPA Alvo</label>
                <input type="number" value={cpaTarget} onChange={e => setCpaTarget(Number(e.target.value))} min={5} step={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">ROAS Alvo</label>
                <input type="number" value={roasTarget} onChange={e => setRoasTarget(Number(e.target.value))} min={1} step={0.5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
            </div>

            {/* Channels + Max campaigns + Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Canais</label>
                <div className="flex gap-2">
                  {(['meta', 'tiktok', 'google'] as FullAutoChannel[]).map(ch => (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        channels.includes(ch)
                          ? 'bg-violet-900/30 border-violet-600/50 text-violet-300'
                          : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {FULL_AUTO_CHANNEL_ICONS[ch]} {ch === 'meta' ? 'Meta' : ch === 'tiktok' ? 'TikTok' : 'Google'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Máx. Campanhas Simultâneas</label>
                <select value={maxCampaigns} onChange={e => setMaxCampaigns(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
                  {[3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} campanhas</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Moeda</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
                  <option value="USD">USD — Dólar</option>
                  <option value="BRL">BRL — Real</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-800/50 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
              <span className="text-gray-300 font-medium">Resumo: </span>
              O sistema operará com budget máximo de <span className="text-white">{formatCurrency(maxBudget, currency)}/dia</span>,
              criando até <span className="text-white">{maxCampaigns} campanhas</span> simultâneas em{' '}
              <span className="text-white">{channels.map(c => FULL_AUTO_CHANNEL_ICONS[c]).join(' ')}</span>,
              escalonando quando ROAS ≥ <span className="text-white">{RISK_CFG[risk].scaleRoas}x</span> e
              pausando quando ROAS &lt; <span className="text-white">{RISK_CFG[risk].pauseRoas}x</span>.
              Pausa de emergência se prejuízo superar <span className="text-red-400">{formatCurrency(maxBudget * 0.4, currency)}</span>.
            </div>
          </div>

          {/* Activate button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleActivate}
              className="flex items-center gap-3 px-12 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-lg transition-all shadow-xl shadow-violet-900/40 border border-violet-400/20"
            >
              <span className="text-2xl">🤖</span>
              Ativar Modo Total
            </button>
          </div>
        </div>
      )}

      {/* ── Active dashboard ───────────────────────────────────────────────── */}
      {hasSession && session && (
        <div className="space-y-5">

          {/* Health + P&L row */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">

            {/* Health ring + key numbers */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-5">
              <HealthRing score={session.health_score} />
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">P&L</div>
                  <div className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isProfitable ? '+' : ''}{formatCurrency(session.metrics.profit_loss, session.config.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">ROAS Geral</div>
                  <div className={`text-lg font-bold ${totalRoas >= 2.5 ? 'text-emerald-400' : totalRoas >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                    {totalRoas > 0 ? `${totalRoas.toFixed(2)}x` : '—'}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {isRunning && <span className="flex items-center gap-1"><PulsingDot color="bg-emerald-500" /> Autônomo</span>}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Gasto Total"
                value={formatCurrency(session.metrics.total_spend, session.config.currency)}
                sub="acumulado"
              />
              <StatCard
                label="Receita Total"
                value={formatCurrency(session.metrics.total_revenue, session.config.currency)}
                sub="acumulado"
              />
              <StatCard
                label="Campanhas"
                value={`${activeCampaigns.length} ativas`}
                sub={`${pausedCampaigns.length} pausadas · ${session.metrics.campaigns_created} criadas`}
              />
              <StatCard
                label="Escaladas / Vencedoras"
                value={`${session.metrics.campaigns_scaled}`}
                sub={`${session.metrics.winners_count} com ROAS ≥ 3x`}
                color={session.metrics.campaigns_scaled > 0 ? 'text-emerald-400' : 'text-white'}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1 w-fit border border-gray-800">
            {([
              { key: 'campanhas', label: '📡 Campanhas' },
              { key: 'acoes', label: '⚡ Decisões' },
              { key: 'insights', label: '🧠 Insights IA' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

            {/* Main panel */}
            <div>
              {/* Campaigns tab */}
              {activeTab === 'campanhas' && (
                <div>
                  {session.campaigns.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                      <div className="text-4xl mb-3 animate-pulse">🤖</div>
                      <div className="text-white font-medium mb-1">Inicializando sistema...</div>
                      <div className="text-gray-500 text-sm">As primeiras campanhas estão sendo criadas</div>
                    </div>
                  ) : (
                    <div>
                      {/* Active */}
                      {activeCampaigns.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            {isRunning && <PulsingDot color="bg-emerald-500" />}
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              {activeCampaigns.length} Campanha{activeCampaigns.length !== 1 ? 's' : ''} Ativa{activeCampaigns.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {activeCampaigns.sort((a, b) => b.roas - a.roas).map(c => (
                              <CampaignCard key={c.id} campaign={c} currency={session.config.currency} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Paused */}
                      {pausedCampaigns.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide mb-3">
                            {pausedCampaigns.length} Pausada{pausedCampaigns.length !== 1 ? 's' : ''}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pausedCampaigns.map(c => (
                              <CampaignCard key={c.id} campaign={c} currency={session.config.currency} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions tab */}
              {activeTab === 'acoes' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Decisões Automáticas</h2>
                    <span className="text-xs text-gray-500">{session.actions.length} ações registradas</span>
                  </div>
                  {session.actions.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">Nenhuma ação ainda</div>
                  ) : (
                    <div className="max-h-[560px] overflow-y-auto space-y-0">
                      {session.actions.map(action => <ActionItem key={action.id} action={action} />)}
                    </div>
                  )}
                </div>
              )}

              {/* AI Insights tab */}
              {activeTab === 'insights' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  {isStrategyLoading ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4 animate-pulse">🧠</div>
                      <div className="text-white font-semibold mb-2">IA analisando o sistema...</div>
                      <div className="text-gray-400 text-sm">Avaliando campanhas, métricas e padrões históricos</div>
                    </div>
                  ) : !aiStrategy ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">🤖</div>
                      <div className="text-white font-semibold mb-2">Nenhum insight gerado ainda</div>
                      <div className="text-gray-400 text-sm mb-6">
                        Solicite uma análise estratégica completa do sistema
                      </div>
                      <button onClick={handleAiStrategy}
                        className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all">
                        🧠 Gerar Estratégia
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
                        <span className="text-xl">🧠</span>
                        <h3 className="text-base font-bold text-white">Estratégia do Sistema</h3>
                        <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">claude AI</span>
                      </div>

                      {/* Assessment */}
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">📊 Avaliação Atual</div>
                        <p className="text-sm text-gray-200 leading-relaxed">{aiStrategy.assessment}</p>
                      </div>

                      {/* Next action */}
                      <div className="bg-violet-900/20 border border-violet-700/40 rounded-xl p-4">
                        <div className="text-xs text-violet-400 font-semibold uppercase tracking-wide mb-2">⚡ Próxima Ação Recomendada</div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {aiStrategy.next_action === 'escalar_vencedor' ? '📈' :
                             aiStrategy.next_action === 'criar_variacao' ? '🔄' :
                             aiStrategy.next_action === 'nova_campanha' ? '✨' :
                             aiStrategy.next_action === 'pausar_fraca' ? '⏸' :
                             aiStrategy.next_action === 'otimizar_budget' ? '💰' : '⏳'}
                          </span>
                          <div>
                            <div className="text-white font-bold text-sm capitalize">{aiStrategy.next_action.replace(/_/g, ' ')}</div>
                            {aiStrategy.target_campaign && (
                              <div className="text-xs text-violet-300 mt-0.5">Alvo: {aiStrategy.target_campaign}</div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mt-3">{aiStrategy.reasoning}</p>
                      </div>

                      {/* Risk alert */}
                      {aiStrategy.risk_alert && (
                        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
                          <div className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-1">⚠️ Alerta de Risco</div>
                          <p className="text-sm text-red-200 leading-relaxed">{aiStrategy.risk_alert}</p>
                        </div>
                      )}

                      {/* Focus directives */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Budget</div>
                          <div className="text-sm font-medium text-white capitalize">
                            {aiStrategy.budget_directive === 'aumentar' ? '📈 Aumentar' :
                             aiStrategy.budget_directive === 'reduzir' ? '📉 Reduzir' : '⏸ Manter'}
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Produto Foco</div>
                          <div className="text-sm font-medium text-white truncate">{aiStrategy.focus_product}</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">Canal Foco</div>
                          <div className="text-sm font-medium text-white">{aiStrategy.focus_channel}</div>
                        </div>
                      </div>

                      {/* Insights */}
                      {aiStrategy.insights.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">💡 Insights Estratégicos</div>
                          <div className="space-y-2">
                            {aiStrategy.insights.map((insight, i) => (
                              <div key={i} className="flex items-start gap-2.5 bg-gray-800/40 rounded-lg p-3">
                                <span className="text-violet-400 text-xs font-bold shrink-0 mt-0.5">{i + 1}.</span>
                                <p className="text-sm text-gray-300 leading-snug">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button onClick={handleAiStrategy}
                        className="w-full py-2.5 rounded-lg border border-violet-600/40 text-violet-400 hover:bg-violet-900/20 text-sm font-medium transition-all">
                        🔄 Atualizar Estratégia
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live activity feed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-white">Decisões em Tempo Real</h2>
                {isRunning && <PulsingDot color="bg-emerald-500" />}
              </div>
              <p className="text-xs text-gray-600 mb-4">Tudo que o sistema fez sozinho</p>

              {session.actions.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-xs">
                  <div className="text-2xl mb-2">⏳</div>
                  Aguardando primeiras decisões...
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {session.actions.slice(0, 25).map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                </div>
              )}

              {/* Config summary */}
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-1.5">
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">Configuração Ativa</div>
                {[
                  ['Budget/dia', formatCurrency(session.config.max_daily_budget, session.config.currency)],
                  ['Risco', FULL_AUTO_RISK_LABELS[session.config.risk_level]],
                  ['CPA Alvo', formatCurrency(session.config.cpa_target, session.config.currency)],
                  ['ROAS Alvo', `${session.config.roas_target}x`],
                  ['Máx. campanhas', `${session.config.max_active_campaigns}`],
                  ['Canais', session.config.channels.map(c => FULL_AUTO_CHANNEL_ICONS[c]).join(' ')],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-gray-600">{label}</span>
                    <span className="text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
