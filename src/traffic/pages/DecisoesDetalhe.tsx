import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  DECISION_TYPE_LABELS,
  DECISION_TYPE_ICONS,
  DECISION_STATUS_LABELS,
  PRIORITY_LABELS,
  CONFIDENCE_LABELS,
  formatDate,
} from '../utils/helpers'
import type { AIDecision, DecisionStatus } from '../types'

function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
      {label}
    </span>
  )
}

export default function DecisoesDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [noteText, setNoteText] = useState('')
  const [editingNote, setEditingNote] = useState(false)

  const decision: AIDecision | null = id
    ? tosDb.decisions.getAll().find(d => d.id === id) ?? null
    : null

  if (!decision) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Decisão não encontrada.</p>
        <button onClick={() => navigate('/decisoes')} className="text-emerald-400 hover:underline">
          ← Voltar para Decisões
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(decision.product_id)
  const aiCampaign = decision.campaign_id
    ? tosDb.aiCampaigns.getById(decision.campaign_id)
    : null
  const aiCreative = decision.creative_id
    ? tosDb.aiCreatives.getById(decision.creative_id)
    : null

  function updateStatus(status: DecisionStatus) {
    const updated = { ...decision!, status, updated_at: now() } as AIDecision & { updated_at?: string }
    tosDb.decisions.save(updated as AIDecision)
    setTick(t => t + 1)
  }

  function saveNote() {
    const updated = { ...decision!, notes: noteText } as AIDecision
    tosDb.decisions.save(updated)
    setEditingNote(false)
    setTick(t => t + 1)
  }

  function handleDelete() {
    if (!confirm('Excluir esta decisão?')) return
    tosDb.decisions.delete(decision!.id)
    navigate('/decisoes')
  }

  const priorityBorderMap: Record<string, string> = {
    critical: 'border-red-500',
    high: 'border-orange-500',
    medium: 'border-amber-500',
    low: 'border-gray-600',
  }

  const icon = DECISION_TYPE_ICONS[decision.decision_type] ?? '📋'
  const borderColor = priorityBorderMap[decision.priority] ?? 'border-gray-600'

  // Force re-read after mutations
  void tick

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/decisoes')}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        ← Voltar para Decisões
      </button>

      {/* Header card */}
      <div className={`bg-gray-900 rounded-xl border-l-4 ${borderColor} p-6 space-y-4`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">
                {decision.title ?? DECISION_TYPE_LABELS[decision.decision_type] ?? decision.decision_type}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{formatDate(decision.created_at)}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0"
          >
            Excluir
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <Badge value={decision.decision_type} label={`${icon} ${DECISION_TYPE_LABELS[decision.decision_type] ?? decision.decision_type}`} />
          <Badge value={decision.priority} label={`🎯 ${PRIORITY_LABELS[decision.priority] ?? decision.priority}`} />
          <Badge value={decision.status} label={DECISION_STATUS_LABELS[decision.status] ?? decision.status} />
          {decision.confidence_level && (
            <Badge value={decision.confidence_level} label={CONFIDENCE_LABELS[decision.confidence_level] ?? decision.confidence_level} />
          )}
          {decision.deadline && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
              ⏰ {decision.deadline}
            </span>
          )}
        </div>
      </div>

      {/* Context */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Contexto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Produto</p>
            {product ? (
              <Link to={`/produtos/${product.id}`} className="text-sm text-emerald-400 hover:underline">
                {product.name}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Campanha</p>
            {aiCampaign ? (
              <Link to={`/campanhas/${aiCampaign.id}`} className="text-sm text-emerald-400 hover:underline">
                {aiCampaign.strategy?.nome_estrategico ?? aiCampaign.id}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">{decision.campaign_id ?? '—'}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Criativo</p>
            {aiCreative ? (
              <Link to={`/criativos/${aiCreative.id}`} className="text-sm text-emerald-400 hover:underline">
                {aiCreative.strategy?.nome ?? aiCreative.id}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">{decision.creative_id ?? '—'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Análise</h2>

        {decision.reasoning && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Justificativa</p>
            <p className="text-sm text-gray-200 leading-relaxed">{decision.reasoning}</p>
          </div>
        )}

        {decision.supporting_data && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Métricas analisadas</p>
            <p className="text-sm text-gray-300 leading-relaxed bg-gray-800 rounded-lg px-4 py-3">
              {decision.supporting_data}
            </p>
          </div>
        )}

        {decision.risk && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Risco</p>
            <p className="text-sm text-amber-300 leading-relaxed">{decision.risk}</p>
          </div>
        )}
      </div>

      {/* Recommended actions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Ações Recomendadas</h2>

        {decision.recommended_action && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Ação recomendada</p>
            <p className="text-sm text-emerald-300 font-medium leading-relaxed">{decision.recommended_action}</p>
          </div>
        )}

        {decision.actions && decision.actions.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Passos de execução</p>
            <ol className="space-y-2">
              {decision.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-200">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs text-emerald-400 font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {decision.next_step && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Próximo passo</p>
            <p className="text-sm text-blue-300 leading-relaxed">{decision.next_step}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Notas</h2>
          {!editingNote && (
            <button
              onClick={() => { setNoteText(decision.notes ?? ''); setEditingNote(true) }}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {decision.notes ? 'Editar' : '+ Adicionar nota'}
            </button>
          )}
        </div>
        {editingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500"
              placeholder="Adicionar notas sobre esta decisão..."
            />
            <div className="flex gap-2">
              <button onClick={saveNote} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Salvar</button>
              <button onClick={() => setEditingNote(false)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{decision.notes || 'Nenhuma nota adicionada.'}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Atualizar Status</h2>
        <div className="flex flex-wrap gap-2">
          {decision.status !== 'accepted' && (
            <button
              onClick={() => updateStatus('accepted')}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ✓ Aceitar decisão
            </button>
          )}
          {decision.status !== 'executed' && (
            <button
              onClick={() => updateStatus('executed')}
              className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ✔ Marcar como executada
            </button>
          )}
          {decision.status !== 'ignored' && (
            <button
              onClick={() => updateStatus('ignored')}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Ignorar
            </button>
          )}
          {decision.status !== 'archived' && (
            <button
              onClick={() => updateStatus('archived')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Arquivar
            </button>
          )}
          {decision.status === 'pending' && (
            <button
              onClick={() => updateStatus('in_progress')}
              className="bg-violet-700 hover:bg-violet-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              ▶ Em andamento
            </button>
          )}
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap gap-3 pb-4">
        {product && (
          <Link
            to={`/produtos/${product.id}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            📦 Ir para produto
          </Link>
        )}
        {aiCampaign && (
          <Link
            to={`/campanhas/${aiCampaign.id}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            📢 Ir para campanha
          </Link>
        )}
        {aiCreative && (
          <Link
            to={`/criativos/${aiCreative.id}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            🎨 Ir para criativo
          </Link>
        )}
        <button
          onClick={() => navigate('/decisoes')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          🔀 Criar variação
        </button>
      </div>
    </div>
  )
}
