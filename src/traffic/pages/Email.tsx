import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  EMAIL_TYPE_LABELS,
  EMAIL_TYPE_ICONS,
  EMAIL_TYPE_COLORS,
  EMAIL_SEQUENCE_STATUS_LABELS,
} from '../utils/helpers'
import type { EmailSequence, EmailSequenceStatus, EmailType } from '../types'

const PROGRESS_MSGS = [
  'Analisando produto e oferta...',
  'Mapeando dores e desejos do público...',
  'Construindo estrutura narrativa...',
  'Escrevendo emails de abertura e dor...',
  'Criando argumentos de autoridade e prova...',
  'Finalizando sequência de conversão...',
]

type RawSequence = Omit<EmailSequence, 'id' | 'product_id' | 'status' | 'notes' | 'created_at' | 'updated_at'>

function buildEmailPrompt(productId: string): string {
  const product = tosDb.products.getById(productId)
  const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)
  const campaigns = tosDb.aiCampaigns.getByProduct(productId).slice(0, 4)
  const creatives = tosDb.aiCreatives.getByProduct(productId)
  const metrics = tosDb.metrics.getByProduct(productId)

  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0

  const winnerCreatives = creatives
    .filter(c => c.status === 'vencedor')
    .slice(0, 3)
    .map(c => ({
      angulo: c.angle,
      hook: c.strategy?.hooks?.[0]?.texto ?? '',
      ideia: c.strategy?.ideia_central ?? '',
      tipo: c.creative_type,
    }))

  const hasDiagnosis = !!latestDiagnosis

  return `PRODUTO: ${product?.name}
Nicho: ${product?.niche} | Categoria: ${product?.category}
Preço: ${product?.currency} ${product?.price} | Modelo: ${product?.billing_model}
Público-alvo: ${product?.target_audience}
Dor principal: ${product?.main_pain}
Desejo principal: ${product?.main_desire}
Benefício principal: ${product?.main_benefit}
Promessa principal: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}
Objeções principais: ${product?.main_objections}
Mercado/País: ${product?.market}
Idioma: ${product?.language}

DIAGNÓSTICO DE OFERTA: ${hasDiagnosis
  ? `Score ${latestDiagnosis!.analysis?.nota_geral?.score ?? '—'}/10
O que está bom: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_esta_bom ?? '—'}
O que melhorar: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_melhorar ?? '—'}
Próximo passo: ${latestDiagnosis!.analysis?.resumo_executivo?.proximo_passo ?? '—'}`
  : 'Sem diagnóstico disponível.'}

CAMPANHAS ATIVAS (${campaigns.length}):
${campaigns.map(c => `- ${c.strategy?.nome_estrategico ?? c.id} | Canal: ${c.channel} | Fase: ${c.phase} | Objetivo: ${c.objective}`).join('\n')}

ÂNGULOS/COPIES VENCEDORES (${winnerCreatives.length}):
${winnerCreatives.length > 0
  ? JSON.stringify(winnerCreatives, null, 2)
  : 'Nenhum criativo vencedor identificado ainda.'}

MÉTRICAS GERAIS:
- CPA médio: $${avgCpa.toFixed(2)}
- Total conversões: ${totalConversions}
- Gasto total: $${totalSpend.toFixed(2)}`
}

// ─── Generator Modal ──────────────────────────────────────────────────────────

function GeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [generated, setGenerated] = useState<RawSequence | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const products = tosDb.products.getAll()

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setGenerated(null)

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 1.2, 90)
      msgIdx = Math.min(Math.floor(pct / 16), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const contextData = buildEmailPrompt(productId)
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData }),
      })
      clearInterval(interval)
      setProgress(100)
      setProgressMsg('Sequência gerada com sucesso!')

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setGenerated(data.sequence as RawSequence)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar sequência.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!generated) return
    const sequence: EmailSequence = {
      id: generateId(),
      product_id: productId,
      nome: generated.nome,
      descricao: generated.descricao,
      frequencia: generated.frequencia,
      publico_alvo: generated.publico_alvo,
      emails: generated.emails ?? [],
      status: 'rascunho',
      created_at: now(),
      updated_at: now(),
    }
    tosDb.emailSequences.save(sequence)
    setSaved(true)
    onSaved()
  }

  const isPreview = !loading && !!generated

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">Gerar Sequência de Emails com IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">7 emails completos para converter leads em clientes</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Config */}
          {!isPreview && !loading && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Produto *</label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">Selecione um produto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {productId && (
                <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
                  {(() => {
                    const p = tosDb.products.getById(productId)
                    return <>
                      <div className="font-medium text-gray-300">{p?.name}</div>
                      <div className="text-gray-500">{p?.main_pain?.slice(0, 80)}{(p?.main_pain?.length ?? 0) > 80 ? '...' : ''}</div>
                    </>
                  })()}
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!productId}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                📧 Gerar Sequência de 7 Emails
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-4 py-4">
              <div className="text-center text-sm text-gray-300">{progressMsg}</div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-500">{Math.round(progress)}%</div>
            </div>
          )}

          {/* Preview */}
          {isPreview && generated && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-white mb-0.5">{generated.nome}</div>
                <p className="text-xs text-gray-400 leading-relaxed">{generated.descricao}</p>
              </div>

              <div className="bg-gray-800/40 rounded-lg p-3 text-xs text-gray-400 flex items-center gap-3">
                <span>📅 {generated.frequencia}</span>
                <span className="text-gray-600">·</span>
                <span>👥 {generated.publico_alvo?.slice(0, 50)}{(generated.publico_alvo?.length ?? 0) > 50 ? '...' : ''}</span>
              </div>

              <div className="space-y-1.5">
                {(generated.emails ?? []).map((email, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${EMAIL_TYPE_COLORS[email.tipo] ?? 'border-gray-700 bg-gray-800/30'}`}>
                    <span className="text-base flex-shrink-0">{EMAIL_TYPE_ICONS[email.tipo] ?? '📧'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Dia {email.dia}</span>
                        <span className="text-xs font-medium text-white truncate">{email.assunto}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{EMAIL_TYPE_LABELS[email.tipo] ?? email.tipo}</div>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {isPreview && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            {saved ? (
              <span className="text-emerald-400 text-sm">✓ Sequência salva com sucesso!</span>
            ) : (
              <>
                <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Salvar sequência
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ALL_STATUSES: EmailSequenceStatus[] = ['rascunho', 'ativo', 'pausado', 'arquivado']
const EMAIL_TYPES: EmailType[] = ['boas_vindas', 'dor', 'erro_comum', 'autoridade', 'oferta', 'prova', 'urgencia']

export default function Email() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [, setRefresh] = useState(0)
  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState<EmailSequenceStatus | ''>('')

  const products = tosDb.products.getAll()
  const allSequences = tosDb.emailSequences.getAll()

  const filtered = allSequences.filter(s => {
    if (filterProduct && s.product_id !== filterProduct) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const total = allSequences.length
  const ativas = allSequences.filter(s => s.status === 'ativo').length
  const totalEmails = allSequences.reduce((s, e) => s + (e.emails?.length ?? 0), 0)

  const handleSaved = useCallback(() => {
    setRefresh(r => r + 1)
    setTimeout(() => setShowModal(false), 1200)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {showModal && <GeneratorModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Email Marketing</h1>
          <p className="text-sm text-gray-400 mt-0.5">Sequências automáticas de conversão geradas por IA</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>📧</span> Gerar Sequência com IA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sequências', value: total, color: 'text-white' },
          { label: 'Ativas', value: ativas, color: 'text-emerald-400' },
          { label: 'Emails gerados', value: totalEmails, color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Email types legend */}
      <div className="flex flex-wrap gap-1.5">
        {EMAIL_TYPES.map(t => (
          <span key={t} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${EMAIL_TYPE_COLORS[t]}`}>
            <span>{EMAIL_TYPE_ICONS[t]}</span>
            <span>{EMAIL_TYPE_LABELS[t]}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as EmailSequenceStatus | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{EMAIL_SEQUENCE_STATUS_LABELS[s]}</option>)}
        </select>

        {(filterProduct || filterStatus) && (
          <button
            onClick={() => { setFilterProduct(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-white px-2"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Sequences list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📧</div>
          <div className="text-sm font-medium text-gray-400 mb-1">
            {allSequences.length === 0 ? 'Nenhuma sequência gerada ainda' : 'Nenhum resultado para os filtros'}
          </div>
          <div className="text-xs">
            {allSequences.length === 0 ? 'Clique em "Gerar Sequência com IA" para começar' : 'Tente ajustar os filtros'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(seq => {
            const product = tosDb.products.getById(seq.product_id)
            return (
              <div
                key={seq.id}
                onClick={() => navigate(`/email/${seq.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {seq.nome}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(seq.status)}`}>
                        {EMAIL_SEQUENCE_STATUS_LABELS[seq.status] ?? seq.status}
                      </span>
                    </div>

                    {product && (
                      <div className="text-xs text-gray-500 mb-1.5">{product.name}</div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
                      {seq.descricao}
                    </p>

                    {/* Email type pills */}
                    <div className="flex flex-wrap gap-1">
                      {(seq.emails ?? []).map((email, i) => (
                        <span
                          key={i}
                          className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${EMAIL_TYPE_COLORS[email.tipo] ?? 'border-gray-700 text-gray-400'}`}
                        >
                          <span>{EMAIL_TYPE_ICONS[email.tipo] ?? '📧'}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-xs">
                    <div className="text-gray-600">{formatDate(seq.created_at)}</div>
                    <div className="text-gray-500">{seq.emails?.length ?? 0} emails</div>
                    <div className="text-gray-600">{seq.frequencia}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
