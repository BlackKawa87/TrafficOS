import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  EXPANSAO_CHANNEL_LABELS,
  EXPANSAO_CHANNEL_ICONS,
  EXPANSAO_STATUS_LABELS,
  EXPANSAO_RISK_LABELS,
} from '../utils/helpers'
import type { ExpansaoPlan, ExpansaoChannel, ExpansaoStatus } from '../types'

const PROGRESS_MSGS = [
  'Analisando campanhas e criativos...',
  'Avaliando performance por canal...',
  'Identificando canais com maior potencial...',
  'Adaptando estratégia para cada canal...',
  'Calculando risco e potencial de escala...',
  'Finalizando planos de expansão...',
]

type RawPlan = Omit<ExpansaoPlan, 'id' | 'product_id' | 'status' | 'notes' | 'created_at' | 'updated_at'>

function buildExpansaoPrompt(productId: string): string {
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

  const channelsInUse = [...new Set([
    ...campaigns.map(c => c.channel),
    ...metrics.map(m => m.channel).filter(Boolean),
  ])].filter(Boolean)

  const bestCreatives = creatives
    .filter(c => c.roas > 0 || c.conversions > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      nome: c.strategy?.nome ?? 'Sem nome',
      tipo: c.creative_type,
      canal: c.channel,
      status: c.status,
      roas: c.roas.toFixed(2),
      ctr: `${c.ctr.toFixed(2)}%`,
      cpa: c.cpa.toFixed(2),
      gasto: `$${c.spend.toFixed(2)}`,
      impressoes: c.impressions,
      conversoes: c.conversions,
    }))

  const campaignsList = campaigns.map(c => ({
    id: c.id,
    nome: c.strategy?.nome_estrategico ?? c.id,
    canal: c.channel,
    fase: c.phase,
    objetivo: c.objective,
    status: c.status,
    orcamento_dia: c.daily_budget,
  }))

  const metricsByChannel = Object.entries(
    metrics.reduce<Record<string, { spend: number; revenue: number; conversions: number; impressions: number; clicks: number }>>((acc, m) => {
      const ch = m.channel || 'desconhecido'
      if (!acc[ch]) acc[ch] = { spend: 0, revenue: 0, conversions: 0, impressions: 0, clicks: 0 }
      acc[ch].spend += m.spend
      acc[ch].revenue += m.revenue
      acc[ch].conversions += m.conversions
      acc[ch].impressions += m.impressions
      acc[ch].clicks += m.clicks
      return acc
    }, {})
  ).map(([channel, data]) => ({
    canal: channel,
    gasto: `$${data.spend.toFixed(2)}`,
    receita: `$${data.revenue.toFixed(2)}`,
    roas: data.spend > 0 ? (data.revenue / data.spend).toFixed(2) : '0',
    cpa: data.conversions > 0 ? `$${(data.spend / data.conversions).toFixed(2)}` : 'N/A',
    ctr: data.impressions > 0 ? `${((data.clicks / data.impressions) * 100).toFixed(2)}%` : '0%',
    conversoes: data.conversions,
  }))

  return `PRODUTO: ${product?.name} (id: ${productId})
Nicho: ${product?.niche} | Categoria: ${product?.category}
Preço: ${product?.currency} ${product?.price} | Modelo: ${product?.billing_model}
Público-alvo: ${product?.target_audience}
Promessa: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}
Objeções: ${product?.main_objections}

DIAGNÓSTICO DE OFERTA: ${latestDiagnosis
  ? `Score ${latestDiagnosis.analysis?.nota_geral?.score ?? '—'}/10`
  : 'Sem diagnóstico disponível.'}

CANAIS JÁ EM USO: ${channelsInUse.length > 0 ? channelsInUse.join(', ') : 'Nenhum canal identificado'}

CAMPANHAS (${campaignsList.length}):
${JSON.stringify(campaignsList, null, 2)}

CRIATIVOS VENCEDORES/PERFORMANCE (${bestCreatives.length} melhores):
${JSON.stringify(bestCreatives, null, 2)}

PERFORMANCE POR CANAL:
${JSON.stringify(metricsByChannel, null, 2)}

PERFORMANCE GERAL:
- Gasto total: $${totalSpend.toFixed(2)}
- Receita total: $${totalRevenue.toFixed(2)}
- ROAS médio: ${avgRoas.toFixed(2)}x
- CPA médio: $${avgCpa.toFixed(2)}
- CTR médio: ${avgCtr.toFixed(2)}%
- Total conversões: ${totalConversions}
- Total impressões: ${totalImpressions.toLocaleString()}
- Total criativos: ${creatives.length} (${creatives.filter(c => c.status === 'vencedor').length} vencedores)`
}

// ─── Generator Modal ──────────────────────────────────────────────────────────

function GeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [generated, setGenerated] = useState<(RawPlan & { _selected: boolean })[]>([])
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
      const contextData = buildExpansaoPrompt(productId)
      const res = await fetch('/api/expansao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      clearInterval(interval)
      setProgress(100)
      setProgressMsg('Planos gerados com sucesso!')

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      const plans: RawPlan[] = Array.isArray(data.plans) ? data.plans : []
      setGenerated(plans.map(p => ({ ...p, _selected: true })))
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar planos.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    const selected = generated.filter(p => p._selected)
    selected.forEach(raw => {
      const plan: ExpansaoPlan = {
        id: generateId(),
        product_id: productId,
        source_channel: raw.source_channel,
        target_channel: raw.target_channel as ExpansaoChannel,
        motivo_escolha: raw.motivo_escolha,
        criativo_base_id: raw.criativo_base_id,
        campanha_base_id: raw.campanha_base_id,
        adaptacao_criativos: raw.adaptacao_criativos,
        estrategia_entrada: raw.estrategia_entrada,
        potencial_escala: raw.potencial_escala,
        risco: raw.risco,
        risco_detalhes: raw.risco_detalhes,
        publico_estimado: raw.publico_estimado,
        diferencial_canal: raw.diferencial_canal,
        status: 'pendente',
        created_at: now(),
        updated_at: now(),
      }
      tosDb.expansaoPlans.save(plan)
    })
    setSaved(true)
    onSaved()
  }

  const isPreview = !loading && generated.length > 0
  const allSelected = generated.every(p => p._selected)

  function riskColor(r: string) {
    if (r === 'alto') return 'bg-red-900/50 text-red-300'
    if (r === 'medio') return 'bg-amber-900/50 text-amber-300'
    return 'bg-emerald-900/50 text-emerald-300'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">Expansão Multi-Canal com IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Identifica os melhores canais para replicar o que já funciona</p>
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
                    const winners = creatives.filter(c => c.status === 'vencedor')
                    const channels = [...new Set(campaigns.map(c => c.channel))].filter(Boolean)
                    return <>
                      <div className="font-medium text-gray-300">{p?.name} · {p?.currency} {p?.price}</div>
                      <div>{campaigns.length} campanhas · {creatives.length} criativos ({winners.length} vencedores)</div>
                      {channels.length > 0 && (
                        <div>Canais em uso: {channels.map(c => EXPANSAO_CHANNEL_LABELS[c] ?? c).join(', ')}</div>
                      )}
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
                🌐 Gerar Planos de Expansão
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
                <span className="text-sm font-medium text-white">{generated.length} canais recomendados</span>
                <button
                  onClick={() => setGenerated(g => g.map(p => ({ ...p, _selected: !allSelected })))}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>

              <div className="space-y-2">
                {generated.map((plan, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      plan._selected ? 'border-violet-600/50 bg-violet-900/10' : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={plan._selected}
                      onChange={e => setGenerated(g => g.map((p, j) => j === i ? { ...p, _selected: e.target.checked } : p))}
                      className="mt-0.5 accent-violet-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{EXPANSAO_CHANNEL_ICONS[plan.target_channel] ?? '🌐'}</span>
                        <span className="text-sm font-semibold text-white">
                          {EXPANSAO_CHANNEL_LABELS[plan.source_channel] ?? plan.source_channel}
                          <span className="text-gray-500 mx-1">→</span>
                          {EXPANSAO_CHANNEL_LABELS[plan.target_channel] ?? plan.target_channel}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${riskColor(plan.risco)}`}>
                          {EXPANSAO_RISK_LABELS[plan.risco] ?? plan.risco}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{plan.motivo_escolha}</p>
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
              <span className="text-emerald-400 text-sm">✓ Planos salvos com sucesso!</span>
            ) : (
              <>
                <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={!generated.some(p => p._selected)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Salvar {generated.filter(p => p._selected).length} planos
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

const ALL_STATUSES: ExpansaoStatus[] = ['pendente', 'em_teste', 'ativo', 'pausado', 'arquivado']
const ALL_CHANNELS: ExpansaoChannel[] = ['meta_ads', 'tiktok_ads', 'youtube_ads', 'google_search', 'google_display', 'native_ads']

function riskBadgeColor(r: string): string {
  if (r === 'alto') return 'bg-red-900/50 text-red-300'
  if (r === 'medio') return 'bg-amber-900/50 text-amber-300'
  return 'bg-emerald-900/50 text-emerald-300'
}

export default function Expansao() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [, setRefresh] = useState(0)

  const [filterProduct, setFilterProduct] = useState('')
  const [filterTarget, setFilterTarget] = useState<ExpansaoChannel | ''>('')
  const [filterStatus, setFilterStatus] = useState<ExpansaoStatus | ''>('pendente')

  const products = tosDb.products.getAll()
  const allPlans = tosDb.expansaoPlans.getAll()

  const filtered = allPlans.filter(p => {
    if (filterProduct && p.product_id !== filterProduct) return false
    if (filterTarget && p.target_channel !== filterTarget) return false
    if (filterStatus && p.status !== filterStatus) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const total = allPlans.length
  const emTeste = allPlans.filter(p => p.status === 'em_teste').length
  const ativos = allPlans.filter(p => p.status === 'ativo').length
  const canaisUnicos = [...new Set(allPlans.map(p => p.target_channel))].length

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
          <h1 className="text-xl font-bold text-white">Expansão Multi-Canal</h1>
          <p className="text-sm text-gray-400 mt-0.5">Replique o que funciona em novos canais com planos de entrada detalhados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>🌐</span> Gerar Expansão com IA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Planos gerados', value: total, color: 'text-white' },
          { label: 'Canais únicos', value: canaisUnicos, color: 'text-violet-400' },
          { label: 'Em teste', value: emTeste, color: 'text-amber-400' },
          { label: 'Ativos', value: ativos, color: 'text-emerald-400' },
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
          value={filterTarget}
          onChange={e => setFilterTarget(e.target.value as ExpansaoChannel | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os canais</option>
          {ALL_CHANNELS.map(c => (
            <option key={c} value={c}>{EXPANSAO_CHANNEL_LABELS[c]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as ExpansaoStatus | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{EXPANSAO_STATUS_LABELS[s]}</option>)}
        </select>

        {(filterProduct || filterTarget || filterStatus) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterTarget(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-white px-2"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Plans List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🌐</div>
          <div className="text-sm font-medium text-gray-400 mb-1">
            {allPlans.length === 0 ? 'Nenhum plano gerado ainda' : 'Nenhum resultado para os filtros'}
          </div>
          <div className="text-xs">
            {allPlans.length === 0 ? 'Clique em "Gerar Expansão com IA" para começar' : 'Tente ajustar os filtros'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(plan => {
            const product = tosDb.products.getById(plan.product_id)
            return (
              <div
                key={plan.id}
                onClick={() => navigate(`/expansao/${plan.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Channel visual */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-base">{EXPANSAO_CHANNEL_ICONS[plan.source_channel] ?? '📊'}</span>
                    <span className="text-gray-500 text-xs">→</span>
                    <span className="text-xl">{EXPANSAO_CHANNEL_ICONS[plan.target_channel] ?? '🌐'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {EXPANSAO_CHANNEL_LABELS[plan.source_channel] ?? plan.source_channel}
                        <span className="text-gray-500 mx-1.5">→</span>
                        {EXPANSAO_CHANNEL_LABELS[plan.target_channel] ?? plan.target_channel}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(plan.status)}`}>
                        {EXPANSAO_STATUS_LABELS[plan.status] ?? plan.status}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${riskBadgeColor(plan.risco)}`}>
                        {EXPANSAO_RISK_LABELS[plan.risco] ?? plan.risco}
                      </span>
                    </div>

                    {product && (
                      <div className="text-xs text-gray-500 mb-1.5">{product.name}</div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{plan.motivo_escolha}</p>

                    {plan.estrategia_entrada?.orcamento_teste && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span>💰 {plan.estrategia_entrada.orcamento_teste}</span>
                        <span>·</span>
                        <span>🎨 {plan.estrategia_entrada.num_criativos} criativos</span>
                        <span>·</span>
                        <span>⏱ {plan.estrategia_entrada.duracao_teste}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-600">
                    {formatDate(plan.created_at)}
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
