import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { tosDb } from '../store/storage'
import {
  getStatusColor,
  DAILY_TASK_CATEGORY_LABELS,
  DAILY_TASK_CATEGORY_ICONS,
  DAILY_PLAN_STATUS_LABELS,
  PRIORITY_LABELS,
  formatDate,
} from '../utils/helpers'
import type { DailyTask, DailyTaskCategory, DailyPlanStatus } from '../types'

const CATEGORY_ORDER: DailyTaskCategory[] = ['hoje', 'proximas_24h', 'proximos_3_dias', 'escala', 'correcao']

const CATEGORY_COLORS: Record<string, string> = {
  hoje: 'border-red-800/50',
  proximas_24h: 'border-amber-800/40',
  proximos_3_dias: 'border-blue-800/40',
  escala: 'border-emerald-800/40',
  correcao: 'border-violet-800/40',
}

function TaskRow({
  task,
  onToggle,
  onIgnore,
  aiCampaigns,
  aiCreatives,
}: {
  task: DailyTask
  onToggle: () => void
  onIgnore: () => void
  aiCampaigns: ReturnType<typeof tosDb.aiCampaigns.getAll>
  aiCreatives: ReturnType<typeof tosDb.aiCreatives.getAll>
}) {
  const campaign = task.related_campaign_id
    ? aiCampaigns.find(c => c.id === task.related_campaign_id)
    : null
  const creative = task.related_creative_id
    ? aiCreatives.find(c => c.id === task.related_creative_id)
    : null

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
        task.status === 'done'
          ? 'bg-gray-800/30 opacity-60'
          : task.status === 'ignored'
          ? 'bg-gray-800/20 opacity-40'
          : 'bg-gray-800/50'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          task.status === 'done'
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-gray-600 hover:border-emerald-500'
        }`}
      >
        {task.status === 'done' && <span className="text-white text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
          {task.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(task.priority)}`}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
          {task.estimated_time && (
            <span className="text-xs text-gray-500">⏱ {task.estimated_time}</span>
          )}
          {task.expected_impact && (
            <span className="text-xs text-gray-500 truncate max-w-xs">{task.expected_impact}</span>
          )}
        </div>

        {(campaign || creative) && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {campaign && (
              <Link
                to={`/campanhas/${campaign.id}`}
                className="text-xs text-blue-400 hover:underline"
              >
                📢 {campaign.strategy?.nome_estrategico ?? campaign.id}
              </Link>
            )}
            {creative && (
              <Link
                to={`/criativos/${creative.id}`}
                className="text-xs text-violet-400 hover:underline"
              >
                🎨 {creative.strategy?.nome ?? creative.id}
              </Link>
            )}
          </div>
        )}
      </div>

      {task.status === 'pending' && (
        <button
          onClick={onIgnore}
          className="shrink-0 text-xs text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
          title="Ignorar tarefa"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  void tick

  const plan = id ? tosDb.dailyPlans.getById(id) : null

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Plano não encontrado.</p>
        <button onClick={() => navigate('/plano-diario')} className="text-emerald-400 hover:underline">
          ← Voltar para Plano Diário
        </button>
      </div>
    )
  }

  // plan is guaranteed non-null past the early return; re-read on each render to get latest task state
  const currentPlan = tosDb.dailyPlans.getById(plan.id) ?? plan
  const product = tosDb.products.getById(currentPlan.product_id)
  const allAiCampaigns = tosDb.aiCampaigns.getAll()
  const allAiCreatives = tosDb.aiCreatives.getAll()

  function toggleTask(taskId: string) {
    const latest = tosDb.dailyPlans.getById(currentPlan.id) ?? currentPlan
    const newTasks = latest.tasks.map(t =>
      t.id === taskId ? { ...t, status: t.status === 'done' ? 'pending' : 'done' as DailyTask['status'] } : t
    )
    const doneTasks = newTasks.filter(t => t.status === 'done').length
    const pendingTasks = newTasks.filter(t => t.status === 'pending').length
    let status: DailyPlanStatus = 'pending'
    if (doneTasks === newTasks.length) status = 'done'
    else if (doneTasks > 0 || pendingTasks < newTasks.length) status = 'in_progress'
    tosDb.dailyPlans.save({ ...latest, tasks: newTasks, status })
    setTick(t => t + 1)
  }

  function ignoreTask(taskId: string) {
    const latest = tosDb.dailyPlans.getById(currentPlan.id) ?? currentPlan
    const newTasks = latest.tasks.map(t =>
      t.id === taskId ? { ...t, status: 'ignored' as DailyTask['status'] } : t
    )
    tosDb.dailyPlans.save({ ...latest, tasks: newTasks })
    setTick(t => t + 1)
  }

  function handleDelete() {
    if (!confirm('Excluir este plano?')) return
    tosDb.dailyPlans.delete(currentPlan.id)
    navigate('/plano-diario')
  }
  const doneTasks = currentPlan.tasks.filter(t => t.status === 'done').length
  const pendingTasks = currentPlan.tasks.filter(t => t.status === 'pending').length
  const ignoredTasks = currentPlan.tasks.filter(t => t.status === 'ignored').length
  const progress = currentPlan.tasks.length > 0
    ? Math.round((doneTasks / currentPlan.tasks.length) * 100)
    : 0

  const tasksByCategory = CATEGORY_ORDER.reduce<Record<string, DailyTask[]>>((acc, cat) => {
    acc[cat] = currentPlan.tasks.filter(t => t.category === cat)
    return acc
  }, {} as Record<string, DailyTask[]>)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/plano-diario')}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        ← Voltar para Plano Diário
      </button>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Plano de Ação</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {formatDate(currentPlan.date)} ·{' '}
              {product ? (
                <Link to={`/produtos/${product.id}`} className="text-emerald-400 hover:underline">
                  {product.name}
                </Link>
              ) : 'Produto removido'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(currentPlan.status)}`}>
              {DAILY_PLAN_STATUS_LABELS[currentPlan.status]}
            </span>
            <button onClick={handleDelete} className="text-gray-600 hover:text-red-400 text-xs transition-colors">
              Excluir
            </button>
          </div>
        </div>

        {/* Progress */}
        {currentPlan.tasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{doneTasks} de {currentPlan.tasks.length} tarefas concluídas</span>
              <span className="font-semibold text-emerald-400">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>✓ {doneTasks} feitas</span>
              <span>○ {pendingTasks} pendentes</span>
              {ignoredTasks > 0 && <span>✕ {ignoredTasks} ignoradas</span>}
            </div>
          </div>
        )}
      </div>

      {/* Scenario summary */}
      {currentPlan.scenario_summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resumo do Cenário</h2>
          <p className="text-sm text-gray-200 leading-relaxed">{currentPlan.scenario_summary}</p>
        </div>
      )}

      {/* Day priority */}
      {currentPlan.day_priority_focus && (
        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">🎯 Prioridade do Dia</h2>
          <p className="text-base font-bold text-white">{currentPlan.day_priority_focus}</p>
          {currentPlan.day_priority_reason && (
            <p className="text-sm text-gray-400 leading-relaxed">{currentPlan.day_priority_reason}</p>
          )}
        </div>
      )}

      {/* Tasks by category */}
      {CATEGORY_ORDER.map(cat => {
        const tasks = tasksByCategory[cat]
        if (!tasks?.length) return null
        const icon = DAILY_TASK_CATEGORY_ICONS[cat]
        const label = DAILY_TASK_CATEGORY_LABELS[cat]
        const borderColor = CATEGORY_COLORS[cat]
        const doneCat = tasks.filter(t => t.status === 'done').length

        return (
          <div key={cat} className={`bg-gray-900 border ${borderColor} rounded-2xl p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {icon} {label}
              </h2>
              <span className="text-xs text-gray-500">{doneCat}/{tasks.length}</span>
            </div>
            <div className="space-y-2">
              {tasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onIgnore={() => ignoreTask(task.id)}
                  aiCampaigns={allAiCampaigns}
                  aiCreatives={allAiCreatives}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Alerts */}
      {currentPlan.alerts.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">⚠ Alertas</h2>
          <ul className="space-y-1.5">
            {currentPlan.alerts.map((alert, i) => (
              <li key={i} className="text-sm text-amber-200 leading-relaxed">• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Next strategic step */}
      {currentPlan.next_strategic_step && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximo Passo Estratégico</h2>
          <p className="text-sm text-gray-200 leading-relaxed">{currentPlan.next_strategic_step}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap gap-3 pb-4">
        {product && (
          <Link
            to={`/produtos/${product.id}`}
            className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            📦 Ir para produto
          </Link>
        )}
        <Link
          to="/decisoes"
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          🤖 Ver decisões
        </Link>
        <Link
          to="/campanhas"
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          📢 Ver campanhas
        </Link>
        <Link
          to="/criativos"
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          🎨 Ver criativos
        </Link>
        <button
          onClick={() => navigate('/plano-diario')}
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          ✦ Novo plano
        </button>
      </div>
    </div>
  )
}
