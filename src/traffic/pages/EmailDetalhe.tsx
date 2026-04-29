import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, now } from '../store/storage'
import {
  getStatusColor,
  EMAIL_TYPE_LABELS,
  EMAIL_TYPE_ICONS,
  EMAIL_TYPE_COLORS,
  EMAIL_SEQUENCE_STATUS_LABELS,
  formatDate,
} from '../utils/helpers'
import type { EmailSequence, EmailSequenceStatus, EmailItem } from '../types'

function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
      {label}
    </span>
  )
}

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); handleCopy() }}
      className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
        copied
          ? 'bg-emerald-900/50 text-emerald-400'
          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

// ─── Email Card ───────────────────────────────────────────────────────────────

function EmailCard({ email, index }: { email: EmailItem; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const colorClass = EMAIL_TYPE_COLORS[email.tipo] ?? 'border-gray-700 bg-gray-800/30'

  const fullEmailText = `Assunto: ${email.assunto}
Preheader: ${email.preheader}

${email.corpo}

${email.cta}`

  return (
    <div className={`border rounded-xl overflow-hidden ${colorClass}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-black/10 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-sm font-bold text-white">
          {email.dia}
        </div>
        <span className="text-lg flex-shrink-0">{EMAIL_TYPE_ICONS[email.tipo] ?? '📧'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
              {EMAIL_TYPE_LABELS[email.tipo] ?? email.tipo}
            </span>
          </div>
          <div className="text-sm font-semibold text-white mt-0.5 truncate">{email.assunto}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CopyButton text={email.assunto} label="Assunto" />
          <span className="text-white/50 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10 bg-gray-900 divide-y divide-gray-800">
          {/* Meta row */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-gray-500">Objetivo: </span>
              <span className="text-gray-300">{email.objetivo}</span>
            </div>
          </div>

          {/* Subject + Preheader */}
          <div className="px-5 py-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Assunto</span>
                <CopyButton text={email.assunto} />
              </div>
              <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm font-medium text-white">
                {email.assunto}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Preheader</span>
                <CopyButton text={email.preheader} />
              </div>
              <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 italic">
                {email.preheader}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Corpo do Email</span>
              <CopyButton text={fullEmailText} label="Copiar tudo" />
            </div>
            <div className="bg-gray-800/60 rounded-xl p-5">
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                {email.corpo}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">CTA</span>
              <CopyButton text={email.cta} />
            </div>
            <div className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium">
              {email.cta}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function EmailDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  const seq: EmailSequence | null = id ? tosDb.emailSequences.getById(id) : null

  if (!seq) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Sequência não encontrada.</p>
        <button onClick={() => navigate('/email')} className="text-violet-400 hover:underline text-sm">
          ← Voltar para Email Marketing
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(seq.product_id)

  function updateStatus(status: EmailSequenceStatus) {
    tosDb.emailSequences.save({ ...seq!, status, updated_at: now() })
    setTick(t => t + 1)
  }

  function saveNotes() {
    tosDb.emailSequences.save({ ...seq!, notes, updated_at: now() })
    setEditingNotes(false)
    setTick(t => t + 1)
  }

  const current = tosDb.emailSequences.getById(id!)!
  const currentNotes = current?.notes ?? ''

  function copyAllEmails() {
    const text = (current.emails ?? []).map(e =>
      `═══ EMAIL ${e.dia} — ${EMAIL_TYPE_LABELS[e.tipo] ?? e.tipo} ═══\n\nAssunto: ${e.assunto}\nPreheader: ${e.preheader}\n\n${e.corpo}\n\nCTA: ${e.cta}`
    ).join('\n\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/email')}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
      >
        ← Email Marketing
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white">{current.nome}</h1>
            <Badge value={current.status} label={EMAIL_SEQUENCE_STATUS_LABELS[current.status] ?? current.status} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {product?.name ?? current.product_id} · Criada em {formatDate(current.created_at)}
          </div>
        </div>
        <button
          onClick={copyAllEmails}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded-lg transition-colors flex-shrink-0"
        >
          📋 Copiar todos
        </button>
      </div>

      {/* Sequence info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-violet-400">{current.emails?.length ?? 0}</div>
          <div className="text-xs text-gray-500">emails</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">7 dias</div>
          <div className="text-xs text-gray-500">duração</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-white truncate">{current.frequencia}</div>
          <div className="text-xs text-gray-500">frequência</div>
        </div>
      </div>

      {/* Description + Audience */}
      {(current.descricao || current.publico_alvo) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          {current.descricao && (
            <p className="text-sm text-gray-300 leading-relaxed">{current.descricao}</p>
          )}
          {current.publico_alvo && (
            <div className="flex items-start gap-1.5 text-xs text-gray-500">
              <span>👥</span>
              <span>{current.publico_alvo}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Status</div>
        <div className="flex flex-wrap gap-2">
          {current.status !== 'ativo' && (
            <button
              onClick={() => updateStatus('ativo')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ✓ Ativar sequência
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
          {current.status === 'rascunho' && (
            <button
              onClick={() => updateStatus('ativo')}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ▶ Colocar em uso
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

      {/* Emails */}
      {(current.emails?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Sequência de Emails ({current.emails.length})
            </h3>
          </div>
          <div className="space-y-2">
            {current.emails.map((email, i) => (
              <EmailCard key={i} email={email} index={i} />
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
              placeholder="Adicione observações, resultados, ajustes feitos na sequência..."
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
      </div>
    </div>
  )
}
