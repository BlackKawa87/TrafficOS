import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  REMARKETING_AUDIENCE_LABELS,
  REMARKETING_AUDIENCE_ICONS,
  INTENTION_LEVEL_LABELS,
  REMARKETING_STATUS_LABELS,
} from '../utils/helpers'
import type { RemarketingStrategy, RemarketingStatus } from '../types'

const PROGRESS_MSGS = [
  'Analisando dados do produto...',
  'Mapeando comportamento do funil...',
  'Segmentando públicos de remarketing...',
  'Criando criativos por público...',
  'Definindo estratégia por fase...',
  'Calculando orçamento e frequência...',
]

type RawStrategy = {
  resumo_executivo: string
  publicos: RemarketingStrategy['publicos']
  estrategia_por_fase: RemarketingStrategy['estrategia_por_fase']
  orcamento_recomendado: RemarketingStrategy['orcamento_recomendado']
  frequencia_ideal: RemarketingStrategy['frequencia_ideal']
}

function buildRemarketingPrompt(productId: string): string {
  const product = tosDb.products.getById(productId)
  const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)
  const campaigns = tosDb.aiCampaigns.getByProduct(productId).slice(0, 6)
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
    .filter(c => c.spend > 0 || c.impressions > 0)
    .slice(0, 8)
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
      cliques: c.clicks,
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
      impressoes: m.impressions,
      cliques: m.clicks,
      conversoes: m.conversions,
      canal: m.channel,
    }))

  const hasDiagnosis = !!latestDiagnosis

  return `PRODUTO: ${product?.name} (id: ${productId})
Nicho: ${product?.niche} | Categoria: ${product?.category}
Preço: ${product?.currency} ${product?.price} | Modelo: ${product?.billing_model}
Promessa principal: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}
Público-alvo: ${product?.target_audience}
Dores: ${product?.main_pain}
Objeções: ${product?.main_objections}
Página de vendas: ${product?.sales_page_url || 'Não informada'}

DIAGNÓSTICO DE OFERTA: ${hasDiagnosis
  ? `Score ${latestDiagnosis!.analysis?.nota_geral?.score ?? '—'}/10
O que está bom: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_esta_bom ?? '—'}
O que melhorar: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_melhorar ?? '—'}`
  : 'SEM DIAGNÓSTICO disponível.'}

CAMPANHAS ATIVAS (${campaignsList.length}):
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
- Taxa de conversão estimada: ${totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0'}%
${smallSample ? '\n⚠️ ATENÇÃO: Volume de dados pequeno — seja conservador nas estimativas de tamanho de público.' : ''}

MÉTRICAS RECENTES (últimos ${recentMetrics.length} registros):
${JSON.stringify(recentMetrics, null, 2)}`
}

// ─── Generator Modal ──────────────────────────────────────────────────────────

function GeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [channel, setChannel] = useState('meta_ads')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [generated, setGenerated] = useState<RawStrategy | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const products = tosDb.products.getAll()

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setGenerated(null)

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 1.2, 90)
      msgIdx = Math.min(Math.floor(pct / 16), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const contextData = buildRemarketingPrompt(productId)
      const res = await fetch('/api/remarketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      clearInterval(interval)
      setProgress(100)
      setProgressMsg('Estratégia gerada com sucesso!')

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setGenerated(data.strategy as RawStrategy)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar estratégia.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!generated) return
    const strategy: RemarketingStrategy = {
      id: generateId(),
      product_id: productId,
      channel,
      publicos: generated.publicos ?? [],
      estrategia_por_fase: generated.estrategia_por_fase ?? [],
      orcamento_recomendado: generated.orcamento_recomendado ?? { percentual_do_total: 20, justificativa: '', distribuicao_por_fase: '' },
      frequencia_ideal: generated.frequencia_ideal ?? { frequencia_diaria: '', janela_retargeting: '', recomendacao: '' },
      resumo_executivo: generated.resumo_executivo ?? '',
      status: 'ativo',
      created_at: now(),
      updated_at: now(),
    }
    tosDb.remarketingStrategies.save(strategy)
    setSaved(true)
    onSaved()
  }

  const isPreview = !loading && !!generated

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">Gerar Estratégia de Remarketing com IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cria públicos segmentados, criativos e plano por fase baseado nos seus dados</p>
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

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Canal principal</label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="meta_ads">Meta Ads</option>
                  <option value="tiktok_ads">TikTok Ads</option>
                  <option value="google_display">Google Display</option>
                  <option value="youtube_ads">YouTube Ads</option>
                </select>
              </div>

              {productId && (
                <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
                  {(() => {
                    const p = tosDb.products.getById(productId)
                    const campaigns = tosDb.aiCampaigns.getByProduct(productId)
                    const creatives = tosDb.aiCreatives.getByProduct(productId)
                    const metrics = tosDb.metrics.getByProduct(productId)
                    const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
                    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
                    return <>
                      <div className="font-medium text-gray-300">{p?.name}</div>
                      <div>{campaigns.length} campanhas · {creatives.length} criativos · {metrics.length} registros de métricas</div>
                      {totalClicks > 0 && (
                        <div>
                          {totalClicks.toLocaleString()} cliques · {totalConversions} conversões
                          · taxa {((totalConversions / totalClicks) * 100).toFixed(1)}%
                        </div>
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
                🔁 Gerar Estratégia de Remarketing
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
          {isPreview && generated && (
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Resumo Executivo</div>
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">{generated.resumo_executivo}</p>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                  Públicos gerados ({generated.publicos?.length ?? 0})
                </div>
                <div className="space-y-2">
                  {(generated.publicos ?? []).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800/40 rounded-lg p-3">
                      <span className="text-lg">{REMARKETING_AUDIENCE_ICONS[p.tipo] ?? '👤'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{p.nome}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {REMARKETING_AUDIENCE_LABELS[p.tipo] ?? p.tipo}
                          {p.tamanho_estimado && <span className="ml-2">· {p.tamanho_estimado}</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        p.nivel_intencao === 'alto' ? 'bg-emerald-900/50 text-emerald-300' :
                        p.nivel_intencao === 'medio' ? 'bg-amber-900/50 text-amber-300' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {INTENTION_LEVEL_LABELS[p.nivel_intencao] ?? p.nivel_intencao}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800/40 rounded-lg p-2">
                  <div className="text-sm font-bold text-violet-400">
                    {generated.orcamento_recomendado?.percentual_do_total ?? '—'}%
                  </div>
                  <div className="text-[10px] text-gray-500">do orçamento total</div>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-2">
                  <div className="text-sm font-bold text-white">
                    {generated.estrategia_por_fase?.length ?? 0} fases
                  </div>
                  <div className="text-[10px] text-gray-500">na estratégia</div>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-2">
                  <div className="text-sm font-bold text-white">7 dias</div>
                  <div className="text-[10px] text-gray-500">ciclo completo</div>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {isPreview && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            {saved ? (
              <span className="text-emerald-400 text-sm">✓ Estratégia salva com sucesso!</span>
            ) : (
              <>
                <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Salvar estratégia
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

const ALL_STATUSES: RemarketingStatus[] = ['ativo', 'pausado', 'arquivado']

export default function Remarketing() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [, setRefresh] = useState(0)

  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState<RemarketingStatus | ''>('ativo')

  const products = tosDb.products.getAll()
  const allStrategies = tosDb.remarketingStrategies.getAll()

  const filtered = allStrategies.filter(s => {
    if (filterProduct && s.product_id !== filterProduct) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const total = allStrategies.length
  const ativas = allStrategies.filter(s => s.status === 'ativo').length
  const totalPublicos = allStrategies.reduce((s, e) => s + (e.publicos?.length ?? 0), 0)
  const altaIntencao = allStrategies.reduce(
    (s, e) => s + (e.publicos?.filter(p => p.nivel_intencao === 'alto').length ?? 0), 0
  )

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
          <h1 className="text-xl font-bold text-white">Remarketing Inteligente</h1>
          <p className="text-sm text-gray-400 mt-0.5">Estratégias de retargeting com públicos, criativos e plano por fase</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>🔁</span> Gerar Estratégia com IA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Estratégias', value: total, color: 'text-white' },
          { label: 'Ativas', value: ativas, color: 'text-emerald-400' },
          { label: 'Públicos gerados', value: totalPublicos, color: 'text-violet-400' },
          { label: 'Alta intenção', value: altaIntencao, color: 'text-amber-400' },
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
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as RemarketingStatus | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{REMARKETING_STATUS_LABELS[s]}</option>)}
        </select>

        {(filterProduct || filterStatus) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-white px-2"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Strategy Cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔁</div>
          <div className="text-sm font-medium text-gray-400 mb-1">
            {allStrategies.length === 0 ? 'Nenhuma estratégia ainda' : 'Nenhum resultado para os filtros'}
          </div>
          <div className="text-xs">
            {allStrategies.length === 0 ? 'Clique em "Gerar Estratégia com IA" para começar' : 'Tente ajustar os filtros'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(strategy => {
            const product = tosDb.products.getById(strategy.product_id)
            const altaCount = strategy.publicos?.filter(p => p.nivel_intencao === 'alto').length ?? 0
            const medioCount = strategy.publicos?.filter(p => p.nivel_intencao === 'medio').length ?? 0

            return (
              <div
                key={strategy.id}
                onClick={() => navigate(`/remarketing/${strategy.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {product?.name ?? strategy.product_id}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(strategy.status)}`}>
                        {REMARKETING_STATUS_LABELS[strategy.status] ?? strategy.status}
                      </span>
                      {strategy.channel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                          {strategy.channel}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
                      {strategy.resumo_executivo}
                    </p>

                    {/* Audience pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(strategy.publicos ?? []).map((p, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          <span>{REMARKETING_AUDIENCE_ICONS[p.tipo] ?? '👤'}</span>
                          <span className="truncate max-w-[120px]">{p.nome}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0 text-xs">
                    <div className="text-gray-500">{formatDate(strategy.created_at)}</div>
                    <div className="flex gap-1.5">
                      {altaCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400">
                          {altaCount} alta
                        </span>
                      )}
                      {medioCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400">
                          {medioCount} média
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      {strategy.orcamento_recomendado?.percentual_do_total ?? '—'}% orçamento
                    </div>
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
