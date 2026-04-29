import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getStatusColor,
  CREATIVE_CHANNEL_LABELS,
  AI_CREATIVE_STATUS_LABELS,
} from '../utils/helpers'
import type { PerformanceInsight } from '../types'

const CHANNELS = ['meta_ads', 'tiktok_ads', 'google_search', 'google_display', 'youtube_ads', 'native_ads']

function KpiCard({ label, value, sub, color = 'white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function RankTable({
  title, icon, rows, valueKey, valueFormat, ascending,
}: {
  title: string
  icon: string
  rows: Array<{ id: string; name: string; value: number; product: string; status: string }>
  valueKey: string
  valueFormat: (n: number) => string
  ascending?: boolean
}) {
  const sorted = [...rows]
    .filter(r => r.value > 0)
    .sort((a, b) => ascending ? a.value - b.value : b.value - a.value)
    .slice(0, 10)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <span>{icon}</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="p-6 text-center text-gray-600 text-xs">Sem dados ainda</div>
      ) : (
        <div className="divide-y divide-gray-800/50">
          {sorted.map((row, i) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs text-gray-600 w-4 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{row.name}</div>
                <div className="text-[10px] text-gray-600 truncate">{row.product}</div>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(row.status)}`}>
                {AI_CREATIVE_STATUS_LABELS[row.status] ?? row.status}
              </span>
              <span className={`text-xs font-semibold flex-shrink-0 ${
                valueKey === 'cpa' ? 'text-emerald-400' :
                row.value >= 2 ? 'text-emerald-400' :
                row.value >= 1 ? 'text-amber-400' : 'text-white'
              }`}>
                {valueFormat(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Metricas() {
  const navigate = useNavigate()

  const [productFilter, setProductFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsPanel, setInsightsPanel] = useState<PerformanceInsight | null>(null)

  const allMetrics = tosDb.metrics.getAll()
  const allCreatives = tosDb.aiCreatives.getAll()
  const products = tosDb.products.getAll()
  const aiCampaigns = tosDb.aiCampaigns.getAll()

  const filtered = allMetrics.filter(m => {
    if (productFilter && m.product_id !== productFilter) return false
    if (campaignFilter && m.campaign_id !== campaignFilter) return false
    if (channelFilter && m.channel !== channelFilter) return false
    if (dateFrom && m.date < dateFrom) return false
    if (dateTo && m.date > dateTo) return false
    return true
  }).sort((a, b) => b.date.localeCompare(a.date))

  // KPIs from filtered metric records
  const totalSpend = filtered.reduce((s, m) => s + m.spend, 0)
  const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0)
  const totalImpressions = filtered.reduce((s, m) => s + m.impressions, 0)
  const totalClicks = filtered.reduce((s, m) => s + m.clicks, 0)
  const totalLeads = filtered.reduce((s, m) => s + (m.leads ?? 0), 0)
  const totalConversions = filtered.reduce((s, m) => s + m.conversions, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  // Creative stats from aggregated creative data
  const filteredCreatives = allCreatives.filter(c => {
    if (productFilter && c.product_id !== productFilter) return false
    if (campaignFilter && c.campaign_id !== campaignFilter) return false
    if (channelFilter && c.channel !== channelFilter) return false
    return c.spend > 0
  })
  const winners = filteredCreatives.filter(c => c.status === 'vencedor' || c.status === 'escalar').length
  const losers = filteredCreatives.filter(c => c.status === 'perdedor' || c.status === 'pausado').length

  // Ranking rows
  const rankRows = filteredCreatives.map(c => ({
    id: c.id,
    name: c.strategy?.nome ?? c.id,
    product: products.find(p => p.id === c.product_id)?.name ?? '—',
    status: c.status,
    ctr: c.ctr,
    roas: c.roas,
    cpa: c.cpa,
    spend: c.spend,
  }))

  // Worst by spend: high spend + low ROAS
  const worstBySpend = [...filteredCreatives]
    .filter(c => c.spend > 0)
    .sort((a, b) => {
      const scoreA = a.spend * (1 / Math.max(a.roas, 0.01))
      const scoreB = b.spend * (1 / Math.max(b.roas, 0.01))
      return scoreB - scoreA
    })
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      name: c.strategy?.nome ?? c.id,
      product: products.find(p => p.id === c.product_id)?.name ?? '—',
      status: c.status,
      value: c.spend,
    }))

  async function generateInsights() {
    setInsightsLoading(true)
    try {
      const topCreatives = filteredCreatives
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 20)
        .map(c => ({
          nome: c.strategy?.nome,
          canal: c.channel,
          angulo: c.angle,
          status: c.status,
          ctr: c.ctr.toFixed(2),
          cpc: c.cpc.toFixed(2),
          cpa: c.cpa.toFixed(2),
          roas: c.roas.toFixed(2),
          gasto: c.spend.toFixed(2),
          receita: c.revenue.toFixed(2),
          hook_type: c.learning?.hook_type ?? '',
          promise_type: c.learning?.promise_type ?? '',
        }))

      const recentMetrics = filtered.slice(0, 30).map(m => ({
        data: m.date,
        canal: m.channel,
        gasto: m.spend,
        receita: m.revenue,
        roas: m.roas.toFixed(2),
        ctr: m.ctr.toFixed(2),
        cpa: m.cpa.toFixed(2),
      }))

      const prompt = `Analise os dados de performance desta conta de tráfego pago e gere insights estratégicos.

RESUMO GERAL:
- Total gasto: ${formatCurrency(totalSpend)}
- Total receita: ${formatCurrency(totalRevenue)}
- ROAS médio: ${avgRoas.toFixed(2)}x
- CPA médio: ${formatCurrency(avgCpa)}
- CTR médio: ${avgCtr.toFixed(2)}%
- Criativos vencedores: ${winners}
- Criativos perdedores: ${losers}

TOP CRIATIVOS (por gasto):
${JSON.stringify(topCreatives, null, 2)}

MÉTRICAS RECENTES:
${JSON.stringify(recentMetrics, null, 2)}`

      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightsData: prompt , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as { insights: PerformanceInsight }
      const insight: PerformanceInsight = {
        ...data.insights,
        id: generateId(),
        generated_at: now(),
      }
      tosDb.insights.save(insight)
      setInsightsPanel(insight)
    } catch {
      alert('Erro ao gerar insights. Tente novamente.')
    } finally {
      setInsightsLoading(false)
    }
  }

  function loadLastInsight() {
    const last = tosDb.insights.getLatest()
    if (last) setInsightsPanel(last)
  }

  function handleDelete(id: string) {
    if (confirm('Excluir este registro de métricas?')) {
      tosDb.metrics.delete(id)
      window.location.reload()
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Métricas</h1>
          <p className="text-gray-400 text-sm mt-1">{allMetrics.length} registros · {allCreatives.filter(c => c.spend > 0).length} criativos com dados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/metricas/importar')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors border border-gray-700 flex items-center gap-2"
          >
            📂 Importar CSV
          </button>
          <button
            onClick={() => navigate('/metricas/novo')}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
          >
            + Nova Métrica
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={productFilter}
          onChange={e => { setProductFilter(e.target.value); setCampaignFilter('') }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={campaignFilter}
          onChange={e => setCampaignFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">Todas as campanhas</option>
          {(productFilter ? aiCampaigns.filter(c => c.product_id === productFilter) : aiCampaigns).map(c => (
            <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os canais</option>
          {CHANNELS.map(ch => (
            <option key={ch} value={ch}>{CREATIVE_CHANNEL_LABELS[ch] ?? ch}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500" />
        {(productFilter || campaignFilter || channelFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setProductFilter(''); setCampaignFilter(''); setChannelFilter(''); setDateFrom(''); setDateTo('') }}
            className="text-xs text-gray-500 hover:text-white px-3 py-2 bg-gray-800 rounded-lg"
          >
            Limpar
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Gasto Total" value={formatCurrency(totalSpend)} />
        <KpiCard label="Receita Total" value={formatCurrency(totalRevenue)}
          color={totalRevenue > totalSpend ? 'text-emerald-400' : 'text-white'} />
        <KpiCard label="ROAS Médio" value={avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—'}
          color={avgRoas >= 2 ? 'text-emerald-400' : avgRoas >= 1 ? 'text-amber-400' : 'text-red-400'} />
        <KpiCard label="CPA Médio" value={avgCpa > 0 ? formatCurrency(avgCpa) : '—'} />
        <KpiCard label="CTR Médio" value={avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—'} />
        <KpiCard label="CPC Médio" value={avgCpc > 0 ? formatCurrency(avgCpc) : '—'} />
        <KpiCard label="Conversões" value={formatNumber(totalConversions)} />
        <KpiCard label="Leads" value={formatNumber(totalLeads)} />
        <KpiCard label="Vencedores" value={String(winners)}
          color="text-emerald-400" sub="vencedor + escalar" />
        <KpiCard label="Perdedores" value={String(losers)}
          color={losers > 0 ? 'text-red-400' : 'text-white'} sub="perdedor + pausado" />
      </div>

      {/* AI Insights */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-base font-semibold text-white">Insights de IA</h2>
          <button
            onClick={generateInsights}
            disabled={insightsLoading || filteredCreatives.length === 0}
            className="text-xs px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {insightsLoading ? (
              <>
                <span className="animate-spin text-[10px]">⟳</span>
                Analisando...
              </>
            ) : '✦ Gerar Insights'}
          </button>
          {tosDb.insights.getLatest() && !insightsPanel && (
            <button onClick={loadLastInsight} className="text-xs text-gray-500 hover:text-gray-300">
              Ver último
            </button>
          )}
          {insightsPanel && (
            <button onClick={() => setInsightsPanel(null)} className="text-xs text-gray-500 hover:text-gray-300">
              Fechar
            </button>
          )}
        </div>

        {insightsPanel && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-emerald-400 mb-1 uppercase tracking-wide">O que funciona</div>
                <p className="text-sm text-gray-200 leading-relaxed">{insightsPanel.o_que_funciona}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-red-400 mb-1 uppercase tracking-wide">O que falha</div>
                <p className="text-sm text-gray-200 leading-relaxed">{insightsPanel.o_que_falha}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-violet-400 mb-1 uppercase tracking-wide">Hooks que performam</div>
                <p className="text-sm text-gray-200 leading-relaxed">{insightsPanel.hooks_que_performam}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-amber-400 mb-1 uppercase tracking-wide">Ângulos que convertem</div>
                <p className="text-sm text-gray-200 leading-relaxed">{insightsPanel.angulos_que_convertem}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-400 mb-1 uppercase tracking-wide">Melhores canais</div>
                <p className="text-sm text-gray-200 leading-relaxed">{insightsPanel.melhores_canais}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wide">Produtos com potencial</div>
                <p className="text-sm text-gray-200 leading-relaxed">{insightsPanel.produtos_com_potencial}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-800">
              <div>
                <div className="text-xs font-medium text-red-400 mb-2 uppercase tracking-wide">Pausar</div>
                <div className="space-y-1">
                  {insightsPanel.criativos_pausar.map((c, i) => (
                    <div key={i} className="text-xs text-gray-300 flex items-center gap-2">
                      <span className="text-red-500">•</span> {c}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-cyan-400 mb-2 uppercase tracking-wide">Criar variações</div>
                <div className="space-y-1">
                  {insightsPanel.criativos_variar.map((c, i) => (
                    <div key={i} className="text-xs text-gray-300 flex items-center gap-2">
                      <span className="text-cyan-500">•</span> {c}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-violet-400 mb-2 uppercase tracking-wide">Próximos testes</div>
                <div className="space-y-1">
                  {insightsPanel.proximos_testes.map((t, i) => (
                    <div key={i} className="text-xs text-gray-300 flex items-center gap-2">
                      <span className="text-violet-500">→</span> {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-600 text-right">
              Gerado em {new Date(insightsPanel.generated_at).toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </div>

      {/* Rankings */}
      {filteredCreatives.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white mb-3">Rankings de Criativos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <RankTable
              title="Top CTR"
              icon="👆"
              rows={rankRows.map(r => ({ ...r, value: r.ctr }))}
              valueKey="ctr"
              valueFormat={n => `${n.toFixed(2)}%`}
            />
            <RankTable
              title="Top ROAS"
              icon="💰"
              rows={rankRows.map(r => ({ ...r, value: r.roas }))}
              valueKey="roas"
              valueFormat={n => `${n.toFixed(2)}x`}
            />
            <RankTable
              title="Melhor CPA"
              icon="🎯"
              rows={rankRows.filter(r => r.cpa > 0).map(r => ({ ...r, value: r.cpa }))}
              valueKey="cpa"
              valueFormat={n => formatCurrency(n)}
              ascending
            />
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <span>🔥</span>
                <span className="text-sm font-semibold text-white">Maior Gasto / Menor ROAS</span>
              </div>
              {worstBySpend.length === 0 ? (
                <div className="p-6 text-center text-gray-600 text-xs">Sem dados ainda</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {worstBySpend.map((row, i) => (
                    <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs text-gray-600 w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{row.name}</div>
                        <div className="text-[10px] text-gray-600 truncate">{row.product}</div>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(row.status)}`}>
                        {AI_CREATIVE_STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      <span className="text-xs font-semibold text-red-400 flex-shrink-0">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Table */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Registros de Métricas</h2>
        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-3">Nenhum registro encontrado.</p>
            <button
              onClick={() => navigate('/metricas/novo')}
              className="text-violet-400 hover:text-violet-300 text-sm"
            >
              + Inserir primeira métrica
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Data</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Produto</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Campanha</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Canal</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">Gasto</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">Receita</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">ROAS</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">CPA</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">CTR</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">Cliques</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">Conv.</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const product = products.find(p => p.id === m.product_id)
                    const campaign = m.campaign_id ? aiCampaigns.find(c => c.id === m.campaign_id) : null
                    return (
                      <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 text-gray-300 text-xs whitespace-nowrap">{formatDate(m.date)}</td>
                        <td className="py-3 px-4 text-gray-300 text-xs">{product?.name ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs truncate max-w-[120px]">
                          {campaign?.strategy?.nome_estrategico ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">
                          {m.channel ? (CREATIVE_CHANNEL_LABELS[m.channel] ?? m.channel) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-white text-xs">{formatCurrency(m.spend, m.currency)}</td>
                        <td className="py-3 px-4 text-right text-xs">
                          <span className={m.revenue > m.spend ? 'text-emerald-400' : 'text-white'}>
                            {formatCurrency(m.revenue, m.currency)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs">
                          <span className={m.roas >= 2 ? 'text-emerald-400' : m.roas >= 1 ? 'text-amber-400' : 'text-red-400'}>
                            {m.roas > 0 ? `${m.roas.toFixed(2)}x` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300 text-xs">
                          {m.cpa > 0 ? formatCurrency(m.cpa, m.currency) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300 text-xs">
                          {m.ctr > 0 ? `${m.ctr.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 text-xs">{formatNumber(m.clicks)}</td>
                        <td className="py-3 px-4 text-right text-gray-400 text-xs">{formatNumber(m.conversions)}</td>
                        <td className="py-3 px-4">
                          <button onClick={() => handleDelete(m.id)}
                            className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                            Excluir
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700 bg-gray-800/30">
                    <td colSpan={4} className="py-3 px-4 text-xs font-semibold text-gray-400">Totais</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-white">{formatCurrency(totalSpend)}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-white">{formatCurrency(totalRevenue)}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-white">
                      {avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-white">
                      {avgCpa > 0 ? formatCurrency(avgCpa) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-white">
                      {avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-gray-300">{formatNumber(totalClicks)}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-gray-300">{formatNumber(totalConversions)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
