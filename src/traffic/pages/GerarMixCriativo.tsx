import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface MixConfig {
  creative_type: CreativeTypeType
  objective: CreativeObjectiveType
  angle: string
  role: string
  icon: string
  purpose: string
  tag: 'video' | 'imagem'
}

const MIX_CONFIGS: MixConfig[] = [
  {
    creative_type: 'video_curto',
    objective: 'captar_atencao',
    angle: 'Hook de Interrupção — Foca no problema imediato com urgência',
    role: 'Vídeo 1 — Hook de Problema',
    icon: '📱',
    purpose: 'Capturar atenção de público frio',
    tag: 'video',
  },
  {
    creative_type: 'video_curto',
    objective: 'converter_venda',
    angle: 'Prova Social + Transformação — Resultado real de cliente',
    role: 'Vídeo 2 — Prova Social',
    icon: '📱',
    purpose: 'Converter audiência morna',
    tag: 'video',
  },
  {
    creative_type: 'ugc',
    objective: 'retargeting',
    angle: 'Autoridade + Depoimento Autêntico — Pessoa real, tom casual e direto',
    role: 'Vídeo 3 — UGC Autêntico',
    icon: '🤳',
    purpose: 'Retargeting de quem visitou a página',
    tag: 'video',
  },
  {
    creative_type: 'imagem',
    objective: 'captar_atencao',
    angle: 'Print Alerta — Urgência visual com headline de alto impacto',
    role: 'Imagem 1 — Print Alerta',
    icon: '🖼️',
    purpose: 'Teste rápido de copy com baixo custo',
    tag: 'imagem',
  },
  {
    creative_type: 'imagem',
    objective: 'converter_venda',
    angle: 'Antes/Depois — Transformação visual clara e resultado concreto',
    role: 'Imagem 2 — Antes/Depois',
    icon: '🖼️',
    purpose: 'Demonstrar resultado e conversão',
    tag: 'imagem',
  },
  {
    creative_type: 'carrossel',
    objective: 'gerar_leads',
    angle: 'Benefícios em Sequência — Educa e convence etapa por etapa',
    role: 'Imagem 3 — Carrossel de Benefícios',
    icon: '🎠',
    purpose: 'Engajamento e geração de leads',
    tag: 'imagem',
  },
]

type SlotStatus = 'pending' | 'generating' | 'done' | 'error'

interface Slot {
  config: MixConfig
  status: SlotStatus
  strategy: CreativeStrategy | null
  error: string | null
}

const CHANNELS: CreativeChannelType[] = [
  'meta_ads', 'tiktok_ads', 'google_display', 'youtube_ads', 'native_ads', 'instagram_organico',
]

const CHANNEL_ICONS: Record<CreativeChannelType, string> = {
  meta_ads: '📘', tiktok_ads: '🎵', google_display: '🖥️',
  youtube_ads: '▶️', native_ads: '📰', instagram_organico: '📸',
}

export default function GerarMixCriativo() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [productId, setProductId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [channel, setChannel] = useState<CreativeChannelType>('meta_ads')
  const [slots, setSlots] = useState<Slot[]>(
    MIX_CONFIGS.map(c => ({ config: c, status: 'pending', strategy: null, error: null }))
  )
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [slotProgress, setSlotProgress] = useState(0)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const products = tosDb.products.getAll()
  const selectedProduct = products.find(p => p.id === productId)
  const availableCampaigns = productId ? tosDb.aiCampaigns.getByProduct(productId) : []
  const selectedCampaign = campaignId ? tosDb.aiCampaigns.getById(campaignId) : null

  function buildPrompt(config: MixConfig): string {
    if (!selectedProduct) return ''
    const diagnosis = tosDb.aiDiagnoses.getLatestByProduct(selectedProduct.id)
    const lines = [
      `=== PRODUTO ===`,
      `Nome: ${selectedProduct.name}`,
      `Nicho: ${selectedProduct.niche}`,
      `Categoria: ${selectedProduct.category}`,
      `Mercado: ${selectedProduct.market}`,
      `Preço: ${formatCurrency(selectedProduct.price, selectedProduct.currency)} (${selectedProduct.billing_model})`,
      `Público-alvo: ${selectedProduct.target_audience}`,
      `Dor principal: ${selectedProduct.main_pain}`,
      `Desejo principal: ${selectedProduct.main_desire}`,
      `Benefício principal: ${selectedProduct.main_benefit}`,
      `Promessa principal: ${selectedProduct.main_promise}`,
      `Mecanismo único: ${selectedProduct.unique_mechanism}`,
      `Objeções: ${selectedProduct.main_objections}`,
      ``,
      `=== CONFIGURAÇÕES DO CRIATIVO ===`,
      `Canal: ${CREATIVE_CHANNEL_LABELS[channel]}`,
      `Tipo: ${CREATIVE_TYPE_LABELS[config.creative_type]}`,
      `Objetivo: ${CREATIVE_OBJECTIVE_LABELS[config.objective]}`,
      `Ângulo: ${config.angle}`,
      `Papel no mix: ${config.role} — ${config.purpose}`,
    ]
    if (selectedCampaign) {
      lines.push(``, `=== CAMPANHA VINCULADA ===`)
      lines.push(`Nome: ${selectedCampaign.strategy.nome_estrategico}`)
      lines.push(`Hipótese: ${selectedCampaign.strategy.hipotese_principal}`)
      lines.push(`Ângulo principal: ${selectedCampaign.strategy.angulo_principal.tipo} — ${selectedCampaign.strategy.angulo_principal.descricao}`)
      lines.push(`Público: ${selectedCampaign.strategy.publico.principal}`)
    }
    if (diagnosis) {
      const a = diagnosis.analysis
      lines.push(``, `=== DIAGNÓSTICO DE OFERTA ===`)
      lines.push(`Nota: ${a.nota_geral.score}/10`)
      lines.push(`Big Idea: ${a.big_idea}`)
      lines.push(`Promessa ajustada: ${a.promessa_ajustada}`)
      lines.push(`Dores: ${a.dores.slice(0, 3).join(' | ')}`)
    }
    return lines.join('\n')
  }

  async function generateAll() {
    setStep(2)
    const updatedSlots: Slot[] = slots.map(s => ({ ...s, status: 'pending', strategy: null, error: null }))
    setSlots(updatedSlots)

    for (let i = 0; i < MIX_CONFIGS.length; i++) {
      setCurrentIdx(i)
      setSlotProgress(0)

      // start progress animation
      intervalRef.current = setInterval(() => {
        setSlotProgress(p => Math.min(p + 2, 92))
      }, 400)

      updatedSlots[i] = { ...updatedSlots[i], status: 'generating' }
      setSlots([...updatedSlots])

      try {
        const resp = await fetch('/api/creative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creativeData: buildPrompt(MIX_CONFIGS[i]) }),
        })

        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        setSlotProgress(100)

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
          throw new Error(err.error ?? `HTTP ${resp.status}`)
        }

        const data = await resp.json() as { strategy: CreativeStrategy }
        updatedSlots[i] = { ...updatedSlots[i], status: 'done', strategy: data.strategy }
      } catch (e) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        updatedSlots[i] = {
          ...updatedSlots[i],
          status: 'error',
          error: e instanceof Error ? e.message : 'Erro desconhecido',
        }
      }

      setSlots([...updatedSlots])
    }

    setCurrentIdx(-1)
    setStep(3)
  }

  function saveAll() {
    const ids: string[] = []
    slots.forEach(slot => {
      if (slot.status !== 'done' || !slot.strategy || !productId) return
      const creative: AICreative = {
        id: generateId(),
        product_id: productId,
        campaign_id: campaignId,
        channel,
        creative_type: slot.config.creative_type,
        objective: slot.config.objective,
        angle: slot.config.angle,
        strategy: slot.strategy,
        status: 'novo',
        spend: 0, revenue: 0, impressions: 0, clicks: 0,
        leads: 0, conversions: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0,
        learning: { hook_type: '', promise_type: '', dominant_emotion: '', proof_type: '' },
        history: [],
        notes: '',
        created_at: now(),
        updated_at: now(),
      }
      tosDb.aiCreatives.save(creative)
      ids.push(creative.id)
    })
    setSavedIds(ids)
    navigate('/criativos')
  }

  const doneCount = slots.filter(s => s.status === 'done').length
  const errorCount = slots.filter(s => s.status === 'error').length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/criativos')} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Gerar Mix de Criativos</h1>
          <p className="text-gray-400 text-sm mt-0.5">3 vídeos + 3 imagens por campanha — pronto para teste e escala</p>
        </div>
      </div>

      {/* Mix preview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {MIX_CONFIGS.map((c, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
            c.tag === 'video'
              ? 'bg-violet-900/10 border-violet-800/30'
              : 'bg-blue-900/10 border-blue-800/30'
          }`}>
            <span className="text-xl">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${c.tag === 'video' ? 'text-violet-300' : 'text-blue-300'}`}>
                {c.role}
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{c.purpose}</div>
            </div>
            {step >= 2 && (
              <span className={`text-xs font-bold flex-shrink-0 ${
                slots[i].status === 'done' ? 'text-emerald-400' :
                slots[i].status === 'generating' ? 'text-violet-400 animate-pulse' :
                slots[i].status === 'error' ? 'text-red-400' :
                'text-gray-600'
              }`}>
                {slots[i].status === 'done' ? '✓' :
                 slots[i].status === 'generating' ? '...' :
                 slots[i].status === 'error' ? '✕' :
                 String(i + 1)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Setup ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Product */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Produto *</p>
            {products.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                <p className="text-gray-400 mb-3">Nenhum produto cadastrado.</p>
                <button onClick={() => navigate('/produtos/novo')} className="text-violet-400 text-sm">
                  Cadastrar Produto →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProductId(p.id); setCampaignId('') }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      productId === p.id
                        ? 'border-violet-500 bg-violet-600/10'
                        : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold flex-shrink-0 text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{p.name}</div>
                      <div className="text-gray-500 text-xs">{p.niche} · {formatCurrency(p.price, p.currency)}</div>
                    </div>
                    {productId === p.id && <span className="text-violet-400 flex-shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campaign (optional) */}
          {productId && availableCampaigns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                Campanha <span className="text-gray-600 normal-case font-normal">(opcional)</span>
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setCampaignId('')}
                  className={`w-full text-left p-2.5 rounded-xl border-2 transition-all ${
                    !campaignId ? 'border-gray-600 bg-gray-800' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                  }`}
                >
                  <span className="text-gray-400 text-sm">— Sem campanha vinculada</span>
                </button>
                {availableCampaigns.map(camp => (
                  <button
                    key={camp.id}
                    onClick={() => setCampaignId(camp.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all text-left ${
                      campaignId === camp.id
                        ? 'border-violet-500 bg-violet-600/10'
                        : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                    }`}
                  >
                    <span>📢</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{camp.strategy.nome_estrategico}</div>
                    </div>
                    {campaignId === camp.id && <span className="text-violet-400 flex-shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channel */}
          {productId && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Canal Principal</p>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(ch => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-sm ${
                      channel === ch
                        ? 'border-violet-500 bg-violet-600/10 text-white'
                        : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span>{CHANNEL_ICONS[ch]}</span>
                    <span className="text-xs">{CREATIVE_CHANNEL_LABELS[ch]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {productId && (
            <button
              onClick={generateAll}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 text-base transition-colors"
            >
              <span>✦</span>
              Gerar Mix Completo (6 Criativos)
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Generating ────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-violet-300 font-medium">
                {currentIdx >= 0
                  ? `Gerando ${currentIdx + 1}/6 — ${MIX_CONFIGS[currentIdx]?.role}...`
                  : 'Finalizando...'}
              </span>
            </div>
            <div className="space-y-3">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    slot.status === 'done' ? 'bg-emerald-600 text-white' :
                    slot.status === 'generating' ? 'bg-violet-600 text-white' :
                    slot.status === 'error' ? 'bg-red-600 text-white' :
                    'bg-gray-800 text-gray-600'
                  }`}>
                    {slot.status === 'done' ? '✓' :
                     slot.status === 'generating' ? '…' :
                     slot.status === 'error' ? '✕' :
                     String(i + 1)}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-300">{slot.config.role}</div>
                    {slot.status === 'generating' && (
                      <div className="h-1 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${slotProgress}%` }}
                        />
                      </div>
                    )}
                    {slot.status === 'error' && (
                      <div className="text-xs text-red-400 mt-0.5">{slot.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center">
            Cada criativo é gerado individualmente para máxima qualidade. Aguarde...
          </p>
        </div>
      )}

      {/* ── STEP 3: Review ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-4 rounded-xl border ${
            errorCount === 0
              ? 'bg-emerald-900/20 border-emerald-800/40'
              : 'bg-amber-900/20 border-amber-800/40'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-xl ${errorCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {errorCount === 0 ? '✓' : '⚠'}
              </span>
              <div>
                <p className={`font-semibold text-sm ${errorCount === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {doneCount} de 6 criativos gerados com sucesso
                  {errorCount > 0 && ` — ${errorCount} com erro`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedProduct?.name} · {CREATIVE_CHANNEL_LABELS[channel]}
                  {selectedCampaign && ` · ${selectedCampaign.strategy.nome_estrategico}`}
                </p>
              </div>
            </div>
          </div>

          {/* Slot results */}
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                slot.status === 'done'
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-red-900/10 border-red-800/30'
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                    slot.status === 'done' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {slot.status === 'done' ? '✓' : '✕'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{slot.config.role}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        slot.config.tag === 'video'
                          ? 'bg-violet-900/40 text-violet-300'
                          : 'bg-blue-900/40 text-blue-300'
                      }`}>
                        {slot.config.tag}
                      </span>
                    </div>
                    {slot.status === 'done' && slot.strategy && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{slot.strategy.ideia_central}</p>
                    )}
                    {slot.status === 'error' && (
                      <p className="text-xs text-red-400 mt-0.5">{slot.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setStep(2); generateAll() }}
              className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              ↩ Regerar Tudo
            </button>
            <button
              onClick={saveAll}
              disabled={doneCount === 0}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-colors ${
                doneCount > 0
                  ? 'text-white bg-violet-600 hover:bg-violet-700'
                  : 'text-gray-600 bg-gray-800 cursor-not-allowed'
              }`}
            >
              Salvar {doneCount} Criativos →
            </button>
          </div>
        </div>
      )}

      {savedIds.length > 0 && (
        <div className="mt-4 text-center text-xs text-gray-500">
          {savedIds.length} criativos salvos — redirecionando...
        </div>
      )}
    </div>
  )
}
