import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  WHATSAPP_MSG_LABELS,
  WHATSAPP_MSG_ICONS,
  WHATSAPP_MSG_COLORS,
  WHATSAPP_FLOW_STATUS_LABELS,
  WHATSAPP_CANAL_LABELS,
  formatDate,
} from '../utils/helpers'
import type { WhatsappFlow, WhatsappFlowStatus, WhatsappMessage } from '../types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handle(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className={`text-[10px] px-2 py-0.5 rounded transition-colors flex-shrink-0 ${
        copied ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      {copied ? '✓' : '📋'}
    </button>
  )
}

// ─── WhatsApp Message Card ────────────────────────────────────────────────────

function MessageCard({ msg, index }: { msg: WhatsappMessage; index: number }) {
  const [showVariacao, setShowVariacao] = useState(false)
  const colorBorder = WHATSAPP_MSG_COLORS[msg.tipo] ?? 'border-gray-700 bg-gray-800/30'

  // Format text: replace \n with actual newlines for display
  function formatText(text: string) {
    return text?.replace(/\\n/g, '\n') ?? ''
  }

  return (
    <div className="space-y-2">
      {/* Card header */}
      <div className={`rounded-2xl border overflow-hidden ${colorBorder}`}>
        {/* Label row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-base">{WHATSAPP_MSG_ICONS[msg.tipo] ?? '💬'}</span>
            <div>
              <span className="text-xs font-semibold text-white">{msg.titulo}</span>
              <span className="text-[10px] text-gray-500 ml-2">· {WHATSAPP_MSG_LABELS[msg.tipo]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded bg-black/20">
              Msg {index + 1}
            </span>
          </div>
        </div>

        {/* Context info */}
        <div className="px-4 py-2 bg-black/20 text-xs text-gray-400 flex flex-wrap gap-3">
          <span>
            <span className="text-gray-600">Enviar:</span> {msg.gatilho_envio}
          </span>
          <span>
            <span className="text-gray-600">Objetivo:</span> {msg.objetivo}
          </span>
        </div>

        {/* Phone-style chat bubble */}
        <div className="p-4 bg-gray-950/40">
          <div className="max-w-[85%] ml-auto">
            {/* Chat bubble */}
            <div className="relative bg-green-700 rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg">
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                {formatText(msg.texto)}
              </p>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-green-200/70">✓✓</span>
              </div>
              {/* Bubble tail */}
              <div className="absolute -right-2 top-0 w-0 h-0 border-l-[10px] border-l-green-700 border-b-[10px] border-b-transparent" />
            </div>
          </div>

          {/* Copy button below bubble */}
          <div className="flex justify-end mt-2">
            <CopyButton text={formatText(msg.texto)} />
          </div>
        </div>

        {/* Variação */}
        {msg.variacao && (
          <div className="border-t border-white/10">
            <button
              onClick={() => setShowVariacao(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <span>Variação alternativa</span>
              <span>{showVariacao ? '▲' : '▼'}</span>
            </button>
            {showVariacao && (
              <div className="px-4 pb-4 bg-gray-950/40">
                <div className="max-w-[85%] ml-auto">
                  <div className="relative bg-gray-700 rounded-2xl rounded-tr-sm px-4 py-3 shadow">
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {formatText(msg.variacao)}
                    </p>
                    <div className="absolute -right-2 top-0 w-0 h-0 border-l-[10px] border-l-gray-700 border-b-[10px] border-b-transparent" />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <CopyButton text={formatText(msg.variacao)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tip */}
        {msg.dica && (
          <div className="px-4 py-3 border-t border-white/10 bg-black/10">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-xs flex-shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-gray-400 leading-relaxed">{msg.dica}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function WhatsappDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  const flow: WhatsappFlow | null = id ? tosDb.whatsappFlows.getById(id) : null

  if (!flow) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Fluxo não encontrado.</p>
        <button onClick={() => navigate('/whatsapp')} className="text-green-400 hover:underline text-sm">
          ← Voltar para WhatsApp
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(flow.product_id)

  function updateStatus(status: WhatsappFlowStatus) {
    tosDb.whatsappFlows.save({ ...flow!, status, updated_at: now() })
    setTick(t => t + 1)
  }

  function saveNotes() {
    tosDb.whatsappFlows.save({ ...flow!, notes, updated_at: now() })
    setEditingNotes(false)
    setTick(t => t + 1)
  }

  const current = tosDb.whatsappFlows.getById(id!)!
  const currentNotes = current?.notes ?? ''

  function copyAllMessages() {
    const text = (current.mensagens ?? []).map((msg, i) =>
      `━━ ${i + 1}. ${msg.titulo} ━━\nEnviar: ${msg.gatilho_envio}\n\n${msg.texto?.replace(/\\n/g, '\n')}`
    ).join('\n\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/whatsapp')}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
      >
        ← WhatsApp / Telegram
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white">{current.nome}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(current.status)}`}>
              {WHATSAPP_FLOW_STATUS_LABELS[current.status]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-800/40">
              {WHATSAPP_CANAL_LABELS[current.canal]}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {product?.name ?? current.product_id} · Criado em {formatDate(current.created_at)}
          </div>
        </div>
        <button
          onClick={copyAllMessages}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded-lg transition-colors flex-shrink-0"
        >
          📋 Copiar todos
        </button>
      </div>

      {/* Description */}
      {current.descricao && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-300 leading-relaxed">{current.descricao}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>💬 {current.mensagens?.length ?? 0} mensagens</span>
            <span>·</span>
            <span>{WHATSAPP_CANAL_LABELS[current.canal]}</span>
          </div>
        </div>
      )}

      {/* Status actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Status</div>
        <div className="flex flex-wrap gap-2">
          {current.status !== 'ativo' && (
            <button
              onClick={() => updateStatus('ativo')}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Ativar fluxo
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

      {/* Messages */}
      {(current.mensagens?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Fluxo de Mensagens ({current.mensagens.length})
            </h3>
          </div>

          {/* Flow trail */}
          <div className="flex items-center gap-1 flex-wrap pb-1">
            {current.mensagens.map((msg, i) => (
              <div key={i} className="flex items-center gap-1">
                <span
                  title={WHATSAPP_MSG_LABELS[msg.tipo]}
                  className={`text-base px-2 py-1 rounded-lg border text-sm ${WHATSAPP_MSG_COLORS[msg.tipo] ?? ''}`}
                >
                  {WHATSAPP_MSG_ICONS[msg.tipo]}
                </span>
                {i < current.mensagens.length - 1 && (
                  <span className="text-gray-700 text-xs">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {current.mensagens.map((msg, i) => (
              <MessageCard key={i} msg={msg} index={i} />
            ))}
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
              placeholder="Resultados, ajustes, taxa de resposta..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveNotes}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
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
              className="text-xs text-green-400 hover:text-green-300 mt-2"
            >
              {currentNotes ? 'Editar notas' : '+ Adicionar nota'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
