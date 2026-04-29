import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  SCALE_ACTION_LABELS,
  SCALE_ACTION_ICONS,
  SCALE_PRIORITY_LABELS,
  SCALE_STATUS_LABELS,
  SCALE_LEVEL_LABELS,
} from '../utils/helpers'
import type { ScaleOpportunity, ScaleActionType, ScalePriority, ScaleStatus } from '../types'

const PROGRESS_MSGS = [
  'Carregando dados do produto...',
  'Analisando campanhas e criativos...',
  'Avaliando métricas de performance...',
  'Identificando oportunidades de escala...',
  'Aplicando regras estratégicas...',
  'Priorizando por impacto no ROI...',
]

type RawOpportunity = {
  title: string
  action_type: string
  priority: string
  product_id: string
  campaign_id?: string | null
  creative_id?: string | null
  channel?: string | null
  reason: string
  supporting_data: string
  potential: string
  risk: string
  confidence: string
  recommended_action: string[]
  action_limit: string
  next_step: string
}

function buildScalePrompt(productId: string): string {
  const product = tosDb.products.getById(productId)
  const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)
  const campaigns = tosDb.aiCampaigns.getByProduct(productId).slice(0, 8)
  const creatives = tosDb.aiCreatives.getByProduct(productId)
  const metrics = tosDb.metrics.getByProduct(productId)

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  const smallSample = totalImpressions < 1000 || totalSpend < 20

  const campaignsList = campaigns.map(c => ({
    id: c.id,
    nome: c.strategy?.nome_estrategico ?? c.id,
    canal: c.channel,
    fase: c.phase,
    objetivo: c.objective,
    status: c.status,
    orcamento_dia: c.daily_budget,
  }))

  const creativesList = creatives
    .filter(c => c.spend > 0 || c.status !== 'novo')
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      nome: c.strategy?.nome ?? 'Sem nome',
      canal: c.channel,
      tipo: c.creative_type,
      angulo: c.angle,
      status: c.status,
      roas: c.roas.toFixed(2),
      ctr: `${c.ctr.toFixed(2)}%`,
      cpa: c.cpa.toFixed(2),
      gasto: `$${c.spend.toFixed(2)}`,
      impressoes: c.impressions,
      conversoes: c.conversions,
    }))

  const recentMetrics = metrics
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
    .map(m => ({
      data: m.date,
      gasto: m.spend,
      receita: m.revenue,
      roas: m.roas.toFixed(2),
      ctr: `${m.ctr.toFixed(2)}%`,
      cpa: m.cpa.toFixed(2),
      impressoes: m.impressions,
      cliques: m.clicks,
      conversoes: m.conversions,
      canal: m.channel,
    }))

  const hasDiagnosis = !!latestDiagnosis

  return `PRODUTO: ${product?.name} (id: ${productId})
Nicho: ${product?.niche} | Categoria: ${product?.category}
Preço: ${product?.currency} ${product?.price} | Modelo: ${product?.billing_model}
Status: ${product?.status}
Promessa: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}
Dores principais: ${product?.main_pain}
Objeções: ${product?.main_objections}

DIAGNÓSTICO DE OFERTA: ${hasDiagnosis
  ? `Score ${latestDiagnosis!.analysis?.nota_geral?.score ?? '—'}/10
O que está bom: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_esta_bom ?? '—'}
O que melhorar: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_melhorar ?? '—'}
Próximo passo: ${latestDiagnosis!.analysis?.resumo_executivo?.proximo_passo ?? '—'}`
  : 'SEM DIAGNÓSTICO — considere como risco nas análises.'}

CAMPANHAS (${campaignsList.length}):
${JSON.stringify(campaignsList, null, 2)}

CRIATIVOS COM DADOS (${creativesList.length} de ${creatives.length} total):
${JSON.stringify(creativesList, null, 2)}

PERFORMANCE GERAL:
- Gasto total: $${totalSpend.toFixed(2)}
- Receita total: $${totalRevenue.toFixed(2)}
- ROAS médio: ${avgRoas.toFixed(2)}x
- CPA médio: $${avgCpa.toFixed(2)}
- CTR médio: ${avgCtr.toFixed(2)}%
- Total conversões: ${totalConversions}
- Total impressões: ${totalImpressions.toLocaleString()}
${smallSample ? '\n⚠️ ATENÇÃO: Amostra pequena (< 1000 impressões ou < $20 gasto). Seja conservador nas conclusões.' : ''}

MÉTRICAS RECENTES (últimos ${recentMetrics.length} registros):
${JSON.stringify(recentMetrics, null, 2)}`
}

// ─── Generator Modal ──────────────────────────────────────────────────────────

function GeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [generated, setGenerated] = useState<(RawOpportunity & { _selected: boolean })[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const products = tosDb.products.getAll()

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setGenerated([])

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 1.5, 90)
      msgIdx = Math.min(Math.floor(pct / 16), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const contextData = buildScalePrompt(productId)
      const res = await fetch('/api/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      clearInterval(interval)
      setProgress(100)
      setProgressMsg('Oportunidades identificadas!')

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      const opps: RawOpportunity[] = Array.isArray(data.opportunities) ? data.opportunities : []
      setGenerated(opps.map(o => ({ ...o, _selected: true })))
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar oportunidades.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    const selected = generated.filter(o => o._selected)
    selected.forEach(o => {
      const opp: ScaleOpportunity = {
        id: generateId(),
        product_id: productId,
        campaign_id: o.campaign_id ?? undefined,
        creative_id: o.creative_id ?? undefined,
        channel: o.channel ?? undefined,
        title: o.title,
        action_type: o.action_type as ScaleActionType,
        priority: o.priority as ScalePriority,
        reason: o.reason,
        supporting_data: o.supporting_data,
        potential: o.potential as 'baixo' | 'medio' | 'alto',
        risk: o.risk as 'baixo' | 'medio' | 'alto',
        confidence: o.confidence as 'baixo' | 'medio' | 'alto',
        recommended_action: Array.isArray(o.recommended_action) ? o.recommended_action : [],
        action_limit: o.action_limit,
        next_step: o.next_step,
        status: 'pendente',
        created_at: now(),
        updated_at: now(),
      }
      tosDb.scaleOpportunities.save(opp)
    })
    setSaved(true)
    onSaved()
  }

  const isPreview = !loading && generated.length > 0
  const allSelected = generated.every(o => o._selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">Motor de Escala com IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Analisa seus dados e gera oportunidades priorizadas por impacto no ROI</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Config */}
          {!isPreview && !loading && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Produto *</label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">Selecione um produto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {productId && (
                <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
                  {(() => {
                    const p = tosDb.products.getById(productId)
                    const campaigns = tosDb.aiCampaigns.getByProduct(productId)
                    const creatives = tosDb.aiCreatives.getByProduct(productId)
                    const metrics = tosDb.metrics.getByProduct(productId)
                    return <>
                      <div className="font-medium text-gray-300">{p?.name}</div>
                      <div>{campaigns.length} campanhas · {creatives.length} criativos · {metrics.length} registros de métricas</div>
                    </>
                  })()}
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!productId}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                🚀 Gerar Oportunidades de Escala
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-4 py-4">
              <div className="text-center text-sm text-gray-300">{progressMsg}</div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-500">{Math.round(progress)}%</div>
            </div>
          )}

          {/* Preview */}
          {isPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{generated.length} oportunidades geradas</span>
                <button
                  onClick={() => setGenerated(g => g.map(o => ({ ...o, _selected: !allSelected })))}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
                </button>
              </div>

              <div className="space-y-2">
                {generated.map((opp, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      opp._selected ? 'border-violet-600/50 bg-violet-900/10' : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={opp._selected}
                      onChange={e => setGenerated(g => g.map((o, j) => j === i ? { ...o, _selected: e.target.checked } : o))}
                      className="mt-0.5 accent-violet-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{opp.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(opp.priority)}`}>
                          {SCALE_PRIORITY_LABELS[opp.priority] ?? opp.priority}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {SCALE_ACTION_ICONS[opp.action_type]} {SCALE_ACTION_LABELS[opp.action_type] ?? opp.action_type}
                        {opp.channel && <span className="ml-2 text-gray-500">· {opp.channel}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{opp.reason}</div>
                    </div>
                  </label>
                ))}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {isPreview && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            {saved ? (
              <span className="text-emerald-400 text-sm">✓ Oportunidades salvas com sucesso!</span>
            ) : (
              <>
                <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={!generated.some(o => o._selected)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Salvar {generated.filter(o => o._selected).length} oportunidades
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ALL_ACTION_TYPES: ScaleActionType[] = [
  'escalar_orcamento', 'duplicar_campanha', 'duplicar_conjunto',
  'criar_variacao_criativo', 'expandir_publico', 'criar_remarketing',
  'replicar_canal', 'ajustar_oferta', 'pausar_campanha', 'continuar_teste',
]

const ALL_PRIORITIES: ScalePriority[] = ['critica', 'alta', 'media', 'baixa']
const ALL_STATUSES: ScaleStatus[] = ['pendente', 'em_execucao', 'executada', 'ignorada', 'arquivada']

function levelColor(v: string): string {
  if (v === 'alto') return 'text-emerald-400'
  if (v === 'medio') return 'text-amber-400'
  return 'text-gray-400'
}

function riskColor(v: string): string {
  if (v === 'alto') return 'text-red-400'
  if (v === 'medio') return 'text-amber-400'
  return 'text-emerald-400'
}

export default function Escala() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [, setRefresh] = useState(0)

  const [filterProduct, setFilterProduct] = useState('')
  const [filterType, setFilterType] = useState<ScaleActionType | ''>('')
  const [filterPriority, setFilterPriority] = useState<ScalePriority | ''>('')
  const [filterStatus, setFilterStatus] = useState<ScaleStatus | ''>('pendente')
  const [filterChannel, setFilterChannel] = useState('')

  const products = tosDb.products.getAll()
  const allOpps = tosDb.scaleOpportunities.getAll()

  const filtered = allOpps.filter(o => {
    if (filterProduct && o.product_id !== filterProduct) return false
    if (filterType && o.action_type !== filterType) return false
    if (filterPriority && o.priority !== filterPriority) return false
    if (filterStatus && o.status !== filterStatus) return false
    if (filterChannel && o.channel !== filterChannel) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const pOrder: ScalePriority[] = ['critica', 'alta', 'media', 'baixa']
    return pOrder.indexOf(a.priority) - pOrder.indexOf(b.priority)
  })

  const total = allOpps.length
  const criticas = allOpps.filter(o => o.priority === 'critica').length
  const altas = allOpps.filter(o => o.priority === 'alta').length
  const pendentes = allOpps.filter(o => o.status === 'pendente').length
  const executadas = allOpps.filter(o => o.status === 'executada').length

  const handleSaved = useCallback(() => {
    setRefresh(r => r + 1)
    setTimeout(() => setShowModal(false), 1200)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {showModal && <GeneratorModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Motor de Escala</h1>
          <p className="text-sm text-gray-400 mt-0.5">Oportunidades de escala e otimização geradas por IA</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>🚀</span> Gerar Oportunidades com IA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-white' },
          { label: 'Críticas', value: criticas, color: 'text-red-400' },
          { label: 'Alta prioridade', value: altas, color: 'text-orange-400' },
          { label: 'Pendentes', value: pendentes, color: 'text-amber-400' },
          { label: 'Executadas', value: executadas, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ScaleActionType | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os tipos</option>
          {ALL_ACTION_TYPES.map(t => (
            <option key={t} value={t}>{SCALE_ACTION_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as ScalePriority | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todas as prioridades</option>
          {ALL_PRIORITIES.map(p => <option key={p} value={p}>{SCALE_PRIORITY_LABELS[p]}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as ScaleStatus | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{SCALE_STATUS_LABELS[s]}</option>)}
        </select>

        <select
          value={filterChannel}
          onChange={e => setFilterChannel(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os canais</option>
          {['meta_ads', 'tiktok_ads', 'google_display', 'youtube_ads', 'native_ads'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {(filterProduct || filterType || filterPriority || filterStatus || filterChannel) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterType(''); setFilterPriority(''); setFilterStatus(''); setFilterChannel('') }}
            className="text-xs text-gray-400 hover:text-white px-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Opportunities List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🚀</div>
          <div className="text-sm font-medium text-gray-400 mb-1">
            {allOpps.length === 0 ? 'Nenhuma oportunidade ainda' : 'Nenhum resultado para os filtros selecionados'}
          </div>
          <div className="text-xs">
            {allOpps.length === 0 ? 'Clique em "Gerar Oportunidades com IA" para começar' : 'Tente ajustar os filtros'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(opp => {
            const product = tosDb.products.getById(opp.product_id)
            return (
              <div
                key={opp.id}
                onClick={() => navigate(`/escala/${opp.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl mt-0.5 flex-shrink-0">{SCALE_ACTION_ICONS[opp.action_type] ?? '📊'}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                            {opp.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(opp.priority)}`}>
                            {SCALE_PRIORITY_LABELS[opp.priority] ?? opp.priority}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(opp.status)}`}>
                            {SCALE_STATUS_LABELS[opp.status] ?? opp.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>{SCALE_ACTION_LABELS[opp.action_type] ?? opp.action_type}</span>
                          {product && <span>· {product.name}</span>}
                          {opp.channel && <span>· {opp.channel}</span>}
                          <span>· {formatDate(opp.created_at)}</span>
                        </div>

                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{opp.reason}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Potencial:</span>
                          <span className={`font-medium ${levelColor(opp.potential)}`}>
                            {SCALE_LEVEL_LABELS[opp.potential] ?? opp.potential}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Risco:</span>
                          <span className={`font-medium ${riskColor(opp.risk)}`}>
                            {SCALE_LEVEL_LABELS[opp.risk] ?? opp.risk}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Confiança:</span>
                          <span className={`font-medium ${levelColor(opp.confidence)}`}>
                            {SCALE_LEVEL_LABELS[opp.confidence] ?? opp.confidence}
                          </span>
                        </div>
                      </div>
                    </div>

                    {opp.supporting_data && (
                      <div className="mt-2 bg-gray-800/50 rounded-lg px-3 py-1.5 text-xs text-gray-400 line-clamp-1">
                        📊 {opp.supporting_data}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
