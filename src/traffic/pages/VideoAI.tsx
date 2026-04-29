import { useState, useEffect, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDateTime,
  VIDEO_AI_FORMAT_LABELS,
  VIDEO_AI_FORMAT_ICONS,
  VIDEO_AI_FORMAT_DESC,
  VIDEO_AI_OBJECTIVE_LABELS,
  VIDEO_AI_OBJECTIVE_ICONS,
  VIDEO_AI_STATUS_COLORS,
  VIDEO_AI_STATUS_LABELS,
} from '../utils/helpers'
import type {
  Product,
  Campaign,
  VideoAIVideo,
  VideoAIFormat,
  VideoAIObjective,
  VideoAIOutput,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMATS: VideoAIFormat[] = ['ugc', 'avatar_ia', 'narracao', 'storytelling', 'demonstracao']
const OBJECTIVES: VideoAIObjective[] = ['conversao', 'trafego', 'leads', 'awareness', 'remarketing']

const GEN_STEPS = [
  { icon: '🔍', label: 'Analisando produto e campanha...' },
  { icon: '📝', label: 'Estruturando roteiro principal...' },
  { icon: '🎙', label: 'Criando texto falado (narração)...' },
  { icon: '💬', label: 'Definindo textos na tela...' },
  { icon: '🎬', label: 'Descrevendo cenas visuais...' },
  { icon: '🔊', label: 'Selecionando perfil de voz...' },
  { icon: '🤖', label: 'Gerando avatar ou imagem base...' },
  { icon: '📄', label: 'Configurando legendas automáticas...' },
  { icon: '🎵', label: 'Sugerindo música e direção de edição...' },
]

const PLATFORM_STYLES: Record<string, string> = {
  'Meta Ads': 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  'TikTok Ads': 'bg-pink-900/40 text-pink-300 border border-pink-700/40',
  'Reels': 'bg-violet-900/40 text-violet-300 border border-violet-700/40',
  'YouTube': 'bg-red-900/40 text-red-300 border border-red-700/40',
}

const INTEGRATIONS = [
  { name: 'HeyGen', icon: '🤖', cat: 'Avatar IA', color: 'text-violet-400' },
  { name: 'Synthesia', icon: '👤', cat: 'Avatar IA', color: 'text-blue-400' },
  { name: 'ElevenLabs', icon: '🎙', cat: 'Voz IA', color: 'text-emerald-400' },
  { name: 'Runway', icon: '🎬', cat: 'Vídeo IA', color: 'text-pink-400' },
  { name: 'Creatomate', icon: '⚙️', cat: 'Automação', color: 'text-amber-400' },
  { name: 'Shotstack', icon: '🎞', cat: 'Render', color: 'text-cyan-400' },
  { name: 'CapCut API', icon: '✂️', cat: 'Edição', color: 'text-orange-400' },
]

const SCRIPT_SECTIONS = [
  { key: 'script_problem', label: 'Problema', color: 'border-red-600/50 bg-red-900/10 text-red-300', icon: '😰' },
  { key: 'script_agitation', label: 'Agitação', color: 'border-orange-600/50 bg-orange-900/10 text-orange-300', icon: '🔥' },
  { key: 'script_solution', label: 'Solução', color: 'border-emerald-600/50 bg-emerald-900/10 text-emerald-300', icon: '✨' },
  { key: 'script_proof', label: 'Prova', color: 'border-amber-600/50 bg-amber-900/10 text-amber-300', icon: '🏆' },
  { key: 'script_cta', label: 'CTA', color: 'border-violet-600/50 bg-violet-900/10 text-violet-300', icon: '🚀' },
] as const

type Step = 'config' | 'generating' | 'result'
type ContentTab = 'roteiro' | 'cenas' | 'producao'
type DurationTab = '15s' | '30s'

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoAI() {
  const [step, setStep] = useState<Step>('config')
  const [products, setProducts] = useState<Product[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [allVideos, setAllVideos] = useState<VideoAIVideo[]>([])

  // config
  const [productId, setProductId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [objective, setObjective] = useState<VideoAIObjective>('conversao')
  const [format, setFormat] = useState<VideoAIFormat>('ugc')

  // generation
  const [genStep, setGenStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // result
  const [video, setVideo] = useState<VideoAIVideo | null>(null)
  const [durationTab, setDurationTab] = useState<DurationTab>('15s')
  const [contentTab, setContentTab] = useState<ContentTab>('roteiro')
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  const genIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const apiDoneRef = useRef(false)
  const apiResultRef = useRef<{ output_15s: VideoAIOutput; output_30s: VideoAIOutput } | null>(null)

  useEffect(() => {
    setProducts(tosDb.products.getAll())
    setAllVideos(tosDb.videoAiVideos.getAll())
  }, [])

  useEffect(() => {
    if (productId) {
      setCampaigns(tosDb.campaigns.getByProduct(productId))
      setCampaignId('')
    }
  }, [productId])

  // ── Generation tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'generating') return
    genIntervalRef.current = setInterval(() => {
      setGenStep(prev => {
        const next = prev + 1
        if (next >= GEN_STEPS.length && apiDoneRef.current && apiResultRef.current) {
          clearInterval(genIntervalRef.current!)
          finalizeVideo(apiResultRef.current)
        }
        return Math.min(next, GEN_STEPS.length)
      })
    }, 400)
    return () => { if (genIntervalRef.current) clearInterval(genIntervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function finalizeVideo(result: { output_15s: VideoAIOutput; output_30s: VideoAIOutput }) {
    const selectedProduct = products.find(p => p.id === productId)
    const selectedCampaign = campaigns.find(c => c.id === campaignId)
    const vid: VideoAIVideo = {
      id: generateId(),
      product_id: productId,
      product_name: selectedProduct?.name ?? 'Produto',
      campaign_id: campaignId,
      campaign_name: selectedCampaign?.name ?? '—',
      objective,
      format,
      status: 'pronto',
      output_15s: result.output_15s ?? null,
      output_30s: result.output_30s ?? null,
      saved_to_library: false,
      created_at: now(),
      updated_at: now(),
    }
    tosDb.videoAiVideos.save(vid)
    setVideo(vid)
    setAllVideos(tosDb.videoAiVideos.getAll())
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
    const campaign = campaigns.find(c => c.id === campaignId)

    const context = `PRODUTO:
Nome: ${product?.name ?? 'N/A'}
Nicho: ${product?.niche ?? 'N/A'}
Preço: ${product?.price ?? 'N/A'} ${product?.currency ?? ''}
Público-alvo: ${product?.target_audience ?? 'N/A'}
Principal dor: ${product?.main_pain ?? 'N/A'}
Principal desejo: ${product?.main_desire ?? 'N/A'}
Principal benefício: ${product?.main_benefit ?? 'N/A'}
Promessa principal: ${product?.main_promise ?? 'N/A'}
Mecanismo único: ${product?.unique_mechanism ?? 'N/A'}
Principais objeções: ${product?.main_objections ?? 'N/A'}

CAMPANHA: ${campaign?.name ?? 'Sem campanha específica'}

CONFIGURAÇÕES DO VÍDEO:
Objetivo: ${VIDEO_AI_OBJECTIVE_LABELS[objective]}
Formato: ${VIDEO_AI_FORMAT_LABELS[format]}
Descrição do formato: ${VIDEO_AI_FORMAT_DESC[format]}
Plataformas alvo: Meta Ads, TikTok Ads, Reels
Formato de vídeo: 9:16 Vertical

REQUISITOS OBRIGATÓRIOS:
- Hook forte nos primeiros 3 segundos
- Versão 15 segundos (direta, sem desperdício)
- Versão 30 segundos (mais desenvolvimento emocional)
- CTA final claro e urgente
- Legendas automáticas incluídas
- Alinhamento total com o produto e suas dores/desejos reais`

    try {
      const res = await fetch('/api/video-ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao gerar vídeo')
      }
      const data = await res.json()
      apiResultRef.current = data
      apiDoneRef.current = true

      // If animation already finished, finalize immediately
      setGenStep(prev => {
        if (prev >= GEN_STEPS.length) {
          if (genIntervalRef.current) clearInterval(genIntervalRef.current)
          finalizeVideo(data)
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

  function handleSaveToLibrary() {
    if (!video) return
    const updated = { ...video, saved_to_library: true, updated_at: now() }
    tosDb.videoAiVideos.save(updated)
    setVideo(updated)
    setSavedToLibrary(true)
  }

  function handleReset() {
    setStep('config')
    setVideo(null)
    setSavedToLibrary(false)
    setDurationTab('15s')
    setContentTab('roteiro')
    setGenStep(0)
  }

  const selectedProduct = products.find(p => p.id === productId)
  const selectedCampaign = campaigns.find(c => c.id === campaignId)
  const currentOutput = video ? (durationTab === '15s' ? video.output_15s : video.output_30s) : null

  // ── Library screen ──────────────────────────────────────────────────────────
  if (showLibrary) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-white">Biblioteca de Vídeos IA</h1>
          <span className="ml-auto text-xs text-gray-500">{allVideos.length} vídeo{allVideos.length !== 1 ? 's' : ''} gerado{allVideos.length !== 1 ? 's' : ''}</span>
        </div>

        {allVideos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-3">🎥</div>
            <p>Nenhum vídeo gerado ainda.</p>
            <button onClick={() => setShowLibrary(false)} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
              Gerar primeiro vídeo →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {allVideos.map(v => (
              <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center text-xl shrink-0">
                  {VIDEO_AI_FORMAT_ICONS[v.format]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm truncate">{v.product_name}</span>
                    {v.campaign_name && v.campaign_name !== '—' && (
                      <span className="text-gray-500 text-xs">· {v.campaign_name}</span>
                    )}
                    {v.saved_to_library && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">Salvo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{VIDEO_AI_FORMAT_LABELS[v.format]}</span>
                    <span>·</span>
                    <span>{VIDEO_AI_OBJECTIVE_LABELS[v.objective]}</span>
                    <span>·</span>
                    <span>{formatDateTime(v.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${VIDEO_AI_STATUS_COLORS[v.status]}`}>
                    {VIDEO_AI_STATUS_LABELS[v.status]}
                  </span>
                  <button
                    onClick={() => {
                      setVideo(v)
                      setSavedToLibrary(v.saved_to_library)
                      setDurationTab('15s')
                      setContentTab('roteiro')
                      setShowLibrary(false)
                      setStep('result')
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg border border-violet-700/40 hover:border-violet-500/50 transition-colors"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Generating screen ───────────────────────────────────────────────────────
  if (step === 'generating') {
    const currentStepLabel = GEN_STEPS[Math.min(genStep, GEN_STEPS.length - 1)]
    const progress = Math.round((genStep / GEN_STEPS.length) * 100)

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-full max-w-md mx-auto px-6">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-5xl animate-pulse">
                🎥
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Gerando seu vídeo com IA</h2>
            <p className="text-gray-400 text-sm">
              {genStep < GEN_STEPS.length ? currentStepLabel.label : 'Finalizando roteiro...'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps checklist */}
          <div className="space-y-2">
            {GEN_STEPS.map((s, i) => {
              const done = i < genStep
              const active = i === genStep && genStep < GEN_STEPS.length
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    active ? 'bg-violet-900/30 border border-violet-700/40' :
                    done ? 'opacity-50' : 'opacity-30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    done ? 'bg-emerald-500' : active ? 'bg-violet-500 animate-pulse' : 'bg-gray-700'
                  }`}>
                    {done ? '✓' : active ? '…' : i + 1}
                  </div>
                  <span className="text-xs text-gray-300">{s.icon} {s.label}</span>
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            Gerando roteiro 15s + 30s, cenas, voz, legenda e direção criativa...
          </p>
        </div>
      </div>
    )
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (step === 'result' && video && currentOutput) {
    return (
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
            <button onClick={handleReset} className="text-gray-400 hover:text-white text-sm shrink-0">← Config</button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-white font-semibold text-sm truncate">{video.product_name}</span>
              {video.campaign_name && video.campaign_name !== '—' && (
                <span className="text-gray-500 text-xs shrink-0">· {video.campaign_name}</span>
              )}
              <span className="text-gray-600 text-xs shrink-0">·</span>
              <span className="text-violet-400 text-xs shrink-0">{VIDEO_AI_FORMAT_ICONS[video.format]} {VIDEO_AI_FORMAT_LABELS[video.format]}</span>
              <span className="text-gray-600 text-xs shrink-0">·</span>
              <span className="text-gray-400 text-xs shrink-0">{VIDEO_AI_OBJECTIVE_ICONS[video.objective]} {VIDEO_AI_OBJECTIVE_LABELS[video.objective]}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowLibrary(true)}
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                📚 Biblioteca ({allVideos.length})
              </button>
              {!savedToLibrary ? (
                <button
                  onClick={handleSaveToLibrary}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors font-medium"
                >
                  💾 Salvar na Biblioteca
                </button>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
                  ✓ Salvo
                </span>
              )}
              <button
                onClick={handleReset}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium"
              >
                + Novo Vídeo
              </button>
            </div>
          </div>

          {/* Duration tabs */}
          <div className="max-w-7xl mx-auto px-6 pb-0 flex items-center gap-1">
            {(['15s', '30s'] as DurationTab[]).map(d => (
              <button
                key={d}
                onClick={() => setDurationTab(d)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  durationTab === d
                    ? 'text-violet-400 border-violet-400'
                    : 'text-gray-400 hover:text-white border-transparent'
                }`}
              >
                {d === '15s' ? '⚡ 15 segundos' : '🎬 30 segundos'}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
          {/* Left — main content */}
          <div className="flex-1 min-w-0">
            {/* Hook banner */}
            <div className="bg-gradient-to-r from-violet-900/50 to-violet-800/30 border border-violet-700/40 rounded-xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-violet-300 uppercase tracking-wider px-2 py-0.5 bg-violet-500/20 rounded-full">
                  🎯 Hook · Primeiros 3 segundos
                </span>
              </div>
              <p className="text-white text-lg font-semibold leading-snug">"{currentOutput.hook}"</p>
              {currentOutput.hook_analysis && (
                <p className="text-violet-300 text-xs mt-2 leading-relaxed opacity-80">{currentOutput.hook_analysis}</p>
              )}
            </div>

            {/* Content section tabs */}
            <div className="flex items-center gap-1 mb-5">
              {(['roteiro', 'cenas', 'producao'] as ContentTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setContentTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    contentTab === t
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {t === 'roteiro' ? '📋 Roteiro' : t === 'cenas' ? '🎬 Cenas' : '🎤 Produção'}
                </button>
              ))}
            </div>

            {/* ── ROTEIRO TAB ── */}
            {contentTab === 'roteiro' && (
              <div className="space-y-4">
                {/* Full narration */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">🗣 Narração Completa</h3>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{durationTab}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed italic">
                    "{currentOutput.full_narration}"
                  </p>
                </div>

                {/* Script breakdown */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">📐 Estrutura do Roteiro</h3>
                  <div className="space-y-3">
                    {SCRIPT_SECTIONS.map(section => {
                      const val = currentOutput[section.key]
                      if (!val) return null
                      return (
                        <div key={section.key} className={`border rounded-lg p-3 ${section.color}`}>
                          <div className="text-xs font-bold mb-1 opacity-80">{section.icon} {section.label}</div>
                          <p className="text-sm leading-relaxed">{val}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Text on screen */}
                {currentOutput.text_on_screen.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">💬 Textos na Tela</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentOutput.text_on_screen.map((t, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                    {currentOutput.cta_final && (
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <div className="text-xs text-gray-500 mb-1.5">CTA Final na Tela</div>
                        <span className="px-4 py-2 bg-violet-600/30 text-violet-200 text-sm font-bold rounded-lg border border-violet-500/40">
                          {currentOutput.cta_final}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CENAS TAB ── */}
            {contentTab === 'cenas' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">🎬 Storyboard · {currentOutput.scenes.length} cenas</h3>
                  <span className="text-xs text-gray-500">{durationTab} · 9:16 Vertical</span>
                </div>
                <div className="divide-y divide-gray-800">
                  {currentOutput.scenes.map((scene) => (
                    <div key={scene.number} className="p-5 hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Scene number + duration */}
                        <div className="shrink-0 text-center">
                          <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-white font-bold text-sm">
                            {scene.number}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-mono">{scene.duration}</div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Visual</div>
                            <p className="text-gray-300 text-sm leading-relaxed">{scene.visual}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Narração</div>
                              <p className="text-gray-400 text-sm italic">"{scene.narration}"</p>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Texto na tela</div>
                              <span className="inline-block px-2 py-1 bg-gray-800 text-white text-xs font-bold rounded border border-gray-700">
                                {scene.text_on_screen || '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Transition */}
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-gray-600 mb-1">Transição</div>
                          <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-700/40 rounded-lg">
                            {scene.transition || 'corte'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PRODUÇÃO TAB ── */}
            {contentTab === 'producao' && (
              <div className="space-y-4">
                {/* Voice */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">🔊 Voz & Avatar</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Perfil de Voz</div>
                      <p className="text-white text-sm font-medium">{currentOutput.voice_profile}</p>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Tom</div>
                      <p className="text-white text-sm font-medium">{currentOutput.voice_tone}</p>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Avatar / Apresentador</div>
                      <p className="text-gray-300 text-sm leading-relaxed">{currentOutput.avatar_description}</p>
                    </div>
                  </div>
                </div>

                {/* Music */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">🎵 Música & Legenda</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Sugestão Musical</div>
                      <p className="text-white text-sm font-medium">{currentOutput.music_suggestion}</p>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Clima</div>
                      <span className="text-xs px-2 py-1 bg-amber-900/30 text-amber-300 border border-amber-700/40 rounded-lg">
                        {currentOutput.music_mood}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Estilo das Legendas</div>
                      <p className="text-gray-300 text-sm">{currentOutput.subtitles_style}</p>
                    </div>
                  </div>
                </div>

                {/* Edit direction */}
                {currentOutput.edit_direction.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">✂️ Direção de Edição</h3>
                    <ul className="space-y-2">
                      {currentOutput.edit_direction.map((d, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-violet-900/50 text-violet-400 text-xs flex items-center justify-center font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-gray-300 text-sm leading-relaxed">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-72 shrink-0 space-y-4">
            {/* Platform badges */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Plataformas</h4>
              <div className="flex flex-wrap gap-1.5">
                {(currentOutput.platforms ?? ['Meta Ads', 'TikTok Ads', 'Reels']).map(p => (
                  <span key={p} className={`text-xs px-2 py-1 rounded-lg font-medium ${PLATFORM_STYLES[p] ?? 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                    {p}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-xs text-gray-500 mb-1">Formato</div>
                <div className="text-sm font-bold text-white">9:16 Vertical</div>
                <div className="text-xs text-gray-500">Otimizado para mobile</div>
              </div>
            </div>

            {/* Video specs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Especificações</h4>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Duração selecionada</span>
                  <span className="text-white font-medium">{durationTab}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total de cenas</span>
                  <span className="text-white font-medium">{currentOutput.scenes.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Textos na tela</span>
                  <span className="text-white font-medium">{currentOutput.text_on_screen.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Formato</span>
                  <span className="text-white font-medium">{VIDEO_AI_FORMAT_LABELS[video.format]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Objetivo</span>
                  <span className="text-white font-medium">{VIDEO_AI_OBJECTIVE_LABELS[video.objective]}</span>
                </div>
              </div>
            </div>

            {/* Both versions available */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Versões Geradas</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setDurationTab('15s')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    durationTab === '15s' ? 'border-violet-600/50 bg-violet-900/20' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">⚡</span>
                  <div>
                    <div className="text-sm font-medium text-white">15 Segundos</div>
                    <div className="text-xs text-gray-500">{video.output_15s?.scenes.length ?? 0} cenas · Feed direto</div>
                  </div>
                  {durationTab === '15s' && <span className="ml-auto text-violet-400 text-xs">●</span>}
                </button>
                <button
                  onClick={() => setDurationTab('30s')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    durationTab === '30s' ? 'border-violet-600/50 bg-violet-900/20' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">🎬</span>
                  <div>
                    <div className="text-sm font-medium text-white">30 Segundos</div>
                    <div className="text-xs text-gray-500">{video.output_30s?.scenes.length ?? 0} cenas · Storytelling</div>
                  </div>
                  {durationTab === '30s' && <span className="ml-auto text-violet-400 text-xs">●</span>}
                </button>
              </div>
            </div>

            {/* Future integrations */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Integrações</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/40">Em breve</span>
              </div>
              <div className="space-y-1.5">
                {INTEGRATIONS.map(int => (
                  <div key={int.name} className="flex items-center gap-2.5 opacity-50 cursor-not-allowed">
                    <span>{int.icon}</span>
                    <div className="flex-1">
                      <span className="text-xs text-gray-300 font-medium">{int.name}</span>
                      <span className="text-gray-600 text-xs ml-1.5">{int.cat}</span>
                    </div>
                    <span className="text-xs text-gray-600">→</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Envio direto para HeyGen, Synthesia, ElevenLabs e mais.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {!savedToLibrary ? (
                <button
                  onClick={handleSaveToLibrary}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                >
                  💾 Salvar na Biblioteca
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 text-sm font-medium text-center">
                  ✓ Salvo na Biblioteca
                </div>
              )}
              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                + Gerar Novo Vídeo
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Config screen ───────────────────────────────────────────────────────────
  const canGenerate = !!productId

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xl">
                🎥
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Geração Automática de Vídeos com IA</h1>
                <p className="text-gray-400 text-sm">Crie vídeos completos para anúncios — sem câmera, sem gravação, sem equipe.</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
          >
            📚 Biblioteca ({allVideos.length})
          </button>
        </div>

        {/* What gets generated */}
        <div className="grid grid-cols-9 gap-2 mb-8">
          {[
            { icon: '📝', label: 'Roteiro' },
            { icon: '🗣', label: 'Narração' },
            { icon: '💬', label: 'Texto na Tela' },
            { icon: '🎬', label: 'Cenas' },
            { icon: '🔊', label: 'Voz' },
            { icon: '🤖', label: 'Avatar' },
            { icon: '📄', label: 'Legendas' },
            { icon: '🎵', label: 'Música' },
            { icon: '✂️', label: 'Direção' },
          ].map(item => (
            <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-xs text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* ── Left: config ── */}
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
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        productId === p.id
                          ? 'border-violet-600/60 bg-violet-900/20'
                          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                      }`}
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

            {/* Step 2: Campaign (optional) */}
            {productId && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
                  <h2 className="text-sm font-semibold text-white">Selecionar Campanha</h2>
                  <span className="text-xs text-gray-500">(opcional)</span>
                  {campaignId && <span className="ml-auto text-xs text-emerald-400">✓ {selectedCampaign?.name}</span>}
                </div>
                {campaigns.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhuma campanha para este produto. O vídeo será gerado com base no produto.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCampaignId('')}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                        !campaignId ? 'border-violet-600/60 bg-violet-900/20' : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-gray-400 text-sm">Sem campanha específica</span>
                      {!campaignId && <span className="ml-auto text-violet-400">●</span>}
                    </button>
                    {campaigns.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCampaignId(c.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                          campaignId === c.id ? 'border-violet-600/60 bg-violet-900/20' : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-white truncate">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.platform}</div>
                        </div>
                        {campaignId === c.id && <span className="text-violet-400 shrink-0">●</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Objective */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
                <h2 className="text-sm font-semibold text-white">Objetivo do Vídeo</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj}
                    onClick={() => setObjective(obj)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      objective === obj
                        ? 'border-violet-600/60 bg-violet-900/20 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                    }`}
                  >
                    <span>{VIDEO_AI_OBJECTIVE_ICONS[obj]}</span>
                    <span>{VIDEO_AI_OBJECTIVE_LABELS[obj]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Format */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">4</span>
                <h2 className="text-sm font-semibold text-white">Formato do Vídeo</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {FORMATS.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
                      format === fmt
                        ? 'border-violet-600/60 bg-violet-900/20'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    }`}
                  >
                    <div className="text-2xl w-8 text-center shrink-0">{VIDEO_AI_FORMAT_ICONS[fmt]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white mb-0.5">{VIDEO_AI_FORMAT_LABELS[fmt]}</div>
                      <div className="text-xs text-gray-400 leading-relaxed">{VIDEO_AI_FORMAT_DESC[fmt]}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      format === fmt ? 'border-violet-400 bg-violet-400' : 'border-gray-600'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: summary + generate ── */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-white mb-4">📋 Resumo da Geração</h3>

              <div className="space-y-3 mb-5">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Produto</div>
                  <div className="text-sm text-white font-medium">
                    {productId ? selectedProduct?.name : <span className="text-gray-600">— não selecionado</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Campanha</div>
                  <div className="text-sm text-white">
                    {campaignId ? selectedCampaign?.name : <span className="text-gray-500 text-xs">Sem campanha específica</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Objetivo</div>
                  <div className="text-sm text-white">{VIDEO_AI_OBJECTIVE_ICONS[objective]} {VIDEO_AI_OBJECTIVE_LABELS[objective]}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Formato</div>
                  <div className="text-sm text-white">{VIDEO_AI_FORMAT_ICONS[format]} {VIDEO_AI_FORMAT_LABELS[format]}</div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 mb-5">
                <div className="text-xs text-gray-400 mb-2 font-medium">O que será gerado:</div>
                <div className="space-y-1">
                  {[
                    '✓ Versão 15 segundos completa',
                    '✓ Versão 30 segundos completa',
                    '✓ Roteiro + narração + cenas',
                    '✓ Textos na tela + legendas',
                    '✓ Voz, avatar e música',
                    '✓ Direção criativa de edição',
                  ].map((item, i) => (
                    <div key={i} className="text-xs text-gray-400">{item}</div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate || loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  canGenerate && !loading
                    ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? '⏳ Gerando...' : '🎥 Gerar Vídeo com IA'}
              </button>

              {!canGenerate && (
                <p className="text-xs text-gray-600 text-center mt-2">Selecione um produto para continuar</p>
              )}
            </div>

            {/* Integrations future */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Integrações Futuras</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/40">Em breve</span>
              </div>
              <div className="space-y-2">
                {INTEGRATIONS.map(int => (
                  <div key={int.name} className="flex items-center gap-2.5 opacity-50">
                    <span className="text-sm">{int.icon}</span>
                    <span className={`text-xs font-medium ${int.color}`}>{int.name}</span>
                    <span className="text-gray-600 text-xs ml-auto">{int.cat}</span>
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
