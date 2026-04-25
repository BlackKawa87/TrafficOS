import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import { formatDate, getStatusColor, DECISION_TYPE_LABELS, PRIORITY_LABELS } from '../utils/helpers'
import type { AIDecision, DecisionType, DecisionStatus, Priority } from '../types'

const DECISION_TYPES: DecisionType[] = ['pause', 'scale', 'improve', 'maintain']
const STATUSES: DecisionStatus[] = ['pending', 'in_progress', 'done', 'dismissed']
const PRIORITIES: Priority[] = ['high', 'medium', 'low']

const DECISION_ICONS: Record<DecisionType, string> = {
  pause: '⏸',
  maintain: '✓',
  scale: '📈',
  improve: '⚡',
}

type GeneratedDecision = {
  decision_type: string
  reasoning: string
  actions: string[]
  priority: string
  _selected: boolean
}

// ─── AI Generation Modal ──────────────────────────────────────────────────────

function AIGeneratorModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [productId, setProductId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generated, setGenerated] = useState<GeneratedDecision[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const products = tosDb.products.getAll()
  const campaigns = productId ? tosDb.aiCampaigns.getByProduct(productId) : tosDb.aiCampaigns.getAll()

  const PROGRESS_MSGS = [
    'Analisando produto...', 'Avaliando campanhas...', 'Revisando criativos...',
    'Examinando métricas...', 'Identificando padrões...', 'Gerando decisões...',
  ]
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setGenerated([])

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 2, 90)
      msgIdx = Math.floor(pct / 16)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[Math.min(msgIdx, PROGRESS_MSGS.length - 1)])
    }, 300)

    try {
      const product = tosDb.products.getById(productId)
      const campaign = campaignId ? tosDb.aiCampaigns.getById(campaignId) : null
      const creatives = productId ? tosDb.aiCreatives.getByProduct(productId) : []
      const metrics = tosDb.metrics.getByProduct(productId)
      const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)

      const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
      const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
      const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      const avgCpa = metrics.reduce((s, m) => s + m.conversions, 0) > 0
        ? totalSpend / metrics.reduce((s, m) => s + m.conversions, 0) : 0

      const topCreatives = creatives
        .filter(c => c.spend > 0)
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 8)
        .map(c => ({
          nome: c.strategy?.nome,
          canal: c.channel,
          angulo: c.angle,
          status: c.status,
          roas: c.roas.toFixed(2),
          ctr: c.ctr.toFixed(2),
          cpa: c.cpa.toFixed(2),
          gasto: c.spend.toFixed(2),
        }))

      const prompt = `Produto: ${product?.name} (${product?.category})
Nicho: ${product?.niche}
Preço: ${product?.price} ${product?.currency}
Modelo: ${product?.billing_model}
Status: ${product?.status}
Promessa principal: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}

${latestDiagnosis ? `Diagnóstico de oferta (score ${latestDiagnosis.analysis?.nota_geral?.score ?? '—'}/10):
${latestDiagnosis.analysis?.resumo_executivo?.o_que_esta_bom ?? ''}
O que melhorar: ${latestDiagnosis.analysis?.resumo_executivo?.o_que_melhorar ?? ''}` : 'Sem diagnóstico de oferta.'}

${campaign ? `Campanha selecionada: ${campaign.strategy?.nome_estrategico}
Canal: ${campaign.channel} | Fase: ${campaign.phase} | Objetivo: ${campaign.objective}
Status: ${campaign.status}
Hipótese: ${campaign.strategy?.hipotese_principal}` : `Total de campanhas IA: ${tosDb.aiCampaigns.getByProduct(productId).length}`}

Performance geral:
- Total gasto: $${totalSpend.toFixed(2)}
- Total receita: $${totalRevenue.toFixed(2)}
- ROAS médio: ${avgRoas.toFixed(2)}x
- CPA médio: $${avgCpa.toFixed(2)}
- Total de criativos: ${creatives.length}
- Com dados de performance: ${creatives.filter(c => c.spend > 0).length}

Top criativos:
${JSON.stringify(topCreatives, null, 2)}

Com base nesses dados, gere as decisões estratégicas mais importantes para este produto agora.`

      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionData: prompt }),
      })

      if (!res.ok) throw new Error('Falha na geração')
      const data = await res.json() as { decisions: Array<{ decision_type: string; reasoning: string; actions: string[]; priority: string }> }
      clearInterval(interval)
      setProgress(100)
      setGenerated(data.decisions.map(d => ({ ...d, _selected: true })))
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar decisões')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(i: number) {
    setGenerated(prev => prev.map((d, idx) => idx === i ? { ...d, _selected: !d._selected } : d))
  }

  function handleSave() {
    const toSave = generated.filter(d => d._selected)
    const ts = now()
    toSave.forEach(d => {
      const decision: AIDecision = {
        id: generateId(),
        product_id: productId,
        decision_type: d.decision_type as DecisionType,
        reasoning: d.reasoning,
        actions: d.actions,
        priority: d.priority as Priority,
        status: 'pending',
        created_at: ts,
      }
      tosDb.decisions.save(decision)
    })
    setSaved(true)
    setTimeout(() => { onSaved(); onClose() }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <h2 className="text-base font-semibold text-white">Gerar Decisões com IA</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!generated.length && !loading && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Produto *</label>
                <select
                  value={productId}
                  onChange={e => { setProductId(e.target.value); setCampaignId('') }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">— Selecionar produto —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Campanha (opcional)</label>
                <select
                  value={campaignId}
                  onChange={e => setCampaignId(e.target.value)}
                  disabled={!productId}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                >
                  <option value="">— Análise geral do produto —</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}

          {loading && (
            <div className="py-8 text-center">
              <div className="text-3xl mb-4 animate-pulse">🤖</div>
              <p className="text-sm text-gray-300 mb-4">{progressMsg}</p>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                <div
                  className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{progress}%</p>
            </div>
          )}

          {generated.length > 0 && !saved && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                {generated.length} decisões geradas. Selecione as que deseja salvar:
              </p>
              {generated.map((d, i) => (
                <div
                  key={i}
                  className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                    d._selected
                      ? 'border-violet-600/50 bg-violet-600/5'
                      : 'border-gray-700 bg-gray-800/30 opacity-60'
                  }`}
                  onClick={() => toggleSelect(i)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {DECISION_ICONS[d.decision_type as DecisionType] ?? '•'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(d.decision_type)}`}>
                          {DECISION_TYPE_LABELS[d.decision_type as DecisionType] ?? d.decision_type}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority as Priority] ?? d.priority}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {d._selected ? '✓ Selecionado' : 'Clique para selecionar'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 mb-2">{d.reasoning}</p>
                      {d.actions.length > 0 && (
                        <ul className="space-y-1">
                          {d.actions.map((action, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-gray-400">
                              <span className="text-violet-500 flex-shrink-0 mt-0.5">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {saved && (
            <div className="py-8 text-center">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-sm text-emerald-400 font-medium">Decisões salvas com sucesso!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            Fechar
          </button>
          {!generated.length && !loading && (
            <button
              onClick={handleGenerate}
              disabled={!productId}
              className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              ✦ Analisar com IA
            </button>
          )}
          {generated.length > 0 && !saved && (
            <button
              onClick={handleSave}
              disabled={!generated.some(d => d._selected)}
              className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Salvar {generated.filter(d => d._selected).length} Decisão{generated.filter(d => d._selected).length !== 1 ? 'ões' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Manual Form Modal ────────────────────────────────────────────────────────

function ManualModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: AIDecision | null
  onClose: () => void
  onSaved: () => void
}) {
  const products = tosDb.products.getAll()
  const [form, setForm] = useState({
    product_id: editing?.product_id ?? '',
    decision_type: editing?.decision_type ?? ('improve' as DecisionType),
    reasoning: editing?.reasoning ?? '',
    actions_text: editing?.actions.join('\n') ?? '',
    priority: editing?.priority ?? ('medium' as Priority),
    status: editing?.status ?? ('pending' as DecisionStatus),
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const decision: AIDecision = {
      id: editing?.id ?? generateId(),
      product_id: form.product_id,
      decision_type: form.decision_type,
      reasoning: form.reasoning,
      actions: form.actions_text.split('\n').map(a => a.trim()).filter(Boolean),
      priority: form.priority,
      status: form.status,
      created_at: editing?.created_at ?? now(),
    }
    tosDb.decisions.save(decision)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{editing ? 'Editar Decisão' : 'Nova Decisão Manual'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Produto</label>
              <select value={form.product_id} onChange={e => set('product_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="">— Selecionar —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
              <select value={form.decision_type} onChange={e => set('decision_type', e.target.value as DecisionType)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {DECISION_TYPES.map(dt => (
                  <option key={dt} value={dt}>{DECISION_ICONS[dt]} {DECISION_TYPE_LABELS[dt]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value as Priority)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value as DecisionStatus)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Raciocínio</label>
            <textarea rows={3} value={form.reasoning} onChange={e => set('reasoning', e.target.value)}
              placeholder="Descreva o raciocínio..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Ações (uma por linha)</label>
            <textarea rows={4} value={form.actions_text} onChange={e => set('actions_text', e.target.value)}
              placeholder={`Ação 1\nAção 2\nAção 3`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DecisoesIA() {
  const [searchParams] = useSearchParams()
  const preselectedProduct = searchParams.get('produto') ?? ''

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [editing, setEditing] = useState<AIDecision | null>(null)
  const [productFilter, setProductFilter] = useState(preselectedProduct)
  const [typeFilter, setTypeFilter] = useState<DecisionType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | 'all'>('all')
  const [tick, setTick] = useState(0)

  function refresh() { setTick(t => t + 1) }

  const decisions = tosDb.decisions.getAll()
  const products = tosDb.products.getAll()

  const filtered = decisions
    .filter(d => {
      const matchProduct = !productFilter || d.product_id === productFilter
      const matchType = typeFilter === 'all' || d.decision_type === typeFilter
      const matchStatus = statusFilter === 'all' || d.status === statusFilter
      return matchProduct && matchType && matchStatus
    })
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 }
      const pDiff = pOrder[a.priority] - pOrder[b.priority]
      if (pDiff !== 0) return pDiff
      return b.created_at.localeCompare(a.created_at)
    })

  void tick

  const pendingCount = decisions.filter(d => d.status === 'pending').length
  const inProgressCount = decisions.filter(d => d.status === 'in_progress').length

  function openEdit(d: AIDecision) {
    setEditing(d)
    setManualModalOpen(true)
  }

  function openManualCreate() {
    setEditing(null)
    setManualModalOpen(true)
  }

  function updateStatus(d: AIDecision, newStatus: DecisionStatus) {
    tosDb.decisions.save({ ...d, status: newStatus })
    refresh()
  }

  function handleDelete(id: string) {
    if (confirm('Excluir esta decisão?')) {
      tosDb.decisions.delete(id)
      refresh()
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Decisões IA</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pendingCount} pendentes · {inProgressCount} em andamento
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openManualCreate}
            className="text-sm font-medium py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            + Manual
          </button>
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>✦</span> Gerar com IA
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex gap-2 flex-wrap">
          {(['all', ...DECISION_TYPES] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type as DecisionType | 'all')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === type ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'Todos' : `${DECISION_ICONS[type as DecisionType]} ${DECISION_TYPE_LABELS[type as DecisionType]}`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'in_progress', 'done'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as DecisionStatus | 'all')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendente' : s === 'in_progress' ? 'Em andamento' : 'Concluído'}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-400 text-sm mb-4">Nenhuma decisão encontrada.</p>
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
          >
            ✦ Gerar Decisões com IA
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const product = tosDb.products.getById(d.product_id)
            return (
              <div key={d.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                d.status === 'done' || d.status === 'dismissed'
                  ? 'border-gray-800 opacity-60'
                  : d.priority === 'high'
                  ? 'border-red-800/50 hover:border-red-700/50'
                  : 'border-gray-800 hover:border-gray-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">{DECISION_ICONS[d.decision_type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(d.decision_type)}`}>
                          {DECISION_TYPE_LABELS[d.decision_type]}
                        </span>
                        {product && (
                          <span className="text-xs text-gray-400">{product.name}</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority]}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.status)}`}>
                          {d.status === 'pending' ? 'Pendente' : d.status === 'in_progress' ? 'Em andamento' : d.status === 'done' ? 'Concluído' : 'Dispensado'}
                        </span>
                        <span className="text-xs text-gray-600">{formatDate(d.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{d.reasoning}</p>
                      {d.actions.length > 0 && (
                        <ul className="space-y-1">
                          {d.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                              <span className="text-violet-500 flex-shrink-0 mt-0.5">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-1 items-end">
                    {d.status === 'pending' && (
                      <button onClick={() => updateStatus(d, 'in_progress')}
                        className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                        → Iniciar
                      </button>
                    )}
                    {(d.status === 'pending' || d.status === 'in_progress') && (
                      <button onClick={() => updateStatus(d, 'done')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 whitespace-nowrap">
                        ✓ Concluir
                      </button>
                    )}
                    <button onClick={() => openEdit(d)} className="text-xs text-gray-400 hover:text-white">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-xs text-gray-600 hover:text-red-400">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {aiModalOpen && (
        <AIGeneratorModal
          onClose={() => setAiModalOpen(false)}
          onSaved={refresh}
        />
      )}
      {manualModalOpen && (
        <ManualModal
          editing={editing}
          onClose={() => { setManualModalOpen(false); setEditing(null) }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
