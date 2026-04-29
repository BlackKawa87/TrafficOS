import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  VSL_STATUS_LABELS,
  VSL_BLOCO_LABELS,
  VSL_BLOCO_ICONS,
  VSL_BLOCO_COLORS,
  VSL_ESTILO_LABELS,
  formatDate,
} from '../utils/helpers'
import type { VslScript, VslStatus } from '../types'

function CopyButton({ text, label = '📋 Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
        copied ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
      }`}
    >
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlocoCard({ bloco, index }: { bloco: VslScript['blocos'][number]; index: number }) {
  const [showDirecao, setShowDirecao] = useState(false)
  const colorBorder = VSL_BLOCO_COLORS[bloco.tipo] ?? 'border-gray-700 bg-gray-800/30'
  const icon = VSL_BLOCO_ICONS[bloco.tipo] ?? '📝'
  const label = VSL_BLOCO_LABELS[bloco.tipo] ?? bloco.nome

  return (
    <div className={`rounded-2xl border overflow-hidden ${colorBorder}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <div>
            <span className="text-xs font-semibold text-white">{label}</span>
            <span className="text-[10px] text-gray-500 ml-2">· {bloco.duracao}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 px-1.5 py-0.5 rounded bg-black/20">
            {bloco.tempo_inicio}
          </span>
          <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded bg-black/20">
            Bloco {index + 1}
          </span>
        </div>
      </div>

      {/* Objetivo */}
      <div className="px-4 py-2 bg-black/20 text-[11px] text-gray-400">
        <span className="text-gray-600">Objetivo:</span> {bloco.objetivo}
      </div>

      {/* Roteiro */}
      <div className="p-4 bg-gray-950/40">
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{bloco.roteiro}</p>
        <div className="flex justify-end mt-2">
          <CopyButton text={bloco.roteiro} />
        </div>
      </div>

      {/* Direção */}
      {bloco.notas_direcao && (
        <div className="border-t border-white/10">
          <button
            onClick={() => setShowDirecao(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>🎬 Direção de gravação</span>
            <span>{showDirecao ? '▲' : '▼'}</span>
          </button>
          {showDirecao && (
            <div className="px-4 pb-3 text-xs text-gray-400 leading-relaxed">
              {bloco.notas_direcao}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function VslDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [showFullScript, setShowFullScript] = useState(false)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  const vsl: VslScript | null = id ? tosDb.vslScripts.getById(id) : null

  if (!vsl) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">VSL não encontrado.</p>
        <button onClick={() => navigate('/vsl')} className="text-violet-400 hover:underline text-sm">
          ← Voltar para VSL
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(vsl.product_id)
  const current = tosDb.vslScripts.getById(id!)!
  const currentNotes = current?.notes ?? ''

  function updateStatus(status: VslStatus) {
    tosDb.vslScripts.save({ ...current, status, updated_at: now() })
    setTick(t => t + 1)
  }

  function saveNotes() {
    tosDb.vslScripts.save({ ...current, notes, updated_at: now() })
    setEditingNotes(false)
    setTick(t => t + 1)
  }

  function copyAllScript() {
    const text = (current.blocos ?? []).map((b, i) =>
      `━━ ${i + 1}. ${b.nome} ━━\n${b.roteiro}`
    ).join('\n\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const estiloIcon: Record<string, string> = { autoridade: '🏆', storytelling: '📖', direto: '⚡' }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/vsl')}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
      >
        ← VSL / Roteiros
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white">{current.nome}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(current.status)}`}>
              {VSL_STATUS_LABELS[current.status]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-violet-900/30 text-violet-400 border border-violet-800/40">
              {estiloIcon[current.estilo]} {VSL_ESTILO_LABELS[current.estilo]}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {product?.name ?? current.product_id} · ⏱ {current.duracao_total} · Criado em {formatDate(current.created_at)}
          </div>
        </div>
        <button
          onClick={copyAllScript}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded-lg transition-colors flex-shrink-0"
        >
          📋 Copiar todos
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        {current.promessa_principal && (
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Promessa Principal</span>
            <p className="text-sm text-violet-300 font-medium mt-1 leading-relaxed">"{current.promessa_principal}"</p>
          </div>
        )}
        {current.descricao && (
          <p className="text-sm text-gray-300 leading-relaxed">{current.descricao}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1 border-t border-gray-800">
          <span>🎬 {current.blocos?.length ?? 0} blocos</span>
          {current.publico_alvo && (
            <>
              <span>·</span>
              <span>👥 {current.publico_alvo}</span>
            </>
          )}
        </div>
      </div>

      {/* Status actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Status</div>
        <div className="flex flex-wrap gap-2">
          {current.status !== 'pronto' && (
            <button
              onClick={() => updateStatus('pronto')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Marcar como Pronto
            </button>
          )}
          {current.status !== 'em_uso' && (
            <button
              onClick={() => updateStatus('em_uso')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ▶ Em Uso
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
          {current.status === 'arquivado' && (
            <button
              onClick={() => updateStatus('rascunho')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              ↩ Restaurar
            </button>
          )}
        </div>
      </div>

      {/* Blocks */}
      {(current.blocos?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Roteiro — {current.blocos.length} blocos
            </h3>
          </div>

          {/* Block trail */}
          <div className="flex items-center gap-1 flex-wrap pb-1">
            {current.blocos.map((b, i) => (
              <div key={i} className="flex items-center gap-1">
                <span
                  title={VSL_BLOCO_LABELS[b.tipo] ?? b.nome}
                  className={`text-sm px-2 py-1 rounded-lg border ${VSL_BLOCO_COLORS[b.tipo] ?? ''}`}
                >
                  {VSL_BLOCO_ICONS[b.tipo] ?? '📝'}
                </span>
                {i < current.blocos.length - 1 && (
                  <span className="text-gray-700 text-xs">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {current.blocos.map((bloco, i) => (
              <BlocoCard key={i} bloco={bloco} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Full Script */}
      {current.texto_completo && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFullScript(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
          >
            <span>📄 Roteiro Completo</span>
            <div className="flex items-center gap-2">
              <CopyButton text={current.texto_completo} label="📋 Copiar" />
              <span className="text-gray-600">{showFullScript ? '▲' : '▼'}</span>
            </div>
          </button>
          {showFullScript && (
            <div className="px-5 pb-5 border-t border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mt-4">
                {current.texto_completo}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Direction */}
      {current.direcao && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">🎬 Direção de Vídeo</h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Tom de Voz', value: current.direcao.tom_voz, icon: '🎙' },
              { label: 'Ritmo', value: current.direcao.ritmo, icon: '⏱' },
              { label: 'Cortes', value: current.direcao.cortes, icon: '✂️' },
              { label: 'Expressão', value: current.direcao.expressao, icon: '👁' },
              { label: 'Cenário', value: current.direcao.cenario, icon: '🎥' },
            ].map(item => item.value ? (
              <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-800/40 rounded-lg">
                <span className="text-sm flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">{item.label}</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.value}</p>
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Notas</h3>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Resultados, ajustes, taxa de conversão..."
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
              <p className="text-sm text-gray-600 italic">Nenhuma nota ainda.</p>
            )}
            <button
              onClick={() => { setNotes(currentNotes); setEditingNotes(true) }}
              className="text-xs text-violet-400 hover:text-violet-300 mt-2"
            >
              {currentNotes ? 'Editar notas' : '+ Adicionar nota'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
