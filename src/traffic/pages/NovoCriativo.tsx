import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  CREATIVE_CHANNEL_LABELS,
  CREATIVE_TYPE_LABELS,
  CREATIVE_OBJECTIVE_LABELS,
  formatCurrency,
} from '../utils/helpers'
import type {
  CreativeChannelType,
  CreativeTypeType,
  CreativeObjectiveType,
  CreativeStrategy,
  AICreative,
} from '../types'

const CHANNELS: CreativeChannelType[] = [
  'meta_ads', 'tiktok_ads', 'google_display',
  'youtube_ads', 'native_ads', 'instagram_organico',
]
const TYPES: CreativeTypeType[] = [
  'video_curto', 'video_longo', 'imagem', 'carrossel', 'ugc', 'story',
]
const OBJECTIVES: CreativeObjectiveType[] = [
  'captar_atencao', 'gerar_cliques', 'gerar_leads', 'converter_venda', 'retargeting',
]

const CHANNEL_ICONS: Record<CreativeChannelType, string> = {
  meta_ads: '📘',
  tiktok_ads: '🎵',
  google_display: '🖥️',
  youtube_ads: '▶️',
  native_ads: '📰',
  instagram_organico: '📸',
}
const TYPE_ICONS: Record<CreativeTypeType, string> = {
  video_curto: '📱',
  video_longo: '🎬',
  imagem: '🖼️',
  carrossel: '🎠',
  ugc: '🤳',
  story: '⭕',
}
const OBJECTIVE_ICONS: Record<CreativeObjectiveType, string> = {
  captar_atencao: '👁️',
  gerar_cliques: '🖱️',
  gerar_leads: '🎯',
  converter_venda: '💰',
  retargeting: '🔄',
}

const PROGRESS_MSGS = [
  'Analisando dados do produto...',
  'Selecionando ângulo de alta conversão...',
  'Construindo hooks para parar o scroll...',
  'Escrevendo roteiro completo...',
  'Gerando variações de roteiro...',
  'Criando copies e headlines...',
  'Elaborando direção criativa...',
  'Finalizando briefing completo...',
]

interface WizardState {
  product_id: string
  campaign_id: string
  channel: CreativeChannelType | ''
  creative_type: CreativeTypeType | ''
  objective: CreativeObjectiveType | ''
  angle_source: 'auto' | 'manual'
  angle: string
}

const EMPTY: WizardState = {
  product_id: '',
  campaign_id: '',
  channel: '',
  creative_type: '',
  objective: '',
  angle_source: 'auto',
  angle: '',
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              n < current
                ? 'bg-violet-600 text-white'
                : n === current
                ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-gray-950'
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            {n < current ? '✓' : n}
          </div>
          {n < total && (
            <div className={`h-px w-6 transition-all ${n < current ? 'bg-violet-600' : 'bg-gray-800'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-gray-400">Etapa {current} de {total}</span>
    </div>
  )
}

function OptionCard({
  selected, onClick, icon, label,
}: { selected: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
        selected
          ? 'border-violet-500 bg-violet-600/10 text-white'
          : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-200'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </button>
  )
}

function PreviewCard({ title, icon, content }: { title: string; icon: string; content: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">{content}</p>
    </div>
  )
}

export default function NovoCriativo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preProduct = searchParams.get('produto') ?? ''
  const preCampaign = searchParams.get('campanha') ?? ''
  const baseId = searchParams.get('base') ?? ''

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>({
    ...EMPTY,
    product_id: preProduct,
    campaign_id: preCampaign,
  })

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<CreativeStrategy | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const products = tosDb.products.getAll()
  const selectedProduct = products.find(p => p.id === form.product_id)

  // Campaigns for the selected product (or all if none selected yet)
  const availableCampaigns = form.product_id
    ? tosDb.aiCampaigns.getByProduct(form.product_id)
    : tosDb.aiCampaigns.getAll()

  const selectedCampaign = form.campaign_id
    ? tosDb.aiCampaigns.getById(form.campaign_id)
    : null

  // Campaign angles for manual selection
  const campaignAngles = selectedCampaign
    ? [
        { key: selectedCampaign.strategy.angulo_principal.tipo, label: `${selectedCampaign.strategy.angulo_principal.tipo}: ${selectedCampaign.strategy.angulo_principal.descricao}` },
        ...selectedCampaign.strategy.angulos_secundarios.map(a => ({
          key: a.tipo,
          label: `${a.tipo}: ${a.descricao}`,
        })),
      ]
    : []

  // Pre-fill from base creative if duplicating/varying
  useEffect(() => {
    if (!baseId) return
    const base = tosDb.aiCreatives.getById(baseId)
    if (!base) return
    setForm(prev => ({
      ...prev,
      product_id: base.product_id,
      campaign_id: base.campaign_id,
      channel: base.channel,
      creative_type: base.creative_type,
      objective: base.objective,
      angle_source: base.angle ? 'manual' : 'auto',
      angle: base.angle,
    }))
  }, [baseId])

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceed(): boolean {
    if (step === 1) return !!form.product_id
    if (step === 2) return !!form.channel
    if (step === 3) return !!form.creative_type
    if (step === 4) return !!form.objective
    if (step === 5) return form.angle_source === 'auto' || !!form.angle
    return true
  }

  function buildCreativePrompt(): string {
    const product = selectedProduct
    if (!product) return ''

    const campaign = selectedCampaign
    const diagnosis = tosDb.aiDiagnoses.getLatestByProduct(product.id)

    const lines: string[] = [
      `=== PRODUTO ===`,
      `Nome: ${product.name}`,
      `Nicho: ${product.niche}`,
      `Categoria: ${product.category}`,
      `Mercado: ${product.market}`,
      `Preço: ${formatCurrency(product.price, product.currency)} (${product.billing_model})`,
      `Público-alvo: ${product.target_audience}`,
      `Dor principal: ${product.main_pain}`,
      `Desejo principal: ${product.main_desire}`,
      `Benefício principal: ${product.main_benefit}`,
      `Promessa principal: ${product.main_promise}`,
      `Mecanismo único: ${product.unique_mechanism}`,
      `Objeções: ${product.main_objections}`,
      product.sales_page_url ? `Página de vendas: ${product.sales_page_url}` : '',
      ``,
      `=== CONFIGURAÇÕES DO CRIATIVO ===`,
      `Canal: ${CREATIVE_CHANNEL_LABELS[form.channel as CreativeChannelType] ?? form.channel}`,
      `Tipo: ${CREATIVE_TYPE_LABELS[form.creative_type as CreativeTypeType] ?? form.creative_type}`,
      `Objetivo: ${CREATIVE_OBJECTIVE_LABELS[form.objective as CreativeObjectiveType] ?? form.objective}`,
      `Ângulo: ${form.angle_source === 'auto' ? 'IA deve escolher o melhor ângulo com base nos dados' : form.angle}`,
    ].filter(Boolean)

    if (campaign) {
      lines.push(``)
      lines.push(`=== CAMPANHA VINCULADA ===`)
      lines.push(`Nome: ${campaign.strategy.nome_estrategico}`)
      lines.push(`Hipótese: ${campaign.strategy.hipotese_principal}`)
      lines.push(`Ângulo principal da campanha: ${campaign.strategy.angulo_principal.tipo} — ${campaign.strategy.angulo_principal.descricao}`)
      lines.push(`Público principal: ${campaign.strategy.publico.principal}`)
      lines.push(`Tipo de hook recomendado: ${campaign.strategy.criativos_necessarios.tipo_hook}`)
      lines.push(`Tipo de copy: ${campaign.strategy.criativos_necessarios.tipo_copy}`)
    }

    if (diagnosis) {
      const a = diagnosis.analysis
      lines.push(``)
      lines.push(`=== DIAGNÓSTICO DE OFERTA ===`)
      lines.push(`Nota: ${a.nota_geral.score}/10`)
      lines.push(`Big Idea: ${a.big_idea}`)
      lines.push(`Promessa ajustada: ${a.promessa_ajustada}`)
      lines.push(`Dores principais: ${a.dores.slice(0, 3).join(' | ')}`)
      lines.push(`Desejos principais: ${a.desejos.slice(0, 3).join(' | ')}`)
    }

    if (baseId) {
      lines.push(``)
      lines.push(`=== OBSERVAÇÃO ===`)
      lines.push(`Este criativo é uma variação/dupicata. Gere um ângulo diferente do original.`)
    }

    return lines.join('\n')
  }

  async function generateCreative() {
    setLoading(true)
    setError(null)
    setProgress(2)
    setProgressMsg(PROGRESS_MSGS[0])

    let msgIdx = 0
    intervalRef.current = setInterval(() => {
      setProgress(prev => Math.min(prev + 1.5, 92))
      msgIdx = (msgIdx + 1) % PROGRESS_MSGS.length
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 350)

    try {
      const resp = await fetch('/api/creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeData: buildCreativePrompt() }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${resp.status}`)
      }

      const data = await resp.json() as { strategy: CreativeStrategy }
      setStrategy(data.strategy)
      setProgress(100)
      setProgressMsg('Criativo gerado com sucesso!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar criativo')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
    }
  }

  function handleSave() {
    if (!strategy || !form.product_id) return

    const creative: AICreative = {
      id: generateId(),
      product_id: form.product_id,
      campaign_id: form.campaign_id,
      channel: form.channel as CreativeChannelType,
      creative_type: form.creative_type as CreativeTypeType,
      objective: form.objective as CreativeObjectiveType,
      angle: form.angle_source === 'auto' ? (strategy.nome.split('|')[1]?.trim() ?? 'Automático') : form.angle,
      strategy,
      status: 'novo',
      spend: 0,
      revenue: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: 0,
      learning: { hook_type: '', promise_type: '', dominant_emotion: '', proof_type: '' },
      history: [],
      notes: '',
      created_at: now(),
      updated_at: now(),
    }
    tosDb.aiCreatives.save(creative)
    navigate(`/criativos/${creative.id}`)
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/criativos')}
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {baseId ? 'Gerar Variação do Criativo' : 'Gerar Criativo com IA'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Briefing estratégico completo em etapas</p>
        </div>
      </div>

      <StepIndicator current={step} total={6} />

      {/* ── STEP 1: Product & Campaign ─────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Produto e Campanha</h2>
          <p className="text-gray-400 text-sm mb-5">
            Selecione o produto. A campanha é opcional, mas melhora a qualidade do criativo.
          </p>

          {products.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-3">Nenhum produto cadastrado.</p>
              <button onClick={() => navigate('/produtos/novo')} className="text-violet-400 text-sm">
                Cadastrar Produto →
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Products */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Produto *</p>
                <div className="space-y-2">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { set('product_id', p.id); set('campaign_id', '') }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        form.product_id === p.id
                          ? 'border-violet-500 bg-violet-600/10'
                          : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold flex-shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{p.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {p.niche} · {formatCurrency(p.price, p.currency)}
                        </div>
                      </div>
                      {form.product_id === p.id && <span className="text-violet-400">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign (optional) */}
              {form.product_id && availableCampaigns.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                    Campanha Vinculada <span className="text-gray-600 normal-case font-normal">(opcional — melhora o criativo)</span>
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => set('campaign_id', '')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        !form.campaign_id
                          ? 'border-gray-600 bg-gray-800'
                          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                      }`}
                    >
                      <span className="text-gray-400 text-sm">— Sem campanha vinculada</span>
                    </button>
                    {availableCampaigns.map(camp => (
                      <button
                        key={camp.id}
                        onClick={() => set('campaign_id', camp.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          form.campaign_id === camp.id
                            ? 'border-violet-500 bg-violet-600/10'
                            : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                        }`}
                      >
                        <span className="text-lg">📢</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {camp.strategy.nome_estrategico}
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            {CREATIVE_CHANNEL_LABELS[camp.channel as CreativeChannelType] ?? camp.channel}
                          </div>
                        </div>
                        {form.campaign_id === camp.id && <span className="text-violet-400 flex-shrink-0">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Channel ────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Canal de Veiculação</h2>
          <p className="text-gray-400 text-sm mb-5">Onde este criativo será publicado?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CHANNELS.map(ch => (
              <OptionCard
                key={ch}
                selected={form.channel === ch}
                onClick={() => set('channel', ch)}
                icon={CHANNEL_ICONS[ch]}
                label={CREATIVE_CHANNEL_LABELS[ch]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Type ───────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Tipo de Criativo</h2>
          <p className="text-gray-400 text-sm mb-5">Qual é o formato deste criativo?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TYPES.map(t => (
              <OptionCard
                key={t}
                selected={form.creative_type === t}
                onClick={() => set('creative_type', t)}
                icon={TYPE_ICONS[t]}
                label={CREATIVE_TYPE_LABELS[t]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 4: Objective ──────────────────────────────────── */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Objetivo do Criativo</h2>
          <p className="text-gray-400 text-sm mb-5">Qual é a ação esperada de quem ver este criativo?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OBJECTIVES.map(obj => (
              <OptionCard
                key={obj}
                selected={form.objective === obj}
                onClick={() => set('objective', obj)}
                icon={OBJECTIVE_ICONS[obj]}
                label={CREATIVE_OBJECTIVE_LABELS[obj]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 5: Angle ──────────────────────────────────────── */}
      {step === 5 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Ângulo do Criativo</h2>
          <p className="text-gray-400 text-sm mb-5">
            A IA pode escolher o melhor ângulo ou você pode definir manualmente.
          </p>

          <div className="space-y-4">
            {/* Auto / Manual toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { set('angle_source', 'auto'); set('angle', '') }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  form.angle_source === 'auto'
                    ? 'border-violet-500 bg-violet-600/10 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-2">✦</div>
                <div className="text-sm font-medium">Automático</div>
                <div className="text-xs text-gray-500 mt-1">A IA escolhe o melhor ângulo</div>
              </button>
              <button
                onClick={() => set('angle_source', 'manual')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  form.angle_source === 'manual'
                    ? 'border-violet-500 bg-violet-600/10 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-sm font-medium">Manual</div>
                <div className="text-xs text-gray-500 mt-1">Você define o ângulo</div>
              </button>
            </div>

            {/* Manual angle selection */}
            {form.angle_source === 'manual' && (
              <div>
                {campaignAngles.length > 0 ? (
                  <div>
                    <p className="text-xs text-gray-400 mb-3 font-medium">Ângulos da campanha vinculada:</p>
                    <div className="space-y-2">
                      {campaignAngles.map(a => (
                        <button
                          key={a.key}
                          onClick={() => set('angle', a.key)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            form.angle === a.key
                              ? 'border-violet-500 bg-violet-600/10'
                              : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                          }`}
                        >
                          <div className="text-xs text-violet-400 font-semibold">{a.key}</div>
                          <div className="text-xs text-gray-300 mt-0.5 line-clamp-2">{a.label.split(': ')[1] ?? a.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Descreva o ângulo
                    </label>
                    <input
                      type="text"
                      value={form.angle}
                      onChange={e => set('angle', e.target.value)}
                      placeholder="Ex: Medo/Perda, Transformação, Autoridade..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                    <p className="text-xs text-gray-600 mt-1.5">
                      Dica: vincule uma campanha na etapa 1 para ver os ângulos disponíveis.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 6: AI Generation ──────────────────────────────── */}
      {step === 6 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Geração com IA</h2>
          <p className="text-gray-400 text-sm mb-5">
            A IA irá gerar o briefing criativo completo com roteiro, hooks, copies e direção criativa.
          </p>

          {/* Summary */}
          {!strategy && !loading && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Produto</div>
                <div className="text-white font-medium truncate">{selectedProduct?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Canal</div>
                <div className="text-white">{CREATIVE_CHANNEL_LABELS[form.channel as CreativeChannelType] ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Tipo</div>
                <div className="text-white">{CREATIVE_TYPE_LABELS[form.creative_type as CreativeTypeType] ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Objetivo</div>
                <div className="text-white">{CREATIVE_OBJECTIVE_LABELS[form.objective as CreativeObjectiveType] ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Ângulo</div>
                <div className="text-white text-xs">{form.angle_source === 'auto' ? '✦ Automático (IA)' : form.angle}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Campanha</div>
                <div className="text-white text-xs">
                  {selectedCampaign ? selectedCampaign.strategy.nome_estrategico : '— Sem campanha'}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-violet-300 font-medium">{progressMsg}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2 text-right">{Math.round(progress)}%</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 mb-5 flex items-start gap-3">
              <span className="text-red-400 mt-0.5">⚠</span>
              <div>
                <p className="text-red-300 text-sm font-medium">Erro ao gerar criativo</p>
                <p className="text-red-400/80 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Generate button */}
          {!strategy && !loading && (
            <button
              onClick={generateCreative}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3 text-base"
            >
              <span>✦</span>
              Gerar Criativo com IA
            </button>
          )}

          {/* Strategy preview */}
          {strategy && (
            <div className="space-y-4">
              {/* Success */}
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4 flex items-center gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <div>
                  <p className="text-emerald-300 font-semibold">{strategy.nome}</p>
                  <p className="text-emerald-400/70 text-xs mt-0.5">Briefing criativo gerado</p>
                </div>
              </div>

              <PreviewCard title="Ideia Central" icon="💡" content={strategy.ideia_central} />

              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Hooks (primeiros 3 segundos)</p>
                <div className="space-y-2">
                  {strategy.hooks.map((h, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5">
                      <span className="text-xs text-violet-400 font-semibold">{h.tipo}: </span>
                      <span className="text-sm text-gray-200">{h.texto}</span>
                    </div>
                  ))}
                </div>
              </div>

              <PreviewCard title="Hipótese" icon="🔬" content={strategy.hipotese} />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setStrategy(null); setProgress(0); setError(null) }}
                  className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ↩ Regerar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
                >
                  Salvar Criativo →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {step < 6 && (
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              ← Voltar
            </button>
          )}
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
              canProceed()
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {step === 5 ? 'Ir para Geração com IA →' : 'Próxima Etapa →'}
          </button>
        </div>
      )}
    </div>
  )
}
