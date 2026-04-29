import { useState, useEffect, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  AUTOPILOT_RISK_LABELS,
  AUTOPILOT_RISK_COLORS,
  AUTOPILOT_CHANNEL_LABELS,
  AUTOPILOT_CAMPAIGN_STATUS_LABELS,
  AUTOPILOT_CAMPAIGN_STATUS_COLORS,
  AUTOPILOT_ACTION_ICONS,
  AUTOPILOT_STATUS_COLORS,
  formatCurrency,
  formatNumber,
  formatDateTime,
} from '../utils/helpers'
import type {
  AutoPilotSession,
  AutoPilotConfig,
  AutoPilotCampaign,
  AutoPilotAction,
  AutoPilotRiskLevel,
  AutoPilotChannel,
} from '../types'

// ─── Simulation config ────────────────────────────────────────────────────────

interface RiskCfg {
  scale_pct: number
  ctr_pause_threshold: number
  cpa_multiplier: number
  init_campaigns: number
  tick_ms: number
}

const RISK_CFG: Record<AutoPilotRiskLevel, RiskCfg> = {
  conservador: { scale_pct: 15, ctr_pause_threshold: 0.8,  cpa_multiplier: 1.6, init_campaigns: 2, tick_ms: 7000 },
  moderado:    { scale_pct: 30, ctr_pause_threshold: 1.0,  cpa_multiplier: 1.3, init_campaigns: 3, tick_ms: 5500 },
  agressivo:   { scale_pct: 50, ctr_pause_threshold: 1.2,  cpa_multiplier: 1.1, init_campaigns: 4, tick_ms: 4000 },
}

const RISK_DESC: Record<AutoPilotRiskLevel, string> = {
  conservador: 'Pausas cautelosas, escala de 15%/dia. Ideal para produtos em validação.',
  moderado:    'Equilíbrio entre risco e crescimento, escala de 30%/dia. Recomendado.',
  agressivo:   'Decisões rápidas, escala de 50%/dia. Apenas para produtos validados.',
}

const CAMPAIGN_POOL = [
  'Broad Cold – Interesse Principal',
  'Interest Stack – Dor Primária',
  'Interest Stack – Desejo Final',
  'Lookalike 1–2% Compradores',
  'Lookalike 3–5% Visitantes',
  'Retargeting 3D – Visitantes',
  'Value-Based LAL',
  'Hook Test – Curiosidade',
  'Hook Test – Transformação',
  'Hook Test – Problema+Solução',
]

// ─── Simulation helpers ────────────────────────────────────────────────────────

function jitter(base: number, pctNoise: number): number {
  return base * (1 + (Math.random() * 2 - 1) * (pctNoise / 100))
}

function makeSimCampaign(sessionId: string, name: string, budget: number, health: number): AutoPilotCampaign {
  const ctr = health >= 70 ? jitter(2.4, 25) : health >= 45 ? jitter(1.2, 35) : jitter(0.55, 45)
  const cpc = health >= 70 ? jitter(0.42, 20) : health >= 45 ? jitter(0.85, 30) : jitter(1.60, 40)
  const convRate = health >= 70 ? jitter(3.8, 25) / 100 : health >= 45 ? jitter(1.6, 35) / 100 : jitter(0.4, 50) / 100
  const imp = Math.floor(jitter(900, 40))
  const clk = Math.floor(imp * ctr / 100)
  const conv = Math.floor(clk * convRate)
  const aov = jitter(90, 20)
  const spend = Math.min(clk * cpc, budget * 0.28)
  const revenue = conv * aov

  return {
    id: generateId(),
    session_id: sessionId,
    name,
    status: 'publicando',
    daily_budget: budget,
    spend: parseFloat(spend.toFixed(2)),
    revenue: parseFloat(revenue.toFixed(2)),
    roas: spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0,
    cpa: conv > 0 ? parseFloat((spend / conv).toFixed(2)) : 0,
    ctr: parseFloat(ctr.toFixed(2)),
    impressions: imp,
    clicks: clk,
    conversions: conv,
    sim_health: health,
    created_at: now(),
    updated_at: now(),
  }
}

function runDecisionTick(
  session: AutoPilotSession,
  riskCfg: RiskCfg,
): { campaigns: AutoPilotCampaign[]; newActions: AutoPilotAction[] } {
  const newActions: AutoPilotAction[] = []
  const config = session.config

  const updatedCampaigns: AutoPilotCampaign[] = session.campaigns.map(c => {
    if (c.status !== 'ativa' && c.status !== 'escalando') return c

    // Simulate metric growth per tick
    const hf = c.sim_health / 100
    const deltaImp = Math.floor(jitter(700, 50) * hf + jitter(180, 60))
    const deltaClk = Math.floor(deltaImp * c.ctr / 100)
    const deltaConv = Math.floor(jitter(hf * 3.5, 55))
    const spendDelta = Math.min(deltaClk * jitter(0.58, 25) * hf, c.daily_budget * 0.12)
    const revenueDelta = deltaConv * jitter(92, 22)

    const newSpend = Math.min(c.spend + spendDelta, c.daily_budget * 0.94)
    const newRevenue = c.revenue + revenueDelta
    const newImpressions = c.impressions + deltaImp
    const newClicks = c.clicks + deltaClk
    const newConversions = c.conversions + deltaConv
    const newCtr = newImpressions > 0 ? (newClicks / newImpressions) * 100 : c.ctr
    const newCpa = newConversions > 0 ? newSpend / newConversions : c.cpa
    const newRoas = newSpend > 0 ? newRevenue / newSpend : 0

    const updated: AutoPilotCampaign = {
      ...c,
      impressions: newImpressions,
      clicks: newClicks,
      conversions: newConversions,
      spend: parseFloat(newSpend.toFixed(2)),
      revenue: parseFloat(newRevenue.toFixed(2)),
      ctr: parseFloat(newCtr.toFixed(2)),
      cpa: parseFloat(newCpa.toFixed(2)),
      roas: parseFloat(newRoas.toFixed(2)),
      updated_at: now(),
    }

    // Rule: CTR too low → pause creative
    if (newImpressions > 3500 && newCtr < riskCfg.ctr_pause_threshold && c.status === 'ativa') {
      newActions.push({
        id: generateId(), session_id: session.id,
        action_type: 'campanha_pausada_ctr',
        description: 'Criativo pausado automaticamente',
        reasoning: `CTR de ${newCtr.toFixed(2)}% ficou abaixo do limite ${riskCfg.ctr_pause_threshold}% após ${formatNumber(newImpressions)} impressões`,
        campaign_id: c.id, campaign_name: c.name,
        before_value: `CTR ${newCtr.toFixed(2)}%`, after_value: 'Pausado',
        created_at: now(),
      })
      return { ...updated, status: 'pausada_ctr' as const }
    }

    // Rule: CPA too high → pause adset
    if (newConversions >= 3 && newCpa > config.cpa_target * riskCfg.cpa_multiplier && c.status === 'ativa') {
      newActions.push({
        id: generateId(), session_id: session.id,
        action_type: 'campanha_pausada_cpa',
        description: 'Conjunto pausado por CPA elevado',
        reasoning: `CPA de ${formatCurrency(newCpa)} está ${((newCpa / config.cpa_target - 1) * 100).toFixed(0)}% acima da meta de ${formatCurrency(config.cpa_target)}`,
        campaign_id: c.id, campaign_name: c.name,
        before_value: `CPA ${formatCurrency(newCpa)}`, after_value: 'Pausado',
        created_at: now(),
      })
      return { ...updated, status: 'pausada_cpa' as const }
    }

    // Rule: ROAS excellent → scale budget
    const currentTotalSpend = session.campaigns.reduce((s, x) => s + x.spend, 0)
    if (
      newRoas >= config.roas_target * 1.25 &&
      newConversions >= 5 &&
      c.status === 'ativa' &&
      currentTotalSpend < config.daily_budget_max * 0.78
    ) {
      const scaledBudget = parseFloat(
        Math.min(c.daily_budget * (1 + riskCfg.scale_pct / 100), config.daily_budget_max * 0.45).toFixed(2)
      )
      newActions.push({
        id: generateId(), session_id: session.id,
        action_type: 'campanha_escalada',
        description: 'Campanha escalada automaticamente',
        reasoning: `ROAS de ${newRoas.toFixed(2)}x supera a meta ${config.roas_target}x com ${newConversions} conversões. Orçamento aumentado em ${riskCfg.scale_pct}%`,
        campaign_id: c.id, campaign_name: c.name,
        before_value: `Budget ${formatCurrency(c.daily_budget)}`, after_value: `Budget ${formatCurrency(scaledBudget)}`,
        created_at: now(),
      })
      return { ...updated, status: 'escalando' as const, daily_budget: scaledBudget }
    }

    return updated
  })

  // Safety check: approaching daily budget limit
  const totalSpend = updatedCampaigns.reduce((s, c) => s + c.spend, 0)
  if (totalSpend > config.daily_budget_max * 0.92) {
    const activeCamps = updatedCampaigns.filter(c => c.status === 'ativa')
    if (activeCamps.length > 0) {
      const toPause = activeCamps[activeCamps.length - 1]
      newActions.push({
        id: generateId(), session_id: session.id,
        action_type: 'pausa_seguranca',
        description: 'Pausa de segurança ativada',
        reasoning: `Gasto total ${formatCurrency(totalSpend)} atingiu 92% do limite diário ${formatCurrency(config.daily_budget_max)}`,
        campaign_id: toPause.id, campaign_name: toPause.name,
        created_at: now(),
      })
      const idx = updatedCampaigns.findIndex(c => c.id === toPause.id)
      if (idx >= 0) updatedCampaigns[idx] = { ...toPause, status: 'pausada_cpa' }
    }
  }

  // Auto-variation: winner spawns a variation (rare)
  const winners = updatedCampaigns.filter(c => c.status === 'escalando' && c.roas >= config.roas_target)
  const activeCount = updatedCampaigns.filter(c => c.status === 'ativa' || c.status === 'escalando').length
  const canVariate = winners.length > 0 && Math.random() < 0.12 && activeCount < 6 && totalSpend < config.daily_budget_max * 0.65

  if (canVariate) {
    const winner = winners[0]
    const varHealth = Math.min(winner.sim_health + jitter(8, 35), 100)
    const varBudget = parseFloat((winner.daily_budget * 0.5).toFixed(2))
    const suffix = ['A', 'B', 'C', 'D'][activeCount % 4]
    const varName = `Variação ${suffix} – ${winner.name.split('–')[0].trim()}`
    const newCamp = { ...makeSimCampaign(session.id, varName, varBudget, varHealth), status: 'ativa' as const }
    updatedCampaigns.push(newCamp)
    newActions.push({
      id: generateId(), session_id: session.id,
      action_type: 'variacao_criada',
      description: 'Variação criada a partir de campanha vencedora',
      reasoning: `"${winner.name}" com ROAS ${winner.roas.toFixed(2)}x. Nova variação testa hook alternativo com orçamento reduzido`,
      campaign_id: newCamp.id, campaign_name: newCamp.name,
      created_at: now(),
    })
  }

  return { campaigns: updatedCampaigns, newActions }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Pulse({ color = 'bg-emerald-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

function StatCard({
  label, value, sub, color = 'text-white',
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function CampaignRow({ campaign, cpaTarget, roasTarget }: {
  campaign: AutoPilotCampaign
  cpaTarget: number
  roasTarget: number
}) {
  const statusCls = AUTOPILOT_CAMPAIGN_STATUS_COLORS[campaign.status] ?? 'bg-gray-800 text-gray-400'
  const statusLabel = AUTOPILOT_CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status
  const isActive = campaign.status === 'ativa' || campaign.status === 'escalando'
  const roasGood = campaign.roas > 0 && campaign.roas >= roasTarget
  const cpaGood = campaign.cpa > 0 && campaign.cpa <= cpaTarget

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 transition-all ${
      campaign.status === 'escalando' ? 'border-emerald-700/50' :
      campaign.status === 'pausada_cpa' || campaign.status === 'pausada_ctr' ? 'border-red-800/40' :
      'border-gray-800'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isActive && <Pulse color={campaign.status === 'escalando' ? 'bg-green-500' : 'bg-emerald-500'} />}
          <span className="text-sm font-medium text-white truncate">{campaign.name}</span>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">Gasto</div>
          <div className="text-sm font-semibold text-white">{formatCurrency(campaign.spend)}</div>
          <div className="text-[10px] text-gray-600">/ {formatCurrency(campaign.daily_budget)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">ROAS</div>
          <div className={`text-sm font-semibold ${campaign.roas > 0 ? (roasGood ? 'text-emerald-400' : 'text-amber-400') : 'text-gray-500'}`}>
            {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'}
          </div>
          <div className="text-[10px] text-gray-600">meta {roasTarget}x</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">CPA</div>
          <div className={`text-sm font-semibold ${campaign.cpa > 0 ? (cpaGood ? 'text-emerald-400' : 'text-red-400') : 'text-gray-500'}`}>
            {campaign.cpa > 0 ? formatCurrency(campaign.cpa) : '—'}
          </div>
          <div className="text-[10px] text-gray-600">meta {formatCurrency(cpaTarget)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">CTR</div>
          <div className="text-sm font-semibold text-white">
            {campaign.ctr > 0 ? `${campaign.ctr.toFixed(2)}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-600">{formatNumber(campaign.impressions)} imp.</div>
        </div>
      </div>

      {/* Spend bar */}
      <div className="mt-3">
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              campaign.status === 'escalando' ? 'bg-emerald-500' :
              campaign.status.startsWith('pausada') ? 'bg-red-500' :
              'bg-violet-500'
            }`}
            style={{ width: `${Math.min((campaign.spend / campaign.daily_budget) * 100, 100).toFixed(1)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function ActivityFeed({ actions }: { actions: AutoPilotAction[] }) {
  const sorted = [...actions].reverse().slice(0, 30)
  return (
    <div className="space-y-1.5">
      {sorted.length === 0 && (
        <div className="text-sm text-gray-600 text-center py-8">Aguardando atividade...</div>
      )}
      {sorted.map(action => (
        <div key={action.id} className="flex gap-3 py-2 border-b border-gray-800/60 last:border-0">
          <span className="text-lg shrink-0 mt-0.5">
            {AUTOPILOT_ACTION_ICONS[action.action_type] ?? '•'}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-200">{action.description}</div>
            {action.campaign_name && (
              <div className="text-[10px] text-gray-500 mt-0.5 truncate">📢 {action.campaign_name}</div>
            )}
            <div className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{action.reasoning}</div>
            {(action.before_value || action.after_value) && (
              <div className="flex items-center gap-1.5 mt-1">
                {action.before_value && (
                  <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">{action.before_value}</span>
                )}
                {action.before_value && action.after_value && (
                  <span className="text-[10px] text-gray-600">→</span>
                )}
                {action.after_value && (
                  <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded">{action.after_value}</span>
                )}
              </div>
            )}
            <div className="text-[10px] text-gray-700 mt-1">{formatDateTime(action.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface AIAnalysis {
  diagnostico: string
  score_performance: number
  proximas_acoes: Array<{ tipo: string; descricao: string; motivo: string; urgencia: string }>
  alertas: string[]
  previsao_24h: { spend_estimado: number; revenue_estimado: number; roas_estimado: number; cpa_estimado: number; campanhas_ativas_estimadas: number }
  recomendacao_principal: string
}

function AIAnalysisPanel({ analysis, onClose }: { analysis: AIAnalysis; onClose: () => void }) {
  const scoreColor = analysis.score_performance >= 70 ? 'text-emerald-400' : analysis.score_performance >= 50 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <div className="font-bold text-white">Análise IA do Auto-Pilot</div>
              <div className="text-xs text-gray-500">Diagnóstico estratégico gerado agora</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Score */}
          <div className="flex items-center gap-4 bg-gray-800 rounded-xl p-4">
            <div className={`text-4xl font-black ${scoreColor}`}>{analysis.score_performance}</div>
            <div>
              <div className="text-sm text-gray-400">Score de performance</div>
              <div className="text-xs text-gray-500 mt-1 max-w-md">{analysis.diagnostico}</div>
            </div>
          </div>

          {/* Recomendação principal */}
          <div className="bg-violet-900/20 border border-violet-700/40 rounded-xl p-4">
            <div className="text-xs font-semibold text-violet-400 mb-1.5">🎯 Recomendação Principal</div>
            <div className="text-sm text-white">{analysis.recomendacao_principal}</div>
          </div>

          {/* Próximas ações */}
          {analysis.proximas_acoes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">PRÓXIMAS AÇÕES</div>
              <div className="space-y-2">
                {analysis.proximas_acoes.map((a, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-sm font-medium text-white">{a.descricao}</div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        a.urgencia === 'agora' ? 'bg-red-900/50 text-red-300' :
                        a.urgencia === 'hoje' ? 'bg-amber-900/50 text-amber-300' :
                        'bg-gray-700 text-gray-400'
                      }`}>{a.urgencia}</span>
                    </div>
                    <div className="text-xs text-gray-500">{a.motivo}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertas */}
          {analysis.alertas.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">⚠️ ALERTAS</div>
              <div className="space-y-1.5">
                {analysis.alertas.map((a, i) => (
                  <div key={i} className="flex gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
                    <span className="text-amber-400 shrink-0">!</span>
                    <div className="text-xs text-amber-300">{a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previsão 24h */}
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2">PREVISÃO PRÓXIMAS 24H</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Gasto estimado', value: formatCurrency(analysis.previsao_24h.spend_estimado) },
                { label: 'Receita estimada', value: formatCurrency(analysis.previsao_24h.revenue_estimado), color: 'text-emerald-400' },
                { label: 'ROAS estimado', value: `${analysis.previsao_24h.roas_estimado.toFixed(2)}x`, color: 'text-violet-400' },
                { label: 'CPA estimado', value: formatCurrency(analysis.previsao_24h.cpa_estimado) },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500">{label}</div>
                  <div className={`text-base font-bold mt-0.5 ${color ?? 'text-white'}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Config form ───────────────────────────────────────────────────────────────

function ConfigForm({ onActivate }: { onActivate: (cfg: AutoPilotConfig) => void }) {
  const products = tosDb.products.getAll()

  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [budgetMax, setBudgetMax] = useState('150')
  const [cpaTarget, setCpaTarget] = useState('35')
  const [roasTarget, setRoasTarget] = useState('2.5')
  const [channel, setChannel] = useState<AutoPilotChannel>('meta')
  const [risk, setRisk] = useState<AutoPilotRiskLevel>('moderado')
  const [currency, setCurrency] = useState('USD')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return
    onActivate({
      product_id: productId,
      daily_budget_max: parseFloat(budgetMax) || 150,
      cpa_target: parseFloat(cpaTarget) || 35,
      roas_target: parseFloat(roasTarget) || 2.5,
      channel,
      risk_level: risk,
      max_scale_pct_per_day: RISK_CFG[risk].scale_pct,
      currency,
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Produto */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produto</div>
          {products.length === 0 ? (
            <div className="text-sm text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
              Nenhum produto cadastrado. Crie um produto primeiro.
            </div>
          ) : (
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.niche}</option>
              ))}
            </select>
          )}
        </div>

        {/* Orçamentos e metas */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Orçamento e Metas</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Orçamento Máximo Diário</label>
              <div className="flex">
                <span className="bg-gray-700 border border-gray-600 border-r-0 rounded-l-lg px-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number" min="10" step="5" value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-r-lg px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Moeda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm">
                <option value="USD">USD — Dólar</option>
                <option value="BRL">BRL — Real</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">CPA Alvo</label>
              <div className="flex">
                <span className="bg-gray-700 border border-gray-600 border-r-0 rounded-l-lg px-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number" min="1" step="1" value={cpaTarget}
                  onChange={e => setCpaTarget(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-r-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div className="text-[10px] text-gray-600 mt-1">Máximo aceitável por conversão</div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">ROAS Alvo</label>
              <div className="flex">
                <input
                  type="number" min="0.5" step="0.1" value={roasTarget}
                  onChange={e => setRoasTarget(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-l-lg px-3 py-2.5 text-sm"
                />
                <span className="bg-gray-700 border border-gray-600 border-l-0 rounded-r-lg px-3 flex items-center text-gray-400 text-sm">x</span>
              </div>
              <div className="text-[10px] text-gray-600 mt-1">Trigger para escalar campanhas</div>
            </div>
          </div>
        </div>

        {/* Canal */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Canal de Publicação</div>
          <div className="grid grid-cols-2 gap-3">
            {(['meta', 'tiktok'] as AutoPilotChannel[]).map(ch => (
              <button
                key={ch} type="button"
                onClick={() => setChannel(ch)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  channel === ch
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">{ch === 'meta' ? '📘' : '🎵'}</span>
                <div>
                  <div className="font-semibold text-sm text-white">{AUTOPILOT_CHANNEL_LABELS[ch]}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {ch === 'meta' ? 'Facebook & Instagram' : 'TikTok & Reels'}
                  </div>
                </div>
                {channel === ch && <span className="ml-auto text-violet-400 text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Nível de risco */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nível de Risco</div>
          <div className="grid grid-cols-3 gap-3">
            {(['conservador', 'moderado', 'agressivo'] as AutoPilotRiskLevel[]).map(r => (
              <button
                key={r} type="button"
                onClick={() => setRisk(r)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  risk === r
                    ? `border-2 ${
                        r === 'conservador' ? 'border-blue-500 bg-blue-500/10' :
                        r === 'moderado' ? 'border-amber-500 bg-amber-500/10' :
                        'border-red-500 bg-red-500/10'
                      }`
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="text-lg mb-1.5">
                  {r === 'conservador' ? '🛡' : r === 'moderado' ? '⚖️' : '⚡'}
                </div>
                <div className="text-sm font-semibold text-white">{AUTOPILOT_RISK_LABELS[r]}</div>
                <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">{RISK_DESC[r]}</div>
                <div className={`text-[10px] mt-2 px-1.5 py-0.5 rounded font-semibold inline-block ${
                  r === 'conservador' ? 'bg-blue-900/50 text-blue-300' :
                  r === 'moderado' ? 'bg-amber-900/50 text-amber-300' :
                  'bg-red-900/50 text-red-300'
                }`}>
                  Escala: +{RISK_CFG[r].scale_pct}%/dia
                </div>
                {risk === r && <div className="text-[10px] text-emerald-400 mt-1">✓ Selecionado</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Safety notice */}
        <div className="bg-amber-900/15 border border-amber-700/30 rounded-xl px-4 py-3 flex gap-3">
          <span className="text-amber-500 text-lg shrink-0">🛡</span>
          <div className="text-xs text-amber-300 leading-relaxed">
            <strong>Limites de segurança automáticos:</strong> O piloto nunca ultrapassará o orçamento máximo diário,
            nunca escalará acima do limite configurado, e pausará campanhas automaticamente em caso de prejuízo contínuo.
          </div>
        </div>

        <button
          type="submit"
          disabled={!productId}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors text-base flex items-center justify-center gap-2"
        >
          <span>🚀</span> Ativar Auto-Pilot
        </button>
      </form>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

type GenStep = { label: string; done: boolean }

export default function Autopilot() {
  const [session, setSession] = useState<AutoPilotSession | null>(null)
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'config'>('live')
  const [genSteps, setGenSteps] = useState<GenStep[]>([])
  const [generating, setGenerating] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load existing active session on mount
  useEffect(() => {
    const active = tosDb.autoPilotSessions.getActive()
    if (active) {
      setSession(active)
      setActiveTab('live')
    }
  }, [])

  // Simulation tick
  useEffect(() => {
    if (!session || session.status !== 'running') {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    const riskCfg = RISK_CFG[session.config.risk_level]
    intervalRef.current = setInterval(() => {
      setSession(prev => {
        if (!prev || prev.status !== 'running') return prev
        const { campaigns, newActions } = runDecisionTick(prev, riskCfg)
        const allActions = [...prev.actions, ...newActions]
        const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
        const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0)
        const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0)
        const updated: AutoPilotSession = {
          ...prev,
          campaigns,
          actions: allActions,
          total_spend: parseFloat(totalSpend.toFixed(2)),
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
          total_roas: totalSpend > 0 ? parseFloat((totalRevenue / totalSpend).toFixed(2)) : 0,
          total_cpa: totalConv > 0 ? parseFloat((totalSpend / totalConv).toFixed(2)) : 0,
          updated_at: now(),
        }
        tosDb.autoPilotSessions.save(updated)
        return updated
      })
    }, riskCfg.tick_ms)

    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [session?.id, session?.status])

  async function handleActivate(config: AutoPilotConfig) {
    setGenerating(true)
    const sessionId = generateId()
    const riskCfg = RISK_CFG[config.risk_level]
    const product = tosDb.products.getById(config.product_id)
    const productName = product?.name ?? 'Produto'

    // Phase 1: generating
    const steps: GenStep[] = [
      { label: 'Analisando produto e aprendizados...', done: false },
      { label: 'Gerando estrutura de campanhas com IA...', done: false },
      { label: 'Criando criativos personalizados...', done: false },
      ...Array.from({ length: riskCfg.init_campaigns }, (_, i) => ({
        label: `Publicando campanha ${i + 1} de ${riskCfg.init_campaigns} no ${AUTOPILOT_CHANNEL_LABELS[config.channel]}...`,
        done: false,
      })),
      { label: 'Iniciando monitoramento em tempo real...', done: false },
    ]
    setGenSteps(steps)

    const markDone = (idx: number) =>
      setGenSteps(prev => prev.map((s, i) => i === idx ? { ...s, done: true } : s))

    await delay(900); markDone(0)
    await delay(800); markDone(1)
    await delay(700); markDone(2)

    // Build campaigns
    const campaigns: AutoPilotCampaign[] = []
    const actions: AutoPilotAction[] = [
      {
        id: generateId(), session_id: sessionId,
        action_type: 'piloto_ativado',
        description: 'Auto-Pilot ativado',
        reasoning: `Sessão iniciada com orçamento máximo de ${formatCurrency(config.daily_budget_max)}/dia no ${AUTOPILOT_CHANNEL_LABELS[config.channel]} (risco: ${AUTOPILOT_RISK_LABELS[config.risk_level]})`,
        created_at: now(),
      },
    ]

    for (let i = 0; i < riskCfg.init_campaigns; i++) {
      const campName = `${productName} – ${CAMPAIGN_POOL[i % CAMPAIGN_POOL.length]}`
      const health = 40 + Math.random() * 55  // 40–95
      const budgetPerCamp = parseFloat((config.daily_budget_max / riskCfg.init_campaigns).toFixed(2))
      const camp = makeSimCampaign(sessionId, campName, budgetPerCamp, health)

      actions.push({
        id: generateId(), session_id: sessionId,
        action_type: 'campanha_criada',
        description: `Campanha criada: "${campName}"`,
        reasoning: 'Criada automaticamente pelo Auto-Pilot com base no produto e aprendizados anteriores',
        campaign_id: camp.id, campaign_name: camp.name,
        created_at: now(),
      })

      campaigns.push(camp)
      await delay(600)
      markDone(3 + i)
    }

    // Mark campaigns as active
    const activeCampaigns = campaigns.map(c => ({ ...c, status: 'ativa' as const }))
    activeCampaigns.forEach(c => {
      actions.push({
        id: generateId(), session_id: sessionId,
        action_type: 'campanha_publicada',
        description: `Campanha publicada e ativa`,
        reasoning: `Enviada para ${AUTOPILOT_CHANNEL_LABELS[config.channel]} e ativada automaticamente`,
        campaign_id: c.id, campaign_name: c.name,
        created_at: now(),
      })
    })

    await delay(500); markDone(3 + riskCfg.init_campaigns)

    const totalSpend = activeCampaigns.reduce((s, c) => s + c.spend, 0)
    const totalRevenue = activeCampaigns.reduce((s, c) => s + c.revenue, 0)
    const totalConv = activeCampaigns.reduce((s, c) => s + c.conversions, 0)

    const newSession: AutoPilotSession = {
      id: sessionId,
      config,
      status: 'running',
      campaigns: activeCampaigns,
      actions,
      total_spend: parseFloat(totalSpend.toFixed(2)),
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_roas: totalSpend > 0 ? parseFloat((totalRevenue / totalSpend).toFixed(2)) : 0,
      total_cpa: totalConv > 0 ? parseFloat((totalSpend / totalConv).toFixed(2)) : 0,
      started_at: now(),
      updated_at: now(),
    }

    tosDb.autoPilotSessions.save(newSession)
    await delay(400)
    setGenerating(false)
    setGenSteps([])
    setSession(newSession)
    setActiveTab('live')
  }

  function handlePause() {
    if (!session) return
    const updated: AutoPilotSession = {
      ...session,
      status: 'paused',
      paused_at: now(),
      updated_at: now(),
      actions: [
        ...session.actions,
        {
          id: generateId(), session_id: session.id,
          action_type: 'piloto_pausado',
          description: 'Auto-Pilot pausado manualmente',
          reasoning: 'Piloto pausado pelo usuário. Campanhas permanecem ativas na plataforma.',
          created_at: now(),
        },
      ],
    }
    tosDb.autoPilotSessions.save(updated)
    setSession(updated)
  }

  function handleResume() {
    if (!session) return
    const updated: AutoPilotSession = {
      ...session,
      status: 'running',
      paused_at: undefined,
      updated_at: now(),
      actions: [
        ...session.actions,
        {
          id: generateId(), session_id: session.id,
          action_type: 'piloto_retomado',
          description: 'Auto-Pilot retomado',
          reasoning: 'Monitoramento e otimização automática retomados',
          created_at: now(),
        },
      ],
    }
    tosDb.autoPilotSessions.save(updated)
    setSession(updated)
  }

  function handleStop() {
    if (!session) return
    if (!confirm('Parar o Auto-Pilot? A sessão será encerrada e uma nova configuração será necessária.')) return
    const updated: AutoPilotSession = {
      ...session,
      status: 'idle',
      updated_at: now(),
      actions: [
        ...session.actions,
        {
          id: generateId(), session_id: session.id,
          action_type: 'piloto_parado',
          description: 'Auto-Pilot encerrado',
          reasoning: `Sessão encerrada. Gasto total: ${formatCurrency(session.total_spend)} | Receita: ${formatCurrency(session.total_revenue)}`,
          created_at: now(),
        },
      ],
    }
    tosDb.autoPilotSessions.save(updated)
    setSession(null)
    setActiveTab('live')
  }

  async function handleAiAnalysis() {
    if (!session) return
    setAiLoading(true)
    setAiError('')
    try {
      const sessionData = JSON.stringify({
        config: session.config,
        status: session.status,
        total_spend: session.total_spend,
        total_revenue: session.total_revenue,
        total_roas: session.total_roas,
        total_cpa: session.total_cpa,
        campaigns_summary: session.campaigns.map(c => ({
          name: c.name, status: c.status, spend: c.spend, revenue: c.revenue,
          roas: c.roas, cpa: c.cpa, ctr: c.ctr, conversions: c.conversions,
        })),
        recent_actions: session.actions.slice(-10).map(a => ({
          type: a.action_type, description: a.description, at: a.created_at,
        })),
        started_at: session.started_at,
      }, null, 2)

      const res = await fetch('/api/autopilot-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionData }),
      })
      const data = await res.json() as { analysis?: AIAnalysis; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro desconhecido')
      setAiAnalysis(data.analysis ?? null)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao gerar análise')
    } finally {
      setAiLoading(false)
    }
  }

  // ─── Generation overlay ─────────────────────────────────────────────────────

  if (generating) {
    const done = genSteps.filter(s => s.done).length
    const pct = genSteps.length > 0 ? Math.round((done / genSteps.length) * 100) : 0
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-full max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 animate-pulse">🚀</div>
            <div className="text-xl font-bold text-white">Ativando Auto-Pilot</div>
            <div className="text-sm text-gray-500 mt-1">Gerando e publicando campanhas automaticamente</div>
          </div>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progresso</span><span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {/* Step list */}
          <div className="space-y-2">
            {genSteps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                step.done ? 'bg-emerald-900/20' : i === done ? 'bg-gray-800' : 'opacity-40'
              }`}>
                <span className="text-lg shrink-0">
                  {step.done ? '✅' : i === done ? '⏳' : '○'}
                </span>
                <span className={`text-sm ${step.done ? 'text-emerald-400' : i === done ? 'text-white' : 'text-gray-600'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── No session: show config form ───────────────────────────────────────────

  if (!session) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl font-bold text-white">Auto-Pilot Ads</h1>
            <span className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
              Inativo
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Configure o piloto automático e deixe a IA criar, publicar, monitorar e otimizar suas campanhas sem intervenção manual.
          </p>
        </div>

        {/* Feature highlight */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: '✨', title: 'Geração Automática', desc: 'Campanhas criadas com IA baseadas no produto e histórico' },
            { icon: '📈', title: 'Otimização Contínua', desc: 'Pausa, escala e varia criativos baseado em regras inteligentes' },
            { icon: '🛡', title: 'Limites de Segurança', desc: 'Nunca ultrapassa o orçamento. Para automaticamente em caso de prejuízo' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{title}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          ))}
        </div>

        <ConfigForm onActivate={handleActivate} />
      </div>
    )
  }

  // ─── Active session dashboard ────────────────────────────────────────────────

  const statusStyle = AUTOPILOT_STATUS_COLORS[session.status] ?? AUTOPILOT_STATUS_COLORS.idle
  const statusLabel = session.status === 'running' ? 'Auto-Pilot Ativo' : session.status === 'paused' ? 'Pausado' : 'Inativo'
  const activeCampaigns = session.campaigns.filter(c => c.status === 'ativa' || c.status === 'escalando')
  const pausedCampaigns = session.campaigns.filter(c => c.status.startsWith('pausada'))
  const totalConversions = session.campaigns.reduce((s, c) => s + c.conversions, 0)
  const profit = session.total_revenue - session.total_spend
  const budgetPct = Math.min((session.total_spend / session.config.daily_budget_max) * 100, 100)

  const product = tosDb.products.getById(session.config.product_id)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl font-bold text-white">Auto-Pilot Ads</h1>
            <span className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.badge} ${statusStyle.text}`}>
              {session.status === 'running' && <Pulse color={statusStyle.dot} />}
              {session.status === 'paused' && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />}
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {product?.name ?? 'Produto'} · {AUTOPILOT_CHANNEL_LABELS[session.config.channel]} ·{' '}
            <span className={`font-medium ${AUTOPILOT_RISK_COLORS[session.config.risk_level].split(' ')[2]}`}>
              {AUTOPILOT_RISK_LABELS[session.config.risk_level]}
            </span>
            {' · '}Iniciado {formatDateTime(session.started_at)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-600/40 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm transition-colors"
          >
            {aiLoading ? <span className="animate-spin">⏳</span> : '🧠'}
            {aiLoading ? 'Analisando...' : 'Análise IA'}
          </button>
          {session.status === 'running' && (
            <button onClick={handlePause}
              className="px-4 py-2 bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm transition-colors">
              ⏸ Pausar
            </button>
          )}
          {session.status === 'paused' && (
            <button onClick={handleResume}
              className="px-4 py-2 bg-emerald-600/20 border border-emerald-600/40 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-sm transition-colors">
              ▶ Retomar
            </button>
          )}
          <button onClick={handleStop}
            className="px-4 py-2 bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors">
            ⏹ Parar
          </button>
        </div>
      </div>

      {/* AI Error */}
      {aiError && (
        <div className="mb-4 bg-red-900/20 border border-red-700/40 text-red-300 rounded-lg px-4 py-2.5 text-sm flex justify-between">
          <span>❌ {aiError}</span>
          <button onClick={() => setAiError('')} className="text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        <StatCard label="Gasto Total" value={formatCurrency(session.total_spend)}
          sub={`de ${formatCurrency(session.config.daily_budget_max)} max`} />
        <StatCard label="Receita" value={formatCurrency(session.total_revenue)}
          color={session.total_revenue > 0 ? 'text-emerald-400' : 'text-white'} />
        <StatCard label="Lucro" value={formatCurrency(profit)}
          color={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub={profit >= 0 ? '✅ Positivo' : '⚠️ Negativo'} />
        <StatCard label="ROAS" value={session.total_roas > 0 ? `${session.total_roas.toFixed(2)}x` : '—'}
          color={session.total_roas >= session.config.roas_target ? 'text-emerald-400' : 'text-amber-400'}
          sub={`meta: ${session.config.roas_target}x`} />
        <StatCard label="CPA" value={session.total_cpa > 0 ? formatCurrency(session.total_cpa) : '—'}
          color={session.total_cpa > 0 && session.total_cpa <= session.config.cpa_target ? 'text-emerald-400' : 'text-amber-400'}
          sub={`meta: ${formatCurrency(session.config.cpa_target)}`} />
        <StatCard label="Decisões IA" value={String(session.actions.filter(a => !a.action_type.startsWith('piloto')).length)}
          sub={`${activeCampaigns.length} ativas · ${pausedCampaigns.length} pausadas`} />
      </div>

      {/* Budget bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-5">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-400">Orçamento Diário Utilizado</span>
          <span className={`font-semibold ${budgetPct >= 90 ? 'text-red-400' : budgetPct >= 70 ? 'text-amber-400' : 'text-gray-300'}`}>
            {formatCurrency(session.total_spend)} / {formatCurrency(session.config.daily_budget_max)} ({budgetPct.toFixed(1)}%)
          </span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>{totalConversions} conversões totais</span>
          <span>Limite de escala: +{session.config.max_scale_pct_per_day}%/dia</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-5 w-fit">
        {([
          ['live', '📡 Ao Vivo'],
          ['history', '📋 Histórico'],
          ['config', '⚙️ Configuração'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
              activeTab === t ? 'bg-violet-600 text-white font-medium' : 'text-gray-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Live tab */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Campaigns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-300">
                Campanhas ({session.campaigns.length})
              </div>
              <div className="flex gap-2 text-[10px]">
                <span className="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full">{activeCampaigns.length} ativas</span>
                <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">{pausedCampaigns.length} pausadas</span>
              </div>
            </div>
            <div className="space-y-3">
              {session.campaigns.length === 0 ? (
                <div className="text-sm text-gray-600 text-center py-10">Nenhuma campanha ainda</div>
              ) : (
                session.campaigns.map(c => (
                  <CampaignRow key={c.id} campaign={c}
                    cpaTarget={session.config.cpa_target}
                    roasTarget={session.config.roas_target} />
                ))
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm font-semibold text-gray-300">Atividade da IA</div>
              {session.status === 'running' && <Pulse color="bg-emerald-500" />}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 max-h-[600px] overflow-y-auto">
              <ActivityFeed actions={session.actions} />
            </div>
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">
              Histórico Completo ({session.actions.length} ações)
            </span>
            <span className="text-xs text-gray-500">Mais recentes primeiro</span>
          </div>
          <div className="divide-y divide-gray-800">
            {[...session.actions].reverse().map(action => (
              <div key={action.id} className="flex gap-4 px-5 py-3 hover:bg-gray-800/30 transition-colors">
                <span className="text-xl shrink-0 mt-0.5">{AUTOPILOT_ACTION_ICONS[action.action_type] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-200">{action.description}</div>
                      {action.campaign_name && (
                        <div className="text-xs text-gray-500 mt-0.5">📢 {action.campaign_name}</div>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-600 shrink-0">{formatDateTime(action.created_at)}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{action.reasoning}</div>
                  {(action.before_value || action.after_value) && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {action.before_value && (
                        <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">{action.before_value}</span>
                      )}
                      {action.before_value && action.after_value && <span className="text-[10px] text-gray-600">→</span>}
                      {action.after_value && (
                        <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded">{action.after_value}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config tab */}
      {activeTab === 'config' && (
        <div className="max-w-xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {[
              { label: 'Produto', value: product?.name ?? session.config.product_id },
              { label: 'Canal', value: AUTOPILOT_CHANNEL_LABELS[session.config.channel] },
              { label: 'Orçamento máximo diário', value: formatCurrency(session.config.daily_budget_max, session.config.currency) },
              { label: 'CPA alvo', value: formatCurrency(session.config.cpa_target, session.config.currency) },
              { label: 'ROAS alvo', value: `${session.config.roas_target}x` },
              { label: 'Nível de risco', value: AUTOPILOT_RISK_LABELS[session.config.risk_level] },
              { label: 'Escala máxima por dia', value: `+${session.config.max_scale_pct_per_day}%` },
              { label: 'Moeda', value: session.config.currency },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-500 text-center">
            Para alterar a configuração, pare o piloto e inicie uma nova sessão.
          </div>
        </div>
      )}

      {/* AI Analysis modal */}
      {aiAnalysis && (
        <AIAnalysisPanel analysis={aiAnalysis} onClose={() => setAiAnalysis(null)} />
      )}
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
