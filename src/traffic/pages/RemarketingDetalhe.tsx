import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  REMARKETING_AUDIENCE_LABELS,
  REMARKETING_AUDIENCE_ICONS,
  INTENTION_LEVEL_LABELS,
  REMARKETING_STATUS_LABELS,
  REMARKETING_PHASE_LABELS,
  formatDate,
} from '../utils/helpers'
import type { RemarketingStrategy, RemarketingStatus, RemarketingAudience } from '../types'

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

function intentionColor(level: string): string {
  if (level === 'alto') return 'bg-emerald-900/50 text-emerald-300'
  if (level === 'medio') return 'bg-amber-900/50 text-amber-300'
  return 'bg-gray-700 text-gray-400'
}

function phaseColor(fase: string): string {
  if (fase === 'urgencia') return 'border-red-700/50 bg-red-900/10'
  if (fase === 'prova') return 'border-blue-700/50 bg-blue-900/10'
  return 'border-violet-700/50 bg-violet-900/10'
}

function phaseIcon(fase: string): string {
  if (fase === 'urgencia') return '⚡'
  if (fase === 'prova') return '⭐'
  return '👋'
}

// ─── Audience Card ─────────────────────────────────────────────────────────

function AudienceCard({ audience }: { audience: RemarketingAudience }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      {/* Header (always visible) */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/30 transition-colors"
      >
        <span className="text-2xl flex-shrink-0">{REMARKETING_AUDIENCE_ICONS[audience.tipo] ?? '👤'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{audience.nome}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${intentionColor(audience.nivel_intencao)}`}>
              {INTENTION_LEVEL_LABELS[audience.nivel_intencao] ?? audience.nivel_intencao}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            <span>{REMARKETING_AUDIENCE_LABELS[audience.tipo] ?? audience.tipo}</span>
            {audience.tamanho_estimado && (
              <span className="text-gray-600">· ~{audience.tamanho_estimado}</span>
            )}
          </div>
        </div>
        <span className="text-gray-500 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-800 divide-y divide-gray-800">
          {/* Description */}
          {audience.descricao && (
            <div className="p-4">
              <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">Por que este público importa</div>
              <p className="text-sm text-gray-300 leading-relaxed">{audience.descricao}</p>
            </div>
          )}

          {/* Video Creative */}
          {audience.criativo_video && (
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">🎬 Criativo de Vídeo</div>
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-gray-600 mb-1">Script completo</div>
                  <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                    {audience.criativo_video.script_completo}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/40 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">Abordagem emocional</div>
                    <p className="text-xs text-gray-300">{audience.criativo_video.abordagem_emocional}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">CTA do vídeo</div>
                    <p className="text-xs text-violet-300 font-medium">{audience.criativo_video.cta}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Creative */}
          {audience.criativo_imagem && (
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">🖼 Criativo de Imagem</div>
              <div className="space-y-2">
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <div className="text-[10px] text-gray-600 mb-1">Headline</div>
                  <p className="text-sm font-bold text-white">{audience.criativo_imagem.headline}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/40 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">Layout visual</div>
                    <p className="text-xs text-gray-300">{audience.criativo_imagem.layout}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-600 mb-1">CTA do botão</div>
                    <p className="text-xs text-emerald-400 font-medium">{audience.criativo_imagem.cta}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {audience.mensagens && (
            <div className="p-4 space-y-2">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">💬 Mensagens Recomendadas</div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'urgencia', label: '⏱ Urgência', color: 'border-red-800/50' },
                  { key: 'escassez', label: '🔒 Escassez', color: 'border-orange-800/50' },
                  { key: 'reforco_valor', label: '💎 Reforço de Valor', color: 'border-violet-800/50' },
                  { key: 'quebra_objecao', label: '🛡 Quebra de Objeção', color: 'border-blue-800/50' },
                ].map(item => (
                  <div key={item.key} className={`border ${item.color} rounded-lg p-3 bg-gray-800/30`}>
                    <div className="text-[10px] text-gray-500 mb-1">{item.label}</div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {audience.mensagens[item.key as keyof typeof audience.mensagens]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function RemarketingDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  const strategy: RemarketingStrategy | null = id
    ? tosDb.remarketingStrategies.getById(id)
    : null

  if (!strategy) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Estratégia não encontrada.</p>
        <button onClick={() => navigate('/remarketing')} className="text-violet-400 hover:underline text-sm">
          ← Voltar para Remarketing
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(strategy.product_id)

  function updateStatus(status: RemarketingStatus) {
    tosDb.remarketingStrategies.save({ ...strategy!, status, updated_at: now() })
    setTick(t => t + 1)
  }

  function saveNotes() {
    tosDb.remarketingStrategies.save({ ...strategy!, notes, updated_at: now() })
    setEditingNotes(false)
    setTick(t => t + 1)
  }

  const current = tosDb.remarketingStrategies.getById(id!)!
  const currentNotes = current?.notes ?? ''

  const altaCount = current.publicos?.filter(p => p.nivel_intencao === 'alto').length ?? 0
  const medioCount = current.publicos?.filter(p => p.nivel_intencao === 'medio').length ?? 0
  const baixoCount = current.publicos?.filter(p => p.nivel_intencao === 'baixo').length ?? 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/remarketing')}
          className="text-xs text-gray-400 hover:text-white mb-4 flex items-center gap-1"
        >
          ← Remarketing
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-white">{product?.name ?? current.product_id}</h1>
              <Badge value={current.status} label={REMARKETING_STATUS_LABELS[current.status] ?? current.status} />
              {current.channel && (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{current.channel}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Criado em {formatDate(current.created_at)} · {current.publicos?.length ?? 0} públicos
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Status da Estratégia</div>
        <div className="flex flex-wrap gap-2">
          {current.status !== 'ativo' && (
            <button
              onClick={() => updateStatus('ativo')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Marcar como ativa
            </button>
          )}
          {current.status === 'ativo' && (
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
        </div>
      </div>

      {/* Intention Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{altaCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Alta intenção</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-amber-400">{medioCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Média intenção</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-400">{baixoCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Baixa intenção</div>
        </div>
      </div>

      {/* Resumo Executivo */}
      {current.resumo_executivo && (
        <Section title="Resumo Executivo">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{current.resumo_executivo}</p>
        </Section>
      )}

      {/* Audiences */}
      {(current.publicos?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Públicos de Remarketing ({current.publicos.length})
          </h3>
          <div className="space-y-2">
            {current.publicos.map((audience, i) => (
              <AudienceCard key={i} audience={audience} />
            ))}
          </div>
        </div>
      )}

      {/* Strategy by Phase */}
      {(current.estrategia_por_fase?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Estratégia por Fase</h3>
          <div className="space-y-3">
            {current.estrategia_por_fase.map((phase, i) => (
              <div key={i} className={`border rounded-xl p-4 space-y-3 ${phaseColor(phase.fase)}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{phaseIcon(phase.fase)}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {REMARKETING_PHASE_LABELS[phase.fase] ?? phase.fase} — {phase.periodo}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-500 mb-1">Objetivo</div>
                    <p className="text-gray-300">{phase.objetivo}</p>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Abordagem</div>
                    <p className="text-gray-300">{phase.abordagem}</p>
                  </div>
                </div>

                {phase.criativos_recomendados?.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">Criativos recomendados</div>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.criativos_recomendados.map((c, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800/80 text-gray-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {phase.frequencia && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Frequência:</span> {phase.frequencia}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget */}
      {current.orcamento_recomendado && (
        <Section title="Orçamento Recomendado">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl font-bold text-violet-400">
              {current.orcamento_recomendado.percentual_do_total}%
            </div>
            <div className="text-sm text-gray-400">do orçamento total de mídia paga</div>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Justificativa</div>
              <p className="text-gray-300 leading-relaxed">{current.orcamento_recomendado.justificativa}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Distribuição por fase</div>
              <p className="text-gray-300">{current.orcamento_recomendado.distribuicao_por_fase}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Frequency */}
      {current.frequencia_ideal && (
        <Section title="Frequência Ideal">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="bg-gray-800/40 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Frequência diária</div>
              <p className="text-gray-200 font-medium">{current.frequencia_ideal.frequencia_diaria}</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Janela de retargeting</div>
              <p className="text-gray-200">{current.frequencia_ideal.janela_retargeting}</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Recomendação geral</div>
              <p className="text-gray-300 leading-relaxed">{current.frequencia_ideal.recomendacao}</p>
            </div>
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
              placeholder="Adicione observações, resultados, ajustes feitos..."
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
