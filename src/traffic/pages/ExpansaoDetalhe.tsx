import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  EXPANSAO_CHANNEL_LABELS,
  EXPANSAO_CHANNEL_ICONS,
  EXPANSAO_STATUS_LABELS,
  EXPANSAO_RISK_LABELS,
  formatDate,
} from '../utils/helpers'
import type { ExpansaoPlan, ExpansaoStatus } from '../types'

function Badge({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className ?? getStatusColor(value)}`}>
      {label}
    </span>
  )
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  )
}

function riskColor(r: string): string {
  if (r === 'alto') return 'bg-red-900/50 text-red-300'
  if (r === 'medio') return 'bg-amber-900/50 text-amber-300'
  return 'bg-emerald-900/50 text-emerald-300'
}

export default function ExpansaoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [completedSetup, setCompletedSetup] = useState<number[]>([])

  const plan: ExpansaoPlan | null = id ? tosDb.expansaoPlans.getById(id) : null

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Plano não encontrado.</p>
        <button onClick={() => navigate('/expansao')} className="text-violet-400 hover:underline text-sm">
          ← Voltar para Expansão
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(plan.product_id)
  const baseCampaign = plan.campanha_base_id ? tosDb.aiCampaigns.getById(plan.campanha_base_id) : null
  const baseCreative = plan.criativo_base_id ? tosDb.aiCreatives.getById(plan.criativo_base_id) : null

  function updateStatus(status: ExpansaoStatus) {
    tosDb.expansaoPlans.save({ ...plan!, status, updated_at: now() })
    setTick(t => t + 1)
  }

  function saveNotes() {
    tosDb.expansaoPlans.save({ ...plan!, notes, updated_at: now() })
    setEditingNotes(false)
    setTick(t => t + 1)
  }

  function toggleSetup(i: number) {
    setCompletedSetup(prev =>
      prev.includes(i) ? prev.filter(s => s !== i) : [...prev, i]
    )
  }

  const current = tosDb.expansaoPlans.getById(id!)!
  const currentNotes = current?.notes ?? ''

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/expansao')}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
      >
        ← Expansão Multi-Canal
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 bg-gray-800 rounded-xl px-4 py-3 flex-shrink-0">
            <span className="text-xl">{EXPANSAO_CHANNEL_ICONS[current.source_channel] ?? '📊'}</span>
            <span className="text-gray-500 text-sm">→</span>
            <span className="text-2xl">{EXPANSAO_CHANNEL_ICONS[current.target_channel] ?? '🌐'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white">
                {EXPANSAO_CHANNEL_LABELS[current.source_channel] ?? current.source_channel}
                <span className="text-gray-500 mx-2">→</span>
                {EXPANSAO_CHANNEL_LABELS[current.target_channel] ?? current.target_channel}
              </h1>
              <Badge value={current.status} label={EXPANSAO_STATUS_LABELS[current.status] ?? current.status} />
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskColor(current.risco)}`}>
                {EXPANSAO_RISK_LABELS[current.risco] ?? current.risco}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {product?.name ?? current.product_id} · Criado em {formatDate(current.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Status do Plano</div>
        <div className="flex flex-wrap gap-2">
          {current.status === 'pendente' && (
            <button
              onClick={() => updateStatus('em_teste')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ▶ Iniciar Teste
            </button>
          )}
          {current.status === 'em_teste' && (
            <button
              onClick={() => updateStatus('ativo')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Marcar como Ativo
            </button>
          )}
          {(current.status === 'pendente' || current.status === 'em_teste' || current.status === 'ativo') && (
            <button
              onClick={() => updateStatus('pausado')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              ⏸ Pausar
            </button>
          )}
          {current.status !== 'arquivado' && (
            <button
              onClick={() => updateStatus('arquivado')}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium rounded-lg transition-colors"
            >
              📁 Arquivar
            </button>
          )}
          {(current.status === 'pausado' || current.status === 'arquivado') && (
            <button
              onClick={() => updateStatus('pendente')}
              className="px-3 py-1.5 bg-violet-700 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ↩ Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Base references */}
      {(baseCampaign || baseCreative) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Baseado em</div>
          <div className="flex gap-2">
            {baseCampaign && (
              <button
                onClick={() => navigate(`/campanhas/${baseCampaign.id}`)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
              >
                📢 {baseCampaign.strategy?.nome_estrategico ?? baseCampaign.id}
              </button>
            )}
            {baseCreative && (
              <button
                onClick={() => navigate(`/criativos/${baseCreative.id}`)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
              >
                🎨 {baseCreative.strategy?.nome ?? baseCreative.id}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Motivo */}
      <Section title="Motivo da Escolha" icon="🎯">
        <p className="text-sm text-gray-300 leading-relaxed">{current.motivo_escolha}</p>
      </Section>

      {/* Canal Info */}
      <div className="grid grid-cols-2 gap-3">
        {current.publico_estimado && (
          <Section title="Público Estimado" icon="👥">
            <p className="text-sm text-gray-300 leading-relaxed">{current.publico_estimado}</p>
          </Section>
        )}
        {current.diferencial_canal && (
          <Section title="Diferencial do Canal" icon="⚡">
            <p className="text-sm text-gray-300 leading-relaxed">{current.diferencial_canal}</p>
          </Section>
        )}
      </div>

      {/* Creative Adaptation */}
      {current.adaptacao_criativos && (
        <Section title="Adaptação de Criativos" icon="🎨">
          <div className="space-y-3">
            <div className="bg-gray-800/40 rounded-lg p-3.5">
              <div className="text-xs text-gray-500 mb-1.5 font-medium">🎬 Adaptação de Vídeo</div>
              <p className="text-sm text-gray-300 leading-relaxed">{current.adaptacao_criativos.video_adaptacao}</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3.5">
              <div className="text-xs text-gray-500 mb-1.5 font-medium">🖼 Adaptação de Imagem</div>
              <p className="text-sm text-gray-300 leading-relaxed">{current.adaptacao_criativos.imagem_adaptacao}</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3.5">
              <div className="text-xs text-gray-500 mb-1.5 font-medium">✍ Ajustes de Copy</div>
              <p className="text-sm text-gray-300 leading-relaxed">{current.adaptacao_criativos.copy_ajustes}</p>
            </div>
            {(current.adaptacao_criativos.formatos_recomendados?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium">Formatos recomendados</div>
                <div className="flex flex-wrap gap-1.5">
                  {current.adaptacao_criativos.formatos_recomendados.map((f, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-900/30 text-violet-300 border border-violet-700/30">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Entry Strategy */}
      {current.estrategia_entrada && (
        <Section title="Estratégia de Entrada" icon="🚀">
          <div className="space-y-3">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-violet-400">{current.estrategia_entrada.orcamento_teste}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Orçamento teste</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-white">{current.estrategia_entrada.num_criativos}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Criativos</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-white">{current.estrategia_entrada.duracao_teste}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Duração</div>
              </div>
            </div>

            {/* Test structure */}
            <div className="bg-gray-800/40 rounded-lg p-3.5">
              <div className="text-xs text-gray-500 mb-1.5">Estrutura do teste inicial</div>
              <p className="text-sm text-gray-300 leading-relaxed">{current.estrategia_entrada.teste_inicial}</p>
            </div>

            {/* Validation metrics */}
            {(current.estrategia_entrada.metricas_validacao?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2">Métricas de validação</div>
                <div className="space-y-1">
                  {current.estrategia_entrada.metricas_validacao.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-violet-400 mt-0.5">▸</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup checklist */}
            {(current.estrategia_entrada.setup?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2">Setup técnico</div>
                <div className="space-y-1.5">
                  {current.estrategia_entrada.setup.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSetup(i)}
                      className={`w-full flex items-start gap-2.5 text-left p-2.5 rounded-lg border transition-colors ${
                        completedSetup.includes(i)
                          ? 'border-emerald-700/40 bg-emerald-900/10'
                          : 'border-gray-700 bg-gray-800/20 hover:border-gray-600'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] mt-0.5 ${
                        completedSetup.includes(i)
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-600'
                      }`}>
                        {completedSetup.includes(i) ? '✓' : ''}
                      </div>
                      <span className={`text-xs ${completedSetup.includes(i) ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                        {step}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {completedSetup.length}/{current.estrategia_entrada.setup.length} etapas concluídas
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Scale Potential */}
      {current.potencial_escala && (
        <Section title="Potencial de Escala" icon="📈">
          <p className="text-sm text-gray-300 leading-relaxed">{current.potencial_escala}</p>
        </Section>
      )}

      {/* Risk */}
      <Section title="Análise de Risco" icon="⚠️">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${riskColor(current.risco)}`}>
              {EXPANSAO_RISK_LABELS[current.risco] ?? current.risco}
            </span>
          </div>
          {current.risco_detalhes && (
            <p className="text-sm text-gray-300 leading-relaxed">{current.risco_detalhes}</p>
          )}
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notas">
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Adicione observações, resultados do teste, aprendizados..."
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
    </div>
  )
}
