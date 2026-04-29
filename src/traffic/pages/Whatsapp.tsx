import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  WHATSAPP_MSG_LABELS,
  WHATSAPP_MSG_ICONS,
  WHATSAPP_MSG_COLORS,
  WHATSAPP_FLOW_STATUS_LABELS,
  WHATSAPP_CANAL_LABELS,
} from '../utils/helpers'
import type { WhatsappFlow, WhatsappFlowStatus, WhatsappCanal, WhatsappMessageType } from '../types'

const PROGRESS_MSGS = [
  'Analisando produto e público...',
  'Mapeando dores e objeções...',
  'Construindo sequência conversacional...',
  'Criando gatilhos de resposta...',
  'Escrevendo mensagens de oferta e urgência...',
  'Finalizando fluxo de conversão...',
]

type RawFlow = Omit<WhatsappFlow, 'id' | 'product_id' | 'status' | 'notes' | 'created_at' | 'updated_at'>

const MSG_TYPES: WhatsappMessageType[] = ['inicial', 'follow_up', 'diagnostico', 'valor', 'oferta', 'quebra_objecao', 'final']

function buildWhatsappPrompt(productId: string): string {
  const product = tosDb.products.getById(productId)
  const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)
  const campaigns = tosDb.aiCampaigns.getByProduct(productId).slice(0, 3)
  const creatives = tosDb.aiCreatives.getByProduct(productId)
  const metrics = tosDb.metrics.getByProduct(productId)

  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0

  const winnerAngles = creatives
    .filter(c => c.status === 'vencedor')
    .slice(0, 3)
    .map(c => c.angle)
    .filter(Boolean)

  return `PRODUTO: ${product?.name}
Nicho: ${product?.niche} | Categoria: ${product?.category}
Preço: ${product?.currency} ${product?.price} | Modelo: ${product?.billing_model}
Público-alvo: ${product?.target_audience}
Dor principal: ${product?.main_pain}
Desejo principal: ${product?.main_desire}
Benefício principal: ${product?.main_benefit}
Promessa: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}
Objeções: ${product?.main_objections}
Mercado: ${product?.market} | Idioma: ${product?.language}

DIAGNÓSTICO: ${latestDiagnosis
  ? `Score ${latestDiagnosis.analysis?.nota_geral?.score ?? '—'}/10 — ${latestDiagnosis.analysis?.resumo_executivo?.o_que_melhorar ?? ''}`
  : 'Sem diagnóstico.'}

ÂNGULOS VENCEDORES: ${winnerAngles.length > 0 ? winnerAngles.join(', ') : 'Nenhum ainda'}

CAMPANHAS (${campaigns.length}):
${campaigns.map(c => `- ${c.strategy?.nome_estrategico ?? c.id} | ${c.channel} | ${c.phase}`).join('\n')}

CPA médio: $${avgCpa.toFixed(2)} | Conversões: ${totalConversions}`
}

// ─── Generator Modal ──────────────────────────────────────────────────────────

function GeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [canal, setCanal] = useState<WhatsappCanal>('whatsapp')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [generated, setGenerated] = useState<RawFlow | null>(null)
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
      pct = Math.min(pct + 1.4, 90)
      msgIdx = Math.min(Math.floor(pct / 16), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const contextData = buildWhatsappPrompt(productId)
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      clearInterval(interval)
      setProgress(100)
      setProgressMsg('Fluxo gerado com sucesso!')

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setGenerated({ ...data.flow, canal } as RawFlow)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar fluxo.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!generated) return
    const flow: WhatsappFlow = {
      id: generateId(),
      product_id: productId,
      nome: generated.nome,
      descricao: generated.descricao,
      canal,
      mensagens: generated.mensagens ?? [],
      status: 'rascunho',
      created_at: now(),
      updated_at: now(),
    }
    tosDb.whatsappFlows.save(flow)
    setSaved(true)
    onSaved()
  }

  const isPreview = !loading && !!generated

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">Gerar Fluxo de Conversão WhatsApp</h2>
            <p className="text-xs text-gray-400 mt-0.5">7 mensagens estratégicas para converter leads via chat</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Canal</label>
                <div className="flex gap-2">
                  {(['whatsapp', 'telegram', 'ambos'] as WhatsappCanal[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCanal(c)}
                      className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${
                        canal === c
                          ? 'bg-green-700 border-green-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {WHATSAPP_CANAL_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!productId}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                💬 Gerar Fluxo de Conversão
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-4 py-4">
              <div className="text-center text-sm text-gray-300">{progressMsg}</div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all duration-300"
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
                <p className="text-xs text-gray-400">{generated.descricao}</p>
              </div>

              <div className="space-y-1.5">
                {(generated.mensagens ?? []).map((msg, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${WHATSAPP_MSG_COLORS[msg.tipo] ?? 'border-gray-700'}`}>
                    <span className="text-base flex-shrink-0">{WHATSAPP_MSG_ICONS[msg.tipo] ?? '💬'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{msg.titulo}</span>
                        <span className="text-[10px] text-gray-600">· {msg.gatilho_envio?.slice(0, 30)}</span>
                      </div>
                      <p className="text-xs text-white mt-0.5 line-clamp-1">{msg.texto?.replace(/\\n/g, ' ')}</p>
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
              <span className="text-emerald-400 text-sm">✓ Fluxo salvo com sucesso!</span>
            ) : (
              <>
                <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Salvar fluxo
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

const ALL_STATUSES: WhatsappFlowStatus[] = ['rascunho', 'ativo', 'pausado', 'arquivado']

export default function Whatsapp() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [, setRefresh] = useState(0)
  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState<WhatsappFlowStatus | ''>('')

  const products = tosDb.products.getAll()
  const allFlows = tosDb.whatsappFlows.getAll()

  const filtered = allFlows.filter(f => {
    if (filterProduct && f.product_id !== filterProduct) return false
    if (filterStatus && f.status !== filterStatus) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const total = allFlows.length
  const ativos = allFlows.filter(f => f.status === 'ativo').length
  const totalMensagens = allFlows.reduce((s, f) => s + (f.mensagens?.length ?? 0), 0)

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
          <h1 className="text-xl font-bold text-white">WhatsApp / Telegram</h1>
          <p className="text-sm text-gray-400 mt-0.5">Fluxos de conversão via mensagem direta gerados por IA</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>💬</span> Gerar Fluxo com IA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Fluxos criados', value: total, color: 'text-white' },
          { label: 'Ativos', value: ativos, color: 'text-green-400' },
          { label: 'Mensagens geradas', value: totalMensagens, color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Message types legend */}
      <div className="flex flex-wrap gap-1.5">
        {MSG_TYPES.map(t => (
          <span key={t} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border ${WHATSAPP_MSG_COLORS[t]}`}>
            <span>{WHATSAPP_MSG_ICONS[t]}</span>
            <span>{WHATSAPP_MSG_LABELS[t]}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-green-500"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as WhatsappFlowStatus | '')}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-green-500"
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{WHATSAPP_FLOW_STATUS_LABELS[s]}</option>)}
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

      {/* Flow cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">💬</div>
          <div className="text-sm font-medium text-gray-400 mb-1">
            {allFlows.length === 0 ? 'Nenhum fluxo gerado ainda' : 'Nenhum resultado para os filtros'}
          </div>
          <div className="text-xs">
            {allFlows.length === 0 ? 'Clique em "Gerar Fluxo com IA" para começar' : 'Tente ajustar os filtros'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(flow => {
            const product = tosDb.products.getById(flow.product_id)
            return (
              <div
                key={flow.id}
                onClick={() => navigate(`/whatsapp/${flow.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors">
                        {flow.nome}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(flow.status)}`}>
                        {WHATSAPP_FLOW_STATUS_LABELS[flow.status]}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-800/40">
                        {WHATSAPP_CANAL_LABELS[flow.canal] ?? flow.canal}
                      </span>
                    </div>

                    {product && <div className="text-xs text-gray-500 mb-1.5">{product.name}</div>}

                    <p className="text-xs text-gray-400 line-clamp-1 mb-3">{flow.descricao}</p>

                    {/* Message type trail */}
                    <div className="flex items-center gap-1">
                      {(flow.mensagens ?? []).map((msg, i) => (
                        <div key={i} className="flex items-center gap-0.5">
                          <span className="text-base" title={WHATSAPP_MSG_LABELS[msg.tipo]}>
                            {WHATSAPP_MSG_ICONS[msg.tipo] ?? '💬'}
                          </span>
                          {i < (flow.mensagens.length - 1) && (
                            <span className="text-gray-700 text-[10px]">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-600">
                    {formatDate(flow.created_at)}
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
