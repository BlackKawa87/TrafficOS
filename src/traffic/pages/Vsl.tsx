import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  getStatusColor,
  VSL_STATUS_LABELS,
  VSL_ESTILO_LABELS,
  formatDate,
} from '../utils/helpers'
import type { Product, VslScript, VslEstilo } from '../types'

// ─── Generator Modal ──────────────────────────────────────────────────────────

interface GeneratorModalProps {
  products: Product[]
  onClose: () => void
  onCreated: () => void
}

function GeneratorModal({ products, onClose, onCreated }: GeneratorModalProps) {
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id ?? '')
  const [estilo, setEstilo] = useState<VslEstilo>('storytelling')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function buildContextData(): string {
    const product = tosDb.products.getById(selectedProduct)
    if (!product) return ''

    let ctx = `PRODUTO:\n${JSON.stringify(product, null, 2)}`
    ctx += `\n\nESTILO SOLICITADO: ${estilo}`

    const diag = tosDb.aiDiagnoses.getLatestByProduct(selectedProduct)
    if (diag) {
      ctx += `\n\nDIAGNÓSTICO DE OFERTA:\n${JSON.stringify(diag.analysis, null, 2)}`
    }

    const campaigns = tosDb.aiCampaigns.getByProduct(selectedProduct).slice(0, 2)
    if (campaigns.length > 0) {
      ctx += `\n\nCAMPANHAS ATIVAS:\n${JSON.stringify(campaigns.map(c => ({
        objetivo: c.objective,
        canal: c.channel,
        angulo: c.strategy?.angulo_principal?.descricao,
        hipotese: c.strategy?.hipotese_principal,
      })), null, 2)}`
    }

    return ctx
  }

  async function generate() {
    if (!selectedProduct) return
    setError('')
    setGenerating(true)
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress(p => (p < 90 ? p + 1.3 : p))
    }, 300)

    try {
      const contextData = buildContextData()
      const res = await fetch('/api/vsl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })

      const data = await res.json() as { script?: Partial<VslScript>; error?: string }
      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Erro ao gerar VSL')
      }

      clearTimer()
      setProgress(100)

      const s = data.script!
      const vsl: VslScript = {
        id: generateId(),
        product_id: selectedProduct,
        nome: s.nome ?? 'VSL sem título',
        descricao: s.descricao ?? '',
        estilo: s.estilo ?? estilo,
        duracao_total: s.duracao_total ?? '',
        publico_alvo: s.publico_alvo ?? '',
        promessa_principal: s.promessa_principal ?? '',
        blocos: s.blocos ?? [],
        texto_completo: s.texto_completo ?? '',
        direcao: s.direcao ?? { tom_voz: '', estilo, ritmo: '', cortes: '', expressao: '', cenario: '' },
        status: 'rascunho',
        created_at: now(),
        updated_at: now(),
      }

      tosDb.vslScripts.save(vsl)
      onCreated()
    } catch (err) {
      clearTimer()
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setGenerating(false)
    }
  }

  const estilos: { value: VslEstilo; label: string; desc: string; icon: string }[] = [
    { value: 'autoridade', label: 'Autoridade', desc: 'Expert posicionado', icon: '🏆' },
    { value: 'storytelling', label: 'Storytelling', desc: 'Narrativa emocional', icon: '📖' },
    { value: 'direto', label: 'Direto ao Ponto', desc: 'Sem rodeios', icon: '⚡' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">🎬 Gerar VSL com IA</h2>
            <p className="text-xs text-gray-500 mt-0.5">Roteiro completo de 13 blocos</p>
          </div>
          {!generating && (
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Product selector */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Produto</label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              disabled={generating}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
            >
              <option value="">Selecione um produto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Estilo selector */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Estilo do VSL</label>
            <div className="grid grid-cols-3 gap-2">
              {estilos.map(e => (
                <button
                  key={e.value}
                  onClick={() => setEstilo(e.value)}
                  disabled={generating}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors disabled:opacity-50 ${
                    estilo === e.value
                      ? 'border-violet-500 bg-violet-900/30 text-violet-300'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{e.icon}</span>
                  <span className="font-semibold">{e.label}</span>
                  <span className="text-gray-500 text-[10px]">{e.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Gerando roteiro com 13 blocos...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600">Isso pode levar até 60 segundos</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {!generating && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={generate}
            disabled={generating || !selectedProduct}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {generating ? 'Gerando...' : '🎬 Gerar VSL com IA'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Vsl() {
  const navigate = useNavigate()
  const [, setRefresh] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [filterProduct, setFilterProduct] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const products = tosDb.products.getAll()
  const allVsls = tosDb.vslScripts.getAll()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const vsls = allVsls.filter(v => {
    if (filterProduct && v.product_id !== filterProduct) return false
    if (filterStatus && v.status !== filterStatus) return false
    return true
  })

  function handleDelete(id: string) {
    if (!confirm('Excluir este VSL?')) return
    tosDb.vslScripts.delete(id)
    setRefresh(r => r + 1)
  }

  const hasProducts = products.length > 0

  const estiloIcon: Record<string, string> = { autoridade: '🏆', storytelling: '📖', direto: '⚡' }

  return (
    <div className="p-6 space-y-6">
      {showModal && (
        <GeneratorModal
          products={products}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); setRefresh(r => r + 1) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">🎬 Gerador de VSL</h1>
          <p className="text-sm text-gray-500 mt-0.5">Video Sales Letters completas com 13 blocos de alta conversão</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!hasProducts}
          title={!hasProducts ? 'Cadastre um produto primeiro' : undefined}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
        >
          + Gerar VSL com IA
        </button>
      </div>

      {/* Empty state */}
      {!hasProducts && (
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 text-sm text-amber-300">
          Cadastre um produto em <button onClick={() => navigate('/produtos')} className="underline">Produtos</button> para gerar VSLs.
        </div>
      )}

      {/* Filters */}
      {allVsls.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
          >
            <option value="">Todos os produtos</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
          >
            <option value="">Todos os status</option>
            {Object.entries(VSL_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats bar */}
      {allVsls.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: allVsls.length, color: 'text-white' },
            { label: 'Prontos', value: allVsls.filter(v => v.status === 'pronto').length, color: 'text-blue-400' },
            { label: 'Em Uso', value: allVsls.filter(v => v.status === 'em_uso').length, color: 'text-emerald-400' },
            { label: 'Arquivados', value: allVsls.filter(v => v.status === 'arquivado').length, color: 'text-gray-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {vsls.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-sm">Nenhum VSL gerado ainda.</p>
          <p className="text-xs mt-1 text-gray-700">Clique em "Gerar VSL com IA" para criar seu primeiro roteiro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vsls.map(vsl => {
            const product = tosDb.products.getById(vsl.product_id)
            return (
              <div
                key={vsl.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{vsl.nome}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(vsl.status)}`}>
                        {VSL_STATUS_LABELS[vsl.status]}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-violet-900/30 text-violet-400 border border-violet-800/40">
                        {estiloIcon[vsl.estilo]} {VSL_ESTILO_LABELS[vsl.estilo]}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 flex-wrap">
                      <span>📦 {product?.name ?? vsl.product_id}</span>
                      <span>·</span>
                      <span>⏱ {vsl.duracao_total}</span>
                      <span>·</span>
                      <span>🧩 {vsl.blocos?.length ?? 0} blocos</span>
                      <span>·</span>
                      <span>{formatDate(vsl.created_at)}</span>
                    </div>

                    {vsl.promessa_principal && (
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">
                        "{vsl.promessa_principal}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/vsl/${vsl.id}`)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Ver roteiro →
                    </button>
                    <button
                      onClick={() => handleDelete(vsl.id)}
                      className="px-2 py-1.5 text-gray-600 hover:text-red-400 text-xs rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Block type trail */}
                {(vsl.blocos?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-3 pt-3 border-t border-gray-800/50">
                    {vsl.blocos.map((b, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span
                          title={b.nome}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500"
                        >
                          {i + 1}
                        </span>
                        {i < vsl.blocos.length - 1 && (
                          <span className="text-gray-800 text-[10px]">›</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

