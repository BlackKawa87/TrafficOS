import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'

// ── types ─────────────────────────────────────────────────────────────────────
type DynAlert = {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  icon: string
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1)}K`
  return `R$${n.toFixed(0)}`
}

function fmtX(n: number, dec = 1): string {
  return `${n.toFixed(dec)}x`
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`
}

const PRIO_W: Record<string, number> = {
  critica: 4, alta: 3, media: 2, baixa: 1,
  critical: 4, high: 3, medium: 2, low: 1,
}

// ── component ─────────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const [pauseConfirm, setPauseConfirm] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  // ── data layer ───────────────────────────────────────────────────────────────
  const d = useMemo(() => {
    const products      = tosDb.products.getAll()
    const aiCampaigns   = tosDb.aiCampaigns.getAll()
    const aiCreatives   = tosDb.aiCreatives.getAll()
    const metrics       = tosDb.metrics.getAll()
    const decisions     = tosDb.decisions.getAll()
    const landingPages  = tosDb.landingPublisherPages.getAll()
    const videos        = tosDb.videoAiVideos.getAll()
    const scaleOps      = tosDb.scaleOpportunities.getAll()
    const cloudOps      = tosDb.cloudOps.get()
    const autoPilot     = tosDb.autoPilotSessions.getActive()
    const fullAuto      = tosDb.fullAutoSessions.getActive()
    const autoTest      = tosDb.autoTestSessions.getActive()
    const dailyPlans    = tosDb.dailyPlans.getAll()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    // ── operational KPIs ──────────────────────────────────────────────────────
    const activeProducts   = products.filter(p => p.status === 'validado' || p.status === 'em_teste').length
    const activeCampaigns  = aiCampaigns.filter(c => c.status === 'ativa' || c.status === 'vencedora').length
    const testingCreatives = aiCreatives.filter(c => c.status === 'em_teste').length
    const winnerCreatives  = aiCreatives.filter(c => c.status === 'vencedor').length
    const publishedLPs     = landingPages.filter(lp => lp.status === 'publicado').length
    const readyVideos      = videos.filter(v => v.status === 'pronto' || v.status === 'publicado').length
    const pendingDecisions = decisions.filter(d => d.status === 'pending').length

    // ── financials ────────────────────────────────────────────────────────────
    const totalSpend       = metrics.reduce((s, m) => s + m.spend, 0)
    const totalRevenue     = metrics.reduce((s, m) => s + m.revenue, 0)
    const profit           = totalRevenue - totalSpend
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
    const avgRoas          = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const avgCpa           = totalConversions > 0 ? totalSpend / totalConversions : 0

    // ── per-campaign rollup ──────────────────────────────────────────────────
    const campaignMetrics = new Map<string, { spend: number; revenue: number; roas: number }>()
    for (const m of metrics) {
      if (!m.campaign_id) continue
      const prev = campaignMetrics.get(m.campaign_id) ?? { spend: 0, revenue: 0, roas: 0 }
      prev.spend   += m.spend
      prev.revenue += m.revenue
      campaignMetrics.set(m.campaign_id, prev)
    }
    for (const [id, v] of campaignMetrics) {
      campaignMetrics.set(id, { ...v, roas: v.spend > 0 ? v.revenue / v.spend : 0 })
    }

    // ── per-channel rollup ───────────────────────────────────────────────────
    const channelMetrics = new Map<string, { spend: number; revenue: number; roas: number }>()
    for (const m of metrics) {
      const ch   = m.channel || 'Outro'
      const prev = channelMetrics.get(ch) ?? { spend: 0, revenue: 0, roas: 0 }
      prev.spend   += m.spend
      prev.revenue += m.revenue
      channelMetrics.set(ch, prev)
    }
    for (const [ch, v] of channelMetrics) {
      channelMetrics.set(ch, { ...v, roas: v.spend > 0 ? v.revenue / v.spend : 0 })
    }

    // ── strategic intelligence ───────────────────────────────────────────────
    // 1. Most promising product
    const promisingProduct = [...products]
      .sort((a, b) => (b.offer_score ?? 0) - (a.offer_score ?? 0))[0] ?? null

    // 2. Most profitable campaign
    let bestCampaignId   = ''
    let bestCampaignRoas = 0
    for (const [id, v] of campaignMetrics) {
      if (v.roas > bestCampaignRoas && v.spend > 0) { bestCampaignRoas = v.roas; bestCampaignId = id }
    }
    const bestCampaign     = bestCampaignId ? (aiCampaigns.find(c => c.id === bestCampaignId) ?? null) : null
    const bestCampaignData = bestCampaignId ? (campaignMetrics.get(bestCampaignId) ?? null) : null

    // 3. Winner creative
    const winnerCreative = [...aiCreatives]
      .filter(c => c.status === 'vencedor' || c.status === 'escalar')
      .sort((a, b) => b.roas - a.roas)[0] ?? null

    // 4. Best channel
    let bestChannel      = ''
    let bestChannelRoas  = 0
    let bestChannelSpend = 0
    for (const [ch, v] of channelMetrics) {
      if (v.roas > bestChannelRoas && v.spend > 0) {
        bestChannelRoas = v.roas; bestChannel = ch; bestChannelSpend = v.spend
      }
    }

    // 5. Top scale opportunity
    const topScaleOp = [...scaleOps]
      .filter(o => o.status === 'pendente')
      .sort((a, b) => (PRIO_W[b.priority] ?? 0) - (PRIO_W[a.priority] ?? 0))[0] ?? null

    // 6. Risk campaigns (spend > 50 with zero revenue)
    const riskCampaigns = aiCampaigns.filter(c => {
      const cm = campaignMetrics.get(c.id)
      return cm && cm.spend > 50 && cm.revenue === 0
    })

    // ── alert generation ─────────────────────────────────────────────────────
    const alerts: DynAlert[] = []

    for (const a of (cloudOps?.alerts ?? []).filter(x => x.severity === 'critical' && !x.acknowledged).slice(0, 2)) {
      alerts.push({ id: a.id, severity: 'critical', title: a.title, message: a.message, icon: '🚨' })
    }

    for (const c of riskCampaigns.slice(0, 2)) {
      const cm = campaignMetrics.get(c.id)
      if (!cm) continue
      alerts.push({
        id: `risk_${c.id}`, severity: 'critical',
        title: 'Campanha gastando sem venda',
        message: `${c.strategy.nome_estrategico} — ${fmtMoney(cm.spend)} gasto, R$0 receita`,
        icon: '🔴',
      })
    }

    for (const c of aiCreatives.filter(x => x.status === 'em_teste' && x.impressions > 500 && x.ctr < 1).slice(0, 2)) {
      alerts.push({
        id: `ctr_${c.id}`, severity: 'warning',
        title: 'Criativo com CTR baixo',
        message: `${c.strategy.nome} — CTR ${fmtPct(c.ctr)}`,
        icon: '⚠️',
      })
    }

    const publishedWithLowConv = landingPages.filter(lp => lp.status === 'publicado')
    if (publishedWithLowConv.length > 0 && totalConversions === 0 && totalSpend > 200) {
      alerts.push({
        id: 'low_lp_conv', severity: 'warning',
        title: 'Landing com baixa conversão',
        message: `${publishedWithLowConv.length} LP(s) publicada(s) sem conversão registrada`,
        icon: '🖥️',
      })
    }

    if (avgRoas >= 3) {
      alerts.push({
        id: 'pos_roas', severity: 'success',
        title: 'ROAS positivo — momento de escalar',
        message: `Média atual ${fmtX(avgRoas)} · Amplie budget nas campanhas vencedoras`,
        icon: '✅',
      })
    }

    const roasPositiveProducts = products.filter(p => {
      const pm = metrics.filter(m => m.product_id === p.id)
      const sp = pm.reduce((s, m) => s + m.spend, 0)
      const rv = pm.reduce((s, m) => s + m.revenue, 0)
      return sp > 0 && rv / sp >= 2
    })
    if (roasPositiveProducts.length > 0) {
      alerts.push({
        id: 'pos_products', severity: 'info',
        title: `${roasPositiveProducts.length} produto(s) com ROAS positivo`,
        message: roasPositiveProducts.slice(0, 2).map(p => p.name).join(', '),
        icon: '🏆',
      })
    }

    if (metrics.length === 0 && activeCampaigns > 0) {
      alerts.push({
        id: 'no_tracking', severity: 'warning',
        title: 'Erro de tracking detectado',
        message: `${activeCampaigns} campanha(s) ativa(s) sem dados de métricas`,
        icon: '📡',
      })
    }

    if (publishedLPs === 0 && activeCampaigns > 0) {
      alerts.push({
        id: 'no_lp', severity: 'warning',
        title: 'Nenhuma landing page publicada',
        message: `${activeCampaigns} campanha(s) ativa(s) sem LP publicada`,
        icon: '🖥️',
      })
    }

    const criticalAlertCount = alerts.filter(a => a.severity === 'critical').length

    // ── daily plan / next actions ─────────────────────────────────────────────
    const latestPlan  = dailyPlans[0] ?? null
    const nextActions = latestPlan
      ? latestPlan.tasks.filter(t => t.status === 'pending').slice(0, 6)
      : []

    // ── system health ─────────────────────────────────────────────────────────
    const cloudJobsRunning = (cloudOps?.jobs ?? []).filter(j => j.status === 'running').length
    const cloudErrors      = cloudOps?.total_errors ?? 0

    return {
      // counts
      activeProducts, activeCampaigns, testingCreatives, winnerCreatives,
      publishedLPs, readyVideos, pendingDecisions,
      // financials
      totalSpend, totalRevenue, profit, avgRoas, avgCpa,
      // strategic intelligence
      promisingProduct,
      bestCampaign, bestCampaignRoas, bestCampaignData,
      winnerCreative,
      bestChannel, bestChannelRoas, bestChannelSpend,
      topScaleOp,
      riskCount: riskCampaigns.length,
      // systems
      autoPilotStatus:  autoPilot?.status  ?? 'idle',
      autoPilotRoas:    autoPilot?.total_roas  ?? 0,
      autoPilotSpend:   autoPilot?.total_spend ?? 0,
      fullAutoStatus:   fullAuto?.status   ?? null,
      fullAutoProfit:   fullAuto?.metrics.profit_loss ?? 0,
      fullAutoCampaigns: fullAuto?.campaigns.length    ?? 0,
      cloudOpsEnabled:  cloudOps?.enabled ?? false,
      cloudJobsRunning, cloudErrors,
      autoTestStatus:   autoTest?.status  ?? null,
      autoTestWinners:  autoTest?.winners_count ?? 0,
      // alerts / decisions
      alerts: alerts.slice(0, 9),
      criticalAlertCount,
      nextActions,
      latestPlanDate: latestPlan?.date ?? null,
      recentDecisions: [...decisions]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // ── handlers ──────────────────────────────────────────────────────────────
  const handlePauseAll = useCallback(() => {
    if (!pauseConfirm) {
      setPauseConfirm(true)
      setTimeout(() => setPauseConfirm(false), 5000)
      return
    }
    const ts       = now()
    const campaigns = tosDb.aiCampaigns.getAll()
    for (const c of campaigns) {
      if (c.status === 'ativa') tosDb.aiCampaigns.save({ ...c, status: 'pausada', updated_at: ts })
    }
    setPauseConfirm(false)
    setRefreshKey(k => k + 1)
  }, [pauseConfirm])

  const handleExport = useCallback(() => {
    const json = tosDb.exportAll()
    const blob  = new Blob([json], { type: 'application/json' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href     = url
    a.download = `trafficOS_export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2500)
  }, [])

  // ── style helpers ──────────────────────────────────────────────────────────
  const prioColor = (p: string) => {
    if (p === 'critical' || p === 'critica') return 'text-red-400'
    if (p === 'high'     || p === 'alta')    return 'text-amber-400'
    if (p === 'medium'   || p === 'media')   return 'text-yellow-400'
    return 'text-gray-500'
  }

  const prioEmoji = (p: string) => {
    if (p === 'critical' || p === 'critica') return '🔴'
    if (p === 'high'     || p === 'alta')    return '🟠'
    if (p === 'medium'   || p === 'media')   return '🟡'
    return '⚪'
  }

  const prioLabel = (p: string) => {
    if (p === 'critical' || p === 'critica') return 'CRIT'
    if (p === 'high'     || p === 'alta')    return 'ALTA'
    if (p === 'medium'   || p === 'media')   return 'MED'
    return 'BAI'
  }

  const alertBg = (s: DynAlert['severity']) => {
    if (s === 'critical') return 'border-red-500/30 bg-red-500/5'
    if (s === 'warning')  return 'border-amber-500/30 bg-amber-500/5'
    if (s === 'success')  return 'border-emerald-500/30 bg-emerald-500/5'
    return 'border-blue-500/30 bg-blue-500/5'
  }

  const alertText = (s: DynAlert['severity']) => {
    if (s === 'critical') return 'text-red-300'
    if (s === 'warning')  return 'text-amber-300'
    if (s === 'success')  return 'text-emerald-300'
    return 'text-blue-300'
  }

  const sysDot = (on: boolean) =>
    on ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-gray-600'

  const roasColor = (r: number) =>
    r >= 2 ? 'text-emerald-400' : r >= 1 ? 'text-amber-400' : r > 0 ? 'text-red-400' : 'text-gray-500'

  // ── quick actions ──────────────────────────────────────────────────────────
  const quickActions = [
    { label: 'Criar Produto',      icon: '📦', color: 'hover:bg-violet-600/20 hover:border-violet-500/40',  fn: () => navigate('/produtos/novo') },
    { label: 'Gerar Campanha',     icon: '📢', color: 'hover:bg-blue-600/20 hover:border-blue-500/40',      fn: () => navigate('/campanhas/nova') },
    { label: 'Gerar Criativo',     icon: '🎨', color: 'hover:bg-amber-600/20 hover:border-amber-500/40',    fn: () => navigate('/criativos/novo') },
    { label: 'Gerar Landing',      icon: '🖥️', color: 'hover:bg-teal-600/20 hover:border-teal-500/40',      fn: () => navigate('/landing-publisher') },
    { label: 'Gerar Vídeo',        icon: '🎥', color: 'hover:bg-pink-600/20 hover:border-pink-500/40',      fn: () => navigate('/video-ai') },
    { label: 'Ativar Auto-Pilot',  icon: '🎯', color: 'hover:bg-emerald-600/20 hover:border-emerald-500/40', fn: () => navigate('/autopilot') },
    {
      label: pauseConfirm ? 'Confirmar Pausa?' : 'Pausar Tudo',
      icon: '⏸️',
      color: pauseConfirm
        ? 'bg-red-600/25 border-red-500/50 text-red-300 hover:bg-red-600/35'
        : 'hover:bg-red-600/20 hover:border-red-500/40',
      fn: handlePauseAll,
    },
    {
      label: exportDone ? 'Exportado ✓' : 'Exportar Rel.',
      icon: '📤',
      color: exportDone
        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
        : 'hover:bg-gray-700 hover:border-gray-600',
      fn: handleExport,
    },
  ]

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-violet-900/40">
            🧠
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
            <p className="text-xs text-gray-500">Painel de Controle Supremo · TrafficOS</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {d.criticalAlertCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-full animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-red-400 font-medium">{d.criticalAlertCount} crítico(s)</span>
            </div>
          )}
          {d.autoPilotStatus === 'running' || d.fullAutoStatus === 'running' ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Sistema ativo</span>
            </div>
          ) : null}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-all"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* ── Operational KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {[
          { label: 'Produtos Ativos',   value: d.activeProducts,   icon: '📦', color: 'text-violet-400',  path: '/produtos' },
          { label: 'Campanhas Ativas',  value: d.activeCampaigns,  icon: '📢', color: 'text-blue-400',    path: '/campanhas' },
          { label: 'Criativos Teste',   value: d.testingCreatives, icon: '🎨', color: 'text-amber-400',   path: '/criativos' },
          { label: 'Criativos Winner',  value: d.winnerCreatives,  icon: '🏆', color: 'text-yellow-400',  path: '/criativos' },
          { label: 'Landings Pub.',     value: d.publishedLPs,     icon: '🖥️', color: 'text-teal-400',    path: '/landing-publisher' },
          { label: 'Vídeos Gerados',    value: d.readyVideos,      icon: '🎥', color: 'text-pink-400',    path: '/video-ai' },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 text-left transition-all group"
          >
            <div className="text-base mb-2">{item.icon}</div>
            <div className={`text-3xl font-bold ${item.color} tabular-nums`}>{item.value}</div>
            <div className="text-[10px] text-gray-500 mt-1 leading-tight">{item.label}</div>
          </button>
        ))}
      </div>

      {/* ── Financial KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5">
        {[
          {
            label: 'Gasto Total',    icon: '💸',
            value: fmtMoney(d.totalSpend),
            color: 'text-red-400',
            sub: 'acumulado',
          },
          {
            label: 'Receita Total',  icon: '💰',
            value: fmtMoney(d.totalRevenue),
            color: 'text-emerald-400',
            sub: 'acumulada',
          },
          {
            label: 'Lucro Estimado', icon: d.profit >= 0 ? '📈' : '📉',
            value: fmtMoney(d.profit),
            color: d.profit >= 0 ? 'text-emerald-400' : 'text-red-400',
            sub: d.profit >= 0 ? 'positivo' : 'negativo',
          },
          {
            label: 'ROAS Médio',     icon: '🎯',
            value: d.avgRoas > 0 ? fmtX(d.avgRoas) : '—',
            color: roasColor(d.avgRoas),
            sub: d.avgRoas >= 3 ? 'excelente' : d.avgRoas >= 2 ? 'bom' : d.avgRoas >= 1 ? 'neutro' : 'sem dados',
          },
          {
            label: 'CPA Médio',      icon: '🏷️',
            value: d.avgCpa > 0 ? fmtMoney(d.avgCpa) : '—',
            color: 'text-sky-400',
            sub: 'por conversão',
          },
          {
            label: 'Decisões IA',    icon: '🤖',
            value: d.pendingDecisions,
            color: d.pendingDecisions > 0 ? 'text-indigo-400' : 'text-gray-500',
            sub: d.pendingDecisions > 0 ? 'pendentes' : 'sem pendências',
          },
          {
            label: 'Alertas',        icon: '🔔',
            value: d.criticalAlertCount > 0 ? d.criticalAlertCount : d.alerts.length,
            color: d.criticalAlertCount > 0 ? 'text-red-400' : d.alerts.length > 0 ? 'text-amber-400' : 'text-gray-500',
            sub: d.criticalAlertCount > 0 ? 'críticos' : d.alerts.length > 0 ? 'ativos' : 'sem alertas',
          },
        ].map(item => (
          <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm">{item.icon}</span>
              <span className="text-[9px] text-gray-600 uppercase tracking-wider">{item.sub}</span>
            </div>
            <div className={`text-xl font-bold tabular-nums ${item.color}`}>{String(item.value)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">⚡ Ações Rápidas</div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={action.fn}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-all ${action.color}`}
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-[10px] font-medium leading-tight text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Strategic Intelligence — 5 cols ──────────────────────────────── */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">🧠 Inteligência Estratégica</div>

          {/* 1 — Most promising product */}
          <div
            onClick={() => navigate('/produtos')}
            className="bg-gray-900 border border-gray-800 hover:border-violet-500/40 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span>🏆</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Produto Mais Promissor</span>
              </div>
              <span className="text-[10px] text-gray-600 group-hover:text-violet-400 transition-colors">ver →</span>
            </div>
            {d.promisingProduct ? (
              <>
                <div className="font-semibold text-white">{d.promisingProduct.name}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">
                    {d.promisingProduct.niche}
                  </span>
                  {d.promisingProduct.offer_score !== null && (
                    <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full text-gray-300">
                      Score <span className="text-emerald-400 font-semibold">{d.promisingProduct.offer_score}</span>
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                    d.promisingProduct.status === 'validado' ? 'bg-emerald-500/10 text-emerald-400' :
                    d.promisingProduct.status === 'em_teste' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>{d.promisingProduct.status.replace('_', ' ')}</span>
                </div>
                {(d.promisingProduct.main_promise || d.promisingProduct.main_benefit) && (
                  <div className="mt-2 text-xs text-gray-500 line-clamp-1">
                    {d.promisingProduct.main_promise || d.promisingProduct.main_benefit}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-600 italic">Nenhum produto cadastrado ainda.</div>
            )}
          </div>

          {/* 2 — Most profitable campaign */}
          <div
            onClick={() => navigate('/campanhas')}
            className="bg-gray-900 border border-gray-800 hover:border-blue-500/40 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Campanha Mais Lucrativa</span>
              </div>
              <span className="text-[10px] text-gray-600 group-hover:text-blue-400 transition-colors">ver →</span>
            </div>
            {d.bestCampaign ? (
              <>
                <div className="font-semibold text-white">{d.bestCampaign.strategy.nome_estrategico}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className={`font-bold ${roasColor(d.bestCampaignRoas)}`}>
                    ROAS {fmtX(d.bestCampaignRoas)}
                  </span>
                  <span className="text-gray-500 capitalize">{d.bestCampaign.channel.replace('_', ' ')}</span>
                  {d.bestCampaignData && (
                    <span className="text-gray-600">{fmtMoney(d.bestCampaignData.spend)} gasto</span>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500 line-clamp-2">{d.bestCampaign.strategy.hipotese_principal}</div>
              </>
            ) : (
              <div className="text-sm text-gray-600 italic">Sem campanhas com dados de métricas.</div>
            )}
          </div>

          {/* 3 — Winner creative */}
          <div
            onClick={() => navigate('/criativos')}
            className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Criativo Vencedor</span>
              </div>
              <span className="text-[10px] text-gray-600 group-hover:text-amber-400 transition-colors">ver →</span>
            </div>
            {d.winnerCreative ? (
              <>
                <div className="font-semibold text-white">{d.winnerCreative.strategy.nome}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className={`font-bold ${roasColor(d.winnerCreative.roas)}`}>
                    ROAS {fmtX(d.winnerCreative.roas)}
                  </span>
                  <span className="text-gray-400">CTR {fmtPct(d.winnerCreative.ctr)}</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full capitalize">
                    {d.winnerCreative.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500 line-clamp-1">{d.winnerCreative.strategy.ideia_central}</div>
              </>
            ) : (
              <div className="text-sm text-gray-600 italic">Nenhum criativo vencedor ainda.</div>
            )}
          </div>

          {/* 4 — Best channel */}
          <div
            onClick={() => navigate('/expansao')}
            className="bg-gray-900 border border-gray-800 hover:border-teal-500/40 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span>📡</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Canal com Melhor Performance</span>
              </div>
              <span className="text-[10px] text-gray-600 group-hover:text-teal-400 transition-colors">ver →</span>
            </div>
            {d.bestChannel ? (
              <>
                <div className="font-semibold text-white capitalize">{d.bestChannel.replace(/_/g, ' ')}</div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={`font-bold ${roasColor(d.bestChannelRoas)}`}>ROAS {fmtX(d.bestChannelRoas)}</span>
                  <span className="text-gray-500">{fmtMoney(d.bestChannelSpend)} investido</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Oportunidade: replique a estrutura vencedora e escale neste canal.
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600 italic">Sem dados de métricas por canal.</div>
            )}
          </div>

          {/* 5 — Top scale opportunity */}
          <div
            onClick={() => navigate('/escala')}
            className="bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span>🚀</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Maior Oportunidade de Escala</span>
              </div>
              <span className="text-[10px] text-gray-600 group-hover:text-emerald-400 transition-colors">ver →</span>
            </div>
            {d.topScaleOp ? (
              <>
                <div className="font-semibold text-white">{d.topScaleOp.title}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                    d.topScaleOp.priority === 'critica' ? 'bg-red-500/10 text-red-400' :
                    d.topScaleOp.priority === 'alta'    ? 'bg-amber-500/10 text-amber-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>{d.topScaleOp.priority}</span>
                  <span className="text-gray-500">Potencial: <span className="text-white">{d.topScaleOp.potential}</span></span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    d.topScaleOp.risk === 'baixo' ? 'bg-emerald-500/10 text-emerald-400' :
                    d.topScaleOp.risk === 'medio' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>Risco: {d.topScaleOp.risk}</span>
                </div>
                <div className="mt-2 text-xs text-gray-500 line-clamp-2">{d.topScaleOp.reason}</div>
              </>
            ) : (
              <div className="text-sm text-gray-600 italic">Nenhuma oportunidade de escala pendente.</div>
            )}
          </div>

          {/* 6 — Biggest risk */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span>⚠️</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Maior Risco Atual</span>
            </div>
            {d.riskCount > 0 ? (
              <>
                <div className="font-semibold text-red-400">
                  {d.riskCount} campanha{d.riskCount > 1 ? 's' : ''} gastando sem venda
                </div>
                <div className="mt-1.5 text-xs text-gray-500">
                  Revise criativos, landings e oferta. Considere pausar imediatamente para proteger o orçamento.
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate('/decisoes') }}
                  className="mt-2.5 text-xs text-violet-400 hover:text-violet-300 underline"
                >
                  Ver decisões recomendadas →
                </button>
              </>
            ) : d.criticalAlertCount > 0 ? (
              <>
                <div className="font-semibold text-amber-400">{d.criticalAlertCount} alerta(s) crítico(s)</div>
                <div className="mt-1.5 text-xs text-gray-500">Verifique Cloud Ops e tome ação imediata.</div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span>✅</span>
                <span>Nenhum risco crítico identificado.</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Systems + Actions — 4 cols ──────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-3">

          {/* Active Systems */}
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">🔧 Sistemas Ativos</div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Auto-Pilot */}
            <div
              onClick={() => navigate('/autopilot')}
              className="bg-gray-900 border border-gray-800 hover:border-emerald-500/30 rounded-xl p-3.5 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span>🎯</span>
                <div className={`w-2 h-2 rounded-full ${sysDot(d.autoPilotStatus === 'running')}`} />
              </div>
              <div className="text-xs font-semibold text-white">Auto-Pilot</div>
              <div className={`text-[10px] mt-0.5 ${d.autoPilotStatus === 'running' ? 'text-emerald-400' : 'text-gray-500'}`}>
                {d.autoPilotStatus === 'running' ? 'Rodando' : d.autoPilotStatus === 'paused' ? 'Pausado' : 'Inativo'}
              </div>
              {d.autoPilotRoas > 0 && (
                <div className={`text-[10px] mt-1 font-medium ${roasColor(d.autoPilotRoas)}`}>
                  ROAS {fmtX(d.autoPilotRoas)}
                </div>
              )}
              {d.autoPilotSpend > 0 && (
                <div className="text-[10px] text-gray-600 mt-0.5">{fmtMoney(d.autoPilotSpend)} gasto</div>
              )}
            </div>

            {/* Full Auto */}
            <div
              onClick={() => navigate('/full-auto')}
              className="bg-gray-900 border border-gray-800 hover:border-violet-500/30 rounded-xl p-3.5 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span>🤖</span>
                <div className={`w-2 h-2 rounded-full ${sysDot(d.fullAutoStatus === 'running')}`} />
              </div>
              <div className="text-xs font-semibold text-white">Full Auto</div>
              <div className={`text-[10px] mt-0.5 ${d.fullAutoStatus === 'running' ? 'text-emerald-400' : 'text-gray-500'}`}>
                {d.fullAutoStatus === 'running' ? 'Rodando' :
                 d.fullAutoStatus === 'paused'  ? 'Pausado' :
                 d.fullAutoStatus === 'emergency_stop' ? '🚨 Emergência' : 'Inativo'}
              </div>
              {d.fullAutoProfit !== 0 && (
                <div className={`text-[10px] mt-1 font-medium ${d.fullAutoProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtMoney(d.fullAutoProfit)}
                </div>
              )}
              {d.fullAutoCampaigns > 0 && (
                <div className="text-[10px] text-gray-600 mt-0.5">{d.fullAutoCampaigns} campanhas</div>
              )}
            </div>

            {/* Cloud Ops */}
            <div
              onClick={() => navigate('/cloud-ops')}
              className="bg-gray-900 border border-gray-800 hover:border-sky-500/30 rounded-xl p-3.5 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span>☁️</span>
                <div className={`w-2 h-2 rounded-full ${sysDot(d.cloudOpsEnabled)}`} />
              </div>
              <div className="text-xs font-semibold text-white">Cloud Ops</div>
              <div className={`text-[10px] mt-0.5 ${d.cloudOpsEnabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                {d.cloudOpsEnabled ? `${d.cloudJobsRunning} job(s) rodando` : 'Desativado'}
              </div>
              {d.cloudErrors > 0 && (
                <div className="text-[10px] text-red-400 mt-1">{d.cloudErrors} erro(s)</div>
              )}
            </div>

            {/* Auto-Testing */}
            <div
              onClick={() => navigate('/auto-testing')}
              className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-3.5 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span>🧪</span>
                <div className={`w-2 h-2 rounded-full ${sysDot(d.autoTestStatus === 'ativo')}`} />
              </div>
              <div className="text-xs font-semibold text-white">Auto-Testing</div>
              <div className={`text-[10px] mt-0.5 ${d.autoTestStatus === 'ativo' ? 'text-emerald-400' : 'text-gray-500'}`}>
                {d.autoTestStatus === 'ativo' ? 'Testando' : d.autoTestStatus === 'pausado' ? 'Pausado' : 'Inativo'}
              </div>
              {d.autoTestWinners > 0 && (
                <div className="text-[10px] text-amber-400 mt-1">{d.autoTestWinners} vencedor(es)</div>
              )}
            </div>
          </div>

          {/* Próximas Ações */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">📅 Próximas Ações</div>
              {d.latestPlanDate && (
                <span className="text-[9px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                  plano {d.latestPlanDate}
                </span>
              )}
            </div>
            {d.nextActions.length > 0 ? (
              <div className="space-y-2.5">
                {d.nextActions.map((task, idx) => (
                  <div key={task.id ?? idx} className="flex items-start gap-2.5">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      task.priority === 'critical' ? 'bg-red-400' :
                      task.priority === 'high'     ? 'bg-amber-400' :
                      task.priority === 'medium'   ? 'bg-yellow-400' : 'bg-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{task.description}</div>
                      {task.estimated_time && (
                        <div className="text-[10px] text-gray-600 mt-0.5">⏱ {task.estimated_time}</div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold flex-shrink-0 mt-0.5 ${prioColor(task.priority)}`}>
                      {prioLabel(task.priority)}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/plano-diario')}
                  className="w-full mt-1 text-xs text-violet-400 hover:text-violet-300 py-1.5 border border-violet-500/20 hover:border-violet-500/40 rounded-lg transition-all"
                >
                  Ver plano completo →
                </button>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-sm text-gray-600 mb-3">Nenhum plano ativo.</div>
                <button
                  onClick={() => navigate('/plano-diario')}
                  className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 px-3 py-1.5 rounded-lg transition-all"
                >
                  Gerar plano diário →
                </button>
              </div>
            )}
          </div>

          {/* Module grid */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">🔗 Acesso Rápido</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Métricas',    icon: '📈', path: '/metricas' },
                { label: 'Decisões',    icon: '🤖', path: '/decisoes' },
                { label: 'Escala',      icon: '🚀', path: '/escala' },
                { label: 'Email',       icon: '📧', path: '/email' },
                { label: 'WhatsApp',    icon: '💬', path: '/whatsapp' },
                { label: 'VSL',         icon: '🎬', path: '/vsl' },
                { label: 'Remarketing', icon: '🔁', path: '/remarketing' },
                { label: 'Expansão',    icon: '🌐', path: '/expansao' },
                { label: 'Inteligência',icon: '🧠', path: '/inteligencia' },
              ].map(m => (
                <button
                  key={m.path}
                  onClick={() => navigate(m.path)}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                >
                  <span className="text-xs">{m.icon}</span>
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Alerts + Decisions — 3 cols ──────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">

          {/* Alerts */}
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">🔔 Alertas</div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {d.alerts.length > 0 ? (
              <div className="space-y-2">
                {d.alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${alertBg(alert.severity)}`}
                  >
                    <span className="text-sm flex-shrink-0 mt-0.5">{alert.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${alertText(alert.severity)}`}>
                        {alert.title}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {alert.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm text-gray-500">Nenhum alerta ativo.</div>
                <div className="text-xs text-gray-600 mt-1">Sistema operando normalmente.</div>
              </div>
            )}
          </div>

          {/* Recent Decisions */}
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">🧠 Decisões Recentes</div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {d.recentDecisions.length > 0 ? (
              <div className="space-y-1.5">
                {d.recentDecisions.map(dec => (
                  <div
                    key={dec.id}
                    onClick={() => navigate(`/decisoes/${dec.id}`)}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-all"
                  >
                    <span className="text-xs flex-shrink-0 mt-0.5">{prioEmoji(dec.priority)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                        {dec.title ?? dec.decision_type.replace(/_/g, ' ')}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          dec.status === 'pending'                      ? 'bg-amber-500/10 text-amber-400' :
                          dec.status === 'executed' || dec.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                          dec.status === 'ignored'  || dec.status === 'dismissed' ? 'bg-gray-700 text-gray-500' :
                          'bg-gray-700 text-gray-500'
                        }`}>{dec.status}</span>
                        <span className="text-[9px] text-gray-600">
                          {new Date(dec.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/decisoes')}
                  className="w-full mt-1 text-xs text-violet-400 hover:text-violet-300 py-1.5 border border-violet-500/20 hover:border-violet-500/40 rounded-lg transition-all"
                >
                  Ver todas →
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-2xl mb-2">🤖</div>
                <div className="text-sm text-gray-600 mb-3">Sem decisões geradas.</div>
                <button
                  onClick={() => navigate('/decisoes')}
                  className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all"
                >
                  Gerar decisões →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
