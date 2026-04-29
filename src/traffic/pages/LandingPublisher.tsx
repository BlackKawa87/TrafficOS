import { useState, useEffect, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDateTime,
  LANDING_PUB_FUNNEL_LABELS,
  LANDING_PUB_FUNNEL_ICONS,
  LANDING_PUB_FUNNEL_DESC,
  LANDING_PUB_DESIGN_LABELS,
  LANDING_PUB_DESIGN_DESC,
  LANDING_PUB_STATUS_LABELS,
  LANDING_PUB_STATUS_COLORS,
  LANDING_PUB_SECTION_LABELS,
  LANDING_PUB_SECTION_ICONS,
  LANDING_PUB_SECTION_COLORS,
} from '../utils/helpers'
import { buildLandingHTML } from '../utils/landingHtmlBuilder'
import type {
  Product,
  LandingPublisherPage,
  LandingPublisherContent,
  LandingPublisherFunnel,
  LandingPublisherDesign,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNNELS: LandingPublisherFunnel[] = ['direto', 'isca_digital', 'webinar', 'lancamento', 'produto_fisico', 'saas', 'servico']
const DESIGNS: LandingPublisherDesign[] = ['dark_modern', 'clean_white', 'bold_energy']

const DESIGN_COLORS: Record<LandingPublisherDesign, { primary: string; bg: string; ring: string }> = {
  dark_modern: { primary: '#7c3aed', bg: '#0a0a0a', ring: 'ring-violet-500' },
  clean_white: { primary: '#2563eb', bg: '#f8fafc', ring: 'ring-blue-500' },
  bold_energy: { primary: '#f59e0b', bg: '#0a0a0a', ring: 'ring-amber-500' },
}

const GEN_STEPS = [
  { icon: '🔍', label: 'Analisando produto e funil...' },
  { icon: '🏗', label: 'Definindo arquitetura da página...' },
  { icon: '✍️', label: 'Gerando copy de conversão...' },
  { icon: '💎', label: 'Estruturando benefícios e prova social...' },
  { icon: '💰', label: 'Criando seção de oferta e garantia...' },
  { icon: '❓', label: 'Gerando FAQ e CTA final...' },
  { icon: '🖥️', label: 'Compilando HTML/CSS da página...' },
]

const SECTIONS = ['hero', 'problem', 'solution', 'benefits', 'proof', 'offer', 'guarantee', 'faq', 'cta'] as const

type Step = 'config' | 'generating' | 'result'
type ResultTab = 'preview' | 'code' | 'sections' | 'versions'
type PreviewMode = 'desktop' | 'mobile'

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPublisher() {
  const [step, setStep] = useState<Step>('config')
  const [products, setProducts] = useState<Product[]>([])
  const [allPages, setAllPages] = useState<LandingPublisherPage[]>([])

  // config
  const [productId, setProductId] = useState('')
  const [funnel, setFunnel] = useState<LandingPublisherFunnel>('direto')
  const [design, setDesign] = useState<LandingPublisherDesign>('dark_modern')
  const [ctaUrl, setCtaUrl] = useState('')

  // generation
  const [genStep, setGenStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // result
  const [page, setPage] = useState<LandingPublisherPage | null>(null)
  const [resultTab, setResultTab] = useState<ResultTab>('preview')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [copied, setCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  const genIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const apiDoneRef = useRef(false)
  const apiResultRef = useRef<LandingPublisherContent | null>(null)

  useEffect(() => {
    setProducts(tosDb.products.getAll())
    setAllPages(tosDb.landingPublisherPages.getAll())
  }, [])

  // Generation animation tick
  useEffect(() => {
    if (step !== 'generating') return
    genIntervalRef.current = setInterval(() => {
      setGenStep(prev => {
        const next = prev + 1
        if (next >= GEN_STEPS.length && apiDoneRef.current && apiResultRef.current) {
          clearInterval(genIntervalRef.current!)
          finalizeGeneration(apiResultRef.current)
        }
        return Math.min(next, GEN_STEPS.length)
      })
    }, 500)
    return () => { if (genIntervalRef.current) clearInterval(genIntervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function finalizeGeneration(content: LandingPublisherContent) {
    const product = products.find(p => p.id === productId)
    const newPage: LandingPublisherPage = {
      id: generateId(),
      product_id: productId,
      product_name: product?.name ?? 'Produto',
      funnel,
      design,
      status: 'rascunho',
      current_version: 1,
      versions: [{
        version: 1,
        content,
        created_at: now(),
        note: 'Versão inicial gerada por IA',
      }],
      created_at: now(),
      updated_at: now(),
    }
    tosDb.landingPublisherPages.save(newPage)
    setPage(newPage)
    setAllPages(tosDb.landingPublisherPages.getAll())
    setResultTab('preview')
    setPreviewMode('desktop')
    setStep('result')
    setLoading(false)
  }

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto para continuar.'); return }
    setError(null)
    setLoading(true)
    setGenStep(0)
    apiDoneRef.current = false
    apiResultRef.current = null
    setStep('generating')

    const product = products.find(p => p.id === productId)
    const context = `PRODUTO:
Nome: ${product?.name ?? 'N/A'}
Nicho: ${product?.niche ?? 'N/A'}
Categoria: ${product?.category ?? 'N/A'}
Preço: ${product?.price ?? 'N/A'} ${product?.currency ?? ''}
Modelo de cobrança: ${product?.billing_model ?? 'N/A'}
Público-alvo: ${product?.target_audience ?? 'N/A'}
Principal dor: ${product?.main_pain ?? 'N/A'}
Principal desejo: ${product?.main_desire ?? 'N/A'}
Principal benefício: ${product?.main_benefit ?? 'N/A'}
Promessa principal: ${product?.main_promise ?? 'N/A'}
Mecanismo único: ${product?.unique_mechanism ?? 'N/A'}
Principais objeções: ${product?.main_objections ?? 'N/A'}
URL do checkout: ${ctaUrl || product?.checkout_url || product?.sales_page_url || '#'}

FUNIL: ${LANDING_PUB_FUNNEL_LABELS[funnel]} — ${LANDING_PUB_FUNNEL_DESC[funnel]}
DESIGN: ${LANDING_PUB_DESIGN_LABELS[design]} — ${LANDING_PUB_DESIGN_DESC[design]}

REQUISITOS:
- CTA visível acima da dobra
- Promessa alinhada ao anúncio
- Design mobile-first
- Foco total em conversão
- Todos os 9 blocos: Hero, Problema, Solução, Benefícios, Prova, Oferta, Garantia, FAQ, CTA Final`

    try {
      const res = await fetch('/api/landing-publisher-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao gerar landing page')
      }
      const data: LandingPublisherContent = await res.json()
      apiResultRef.current = data
      apiDoneRef.current = true

      setGenStep(prev => {
        if (prev >= GEN_STEPS.length) {
          if (genIntervalRef.current) clearInterval(genIntervalRef.current)
          finalizeGeneration(data)
        }
        return prev
      })
    } catch (err) {
      clearInterval(genIntervalRef.current!)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStep('config')
      setLoading(false)
    }
  }

  async function handlePublish() {
    if (!page) return
    setPublishing(true)
    await new Promise(r => setTimeout(r, 2000))
    const url = `https://trfos-${page.id.slice(0, 8)}.netlify.app`
    const updated: LandingPublisherPage = { ...page, status: 'publicado', published_url: url, updated_at: now() }
    tosDb.landingPublisherPages.save(updated)
    setPage(updated)
    setAllPages(tosDb.landingPublisherPages.getAll())
    setPublishing(false)
  }

  function handleRegenerateVersion() {
    if (!page) return
    setError(null)
    setLoading(true)
    setGenStep(0)
    apiDoneRef.current = false
    apiResultRef.current = null
    setStep('generating')

    const product = products.find(p => p.id === page.product_id)
    const context = `PRODUTO: ${product?.name ?? page.product_name}
Nicho: ${product?.niche ?? 'N/A'}
Principal dor: ${product?.main_pain ?? 'N/A'}
Principal desejo: ${product?.main_desire ?? 'N/A'}
Promessa principal: ${product?.main_promise ?? 'N/A'}
Mecanismo único: ${product?.unique_mechanism ?? 'N/A'}
Preço: ${product?.price ?? 'N/A'} ${product?.currency ?? ''}

FUNIL: ${LANDING_PUB_FUNNEL_LABELS[page.funnel]}
DESIGN: ${LANDING_PUB_DESIGN_LABELS[page.design]}
INSTRUÇÃO: Gere uma nova variação com ângulo e copy diferentes da anterior.`

    fetch('/api/landing-publisher-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    })
      .then(r => r.json())
      .then((data: LandingPublisherContent) => {
        const newVersion = page.current_version + 1
        const updatedPage: LandingPublisherPage = {
          ...page,
          current_version: newVersion,
          versions: [
            ...page.versions,
            { version: newVersion, content: data, created_at: now(), note: `Versão ${newVersion} — nova variação` },
          ],
          status: 'rascunho',
          updated_at: now(),
        }
        tosDb.landingPublisherPages.save(updatedPage)
        apiResultRef.current = data
        apiDoneRef.current = true
        setGenStep(prev => {
          if (prev >= GEN_STEPS.length) {
            if (genIntervalRef.current) clearInterval(genIntervalRef.current)
            setPage(updatedPage)
            setAllPages(tosDb.landingPublisherPages.getAll())
            setStep('result')
            setLoading(false)
          }
          return prev
        })
      })
      .catch(err => {
        clearInterval(genIntervalRef.current!)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setStep('result')
        setLoading(false)
      })
  }

  function handleCopyCode() {
    if (!page) return
    const content = page.versions.find(v => v.version === page.current_version)?.content
    if (!content) return
    const html = buildLandingHTML(content, page.product_name, page.design)
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleRestoreVersion(version: number) {
    if (!page) return
    const updated = { ...page, current_version: version, updated_at: now() }
    tosDb.landingPublisherPages.save(updated)
    setPage(updated)
    setAllPages(tosDb.landingPublisherPages.getAll())
  }

  const currentContent = page?.versions.find(v => v.version === page.current_version)?.content ?? null
  const currentHtml = currentContent ? buildLandingHTML(currentContent, page!.product_name, page!.design) : ''
  const selectedProduct = products.find(p => p.id === productId)

  // ── Library ─────────────────────────────────────────────────────────────────
  if (showLibrary) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-white text-sm">← Voltar</button>
          <h1 className="text-xl font-bold text-white">Biblioteca de Landing Pages</h1>
          <span className="ml-auto text-xs text-gray-500">{allPages.length} página{allPages.length !== 1 ? 's' : ''}</span>
        </div>
        {allPages.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-3">🖥️</div>
            <p>Nenhuma landing page gerada ainda.</p>
            <button onClick={() => setShowLibrary(false)} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">Criar primeira página →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {allPages.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-lg shrink-0">
                  {LANDING_PUB_FUNNEL_ICONS[p.funnel]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm truncate">{p.product_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LANDING_PUB_STATUS_COLORS[p.status]}`}>
                      {LANDING_PUB_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {LANDING_PUB_FUNNEL_LABELS[p.funnel]} · {LANDING_PUB_DESIGN_LABELS[p.design]} · v{p.current_version} · {formatDateTime(p.created_at)}
                  </div>
                  {p.published_url && (
                    <div className="text-xs text-emerald-400 mt-1 truncate">{p.published_url}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setPage(p)
                    setResultTab('preview')
                    setShowLibrary(false)
                    setStep('result')
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg border border-violet-700/40 hover:border-violet-500/50 transition-colors shrink-0"
                >
                  Abrir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Generating screen ───────────────────────────────────────────────────────
  if (step === 'generating') {
    const progress = Math.round((genStep / GEN_STEPS.length) * 100)
    const label = GEN_STEPS[Math.min(genStep, GEN_STEPS.length - 1)]

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-full max-w-md mx-auto px-6">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-5xl animate-pulse">
                🖥️
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>
          </div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Gerando sua Landing Page</h2>
            <p className="text-gray-400 text-sm">{genStep < GEN_STEPS.length ? label.label : 'Finalizando...'}</p>
          </div>
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {GEN_STEPS.map((s, i) => {
              const done = i < genStep
              const active = i === genStep && genStep < GEN_STEPS.length
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${active ? 'bg-violet-900/30 border border-violet-700/40' : done ? 'opacity-50' : 'opacity-30'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${done ? 'bg-emerald-500' : active ? 'bg-violet-500 animate-pulse' : 'bg-gray-700'}`}>
                    {done ? '✓' : active ? '…' : i + 1}
                  </div>
                  <span className="text-xs text-gray-300">{s.icon} {s.label}</span>
                </div>
              )
            })}
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">Gerando Hero, Problema, Solução, Benefícios, Prova, Oferta, Garantia, FAQ e CTA...</p>
        </div>
      </div>
    )
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (step === 'result' && page && currentContent) {
    return (
      <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 shrink-0">
          <div className="px-6 py-3 flex items-center gap-4">
            <button onClick={() => setStep('config')} className="text-gray-400 hover:text-white text-sm shrink-0">← Config</button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-white font-semibold text-sm truncate">{page.product_name}</span>
              <span className="text-gray-600 text-xs shrink-0">·</span>
              <span className="text-violet-400 text-xs shrink-0">{LANDING_PUB_FUNNEL_ICONS[page.funnel]} {LANDING_PUB_FUNNEL_LABELS[page.funnel]}</span>
              <span className="text-gray-600 text-xs shrink-0">·</span>
              <span className="text-xs text-gray-400 shrink-0">{LANDING_PUB_DESIGN_LABELS[page.design]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${LANDING_PUB_STATUS_COLORS[page.status]}`}>
                {LANDING_PUB_STATUS_LABELS[page.status]}
              </span>
              {page.published_url && (
                <a href={page.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline truncate max-w-48">{page.published_url}</a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowLibrary(true)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-colors">
                📚 ({allPages.length})
              </button>
              <button
                onClick={handleRegenerateVersion}
                disabled={loading}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                🔄 Nova Variação
              </button>
              {page.status !== 'publicado' ? (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="text-xs px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  {publishing ? '⏳ Publicando...' : '🚀 Publicar'}
                </button>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
                  ✓ Publicado
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 flex items-center gap-1">
            {(['preview', 'code', 'sections', 'versions'] as ResultTab[]).map(t => (
              <button
                key={t}
                onClick={() => setResultTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${resultTab === t ? 'text-violet-400 border-violet-400' : 'text-gray-400 hover:text-white border-transparent'}`}
              >
                {t === 'preview' ? '👁 Preview' : t === 'code' ? '💻 Código' : t === 'sections' ? '📋 Seções' : '🕐 Versões'}
              </button>
            ))}
          </div>
        </div>

        {/* ── PREVIEW TAB ── */}
        {resultTab === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* preview controls */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-2 flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${previewMode === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  🖥 Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${previewMode === 'mobile' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  📱 Mobile
                </button>
              </div>
              <div className="text-xs text-gray-500">{previewMode === 'desktop' ? '1200px' : '375px'} · 9 seções</div>
              {page.published_url && (
                <a href={page.published_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-emerald-400 hover:underline">
                  ↗ {page.published_url}
                </a>
              )}
            </div>
            <div className="flex-1 bg-gray-800 overflow-hidden flex items-center justify-center">
              {previewMode === 'desktop' ? (
                <iframe
                  srcDoc={currentHtml}
                  title="Landing Page Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="h-full flex items-center justify-center py-4">
                  <div className="relative shrink-0" style={{ width: 375, height: '100%', maxHeight: 'calc(100vh - 160px)' }}>
                    {/* Phone frame */}
                    <div className="absolute inset-0 rounded-3xl border-4 border-gray-600 shadow-2xl overflow-hidden bg-white">
                      <iframe
                        srcDoc={currentHtml}
                        title="Landing Page Mobile Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                        style={{ width: 375 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CODE TAB ── */}
        {resultTab === 'code' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4 shrink-0">
              <span className="text-sm text-white font-medium">HTML + CSS</span>
              <span className="text-xs text-gray-500">{currentHtml.length.toLocaleString()} caracteres · Self-contained</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([currentHtml], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${page.product_name.toLowerCase().replace(/\s+/g, '-')}-v${page.current_version}.html`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  ⬇ Download .html
                </button>
                <button
                  onClick={handleCopyCode}
                  className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}
                >
                  {copied ? '✓ Copiado!' : '📋 Copiar Código'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <pre className="p-6 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-all select-all">
                {currentHtml}
              </pre>
            </div>
          </div>
        )}

        {/* ── SECTIONS TAB ── */}
        {resultTab === 'sections' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {SECTIONS.map(sec => {
                const icon = LANDING_PUB_SECTION_ICONS[sec]
                const label = LANDING_PUB_SECTION_LABELS[sec]
                const color = LANDING_PUB_SECTION_COLORS[sec]
                let headline = ''
                let preview = ''
                switch (sec) {
                  case 'hero':
                    headline = currentContent.hero_headline
                    preview = currentContent.hero_subheadline
                    break
                  case 'problem':
                    headline = currentContent.problem_headline
                    preview = (currentContent.problem_items ?? []).slice(0, 2).join(' · ')
                    break
                  case 'solution':
                    headline = currentContent.solution_headline
                    preview = currentContent.solution_mechanism
                    break
                  case 'benefits':
                    headline = currentContent.benefits_headline
                    preview = (currentContent.benefits ?? []).map(b => b.title).join(' · ')
                    break
                  case 'proof':
                    headline = currentContent.proof_headline
                    preview = currentContent.results_stat
                    break
                  case 'offer':
                    headline = currentContent.offer_headline
                    preview = `${currentContent.offer_price} — ${(currentContent.offer_items ?? []).length} itens incluídos`
                    break
                  case 'guarantee':
                    headline = currentContent.guarantee_headline
                    preview = `${currentContent.guarantee_days} dias de garantia`
                    break
                  case 'faq':
                    headline = currentContent.faq_headline
                    preview = `${(currentContent.faq ?? []).length} perguntas`
                    break
                  case 'cta':
                    headline = currentContent.final_headline
                    preview = currentContent.final_cta_text
                    break
                }
                return (
                  <div key={sec} className={`border rounded-xl p-5 ${color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-semibold text-white uppercase tracking-wider">{label}</span>
                    </div>
                    {headline && <div className="text-white font-bold text-base mb-1.5 leading-snug">{headline}</div>}
                    {preview && <div className="text-gray-400 text-sm leading-relaxed">{preview}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── VERSIONS TAB ── */}
        {resultTab === 'versions' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-3">
              {[...page.versions].reverse().map(v => (
                <div
                  key={v.version}
                  className={`bg-gray-900 border rounded-xl p-5 ${v.version === page.current_version ? 'border-violet-600/50' : 'border-gray-800'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">Versão {v.version}</span>
                      {v.version === page.current_version && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 border border-violet-700/40">Atual</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatDateTime(v.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-3">{v.note}</div>
                  <div className="text-xs text-gray-500 mb-3 truncate">Hero: "{v.content.hero_headline}"</div>
                  {v.version !== page.current_version && (
                    <button
                      onClick={() => handleRestoreVersion(v.version)}
                      className="text-xs text-violet-400 hover:text-violet-300 border border-violet-700/40 hover:border-violet-500/50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ↺ Restaurar esta versão
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleRegenerateVersion}
                disabled={loading}
                className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm transition-colors"
              >
                + Gerar nova variação
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Config screen ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xl">
              🖥️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Publicador Automático de Landing Pages</h1>
              <p className="text-gray-400 text-sm">Gere, monte e publique landing pages de alta conversão com IA.</p>
            </div>
          </div>
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
          >
            📚 Biblioteca ({allPages.length})
          </button>
        </div>

        {/* What gets generated */}
        <div className="grid grid-cols-9 gap-2 mb-8">
          {SECTIONS.map(sec => (
            <div key={sec} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg mb-1">{LANDING_PUB_SECTION_ICONS[sec]}</div>
              <div className="text-xs text-gray-400">{LANDING_PUB_SECTION_LABELS[sec]}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* ── Left: Steps ── */}
          <div className="col-span-2 space-y-6">

            {/* Step 1: Product */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
                <h2 className="text-sm font-semibold text-white">Selecionar Produto</h2>
                {productId && <span className="ml-auto text-xs text-emerald-400">✓ {selectedProduct?.name}</span>}
              </div>
              {products.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum produto cadastrado. <a href="/produtos/novo" className="text-violet-400 hover:underline">Cadastrar produto →</a></p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {products.slice(0, 8).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProductId(p.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${productId === p.id ? 'border-violet-600/60 bg-violet-900/20' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate">{p.niche}</div>
                      </div>
                      {productId === p.id && <span className="ml-auto text-violet-400 shrink-0">●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Funnel */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                <h2 className="text-sm font-semibold text-white">Tipo de Funil</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {FUNNELS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFunnel(f)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${funnel === f ? 'border-violet-600/60 bg-violet-900/20' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'}`}
                  >
                    <span className="text-2xl w-8 text-center shrink-0">{LANDING_PUB_FUNNEL_ICONS[f]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white mb-0.5">{LANDING_PUB_FUNNEL_LABELS[f]}</div>
                      <div className="text-xs text-gray-400 leading-relaxed">{LANDING_PUB_FUNNEL_DESC[f]}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${funnel === f ? 'border-violet-400 bg-violet-400' : 'border-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Design */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                <h2 className="text-sm font-semibold text-white">Estilo Visual</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {DESIGNS.map(d => {
                  const dc = DESIGN_COLORS[d]
                  return (
                    <button
                      key={d}
                      onClick={() => setDesign(d)}
                      className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${design === d ? `${dc.ring} ring-2 ring-offset-1 ring-offset-gray-900 border-transparent` : 'border-gray-700 hover:border-gray-600'}`}
                    >
                      {/* Color swatch */}
                      <div className="h-16 flex items-center justify-center" style={{ background: dc.bg, border: `2px solid ${dc.primary}33` }}>
                        <div className="w-8 h-8 rounded-full" style={{ background: dc.primary }} />
                      </div>
                      <div className="p-3 bg-gray-800">
                        <div className="text-sm font-semibold text-white mb-0.5">{LANDING_PUB_DESIGN_LABELS[d]}</div>
                        <div className="text-xs text-gray-400 leading-relaxed">{LANDING_PUB_DESIGN_DESC[d]}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 4: CTA URL */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
                <h2 className="text-sm font-semibold text-white">URL do CTA</h2>
                <span className="text-xs text-gray-500">(opcional)</span>
              </div>
              <input
                type="url"
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://checkout.seusite.com/produto"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">Se não informada, usará a URL de checkout do produto.</p>
            </div>
          </div>

          {/* ── Right: Summary ── */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-white mb-4">📋 Resumo da Geração</h3>
              <div className="space-y-3 mb-5">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Produto</div>
                  <div className="text-sm text-white font-medium">{productId ? selectedProduct?.name : <span className="text-gray-600">— não selecionado</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Funil</div>
                  <div className="text-sm text-white">{LANDING_PUB_FUNNEL_ICONS[funnel]} {LANDING_PUB_FUNNEL_LABELS[funnel]}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Design</div>
                  <div className="text-sm text-white">🎨 {LANDING_PUB_DESIGN_LABELS[design]}</div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 mb-5">
                <div className="text-xs text-gray-400 mb-2 font-medium">O que será gerado:</div>
                <div className="space-y-1">
                  {['✓ Copy completa — 9 seções', '✓ Versão desktop + mobile', '✓ HTML/CSS auto-contido', '✓ Código pronto para copiar', '✓ Publicação simulada com URL', '✓ Histórico de versões'].map((item, i) => (
                    <div key={i} className="text-xs text-gray-400">{item}</div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!productId || loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${productId && !loading ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              >
                {loading ? '⏳ Gerando...' : '🖥️ Gerar Landing Page'}
              </button>
              {!productId && <p className="text-xs text-gray-600 text-center mt-2">Selecione um produto para continuar</p>}
            </div>

            {/* Future integrations */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Integrações Futuras</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/40">Em breve</span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: '▲', name: 'Vercel', color: 'text-white' },
                  { icon: '🟩', name: 'Netlify', color: 'text-teal-400' },
                  { icon: '🔷', name: 'Webflow', color: 'text-blue-400' },
                  { icon: '⚡', name: 'Framer', color: 'text-violet-400' },
                  { icon: '🌐', name: 'WordPress', color: 'text-blue-300' },
                  { icon: '❤️', name: 'Lovable', color: 'text-pink-400' },
                ].map(int => (
                  <div key={int.name} className="flex items-center gap-2.5 opacity-50">
                    <span className="text-sm">{int.icon}</span>
                    <span className={`text-xs font-medium ${int.color}`}>{int.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
