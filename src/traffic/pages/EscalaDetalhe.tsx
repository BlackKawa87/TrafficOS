import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  SCALE_ACTION_LABELS,
  SCALE_ACTION_ICONS,
  SCALE_PRIORITY_LABELS,
  SCALE_STATUS_LABELS,
  SCALE_LEVEL_LABELS,
  formatDate,
} from '../utils/helpers'
import type { ScaleOpportunity, ScaleStatus } from '../types'

function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

export default function EscalaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  const opp: ScaleOpportunity | null = id
    ? tosDb.scaleOpportunities.getById(id)
    : null

  if (!opp) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Oportunidade não encontrada.</p>
        <button onClick={() => navigate('/escala')} className="text-violet-400 hover:underline text-sm">
          ← Voltar para Motor de Escala
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(opp.product_id)
  const campaign = opp.campaign_id ? tosDb.aiCampaigns.getById(opp.campaign_id) : null
  const creative = opp.creative_id ? tosDb.aiCreatives.getById(opp.creative_id) : null

  function updateStatus(status: ScaleStatus) {
    tosDb.scaleOpportunities.save({ ...opp!, status, updated_at: now() })
    setTick(t => t + 1)
  }

  function saveNotes() {
    tosDb.scaleOpportunities.save({ ...opp!, notes, updated_at: now() })
    setEditingNotes(false)
    setTick(t => t + 1)
  }

  function toggleStep(i: number) {
    setCompletedSteps(prev =>
      prev.includes(i) ? prev.filter(s => s !== i) : [...prev, i]
    )
  }

  const currentOpp = tosDb.scaleOpportunities.getById(id!)!
  const currentNotes = currentOpp?.notes ?? ''

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/escala')}
          className="text-xs text-gray-400 hover:text-white mb-4 flex items-center gap-1"
        >
          ← Motor de Escala
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-3xl mt-0.5">{SCALE_ACTION_ICONS[currentOpp.action_type] ?? '📊'}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight">{currentOpp.title}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge value={currentOpp.priority} label={SCALE_PRIORITY_LABELS[currentOpp.priority] ?? currentOpp.priority} />
                <Badge value={currentOpp.status} label={SCALE_STATUS_LABELS[currentOpp.status] ?? currentOpp.status} />
                <span className="text-xs text-gray-500">
                  {SCALE_ACTION_LABELS[currentOpp.action_type] ?? currentOpp.action_type}
                </span>
                {currentOpp.channel && (
                  <span className="text-xs text-gray-500">· {currentOpp.channel}</span>
                )}
                <span className="text-xs text-gray-600">· {formatDate(currentOpp.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Ações</div>
        <div className="flex flex-wrap gap-2">
          {currentOpp.status === 'pendente' && (
            <button
              onClick={() => updateStatus('em_execucao')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ▶ Executar ação
            </button>
          )}
          {currentOpp.status === 'em_execucao' && (
            <button
              onClick={() => updateStatus('executada')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Marcar como concluída
            </button>
          )}
          {(currentOpp.status === 'pendente' || currentOpp.status === 'em_execucao') && (
            <button
              onClick={() => updateStatus('ignorada')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              ✕ Ignorar
            </button>
          )}
          {currentOpp.status !== 'arquivada' && (
            <button
              onClick={() => updateStatus('arquivada')}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium rounded-lg transition-colors"
            >
              📁 Arquivar
            </button>
          )}
          {currentOpp.status === 'ignorada' && (
            <button
              onClick={() => updateStatus('pendente')}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ↩ Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Context */}
      <Section title="Contexto">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Produto</div>
            <div className="text-gray-200">{product?.name ?? currentOpp.product_id}</div>
          </div>
          {campaign && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Campanha</div>
              <button
                onClick={() => navigate(`/campanhas/${campaign.id}`)}
                className="text-violet-400 hover:text-violet-300 text-sm text-left"
              >
                {campaign.strategy?.nome_estrategico ?? campaign.id} →
              </button>
            </div>
          )}
          {creative && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Criativo</div>
              <button
                onClick={() => navigate(`/criativos/${creative.id}`)}
                className="text-violet-400 hover:text-violet-300 text-sm text-left"
              >
                {creative.strategy?.nome ?? creative.id} →
              </button>
            </div>
          )}
          {currentOpp.channel && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Canal</div>
              <div className="text-gray-200">{currentOpp.channel}</div>
            </div>
          )}
        </div>
      </Section>

      {/* Reason */}
      <Section title="Motivo da Ação">
        <p className="text-sm text-gray-300 leading-relaxed">{currentOpp.reason}</p>
      </Section>

      {/* Supporting Data */}
      {currentOpp.supporting_data && (
        <Section title="Dados que Justificam">
          <div className="bg-gray-800/60 rounded-lg p-3 text-sm text-gray-300 font-mono leading-relaxed">
            {currentOpp.supporting_data}
          </div>
        </Section>
      )}

      {/* Recommended Actions */}
      {currentOpp.recommended_action?.length > 0 && (
        <Section title="Ação Recomendada">
          <div className="space-y-2">
            {currentOpp.recommended_action.map((step, i) => (
              <button
                key={i}
                onClick={() => toggleStep(i)}
                className={`w-full flex items-start gap-3 text-left p-3 rounded-lg border transition-colors ${
                  completedSteps.includes(i)
                    ? 'border-emerald-700/50 bg-emerald-900/10'
                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                }`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs mt-0.5 ${
                  completedSteps.includes(i)
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-600 text-gray-600'
                }`}>
                  {completedSteps.includes(i) ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${completedSteps.includes(i) ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {step}
                </span>
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {completedSteps.length}/{currentOpp.recommended_action.length} passos marcados
          </div>
        </Section>
      )}

      {/* Action Limit */}
      {currentOpp.action_limit && (
        <Section title="Limite da Ação">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-sm flex-shrink-0">⚠️</span>
            <p className="text-sm text-amber-300 leading-relaxed">{currentOpp.action_limit}</p>
          </div>
        </Section>
      )}

      {/* Potential / Risk / Confidence */}
      <Section title="Avaliação">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Potencial', value: currentOpp.potential, colorFn: (v: string) => v === 'alto' ? 'text-emerald-400' : v === 'medio' ? 'text-amber-400' : 'text-gray-400' },
            { label: 'Risco', value: currentOpp.risk, colorFn: (v: string) => v === 'alto' ? 'text-red-400' : v === 'medio' ? 'text-amber-400' : 'text-emerald-400' },
            { label: 'Confiança', value: currentOpp.confidence, colorFn: (v: string) => v === 'alto' ? 'text-emerald-400' : v === 'medio' ? 'text-amber-400' : 'text-gray-400' },
          ].map(item => (
            <div key={item.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${item.colorFn(item.value)}`}>
                {SCALE_LEVEL_LABELS[item.value] ?? item.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Next Step */}
      {currentOpp.next_step && (
        <Section title="Próximo Passo">
          <div className="flex items-start gap-2">
            <span className="text-violet-400 text-sm flex-shrink-0">→</span>
            <p className="text-sm text-gray-300 leading-relaxed">{currentOpp.next_step}</p>
          </div>
        </Section>
      )}

      {/* Notes */}
      <Section title="Notas">
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Adicione observações, contexto adicional ou resultado da execução..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNotes}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => { setEditingNotes(false); setNotes(currentNotes) }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div>
            {currentNotes ? (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{currentNotes}</p>
            ) : (
              <p className="text-sm text-gray-600 italic">Nenhuma nota adicionada.</p>
            )}
            <button
              onClick={() => { setNotes(currentNotes); setEditingNotes(true) }}
              className="text-xs text-violet-400 hover:text-violet-300 mt-2"
            >
              {currentNotes ? 'Editar notas' : '+ Adicionar nota'}
            </button>
          </div>
        )}
      </Section>

      {/* Navigation Links */}
      {(campaign || creative) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Navegar para</div>
          <div className="flex gap-2 flex-wrap">
            {campaign && (
              <button
                onClick={() => navigate(`/campanhas/${campaign.id}`)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
              >
                📢 {campaign.strategy?.nome_estrategico ?? campaign.id}
              </button>
            )}
            {creative && (
              <button
                onClick={() => navigate(`/criativos/${creative.id}`)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
              >
                🎨 {creative.strategy?.nome ?? creative.id}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
