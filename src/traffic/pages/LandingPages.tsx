import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId } from '../store/storage'
import { formatDate } from '../utils/helpers'
import type { LandingPage, LandingPageStructure } from '../types'

const PROGRESS_MSGS = [
  'Analisando dados do produto...',
  'Construindo wireframe por blocos...',
  'Posicionando copy em cada seção...',
  'Definindo paleta de cores...',
  'Elaborando direção de design...',
  'Adaptando para mobile...',
  'Finalizando landing page...',
]

const BLOCO_ICONS: Record<string, string> = {
  hero: '🌟',
  problema: '⚡',
  solucao: '✅',
  como_funciona: '⚙️',
  beneficios: '🎯',
  prova: '⭐',
  garantia: '🛡️',
  oferta: '💰',
  faq: '❓',
  cta_final: '🚀',
}

const BLOCO_LABELS: Record<string, string> = {
  hero: 'Hero',
  problema: 'Problema',
  solucao: 'Solução',
  como_funciona: 'Como Funciona',
  beneficios: 'Benefícios',
  prova: 'Prova Social',
  garantia: 'Garantia',
  oferta: 'Oferta',
  faq: 'FAQ',
  cta_final: 'CTA Final',
}

// ─── Generator Modal ──────────────────────────────────────────────────────────

function GeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [preview, setPreview] = useState<LandingPageStructure | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const products = tosDb.products.getAll()

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setPreview(null)

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 1.2, 90)
      msgIdx = Math.min(Math.floor(pct / 14), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const product = tosDb.products.getById(productId)
      const diagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)

      const landingData = `Produto:
${JSON.stringify({
  nome: product?.name,
  nicho: product?.niche,
  categoria: product?.category,
  mercado: product?.market,
  preco: product?.price,
  moeda: product?.currency,
  modelo_cobranca: product?.billing_model,
  publico_alvo: product?.target_audience,
  dor_principal: product?.main_pain,
  desejo_principal: product?.main_desire,
  beneficio_principal: product?.main_benefit,
  promessa_principal: product?.main_promise,
  mecanismo_unico: product?.unique_mechanism,
  objecoes: product?.main_objections,
  pagina_vendas: product?.sales_page_url,
}, null, 2)}

${diagnosis ? `Diagnóstico de oferta:
${JSON.stringify({
  score: diagnosis.analysis?.nota_geral?.score,
  big_idea: diagnosis.analysis?.big_idea,
  promessa_ajustada: diagnosis.analysis?.promessa_ajustada,
  avatar: diagnosis.analysis?.avatar,
  dores: diagnosis.analysis?.dores?.slice(0, 4),
  desejos: diagnosis.analysis?.desejos?.slice(0, 4),
  objecoes: diagnosis.analysis?.objecoes?.slice(0, 3),
  oferta: diagnosis.analysis?.oferta_recomendada,
  resumo: diagnosis.analysis?.resumo_executivo,
}, null, 2)}` : 'Diagnóstico de oferta: não disponível'}`

      const res = await fetch('/api/landingpage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landingData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })

      clearInterval(interval)
      setProgress(100)

      if (!res.ok) { setError('Erro ao gerar landing page.'); setLoading(false); return }

      const data = await res.json()
      setPreview(data.structure)
    } catch {
      clearInterval(interval)
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!preview) return
    const lp: LandingPage = {
      id: generateId(),
      product_id: productId,
      structure: preview,
      created_at: new Date().toISOString(),
    }
    tosDb.landingPages.save(lp)
    setSaved(true)
    onSaved(lp.id)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Gerar Landing Page com IA</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {!preview && !loading && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Produto *</label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">— Selecionar produto —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  A IA usará os dados do produto e diagnóstico de oferta para gerar a landing page.
                </p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleGenerate}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                ✦ Gerar Landing Page com IA
              </button>
            </>
          )}

          {loading && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-400 text-center">{progressMsg}</p>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">{Math.round(progress)}%</p>
            </div>
          )}

          {preview && !saved && (
            <div className="space-y-4">
              {/* Page info */}
              <div className="bg-gray-800 rounded-xl p-4 space-y-1">
                <p className="text-sm font-bold text-white">{preview.page_title}</p>
                <p className="text-xs text-gray-400">{preview.meta_description}</p>
                <p className="text-xs text-gray-500">Objetivo: {preview.objetivo}</p>
              </div>

              {/* Blocos preview */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {(preview.blocos ?? []).length} blocos gerados
                </p>
                <div className="space-y-1.5">
                  {(preview.blocos ?? []).map((bloco, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-800/60 rounded-lg px-3 py-2.5">
                      <span className="shrink-0 text-base">{BLOCO_ICONS[bloco.tipo] ?? '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-300">
                          {BLOCO_LABELS[bloco.tipo] ?? bloco.tipo}
                        </p>
                        {bloco.copy?.headline && (
                          <p className="text-sm text-white mt-0.5 truncate">{bloco.copy.headline}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{bloco.layout?.notas}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Design preview */}
              {preview.design?.paleta?.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Paleta de Cores</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.design.paleta.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded border border-gray-600"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs text-gray-300">{c.nome}</span>
                        <span className="text-xs text-gray-500">{c.hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Salvar Landing Page
                </button>
                <button
                  onClick={() => { setPreview(null); setProgress(0) }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Regerar
                </button>
              </div>
            </div>
          )}

          {saved && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-white font-semibold">Landing page salva!</p>
              <p className="text-gray-400 text-sm mt-1">Acessando detalhes...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPages() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [filterProduct, setFilterProduct] = useState('')

  const allPages = tosDb.landingPages.getAll()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const products = tosDb.products.getAll()

  const filtered = filterProduct
    ? allPages.filter(p => p.product_id === filterProduct)
    : allPages

  function handleSaved(id: string) {
    setShowModal(false)
    navigate(`/landing-page/${id}`)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {showModal && (
        <GeneratorModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Wireframes, copy posicionada e direção de design — prontos para execução
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          <span>✦</span> Gerar Landing Page
        </button>
      </div>

      {/* Filter */}
      {allPages.length > 0 && (
        <div className="flex gap-3">
          <select
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">Todos os produtos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {filterProduct && (
            <button
              onClick={() => setFilterProduct('')}
              className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded-lg bg-gray-800 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Pages list */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🖥️</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {allPages.length === 0 ? 'Nenhuma landing page gerada' : 'Nenhuma encontrada'}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            {allPages.length === 0
              ? 'Gere sua primeira landing page com wireframe, copy posicionada e direção de design completa.'
              : 'Tente ajustar os filtros.'}
          </p>
          {allPages.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              ✦ Gerar Primeira Landing Page
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(lp => {
            const product = products.find(p => p.id === lp.product_id)
            const s = lp.structure
            const blocos = s.blocos ?? []

            return (
              <div
                key={lp.id}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-bold text-white truncate">{s.page_title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {product?.name ?? 'Produto removido'} · {formatDate(lp.created_at)} · {blocos.length} blocos
                    </p>

                    {/* Bloco chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {blocos.slice(0, 6).map((b, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full"
                        >
                          {BLOCO_ICONS[b.tipo] ?? '📄'} {BLOCO_LABELS[b.tipo] ?? b.tipo}
                        </span>
                      ))}
                      {blocos.length > 6 && (
                        <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                          +{blocos.length - 6}
                        </span>
                      )}
                    </div>

                    {/* Color palette preview */}
                    {s.design?.paleta?.length > 0 && (
                      <div className="flex gap-1 mb-1">
                        {s.design.paleta.slice(0, 5).map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded border border-gray-700"
                            style={{ backgroundColor: c.hex }}
                            title={`${c.nome}: ${c.hex}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/landing-page/${lp.id}`)}
                    className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Ver Página →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
