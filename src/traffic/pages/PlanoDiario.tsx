import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb } from '../store/storage'
import { getStatusColor, DECISION_TYPE_LABELS, PRIORITY_LABELS } from '../utils/helpers'
import type { DecisionStatus } from '../types'

export default function PlanoDiario() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const decisions = tosDb.decisions.getAll()
  const products = tosDb.products.getAll()

  const pending = decisions.filter(d => d.status === 'pending' || d.status === 'in_progress')
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 }
      return pOrder[a.priority] - pOrder[b.priority]
    })

  const done = decisions.filter(d => d.status === 'done')
  const total = pending.length + done.length
  const progress = total > 0 ? Math.round((done.length / total) * 100) : 0

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  function updateStatus(id: string, status: DecisionStatus) {
    const d = decisions.find(x => x.id === id)
    if (d) {
      tosDb.decisions.save({ ...d, status })
      window.location.reload()
    }
  }

  const highPriority = pending.filter(d => d.priority === 'high')
  const mediumPriority = pending.filter(d => d.priority === 'medium')
  const lowPriority = pending.filter(d => d.priority === 'low')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('plan.title')}</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">{t('plan.progress')}</span>
            <span className="text-sm font-bold text-violet-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{done.length} concluídas</span>
            <span>{pending.length} pendentes</span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-red-800/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{highPriority.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Alta Prioridade</div>
        </div>
        <div className="bg-gray-900 border border-amber-800/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{mediumPriority.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Média Prioridade</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{lowPriority.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Baixa Prioridade</div>
        </div>
      </div>

      {/* Pending Decisions */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">{t('plan.pending_decisions')}</h2>

        {pending.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-gray-400 text-sm">{t('plan.no_pending')}</p>
            <p className="text-gray-600 text-xs mt-2">Todos os itens foram concluídos ou estão sem pendências.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(d => {
              const product = products.find(p => p.id === d.product_id)
              return (
                <div
                  key={d.id}
                  className={`bg-gray-900 border rounded-xl p-4 ${
                    d.priority === 'high' ? 'border-red-800/50' :
                    d.priority === 'medium' ? 'border-amber-800/30' :
                    'border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {d.decision_type === 'pause' && <span className="text-xl">⏸</span>}
                      {d.decision_type === 'scale' && <span className="text-xl">📈</span>}
                      {d.decision_type === 'maintain' && <span className="text-xl">✓</span>}
                      {d.decision_type === 'improve' && <span className="text-xl">⚡</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(d.decision_type)}`}>
                          {DECISION_TYPE_LABELS[d.decision_type]}
                        </span>
                        {product && (
                          <span className="text-xs text-gray-400">{product.name}</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority]}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.status)}`}>
                          {t(`status.${d.status}` as Parameters<typeof t>[0])}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{d.reasoning}</p>
                      {d.actions.length > 0 && (
                        <ul className="space-y-1 mb-3">
                          {d.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                              <span className="text-violet-500 flex-shrink-0">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-3">
                        {d.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(d.id, 'in_progress')}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            → {t('plan.mark_in_progress')}
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(d.id, 'done')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                        >
                          ✓ {t('plan.mark_done')}
                        </button>
                        <button
                          onClick={() => navigate(`/decisoes`)}
                          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/decisoes')}
            className="text-left bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
          >
            <div className="text-base mb-1">🤖</div>
            <div className="text-sm font-medium text-white">Registrar Decisão</div>
            <div className="text-xs text-gray-500">Adicionar nova decisão da IA</div>
          </button>
          <button
            onClick={() => navigate('/metricas')}
            className="text-left bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
          >
            <div className="text-base mb-1">📈</div>
            <div className="text-sm font-medium text-white">Inserir Métricas</div>
            <div className="text-xs text-gray-500">Registrar dados de tráfego</div>
          </button>
          <button
            onClick={() => navigate('/prompt-center')}
            className="text-left bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
          >
            <div className="text-base mb-1">💬</div>
            <div className="text-sm font-medium text-white">Prompt Center</div>
            <div className="text-xs text-gray-500">Acessar prompts salvos</div>
          </button>
          <button
            onClick={() => navigate('/produtos')}
            className="text-left bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
          >
            <div className="text-base mb-1">📦</div>
            <div className="text-sm font-medium text-white">Produtos</div>
            <div className="text-xs text-gray-500">Ver todos os produtos</div>
          </button>
        </div>
      </div>
    </div>
  )
}
