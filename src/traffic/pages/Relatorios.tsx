import { useState, useRef, useCallback } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  RELATORIO_TYPE_LABELS,
  RELATORIO_TYPE_ICONS,
  RELATORIO_TYPE_DESCS,
  getStatusColor,
  formatDate,
} from '../utils/helpers'
import type {
  RelatorioType,
  RelatorioKPIs,
  RelatorioCreativePerf,
  RelatorioDecisionEntry,
  RelatorioContent,
  Relatorio,
} from '../types'

// ── constants ─────────────────────────────────────────────────────────────────
const REPORT_TYPES: RelatorioType[] = [
  'diario', 'semanal', 'mensal', 'por_produto', 'por_campanha', 'por_canal',
]

const GEN_STEPS = [
  'Coletando métricas do período...',
  'Analisando campanhas ativas...',
  'Computando KPIs financeiros...',
  'Identificando padrões de performance...',
  'Analisando decisões e ações tomadas...',
  'Gerando resumo executivo com IA...',
  'Finalizando relatório...',
]

const CHANNEL_OPTIONS = [
  'Meta Ads', 'TikTok Ads', 'Google Ads', 'YouTube Ads', 'Native Ads', 'Outro',
]

// ── period helpers ─────────────────────────────────────────────────────────────
type PeriodPreset = 'hoje' | '7d' | '30d' | '90d' | 'custom'

function computeDateRange(preset: PeriodPreset, customStart: string, customEnd: string): { start: string; end: string; label: string } {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const todayStr = today.toISOString().split('T')[0]

  if (preset === 'hoje') {
    const s = todayStr
    return { start: s, end: s, label: `Hoje (${formatDate(s)})` }
  }
  if (preset === '7d') {
    const s = new Date(today); s.setDate(s.getDate() - 6)
    const ss = s.toISOString().split('T')[0]
    return { start: ss, end: todayStr, label: `Últimos 7 dias` }
  }
  if (preset === '30d') {
    const s = new Date(today); s.setDate(s.getDate() - 29)
    const ss = s.toISOString().split('T')[0]
    return { start: ss, end: todayStr, label: `Últimos 30 dias` }
  }
  if (preset === '90d') {
    const s = new Date(today); s.setDate(s.getDate() - 89)
    const ss = s.toISOString().split('T')[0]
    return { start: ss, end: todayStr, label: `Últimos 90 dias` }
  }
  // custom
  return {
    start: customStart || todayStr,
    end: customEnd || todayStr,
    label: `${formatDate(customStart || todayStr)} – ${formatDate(customEnd || todayStr)}`,
  }
}

// ── fallback content ───────────────────────────────────────────────────────────
function fallbackContent(): RelatorioContent {
  return {
    resumo_executivo: 'Servidor de IA indisponível. Relatório gerado com dados locais apenas. Reconecte para análise qualitativa completa.',
    principais_aprendizados: [
      'Análise automática indisponível — revise os dados manualmente.',
      'Verifique a conectividade com o servidor de IA.',
      'Os KPIs financeiros acima foram calculados localmente e são precisos.',
    ],
    acoes_tomadas: [
      'Dados coletados e KPIs calculados automaticamente.',
      'Criativos ranqueados por ROAS.',
      'Decisões do período listadas.',
    ],
    riscos_identificados: [
      'Sem análise qualitativa disponível neste momento.',
      'Revise criativos com ROAS < 1 manualmente.',
      'Verifique campanhas com alto gasto e baixa conversão.',
    ],
    oportunidades: [
      'Tente gerar novamente quando o servidor estiver disponível.',
      'Criativos vencedores podem ser escalados manualmente.',
      'Analise os dados exportados em CSV para insights adicionais.',
    ],
    proximos_passos: [
      'Reconectar ao servidor de IA para análise completa.',
      'Revisar KPIs financeiros detalhados.',
      'Analisar criativos vencedores e perdedores.',
    ],
    recomendacoes: [
      'Mantenha métricas atualizadas para relatórios mais precisos.',
      'Registre decisões regularmente para análise histórica.',
      'Configure alertas para ROAS abaixo do mínimo aceitável.',
    ],
  }
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── section list ───────────────────────────────────────────────────────────────
function SectionList({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export default function Relatorios() {
  // ── view state ────────────────────────────────────────────────────────────
  const [view, setView] = useState<'form' | 'generating' | 'result' | 'history'>('form')
  const [activeTab, setActiveTab] = useState<'overview' | 'criativos' | 'decisoes' | 'estrategia'>('overview')

  // ── form state ────────────────────────────────────────────────────────────
  const [reportType, setReportType]       = useState<RelatorioType>('semanal')
  const [periodPreset, setPeriodPreset]   = useState<PeriodPreset>('7d')
  const [customStart, setCustomStart]     = useState('')
  const [customEnd, setCustomEnd]         = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedChannel, setSelectedChannel]   = useState('')

  // ── generation state ──────────────────────────────────────────────────────
  const [genStep, setGenStep]     = useState(0)
  const [genError, setGenError]   = useState('')
  const genStepRef  = useRef(0)
  const apiDoneRef  = useRef(false)
  const apiResultRef = useRef<RelatorioContent | null>(null)

  // ── current report ────────────────────────────────────────────────────────
  const [currentReport, setCurrentReport] = useState<Relatorio | null>(null)

  // ── history ───────────────────────────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState<RelatorioType | 'all'>('all')
  const [selectedHistory, setSelectedHistory] = useState<Relatorio | null>(null)

  // ── data helpers ──────────────────────────────────────────────────────────
  const products  = tosDb.products.getAll()
  const campaigns = tosDb.campaigns.getAll()

  // ── aggregate metrics for a date range ───────────────────────────────────
  const aggregateData = useCallback((startDate: string, endDate: string, filters: {
    productId?: string; campaignId?: string; channel?: string
  }) => {
    let metrics = tosDb.metrics.getAll().filter(m => m.date >= startDate && m.date <= endDate)

    if (filters.productId)  metrics = metrics.filter(m => m.product_id  === filters.productId)
    if (filters.campaignId) metrics = metrics.filter(m => m.campaign_id === filters.campaignId)
    if (filters.channel)    metrics = metrics.filter(m =>
      m.channel?.toLowerCase().includes(filters.channel!.toLowerCase()))

    const kpis: RelatorioKPIs = {
      total_spend:      metrics.reduce((s, m) => s + (m.spend       || 0), 0),
      total_revenue:    metrics.reduce((s, m) => s + (m.revenue     || 0), 0),
      profit:           0,
      avg_roas:         0,
      avg_cpa:          0,
      avg_ctr:          0,
      avg_cpc:          0,
      total_conversions: metrics.reduce((s, m) => s + (m.conversions || 0), 0),
      total_impressions: metrics.reduce((s, m) => s + (m.impressions || 0), 0),
      total_clicks:     metrics.reduce((s, m) => s + (m.clicks      || 0), 0),
      total_leads:      metrics.reduce((s, m) => s + (m.leads       || 0), 0),
    }
    kpis.profit   = kpis.total_revenue - kpis.total_spend
    kpis.avg_roas = kpis.total_spend > 0 ? kpis.total_revenue / kpis.total_spend : 0
    kpis.avg_cpa  = kpis.total_conversions > 0 ? kpis.total_spend / kpis.total_conversions : 0
    kpis.avg_ctr  = kpis.total_impressions > 0 ? (kpis.total_clicks / kpis.total_impressions) * 100 : 0
    kpis.avg_cpc  = kpis.total_clicks > 0 ? kpis.total_spend / kpis.total_clicks : 0

    // Creative performance
    const creativeMap = new Map<string, { spend: number; revenue: number; clicks: number; impressions: number; conversions: number }>()
    metrics.forEach(m => {
      if (!m.creative_id) return
      const ex = creativeMap.get(m.creative_id) ?? { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 }
      ex.spend       += m.spend       || 0
      ex.revenue     += m.revenue     || 0
      ex.clicks      += m.clicks      || 0
      ex.impressions += m.impressions || 0
      ex.conversions += m.conversions || 0
      creativeMap.set(m.creative_id, ex)
    })

    const allCreatives = tosDb.creatives.getAll()
    const creativePerf: RelatorioCreativePerf[] = []

    creativeMap.forEach((v, creativeId) => {
      const c = allCreatives.find(x => x.id === creativeId)
      const roas = v.spend > 0 ? v.revenue / v.spend : 0
      const ctr  = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0
      const cpa  = v.conversions > 0 ? v.spend / v.conversions : 0
      creativePerf.push({
        creative_id:   creativeId,
        creative_name: c?.name ?? `Criativo ${creativeId.slice(-4)}`,
        spend:         v.spend,
        revenue:       v.revenue,
        roas,
        ctr,
        cpa,
        status:        c?.status ?? 'testing',
      })
    })

    creativePerf.sort((a, b) => b.roas - a.roas)
    const median  = creativePerf.length > 0 ? creativePerf[Math.floor(creativePerf.length / 2)].roas : 1
    const winners = creativePerf.filter(c => c.roas >= Math.max(median, 1.5)).slice(0, 5)
    const losers  = creativePerf.filter(c => c.roas < Math.max(median * 0.5, 0.8) || c.roas < 1).slice(0, 5)

    // Decisions
    let decisions = tosDb.decisions.getAll()
      .filter(d => d.created_at >= startDate && d.created_at <= endDate + 'T23:59:59')

    if (filters.productId)  decisions = decisions.filter(d => d.product_id === filters.productId)
    if (filters.campaignId) decisions = decisions.filter(d => d.campaign_id === filters.campaignId)

    const decisionEntries: RelatorioDecisionEntry[] = decisions.slice(0, 20).map(d => ({
      id:            d.id,
      title:         d.title ?? d.decision_type,
      decision_type: d.decision_type,
      priority:      d.priority,
      status:        d.status,
      created_at:    d.created_at,
    }))

    return { kpis, winners, losers, decisions: decisionEntries }
  }, [])

  // ── pending data ref for finalize ─────────────────────────────────────────
  const pendingDataRef = useRef<{
    kpis: RelatorioKPIs
    winners: RelatorioCreativePerf[]
    losers:  RelatorioCreativePerf[]
    decisions: RelatorioDecisionEntry[]
    periodLabel: string
    periodStart: string
    periodEnd: string
    productId: string
    productName: string
    campaignId: string
    campaignName: string
    channel: string
  } | null>(null)

  // ── finalize report ───────────────────────────────────────────────────────
  const finalizeReport = useCallback(() => {
    const data    = pendingDataRef.current
    const content = apiResultRef.current
    if (!data || !content) return

    const typeLabel = RELATORIO_TYPE_LABELS[reportType] ?? reportType
    const contextPart = data.productName ? ` · ${data.productName}` :
                        data.campaignName ? ` · ${data.campaignName}` :
                        data.channel ? ` · ${data.channel}` : ''
    const title = `${typeLabel}${contextPart} — ${data.periodLabel}`

    const relatorio: Relatorio = {
      id:            generateId(),
      type:          reportType,
      title,
      period_label:  data.periodLabel,
      period_start:  data.periodStart,
      period_end:    data.periodEnd,
      product_id:    data.productId,
      product_name:  data.productName,
      campaign_id:   data.campaignId,
      campaign_name: data.campaignName,
      channel:       data.channel,
      kpis:          data.kpis,
      winners:       data.winners,
      losers:        data.losers,
      decisions:     data.decisions,
      content,
      status:        'pronto',
      created_at:    now(),
    }

    tosDb.relatorios.save(relatorio)
    setCurrentReport(relatorio)
    setActiveTab('overview')
    setView('result')
  }, [reportType])

  // ── generate report ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenError('')
    setGenStep(0)
    genStepRef.current  = 0
    apiDoneRef.current  = false
    apiResultRef.current = null
    setView('generating')

    const { start, end, label } = computeDateRange(periodPreset, customStart, customEnd)

    const productId   = reportType === 'por_produto'  ? selectedProduct  : ''
    const campaignId  = reportType === 'por_campanha' ? selectedCampaign : ''
    const channel     = reportType === 'por_canal'    ? selectedChannel  : ''
    const productName  = productId  ? (products.find(p => p.id === productId)?.name  ?? '') : ''
    const campaignName = campaignId ? (campaigns.find(c => c.id === campaignId)?.name ?? '') : ''

    const { kpis, winners, losers, decisions } = aggregateData(start, end, { productId, campaignId, channel })

    pendingDataRef.current = {
      kpis, winners, losers, decisions,
      periodLabel: label, periodStart: start, periodEnd: end,
      productId, productName, campaignId, campaignName, channel,
    }

    // Animation
    const interval = setInterval(() => {
      genStepRef.current += 1
      setGenStep(genStepRef.current)
      if (genStepRef.current >= GEN_STEPS.length - 1) {
        clearInterval(interval)
        if (apiDoneRef.current) finalizeReport()
      }
    }, 420)

    // API call
    try {
      const res = await fetch('/api/relatorio-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:          reportType,
          period_label:  label,
          kpis,
          winners:       winners.map(w => ({
            creative_name: w.creative_name,
            spend: w.spend, revenue: w.revenue,
            roas: w.roas, ctr: w.ctr, cpa: w.cpa,
          })),
          losers:        losers.map(l => ({
            creative_name: l.creative_name,
            spend: l.spend, revenue: l.revenue,
            roas: l.roas, ctr: l.ctr, cpa: l.cpa,
          })),
          decisions:     decisions.map(d => ({
            title: d.title, decision_type: d.decision_type,
            priority: d.priority, status: d.status,
          })),
          ...(productName  ? { product_name:  productName  } : {}),
          ...(campaignName ? { campaign_name: campaignName } : {}),
          ...(channel      ? { channel                     } : {}),
        }),
      })

      const data: RelatorioContent = await res.json()
      if (data.resumo_executivo) {
        apiResultRef.current = data
      } else {
        apiResultRef.current = fallbackContent()
      }
    } catch {
      apiResultRef.current = fallbackContent()
    }

    apiDoneRef.current = true
    if (genStepRef.current >= GEN_STEPS.length - 1) {
      clearInterval(interval)
      finalizeReport()
    }
  }, [
    reportType, periodPreset, customStart, customEnd,
    selectedProduct, selectedCampaign, selectedChannel,
    products, campaigns, aggregateData, finalizeReport,
  ])

  // ── exports ───────────────────────────────────────────────────────────────
  const exportPDF = useCallback((r: Relatorio) => {
    const win = window.open('', '_blank')
    if (!win) return
    const kpis = r.kpis
    win.document.write(`<!DOCTYPE html><html><head>
<title>${r.title}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
  th { background: #f5f5f5; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 2px solid #333; padding-bottom: 6px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 14px; }
  .roas-good { color: green; } .roas-warn { color: orange; } .roas-bad { color: red; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<h1>${r.title}</h1>
<div class="subtitle">Período: ${r.period_label} · Gerado em: ${formatDate(r.created_at)}</div>

<h2>KPIs Financeiros</h2>
<table>
<tr><th>Métrica</th><th>Valor</th></tr>
<tr><td>Gasto Total</td><td>R$ ${kpis.total_spend.toFixed(2)}</td></tr>
<tr><td>Receita Total</td><td>R$ ${kpis.total_revenue.toFixed(2)}</td></tr>
<tr><td>Lucro/Prejuízo</td><td class="${kpis.profit >= 0 ? 'roas-good' : 'roas-bad'}">R$ ${kpis.profit.toFixed(2)}</td></tr>
<tr><td>ROAS Médio</td><td class="${kpis.avg_roas >= 2 ? 'roas-good' : kpis.avg_roas >= 1 ? 'roas-warn' : 'roas-bad'}">${kpis.avg_roas.toFixed(2)}x</td></tr>
<tr><td>CPA Médio</td><td>${kpis.avg_cpa > 0 ? 'R$ ' + kpis.avg_cpa.toFixed(2) : '—'}</td></tr>
<tr><td>CTR Médio</td><td>${kpis.avg_ctr.toFixed(2)}%</td></tr>
<tr><td>Conversões</td><td>${kpis.total_conversions}</td></tr>
<tr><td>Leads</td><td>${kpis.total_leads}</td></tr>
<tr><td>Impressões</td><td>${kpis.total_impressions.toLocaleString('pt-BR')}</td></tr>
<tr><td>Cliques</td><td>${kpis.total_clicks.toLocaleString('pt-BR')}</td></tr>
</table>

<h2>Resumo Executivo</h2>
<p style="font-size:14px;line-height:1.6">${r.content.resumo_executivo}</p>

${r.winners.length > 0 ? `<h2>Criativos Vencedores</h2>
<table>
<tr><th>Criativo</th><th>Gasto</th><th>Receita</th><th>ROAS</th><th>CTR</th></tr>
${r.winners.map(w => `<tr><td>${w.creative_name}</td><td>R$ ${w.spend.toFixed(0)}</td><td>R$ ${w.revenue.toFixed(0)}</td><td class="roas-good">${w.roas.toFixed(2)}x</td><td>${w.ctr.toFixed(2)}%</td></tr>`).join('')}
</table>` : ''}

${r.losers.length > 0 ? `<h2>Criativos Perdedores</h2>
<table>
<tr><th>Criativo</th><th>Gasto</th><th>ROAS</th><th>CTR</th></tr>
${r.losers.map(l => `<tr><td>${l.creative_name}</td><td>R$ ${l.spend.toFixed(0)}</td><td class="roas-bad">${l.roas.toFixed(2)}x</td><td>${l.ctr.toFixed(2)}%</td></tr>`).join('')}
</table>` : ''}

<h2>Principais Aprendizados</h2>
<ul>${r.content.principais_aprendizados.map(x => `<li>${x}</li>`).join('')}</ul>

<h2>Ações Tomadas</h2>
<ul>${r.content.acoes_tomadas.map(x => `<li>${x}</li>`).join('')}</ul>

<h2>Riscos Identificados</h2>
<ul>${r.content.riscos_identificados.map(x => `<li>${x}</li>`).join('')}</ul>

<h2>Oportunidades</h2>
<ul>${r.content.oportunidades.map(x => `<li>${x}</li>`).join('')}</ul>

<h2>Próximos Passos</h2>
<ul>${r.content.proximos_passos.map(x => `<li>${x}</li>`).join('')}</ul>

<h2>Recomendações</h2>
<ul>${r.content.recomendacoes.map(x => `<li>${x}</li>`).join('')}</ul>

</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }, [])

  const exportText = useCallback((r: Relatorio) => {
    const lines: string[] = [
      `RELATÓRIO EXECUTIVO — ${r.title}`,
      `Período: ${r.period_label} | Gerado: ${formatDate(r.created_at)}`,
      '',
      '═══ KPIs FINANCEIROS ═══',
      `Gasto Total:   R$ ${r.kpis.total_spend.toFixed(2)}`,
      `Receita Total: R$ ${r.kpis.total_revenue.toFixed(2)}`,
      `Lucro:         R$ ${r.kpis.profit.toFixed(2)}`,
      `ROAS Médio:    ${r.kpis.avg_roas.toFixed(2)}x`,
      `CPA Médio:     ${r.kpis.avg_cpa > 0 ? 'R$ ' + r.kpis.avg_cpa.toFixed(2) : '—'}`,
      `CTR Médio:     ${r.kpis.avg_ctr.toFixed(2)}%`,
      `Conversões:    ${r.kpis.total_conversions}`,
      `Leads:         ${r.kpis.total_leads}`,
      '',
      '═══ RESUMO EXECUTIVO ═══',
      r.content.resumo_executivo,
      '',
      '═══ PRINCIPAIS APRENDIZADOS ═══',
      ...r.content.principais_aprendizados.map((x, i) => `${i + 1}. ${x}`),
      '',
      '═══ AÇÕES TOMADAS ═══',
      ...r.content.acoes_tomadas.map((x, i) => `${i + 1}. ${x}`),
      '',
      '═══ RISCOS IDENTIFICADOS ═══',
      ...r.content.riscos_identificados.map((x, i) => `${i + 1}. ${x}`),
      '',
      '═══ OPORTUNIDADES ═══',
      ...r.content.oportunidades.map((x, i) => `${i + 1}. ${x}`),
      '',
      '═══ PRÓXIMOS PASSOS ═══',
      ...r.content.proximos_passos.map((x, i) => `${i + 1}. ${x}`),
      '',
      '═══ RECOMENDAÇÕES ═══',
      ...r.content.recomendacoes.map((x, i) => `${i + 1}. ${x}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${r.type}-${r.period_start}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportCSV = useCallback((r: Relatorio) => {
    const rows: string[][] = []
    rows.push(['Relatório', r.title])
    rows.push(['Período', r.period_label])
    rows.push(['Gerado em', formatDate(r.created_at)])
    rows.push([])
    rows.push(['KPI', 'Valor'])
    rows.push(['Gasto Total', `R$ ${r.kpis.total_spend.toFixed(2)}`])
    rows.push(['Receita Total', `R$ ${r.kpis.total_revenue.toFixed(2)}`])
    rows.push(['Lucro/Prejuízo', `R$ ${r.kpis.profit.toFixed(2)}`])
    rows.push(['ROAS Médio', `${r.kpis.avg_roas.toFixed(2)}x`])
    rows.push(['CPA Médio', r.kpis.avg_cpa > 0 ? `R$ ${r.kpis.avg_cpa.toFixed(2)}` : '—'])
    rows.push(['CTR Médio', `${r.kpis.avg_ctr.toFixed(2)}%`])
    rows.push(['CPC Médio', r.kpis.avg_cpc > 0 ? `R$ ${r.kpis.avg_cpc.toFixed(2)}` : '—'])
    rows.push(['Conversões', String(r.kpis.total_conversions)])
    rows.push(['Leads', String(r.kpis.total_leads)])
    rows.push(['Impressões', String(r.kpis.total_impressions)])
    rows.push(['Cliques', String(r.kpis.total_clicks)])

    if (r.winners.length > 0) {
      rows.push([])
      rows.push(['Criativos Vencedores', 'Gasto', 'Receita', 'ROAS', 'CTR', 'CPA'])
      r.winners.forEach(w => rows.push([w.creative_name, `R$ ${w.spend.toFixed(2)}`, `R$ ${w.revenue.toFixed(2)}`, `${w.roas.toFixed(2)}x`, `${w.ctr.toFixed(2)}%`, w.cpa > 0 ? `R$ ${w.cpa.toFixed(2)}` : '—']))
    }

    if (r.losers.length > 0) {
      rows.push([])
      rows.push(['Criativos Perdedores', 'Gasto', 'Receita', 'ROAS', 'CTR', 'CPA'])
      r.losers.forEach(l => rows.push([l.creative_name, `R$ ${l.spend.toFixed(2)}`, `R$ ${l.revenue.toFixed(2)}`, `${l.roas.toFixed(2)}x`, `${l.ctr.toFixed(2)}%`, l.cpa > 0 ? `R$ ${l.cpa.toFixed(2)}` : '—']))
    }

    const csv = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${r.type}-${r.period_start}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Relatórios Executivos</h1>
          <p className="text-sm text-gray-400 mt-1">Análise automática de performance com IA</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setView('form'); setCurrentReport(null) }}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              view === 'form' || view === 'generating'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            + Novo Relatório
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              view === 'history'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* ── FORM ── */}
      {view === 'form' && (
        <div className="space-y-6">
          {/* Report type */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Tipo de Relatório</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt}
                  onClick={() => setReportType(rt)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    reportType === rt
                      ? 'border-violet-500 bg-violet-600/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="text-xl mb-1">{RELATORIO_TYPE_ICONS[rt]}</div>
                  <div className={`text-sm font-semibold ${reportType === rt ? 'text-violet-400' : 'text-white'}`}>
                    {RELATORIO_TYPE_LABELS[rt]}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{RELATORIO_TYPE_DESCS[rt]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Período</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {(['hoje', '7d', '30d', '90d', 'custom'] as PeriodPreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodPreset(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    periodPreset === p
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {{ hoje: 'Hoje', '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', '90d': 'Últimos 90 dias', custom: 'Personalizado' }[p]}
                </button>
              ))}
            </div>
            {periodPreset === 'custom' && (
              <div className="flex gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Data início</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Data fim</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Conditional filters */}
          {reportType === 'por_produto' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Selecionar Produto</h2>
              {products.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum produto cadastrado.</p>
              ) : (
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Todos os produtos</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {reportType === 'por_campanha' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Selecionar Campanha</h2>
              {campaigns.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma campanha cadastrada.</p>
              ) : (
                <select
                  value={selectedCampaign}
                  onChange={e => setSelectedCampaign(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Todas as campanhas</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {reportType === 'por_canal' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Selecionar Canal</h2>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(selectedChannel === ch ? '' : ch)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      selectedChannel === ch
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}

          {genError && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-sm text-red-400">
              {genError}
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
          >
            Gerar Relatório com IA →
          </button>
        </div>
      )}

      {/* ── GENERATING ── */}
      {view === 'generating' && (
        <div className="flex flex-col items-center justify-center min-h-96 space-y-8">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">📊</div>
            <h2 className="text-xl font-bold text-white mb-2">Gerando Relatório...</h2>
            <p className="text-sm text-gray-400">Analisando dados e criando relatório executivo com IA</p>
          </div>

          <div className="w-full max-w-md space-y-2">
            {GEN_STEPS.map((step, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                idx < genStep  ? 'bg-emerald-900/20 border border-emerald-800/40' :
                idx === genStep ? 'bg-violet-900/20 border border-violet-700/40' :
                'bg-gray-900/50 border border-gray-800/40'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  idx < genStep  ? 'bg-emerald-600' :
                  idx === genStep ? 'bg-violet-600 animate-pulse' :
                  'bg-gray-700'
                }`}>
                  {idx < genStep ? '✓' : idx === genStep ? '●' : ''}
                </div>
                <span className={`text-sm ${
                  idx < genStep  ? 'text-emerald-400' :
                  idx === genStep ? 'text-violet-300 font-medium' :
                  'text-gray-600'
                }`}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {view === 'result' && currentReport && (
        <div className="space-y-5">
          {/* Result header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{RELATORIO_TYPE_ICONS[currentReport.type]}</span>
                  <span className="text-xs bg-violet-900/40 text-violet-400 px-2 py-0.5 rounded-full">
                    {RELATORIO_TYPE_LABELS[currentReport.type]}
                  </span>
                  <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">Pronto</span>
                </div>
                <h2 className="text-lg font-bold text-white">{currentReport.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Gerado em {formatDate(currentReport.created_at)}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => exportPDF(currentReport)}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 hover:text-white rounded-lg font-medium transition-colors"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => exportText(currentReport)}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 hover:text-white rounded-lg font-medium transition-colors"
                >
                  📝 TXT
                </button>
                <button
                  onClick={() => exportCSV(currentReport)}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 hover:text-white rounded-lg font-medium transition-colors"
                >
                  📊 CSV
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {(['overview', 'criativos', 'decisoes', 'estrategia'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {{ overview: '📈 Visão Geral', criativos: '🎨 Criativos', decisoes: '🤖 Decisões', estrategia: '🧠 Estratégia' }[tab]}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* KPI grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Gasto Total" value={`R$ ${currentReport.kpis.total_spend.toFixed(2)}`} />
                <KpiCard
                  label="Receita Total"
                  value={`R$ ${currentReport.kpis.total_revenue.toFixed(2)}`}
                  color="text-emerald-400"
                />
                <KpiCard
                  label="Lucro / Prejuízo"
                  value={`R$ ${currentReport.kpis.profit.toFixed(2)}`}
                  sub={currentReport.kpis.profit >= 0 ? 'LUCRO' : 'PREJUÍZO'}
                  color={currentReport.kpis.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <KpiCard
                  label="ROAS Médio"
                  value={`${currentReport.kpis.avg_roas.toFixed(2)}x`}
                  sub={currentReport.kpis.avg_roas >= 2 ? '✅ Bom' : currentReport.kpis.avg_roas >= 1 ? '⚠️ Atenção' : '🔴 Crítico'}
                  color={currentReport.kpis.avg_roas >= 2 ? 'text-emerald-400' : currentReport.kpis.avg_roas >= 1 ? 'text-amber-400' : 'text-red-400'}
                />
                <KpiCard label="CPA Médio" value={currentReport.kpis.avg_cpa > 0 ? `R$ ${currentReport.kpis.avg_cpa.toFixed(2)}` : '—'} />
                <KpiCard label="CTR Médio" value={`${currentReport.kpis.avg_ctr.toFixed(2)}%`} />
                <KpiCard label="Conversões" value={String(currentReport.kpis.total_conversions)} />
                <KpiCard label="Leads" value={String(currentReport.kpis.total_leads)} />
              </div>

              {/* Executive summary */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span>📋</span> Resumo Executivo
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {currentReport.content.resumo_executivo}
                </p>
              </div>

              {/* Impressions / clicks */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Impressões"
                  value={currentReport.kpis.total_impressions.toLocaleString('pt-BR')}
                />
                <KpiCard
                  label="Cliques"
                  value={currentReport.kpis.total_clicks.toLocaleString('pt-BR')}
                />
              </div>
            </div>
          )}

          {activeTab === 'criativos' && (
            <div className="space-y-5">
              {/* Winners */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  🏆 Criativos Vencedores ({currentReport.winners.length})
                </h3>
                {currentReport.winners.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum criativo vencedor identificado no período.</p>
                ) : (
                  <div className="space-y-2">
                    {currentReport.winners.map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-emerald-900/10 border border-emerald-800/30 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{w.creative_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Gasto: R${w.spend.toFixed(0)} · Receita: R${w.revenue.toFixed(0)} · CTR: {w.ctr.toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400">{w.roas.toFixed(2)}x</div>
                          <div className="text-xs text-gray-500">ROAS</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Losers */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
                  📉 Criativos Perdedores ({currentReport.losers.length})
                </h3>
                {currentReport.losers.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum criativo perdedor identificado no período.</p>
                ) : (
                  <div className="space-y-2">
                    {currentReport.losers.map((l, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-900/10 border border-red-800/30 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{l.creative_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Gasto: R${l.spend.toFixed(0)} · CTR: {l.ctr.toFixed(2)}%
                            {l.cpa > 0 ? ` · CPA: R$${l.cpa.toFixed(0)}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-400">{l.roas.toFixed(2)}x</div>
                          <div className="text-xs text-gray-500">ROAS</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'decisoes' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">
                Decisões no Período ({currentReport.decisions.length})
              </h3>
              {currentReport.decisions.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma decisão registrada no período.</p>
              ) : (
                <div className="space-y-2">
                  {currentReport.decisions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-white">{d.title || d.decision_type}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{formatDate(d.created_at)}</div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(d.priority)}`}>
                          {d.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(d.status)}`}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'estrategia' && (
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
                <SectionList
                  title="Principais Aprendizados"
                  items={currentReport.content.principais_aprendizados}
                  icon="💡"
                />
                <SectionList
                  title="Ações Tomadas"
                  items={currentReport.content.acoes_tomadas}
                  icon="✅"
                />
                <SectionList
                  title="Riscos Identificados"
                  items={currentReport.content.riscos_identificados}
                  icon="⚠️"
                />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
                <SectionList
                  title="Oportunidades"
                  items={currentReport.content.oportunidades}
                  icon="🚀"
                />
                <SectionList
                  title="Próximos Passos"
                  items={currentReport.content.proximos_passos}
                  icon="📌"
                />
                <SectionList
                  title="Recomendações"
                  items={currentReport.content.recomendacoes}
                  icon="🎯"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {view === 'history' && (
        <div className="space-y-5">
          {selectedHistory ? (
            /* History detail view */
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                  ← Voltar
                </button>
              </div>

              {/* Reuse result display for selected history */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{RELATORIO_TYPE_ICONS[selectedHistory.type]}</span>
                      <span className="text-xs bg-violet-900/40 text-violet-400 px-2 py-0.5 rounded-full">
                        {RELATORIO_TYPE_LABELS[selectedHistory.type]}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{selectedHistory.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Gerado em {formatDate(selectedHistory.created_at)}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => exportPDF(selectedHistory)} className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 hover:text-white rounded-lg font-medium transition-colors">📄 PDF</button>
                    <button onClick={() => exportText(selectedHistory)} className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 hover:text-white rounded-lg font-medium transition-colors">📝 TXT</button>
                    <button onClick={() => exportCSV(selectedHistory)} className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 hover:text-white rounded-lg font-medium transition-colors">📊 CSV</button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir este relatório?')) {
                          tosDb.relatorios.delete(selectedHistory.id)
                          setSelectedHistory(null)
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-lg font-medium transition-colors"
                    >
                      🗑 Excluir
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Gasto Total" value={`R$ ${selectedHistory.kpis.total_spend.toFixed(2)}`} />
                <KpiCard label="Receita Total" value={`R$ ${selectedHistory.kpis.total_revenue.toFixed(2)}`} color="text-emerald-400" />
                <KpiCard
                  label="Lucro / Prejuízo"
                  value={`R$ ${selectedHistory.kpis.profit.toFixed(2)}`}
                  color={selectedHistory.kpis.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <KpiCard
                  label="ROAS Médio"
                  value={`${selectedHistory.kpis.avg_roas.toFixed(2)}x`}
                  color={selectedHistory.kpis.avg_roas >= 2 ? 'text-emerald-400' : selectedHistory.kpis.avg_roas >= 1 ? 'text-amber-400' : 'text-red-400'}
                />
              </div>

              {/* Executive summary */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">📋 Resumo Executivo</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{selectedHistory.content.resumo_executivo}</p>
              </div>

              {/* Strategy sections */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
                  <SectionList title="Principais Aprendizados" items={selectedHistory.content.principais_aprendizados} icon="💡" />
                  <SectionList title="Riscos" items={selectedHistory.content.riscos_identificados} icon="⚠️" />
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
                  <SectionList title="Oportunidades" items={selectedHistory.content.oportunidades} icon="🚀" />
                  <SectionList title="Próximos Passos" items={selectedHistory.content.proximos_passos} icon="📌" />
                </div>
              </div>
            </div>
          ) : (
            /* History list */
            <>
              {/* Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    historyFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                {REPORT_TYPES.map(rt => (
                  <button
                    key={rt}
                    onClick={() => setHistoryFilter(rt)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      historyFilter === rt ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {RELATORIO_TYPE_ICONS[rt]} {RELATORIO_TYPE_LABELS[rt]}
                  </button>
                ))}
              </div>

              {/* List */}
              {(() => {
                const reports = tosDb.relatorios.getAll()
                  .filter(r => historyFilter === 'all' || r.type === historyFilter)

                if (reports.length === 0) {
                  return (
                    <div className="text-center py-16 text-gray-500">
                      <div className="text-4xl mb-3">📊</div>
                      <p className="text-sm">Nenhum relatório encontrado.</p>
                      <button
                        onClick={() => setView('form')}
                        className="mt-4 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
                      >
                        Gerar Primeiro Relatório
                      </button>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    {reports.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedHistory(r)}
                        className="w-full bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 text-left transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{RELATORIO_TYPE_ICONS[r.type]}</span>
                            <div>
                              <div className="text-sm font-semibold text-white">{r.title}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{formatDate(r.created_at)} · {r.period_label}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <div className={`text-sm font-bold ${r.kpis.avg_roas >= 2 ? 'text-emerald-400' : r.kpis.avg_roas >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                                {r.kpis.avg_roas.toFixed(2)}x ROAS
                              </div>
                              <div className="text-xs text-gray-500">R$ {r.kpis.total_spend.toFixed(0)} gasto</div>
                            </div>
                            <span className="text-gray-600">›</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
