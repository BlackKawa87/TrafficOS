import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId } from '../store/storage'
import {
  getStatusColor,
  DAILY_PLAN_STATUS_LABELS,
  PRIORITY_LABELS,
  formatDate,
} from '../utils/helpers'
import type { DailyPlan, DailyTask, DailyTaskCategory, Priority } from '../types'

const PROGRESS_MSGS = [
  'Carregando dados do produto...',
  'Analisando campanhas e criativos...',
  'Avaliando métricas de performance...',
  'Lendo decisões estratégicas pendentes...',
  'Identificando prioridades do dia...',
  'Gerando plano de ação...',
]

type RawTask = {
  description: string
  category: string
  priority: string
  estimated_time?: string
  expected_impact?: string
  related_campaign_id?: string | null
  related_creative_id?: string | null
}

// ─── AI Generator Modal ───────────────────────────────────────────────────────

function AIGeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [preview, setPreview] = useState<{
    scenario_summary: string
    day_priority: { focus: string; reason: string }
    tasks: RawTask[]
    alerts: string[]
    next_strategic_step: string
  } | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const products = tosDb.products.getAll()

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setPreview(null)

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 1.5, 90)
      msgIdx = Math.min(Math.floor(pct / 16), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const product = tosDb.products.getById(productId)
      const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)
      const campaigns = tosDb.aiCampaigns.getByProduct(productId)
      const creatives = tosDb.aiCreatives.getByProduct(productId)
      const metrics = tosDb.metrics.getByProduct(productId)
      const decisions = tosDb.decisions.getByProduct(productId)
        .filter(d => d.status === 'pending' || d.status === 'accepted')
        .slice(0, 10)

      const campaignSummary = campaigns.map(c => ({
        id: c.id,
        nome: c.strategy?.nome_estrategico ?? 'Sem nome',
        status: c.status,
        canal: c.channel,
        orcamento: c.daily_budget,
      }))

      const creativeSummary = creatives.map(c => ({
        id: c.id,
        nome: c.strategy?.nome ?? 'Sem nome',
        status: c.status,
        ctr: c.ctr,
        roas: c.roas,
        cpa: c.cpa,
        spend: c.spend,
      }))

      const metricsSummary = metrics.slice(0, 20).map(m => ({
        canal: m.channel,
        gasto: m.spend,
        receita: m.revenue,
        impressoes: m.impressions,
        cliques: m.clicks,
        conversoes: m.conversions,
        roas: m.roas,
        ctr: m.ctr,
        cpa: m.cpa,
        data: m.date,
      }))

      const decisionsSummary = decisions.map(d => ({
        id: d.id,
        tipo: d.decision_type,
        prioridade: d.priority,
        titulo: d.title ?? d.decision_type,
        reasoning: d.reasoning,
        status: d.status,
      }))

      const planData = `Produto:
${JSON.stringify({ id: product?.id, nome: product?.name, nicho: product?.niche, preco: product?.price, status: product?.status }, null, 2)}

Diagnóstico de oferta:
${latestDiagnosis ? JSON.stringify({ score: latestDiagnosis.analysis?.nota_geral?.score, resumo: latestDiagnosis.analysis?.resumo_executivo }, null, 2) : 'Nenhum diagnóstico disponível'}

Campanhas (${campaigns.length} total):
${JSON.stringify(campaignSummary, null, 2)}

Criativos (${creatives.length} total):
${JSON.stringify(creativeSummary, null, 2)}

Métricas recentes (${metrics.length} registros):
${JSON.stringify(metricsSummary, null, 2)}

Decisões IA pendentes (${decisions.length} total):
${JSON.stringify(decisionsSummary, null, 2)}`

      const res = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })

      clearInterval(interval)
      setProgress(100)

      if (!res.ok) { setError('Erro ao gerar plano.'); setLoading(false); return }

      const data = await res.json()
      setPreview(data)
    } catch {
      clearInterval(interval)
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!preview) return
    const today = new Date().toISOString().slice(0, 10)
    const tasks: DailyTask[] = (preview.tasks ?? []).map((t: RawTask) => ({
      id: generateId(),
      description: t.description,
      category: (t.category as DailyTaskCategory) || 'hoje',
      priority: (t.priority as Priority) || 'medium',
      estimated_time: t.estimated_time,
      expected_impact: t.expected_impact,
      related_campaign_id: t.related_campaign_id ?? undefined,
      related_creative_id: t.related_creative_id ?? undefined,
      status: 'pending',
    }))

    const plan: DailyPlan = {
      id: generateId(),
      product_id: productId,
      date: today,
      scenario_summary: preview.scenario_summary ?? '',
      day_priority_focus: preview.day_priority?.focus ?? '',
      day_priority_reason: preview.day_priority?.reason ?? '',
      tasks,
      alerts: preview.alerts ?? [],
      next_strategic_step: preview.next_strategic_step ?? '',
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    tosDb.dailyPlans.save(plan)
    setSaved(true)
    onSaved()
  }

  const tasksByCategory = preview ? (preview.tasks ?? []).reduce<Record<string, RawTask[]>>((acc, t) => {
    const cat = t.category || 'hoje'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {}) : {}

  const categoryOrder: DailyTaskCategory[] = ['hoje', 'proximas_24h', 'proximos_3_dias', 'escala', 'correcao']
  const categoryLabels: Record<string, string> = {
    hoje: '🔥 Hoje',
    proximas_24h: '⏰ Próximas 24h',
    proximos_3_dias: '📅 Próximos 3 dias',
    escala: '🚀 Escala',
    correcao: '🔧 Correção',
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Gerar Plano de Ação com IA</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {!preview && !loading && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Produto *</label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— Selecionar produto —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleGenerate}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                ✦ Gerar Plano com IA
              </button>
            </>
          )}

          {loading && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-400 text-center">{progressMsg}</p>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">{Math.round(progress)}%</p>
            </div>
          )}

          {preview && !saved && (
            <div className="space-y-5">
              {/* Scenario */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Cenário atual</p>
                <p className="text-sm text-gray-200 leading-relaxed">{preview.scenario_summary}</p>
              </div>

              {/* Day priority */}
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">🎯 Prioridade do dia</p>
                <p className="text-sm font-bold text-white">{preview.day_priority?.focus}</p>
                <p className="text-xs text-gray-400">{preview.day_priority?.reason}</p>
              </div>

              {/* Tasks preview */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {(preview.tasks ?? []).length} tarefas geradas
                </p>
                {categoryOrder.map(cat => {
                  const tasks = tasksByCategory[cat]
                  if (!tasks?.length) return null
                  return (
                    <div key={cat} className="mb-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1.5">{categoryLabels[cat]}</p>
                      <div className="space-y-1.5">
                        {tasks.map((t, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-300 bg-gray-800/50 rounded-lg px-3 py-2">
                            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded mt-0.5 ${getStatusColor(t.priority)}`}>
                              {PRIORITY_LABELS[t.priority] ?? t.priority}
                            </span>
                            <span className="leading-relaxed">{t.description}</span>
                            {t.estimated_time && <span className="shrink-0 text-xs text-gray-500 ml-auto">{t.estimated_time}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Alerts */}
              {(preview.alerts ?? []).length > 0 && (
                <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 space-y-1">
                  <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">⚠ Alertas</p>
                  {(preview.alerts ?? []).map((a, i) => (
                    <p key={i} className="text-sm text-amber-200">• {a}</p>
                  ))}
                </div>
              )}

              {/* Next step */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Próximo passo estratégico</p>
                <p className="text-sm text-gray-200 leading-relaxed">{preview.next_strategic_step}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Salvar Plano
                </button>
                <button
                  onClick={() => { setPreview(null); setProgress(0) }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Regerar
                </button>
              </div>
            </div>
          )}

          {saved && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-white font-semibold">Plano salvo com sucesso!</p>
              <p className="text-gray-400 text-sm mt-1">Acesse na lista abaixo para executar as tarefas.</p>
              <button onClick={onClose} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl transition-colors text-sm">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, done: 2 }

export default function PlanoDiario() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')

  void tick

  const allPlans = tosDb.dailyPlans.getAll()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const products = tosDb.products.getAll()

  const filtered = allPlans.filter(p => {
    if (filterProduct && p.product_id !== filterProduct) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterDate && p.date !== filterDate) return false
    return true
  })

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // Summary stats
  const totalPlans = allPlans.length
  const pendingPlans = allPlans.filter(p => p.status === 'pending').length
  const inProgressPlans = allPlans.filter(p => p.status === 'in_progress').length
  const donePlans = allPlans.filter(p => p.status === 'done').length

  function getPlanProgress(plan: DailyPlan) {
    if (!plan.tasks.length) return 0
    const done = plan.tasks.filter(t => t.status === 'done').length
    return Math.round((done / plan.tasks.length) * 100)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {showModal && (
        <AIGeneratorModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setTick(t => t + 1) }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Plano Diário</h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{today}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          <span>✦</span> Gerar Plano com IA
        </button>
      </div>

      {/* Stats */}
      {totalPlans > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: totalPlans, color: 'text-white' },
            { label: 'Pendentes', value: pendingPlans, color: 'text-amber-400' },
            { label: 'Em andamento', value: inProgressPlans, color: 'text-blue-400' },
            { label: 'Concluídos', value: donePlans, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os status</option>
          {Object.entries(DAILY_PLAN_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
        />

        {(filterProduct || filterStatus || filterDate) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterStatus(''); setFilterDate('') }}
            className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded-lg bg-gray-800 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Plans list */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {allPlans.length === 0 ? 'Nenhum plano gerado ainda' : 'Nenhum plano encontrado'}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {allPlans.length === 0
              ? 'Gere seu primeiro plano de ação com IA para transformar dados em execução prática.'
              : 'Tente ajustar os filtros.'}
          </p>
          {allPlans.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              ✦ Gerar Primeiro Plano
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0) || b.created_at.localeCompare(a.created_at))
            .map(plan => {
              const product = products.find(p => p.id === plan.product_id)
              const pct = getPlanProgress(plan)
              const doneTasks = plan.tasks.filter(t => t.status === 'done').length
              const pendingTasks = plan.tasks.filter(t => t.status === 'pending').length
              const criticalCount = plan.tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length

              return (
                <div
                  key={plan.id}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold text-white">
                          {product?.name ?? 'Produto removido'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(plan.status)}`}>
                          {DAILY_PLAN_STATUS_LABELS[plan.status]}
                        </span>
                        {criticalCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-800 text-red-200">
                            {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mb-3">
                        {formatDate(plan.date)} · {plan.tasks.length} tarefas · {doneTasks} feitas · {pendingTasks} pendentes
                      </p>

                      {plan.day_priority_focus && (
                        <p className="text-sm text-gray-400 truncate mb-3">
                          🎯 <span className="text-gray-300">{plan.day_priority_focus}</span>
                        </p>
                      )}

                      {/* Progress bar */}
                      {plan.tasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/plano-diario/${plan.id}`)}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Ver Plano →
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
