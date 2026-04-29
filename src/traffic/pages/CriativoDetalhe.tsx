import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatCurrency,
  formatDateTime,
  getStatusColor,
  CREATIVE_CHANNEL_LABELS,
  CREATIVE_TYPE_LABELS,
  CREATIVE_OBJECTIVE_LABELS,
  AI_CREATIVE_STATUS_LABELS,
} from '../utils/helpers'
import type { AICreativeStatus, AICreative, CreativeStrategy } from '../types'

// ─── Shared UI ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

function SectionCard({
  number, title, icon, children, copyContent,
}: {
  number: number; title: string; icon: string
  children: React.ReactNode; copyContent?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center">
            {number}
          </span>
          <span className="mr-1">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {copyContent && <CopyButton text={copyContent} />}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function CopyItem({ text, index }: { text: string; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg group">
      <span className="text-xs text-gray-600 font-mono w-5 flex-shrink-0 mt-0.5">{index + 1}.</span>
      <p className="text-sm text-gray-200 flex-1 leading-relaxed">{text}</p>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={text} />
      </div>
    </div>
  )
}

function Tag({ label, color = 'gray' }: { label: string; color?: 'gray' | 'violet' | 'emerald' | 'amber' | 'red' }) {
  const cls = {
    gray: 'bg-gray-800 text-gray-300',
    violet: 'bg-violet-900/40 text-violet-300',
    emerald: 'bg-emerald-900/40 text-emerald-300',
    amber: 'bg-amber-900/40 text-amber-300',
    red: 'bg-red-900/40 text-red-300',
  }[color]
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CriativoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [creative, setCreative] = useState<AICreative | null>(() =>
    id ? tosDb.aiCreatives.getById(id) : null
  )
  const [editingMetrics, setEditingMetrics] = useState(false)
  const [metricsForm, setMetricsForm] = useState({ ctr: 0, cpc: 0, cpa: 0, roas: 0 })
  const [assignCampaignOpen, setAssignCampaignOpen] = useState(false)
  const [editingLearning, setEditingLearning] = useState(false)
  const [learningForm, setLearningForm] = useState({ hook_type: '', promise_type: '', dominant_emotion: '', proof_type: '' })
  const [suggestedStatus, setSuggestedStatus] = useState<AICreativeStatus | null>(null)

  // ─── Asset Generation ────────────────────────────────────────────────────────
  type GeneratedAsset = { url: string; label: string; generated_at: string }
  const [genAssets, setGenAssets] = useState<GeneratedAsset[]>([])
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genDone, setGenDone] = useState(false)
  // Restore persisted assets on mount
  const savedAssets = creative?.generated_assets ?? []

  const generateAssets = useCallback(async () => {
    if (!creative) return
    const product = tosDb.products.getById(creative.product_id)
    setGenLoading(true)
    setGenError(null)
    setGenDone(false)

    const isCarousel = creative.creative_type === 'carrossel'
    const slideCount = isCarousel
      ? Math.min((creative.strategy?.imagem_variacoes ?? []).length || 3, 5)
      : 1

    try {
      const res = await fetch('/api/creative-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creative_type: creative.creative_type,
          product_name:  product?.name ?? 'Produto',
          niche:         product?.niche ?? '',
          strategy:      creative.strategy,
          slide_count:   slideCount,
          language:      localStorage.getItem('tos_ai_lang') ?? 'pt-BR',
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        let errMsg = `HTTP ${res.status}`
        try { errMsg = (JSON.parse(body) as { error?: string }).error ?? errMsg } catch { errMsg = body.slice(0, 300) || errMsg }
        throw new Error(errMsg)
      }
      const data = await res.json() as { assets: Array<{ url: string; label: string; revised_prompt?: string }> }
      const assets: GeneratedAsset[] = data.assets.map(a => ({
        url:          a.url,
        label:        a.label,
        generated_at: now(),
      }))
      setGenAssets(assets)
      setGenDone(true)
      // Persist to creative record
      update({ generated_assets: assets })
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Erro ao gerar imagem')
    } finally {
      setGenLoading(false)
    }
  }, [creative]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!creative) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-400 mb-4">Criativo não encontrado.</p>
        <button onClick={() => navigate('/criativos')} className="text-violet-400 hover:text-violet-300 text-sm">
          ← Voltar para Criativos
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(creative.product_id)
  const campaign = creative.campaign_id ? tosDb.aiCampaigns.getById(creative.campaign_id) : null
  const allCampaigns = tosDb.aiCampaigns.getAll()
  // Normalize strategy — guard against missing/null fields that would crash .map()
  const raw = (creative.strategy ?? {}) as Partial<CreativeStrategy>
  const s: CreativeStrategy = {
    nome:              raw.nome              ?? '',
    ideia_central:     raw.ideia_central     ?? '',
    hooks:             Array.isArray(raw.hooks)              ? raw.hooks              : [],
    roteiro: {
      hook:     raw.roteiro?.hook     ?? '',
      problema: raw.roteiro?.problema ?? '',
      agitacao: raw.roteiro?.agitacao ?? '',
      solucao:  raw.roteiro?.solucao  ?? '',
      cta:      raw.roteiro?.cta      ?? '',
      duracao:  raw.roteiro?.duracao  ?? '',
    },
    cenas:             Array.isArray(raw.cenas)              ? raw.cenas              : undefined,
    variacoes_roteiro: Array.isArray(raw.variacoes_roteiro)  ? raw.variacoes_roteiro  : [],
    texto_anuncio: {
      textos_principais: Array.isArray(raw.texto_anuncio?.textos_principais) ? raw.texto_anuncio!.textos_principais : [],
      headlines:         Array.isArray(raw.texto_anuncio?.headlines)         ? raw.texto_anuncio!.headlines         : [],
      descricoes:        Array.isArray(raw.texto_anuncio?.descricoes)        ? raw.texto_anuncio!.descricoes        : [],
      ctas:              Array.isArray(raw.texto_anuncio?.ctas)              ? raw.texto_anuncio!.ctas              : [],
    },
    direcao_criativa: {
      como_gravar: raw.direcao_criativa?.como_gravar ?? '',
      cenario:     raw.direcao_criativa?.cenario     ?? '',
      tipo_pessoa: raw.direcao_criativa?.tipo_pessoa ?? '',
      estilo:      raw.direcao_criativa?.estilo      ?? '',
      tom_voz:     raw.direcao_criativa?.tom_voz     ?? '',
      edicao:      raw.direcao_criativa?.edicao      ?? '',
    },
    direcao_gravacao:  raw.direcao_gravacao,
    direcao_edicao:    raw.direcao_edicao,
    imagem_tipo:       raw.imagem_tipo,
    imagem_layout:     raw.imagem_layout,
    imagem_texto:      raw.imagem_texto,
    imagem_variacoes:  Array.isArray(raw.imagem_variacoes)   ? raw.imagem_variacoes   : undefined,
    imagem_estilo:     raw.imagem_estilo,
    imagem_referencia: raw.imagem_referencia,
    referencia_visual: raw.referencia_visual  ?? '',
    variacoes_teste:   Array.isArray(raw.variacoes_teste)    ? raw.variacoes_teste    : [],
    hipotese:          raw.hipotese           ?? '',
    metricas_esperadas: {
      ctr_esperado: raw.metricas_esperadas?.ctr_esperado ?? '—',
      cpc_esperado: raw.metricas_esperadas?.cpc_esperado ?? '—',
      cpa_esperado: raw.metricas_esperadas?.cpa_esperado ?? '—',
    },
    recomendacoes: {
      quando_usar:    raw.recomendacoes?.quando_usar    ?? '',
      quando_pausar:  raw.recomendacoes?.quando_pausar  ?? '',
      quando_escalar: raw.recomendacoes?.quando_escalar ?? '',
    },
  }
  const isImageCreative = ['imagem', 'carrossel'].includes(creative.creative_type)

  function update(patch: Partial<AICreative>) {
    const updated: AICreative = { ...creative!, ...patch, updated_at: now() }
    tosDb.aiCreatives.save(updated)
    setCreative(updated)
  }

  function updateStatus(status: AICreativeStatus) {
    const entry = {
      date: now(),
      type: 'status' as const,
      description: `Status alterado para: ${status}`,
    }
    update({ status, history: [...(creative!.history ?? []), entry] })
  }

  function saveMetrics() {
    const { ctr, cpc, cpa, roas } = metricsForm
    const entry = {
      date: now(),
      type: 'metrics' as const,
      description: `Métricas atualizadas — CTR: ${ctr.toFixed(2)}% | CPC: ${cpc.toFixed(2)} | CPA: ${cpa.toFixed(2)} | ROAS: ${roas.toFixed(2)}x`,
    }
    update({ ctr, cpc, cpa, roas, history: [...(creative!.history ?? []), entry] })
    // Auto-suggest status
    if (roas >= 3 && ctr >= 2) setSuggestedStatus('escalar')
    else if (roas >= 2) setSuggestedStatus('vencedor')
    else if (roas < 0.5 && ctr >= 1) setSuggestedStatus('reciclar')
    else if (roas < 0.5) setSuggestedStatus('perdedor')
    setEditingMetrics(false)
  }

  function openMetrics() {
    setMetricsForm({ ctr: creative!.ctr, cpc: creative!.cpc, cpa: creative!.cpa, roas: creative!.roas })
    setEditingMetrics(true)
  }

  function saveLearning() {
    update({ learning: learningForm })
    setEditingLearning(false)
  }

  function openLearning() {
    setLearningForm({
      hook_type: creative!.learning?.hook_type ?? '',
      promise_type: creative!.learning?.promise_type ?? '',
      dominant_emotion: creative!.learning?.dominant_emotion ?? '',
      proof_type: creative!.learning?.proof_type ?? '',
    })
    setEditingLearning(true)
  }

  function handleDuplicate() {
    const copy: AICreative = {
      ...creative!,
      id: generateId(),
      status: 'novo',
      ctr: 0, cpc: 0, cpa: 0, roas: 0,
      created_at: now(),
      updated_at: now(),
      strategy: { ...creative!.strategy, nome: `${creative!.strategy.nome} (cópia)` },
    }
    tosDb.aiCreatives.save(copy)
    navigate(`/criativos/${copy.id}`)
  }

  function handleDelete() {
    if (confirm('Excluir este criativo permanentemente?')) {
      tosDb.aiCreatives.delete(creative!.id)
      navigate('/criativos')
    }
  }

  function assignCampaign(campId: string) {
    update({ campaign_id: campId })
    setAssignCampaignOpen(false)
  }

  function briefingToText(): string {
    const lines = [
      `CRIATIVO: ${s.nome}`,
      `Produto: ${product?.name ?? '—'}`,
      `Canal: ${CREATIVE_CHANNEL_LABELS[creative!.channel] ?? creative!.channel}`,
      `Tipo: ${CREATIVE_TYPE_LABELS[creative!.creative_type] ?? creative!.creative_type}`,
      `Objetivo: ${CREATIVE_OBJECTIVE_LABELS[creative!.objective] ?? creative!.objective}`,
      `Ângulo: ${creative!.angle || '—'}`,
      ``,
      `1. IDEIA CENTRAL`,
      s.ideia_central,
      ``,
      `2. HOOKS`,
      ...s.hooks.map(h => `${h.tipo}: ${h.texto}`),
      ``,
      isImageCreative
        ? `3. ESTRUTURA NARRATIVA`
        : `3. ROTEIRO COMPLETO (${s.roteiro.duracao})`,
      isImageCreative ? `Headline: ${s.roteiro.hook}` : `Hook: ${s.roteiro.hook}`,
      isImageCreative ? `Contexto: ${s.roteiro.problema}` : `Problema: ${s.roteiro.problema}`,
      isImageCreative ? `Urgência: ${s.roteiro.agitacao}` : `Agitação: ${s.roteiro.agitacao}`,
      isImageCreative ? `Benefício: ${s.roteiro.solucao}` : `Solução: ${s.roteiro.solucao}`,
      `CTA: ${s.roteiro.cta}`,
      ``,
      ...(isImageCreative && s.imagem_tipo ? [
        `CRIATIVO DE IMAGEM`,
        `Tipo: ${s.imagem_tipo}`,
        ``,
        s.imagem_layout ? [
          `LAYOUT DA IMAGEM`,
          `Título: ${s.imagem_layout.posicao_titulo}`,
          `Subtítulo: ${s.imagem_layout.posicao_subtitulo}`,
          `Imagem: ${s.imagem_layout.posicao_imagem}`,
          `CTA: ${s.imagem_layout.posicao_cta}`,
          `Hierarquia: ${s.imagem_layout.hierarquia_visual}`,
          `Dimensões: ${s.imagem_layout.dimensoes}`,
          s.imagem_layout.notas_layout ?? '',
          ``,
        ].filter(Boolean) : [],
        s.imagem_texto ? [
          `TEXTO DA IMAGEM`,
          `Headline: ${s.imagem_texto.headline}`,
          `Subheadline: ${s.imagem_texto.subheadline}`,
          `CTA: ${s.imagem_texto.cta}`,
          ``,
        ] : [],
        s.imagem_variacoes?.length ? [
          `VARIAÇÕES (3 VERSÕES)`,
          ...s.imagem_variacoes.map(v => `${v.nome}\nHeadline: ${v.headline}\nÂngulo: ${v.angulo}\nEmoção: ${v.emocao}`),
          ``,
        ] : [],
        s.imagem_estilo ? [
          `ESTILO VISUAL`,
          `Fundo: ${s.imagem_estilo.fundo}`,
          `Estilo: ${s.imagem_estilo.estilo}`,
          `Fonte: ${s.imagem_estilo.fonte}`,
          `Contraste: ${s.imagem_estilo.contraste}`,
          `Elementos: ${s.imagem_estilo.elementos_visuais}`,
          ``,
        ] : [],
        s.imagem_referencia ? [
          `REFERÊNCIA / CANVA`,
          s.imagem_referencia.descricao,
          `Instruções Canva: ${s.imagem_referencia.instrucoes_canva}`,
          `Cores: ${s.imagem_referencia.cores_hex?.join(', ') ?? ''}`,
          `Exemplos: ${s.imagem_referencia.exemplos_visuais}`,
          ``,
        ] : [],
      ].flat() : []),
      `4. VARIAÇÕES DE ROTEIRO`,
      ...s.variacoes_roteiro.map(v => `${v.nome}:\n${v.roteiro}`),
      ``,
      `5. TEXTO DO ANÚNCIO`,
      `Textos principais:`,
      ...s.texto_anuncio.textos_principais.map((t, i) => `${i + 1}. ${t}`),
      `Headlines:`,
      ...s.texto_anuncio.headlines.map((h, i) => `${i + 1}. ${h}`),
      `Descrições:`,
      ...s.texto_anuncio.descricoes.map((d, i) => `${i + 1}. ${d}`),
      `CTAs:`,
      ...s.texto_anuncio.ctas.map((c, i) => `${i + 1}. ${c}`),
      ``,
      `6. DIREÇÃO CRIATIVA`,
      `Como gravar: ${s.direcao_criativa.como_gravar}`,
      `Cenário: ${s.direcao_criativa.cenario}`,
      `Pessoa: ${s.direcao_criativa.tipo_pessoa}`,
      `Estilo: ${s.direcao_criativa.estilo}`,
      `Tom de voz: ${s.direcao_criativa.tom_voz}`,
      `Edição: ${s.direcao_criativa.edicao}`,
      ``,
      ...(s.direcao_gravacao ? [
        `DIREÇÃO DE GRAVAÇÃO`,
        `Quem: ${s.direcao_gravacao.quem}`,
        `Onde: ${s.direcao_gravacao.onde}`,
        `Tom: ${s.direcao_gravacao.tom_voz}`,
        `Expressão: ${s.direcao_gravacao.expressao}`,
        s.direcao_gravacao.equipamento ? `Equipamento: ${s.direcao_gravacao.equipamento}` : '',
        s.direcao_gravacao.observacoes ? `Obs: ${s.direcao_gravacao.observacoes}` : '',
        ``,
      ].filter(Boolean) : []),
      ...(s.direcao_edicao ? [
        `DIREÇÃO DE EDIÇÃO`,
        `Cortes: ${s.direcao_edicao.cortes}`,
        `Legendas: ${s.direcao_edicao.legendas}`,
        `Zoom: ${s.direcao_edicao.zoom}`,
        `Música: ${s.direcao_edicao.musica}`,
        `Ritmo: ${s.direcao_edicao.ritmo}`,
        s.direcao_edicao.transicoes ? `Transições: ${s.direcao_edicao.transicoes}` : '',
        ``,
      ].filter(Boolean) : []),
      ...(s.cenas?.length ? [
        `CENAS — CENA A CENA`,
        ...s.cenas.map(c => `Cena ${c.numero} (${c.duracao}): ${c.texto_falado}`),
        ``,
      ] : []),
      `7. REFERÊNCIA VISUAL`,
      s.referencia_visual,
      ``,
      `8. VARIAÇÕES DE TESTE`,
      ...s.variacoes_teste.map(v => `${v.tipo}: ${v.descricao}`),
      ``,
      `9. HIPÓTESE`,
      s.hipotese,
      ``,
      `10. MÉTRICAS ESPERADAS`,
      `CTR: ${s.metricas_esperadas.ctr_esperado}`,
      `CPC: ${s.metricas_esperadas.cpc_esperado}`,
      `CPA: ${s.metricas_esperadas.cpa_esperado}`,
      ``,
      `11. RECOMENDAÇÕES`,
      `Quando usar: ${s.recomendacoes.quando_usar}`,
      `Quando pausar: ${s.recomendacoes.quando_pausar}`,
      `Quando escalar: ${s.recomendacoes.quando_escalar}`,
      ``,
      `Gerado em: ${formatDateTime(creative!.created_at)}`,
    ]
    return lines.join('\n')
  }

  function exportTxt() {
    const blob = new Blob([briefingToText()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `criativo-${s.nome.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasMetrics = creative.ctr > 0 || creative.cpc > 0 || creative.cpa > 0 || creative.roas > 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <button
            onClick={() => navigate('/criativos')}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-2 flex items-center gap-1"
          >
            ← Criativos
          </button>
          <h1 className="text-2xl font-bold text-white leading-tight">{s.nome}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(creative.status)}`}>
              {AI_CREATIVE_STATUS_LABELS[creative.status]}
            </span>
            <Tag label={CREATIVE_CHANNEL_LABELS[creative.channel] ?? creative.channel} color="violet" />
            <Tag label={CREATIVE_TYPE_LABELS[creative.creative_type] ?? creative.creative_type} />
            <Tag label={CREATIVE_OBJECTIVE_LABELS[creative.objective] ?? creative.objective} color="amber" />
            {creative.angle && <Tag label={creative.angle} color="gray" />}
            {product && (
              <button
                onClick={() => navigate(`/produtos/${product.id}`)}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                📦 {product.name}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <button onClick={exportTxt} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors">↓ .txt</button>
          <button onClick={handleDuplicate} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors">⧉ Duplicar</button>
          <button onClick={handleDelete} className="text-xs px-3 py-2 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-400 rounded-lg transition-colors">Excluir</button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <span className="text-xs text-gray-500 self-center mr-1 font-medium">Ações:</span>

        {creative.status !== 'vencedor' && (
          <button onClick={() => updateStatus('vencedor')}
            className="text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 rounded-lg font-medium transition-colors">
            ⭐ Vencedor
          </button>
        )}
        {creative.status !== 'perdedor' && (
          <button onClick={() => updateStatus('perdedor')}
            className="text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 rounded-lg font-medium transition-colors">
            ✕ Perdedor
          </button>
        )}
        {creative.status !== 'escalar' && (
          <button onClick={() => updateStatus('escalar')}
            className="text-xs px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/30 rounded-lg font-medium transition-colors">
            🚀 Escalar
          </button>
        )}
        {creative.status !== 'em_teste' && (
          <button onClick={() => updateStatus('em_teste')}
            className="text-xs px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 rounded-lg font-medium transition-colors">
            🧪 Em Teste
          </button>
        )}
        {creative.status !== 'reciclar' && (
          <button onClick={() => updateStatus('reciclar')}
            className="text-xs px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-600/30 rounded-lg font-medium transition-colors">
            ♻ Reciclar
          </button>
        )}
        {creative.status !== 'pausado' && (
          <button onClick={() => updateStatus('pausado')}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors">
            ⏸ Pausar
          </button>
        )}

        <button
          onClick={() => navigate(`/criativos/novo?produto=${creative.product_id}&campanha=${creative.campaign_id}&base=${creative.id}`)}
          className="text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-600/30 rounded-lg font-medium transition-colors"
        >
          ⟳ Gerar Variação
        </button>

        <button
          onClick={() => setAssignCampaignOpen(v => !v)}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-600/30 rounded-lg font-medium transition-colors"
        >
          📢 {campaign ? 'Trocar Campanha' : 'Enviar para Campanha'}
        </button>

        <button
          onClick={openMetrics}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
        >
          📊 Inserir Métricas
        </button>

        <button
          onClick={() => navigate(`/metricas?produto=${creative.product_id}`)}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
        >
          + Métricas Detalhadas
        </button>
      </div>

      {/* Assign campaign dropdown */}
      {assignCampaignOpen && (
        <div className="mb-5 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Selecionar Campanha</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <button
              onClick={() => assignCampaign('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !creative.campaign_id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              — Sem campanha
            </button>
            {allCampaigns.map(c => (
              <button
                key={c.id}
                onClick={() => assignCampaign(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  creative.campaign_id === c.id ? 'bg-violet-600/20 text-violet-300' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {c.strategy.nome_estrategico}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metrics bar */}
      {editingMetrics ? (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 mb-4 uppercase tracking-wide">Inserir Métricas Reais</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {(
              [
                { key: 'ctr', label: 'CTR (%)', step: '0.01' },
                { key: 'cpc', label: 'CPC', step: '0.01' },
                { key: 'cpa', label: 'CPA', step: '0.01' },
                { key: 'roas', label: 'ROAS', step: '0.01' },
              ] as const
            ).map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step={f.step}
                  value={metricsForm[f.key] || ''}
                  onChange={e => setMetricsForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setEditingMetrics(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={saveMetrics}
              className="px-5 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
              Salvar Métricas
            </button>
          </div>
        </div>
      ) : hasMetrics ? (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Métricas Reais</p>
            <button onClick={openMetrics} className="text-xs text-violet-400 hover:text-violet-300">Editar</button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'CTR', value: creative.ctr > 0 ? `${creative.ctr.toFixed(2)}%` : '—' },
              { label: 'CPC', value: creative.cpc > 0 ? formatCurrency(creative.cpc) : '—' },
              { label: 'CPA', value: creative.cpa > 0 ? formatCurrency(creative.cpa) : '—' },
              { label: 'ROAS', value: creative.roas > 0 ? `${creative.roas.toFixed(2)}x` : '—' },
            ].map(m => (
              <div key={m.label}>
                <div className="text-xs text-gray-500 mb-0.5">{m.label}</div>
                <div className={`font-semibold text-sm ${m.value === '—' ? 'text-gray-600' : 'text-white'}`}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Auto-suggest status banner */}
      {suggestedStatus && (
        <div className="mb-5 flex items-center justify-between gap-4 p-4 bg-violet-900/20 border border-violet-700/40 rounded-xl">
          <div>
            <span className="text-xs font-medium text-violet-300">Sugestão de IA: </span>
            <span className="text-xs text-gray-300">
              Com base nas métricas, este criativo deve ser marcado como{' '}
              <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${getStatusColor(suggestedStatus)}`}>
                {AI_CREATIVE_STATUS_LABELS[suggestedStatus]}
              </span>
            </span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => { updateStatus(suggestedStatus); setSuggestedStatus(null) }}
              className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
            >
              Aplicar
            </button>
            <button
              onClick={() => setSuggestedStatus(null)}
              className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* Campaign link */}
      {campaign && (
        <div className="mb-6 flex items-center gap-3 p-3 bg-violet-900/10 border border-violet-800/30 rounded-xl">
          <span className="text-violet-400">📢</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 mb-0.5">Campanha vinculada</div>
            <button
              onClick={() => navigate(`/campanhas/${campaign.id}`)}
              className="text-sm text-violet-300 hover:text-violet-200 font-medium truncate"
            >
              {campaign.strategy.nome_estrategico}
            </button>
          </div>
        </div>
      )}

      {/* ─── AI Briefing Sections ─────────────────────────────────── */}
      <h2 className="text-lg font-bold text-white mb-4">Briefing Criativo</h2>
      <div className="space-y-4">

        {/* 1. Ideia Central */}
        <SectionCard number={1} title="Ideia Central" icon="💡" copyContent={s.ideia_central}>
          <p className="text-sm text-gray-200 leading-relaxed font-medium">{s.ideia_central}</p>
        </SectionCard>

        {/* 2. Hooks */}
        <SectionCard number={2} title="Hooks (Primeiros 3 Segundos)" icon="⚡"
          copyContent={s.hooks.map(h => `${h.tipo}: ${h.texto}`).join('\n\n')}>
          <div className="space-y-3">
            {s.hooks.map((h, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-4 group flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Tag label={h.tipo} color="violet" />
                  <p className="text-sm text-gray-200 leading-relaxed mt-2 font-medium">{h.texto}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <CopyButton text={h.texto} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 3. Roteiro / Estrutura Narrativa */}
        <SectionCard
          number={3}
          title={isImageCreative ? `Estrutura Narrativa da Imagem` : `Roteiro Completo — ${s.roteiro.duracao}`}
          icon={isImageCreative ? '📐' : '🎬'}
          copyContent={isImageCreative
            ? `Headline: ${s.roteiro.hook}\n\nContexto: ${s.roteiro.problema}\n\nUrgência: ${s.roteiro.agitacao}\n\nBenefício: ${s.roteiro.solucao}\n\nCTA: ${s.roteiro.cta}`
            : `Hook: ${s.roteiro.hook}\n\nProblema: ${s.roteiro.problema}\n\nAgitação: ${s.roteiro.agitacao}\n\nSolução: ${s.roteiro.solucao}\n\nCTA: ${s.roteiro.cta}`
          }
        >
          <div className="space-y-3">
            {(isImageCreative ? [
              { label: 'Headline', value: s.roteiro.hook, color: 'border-l-violet-500' },
              { label: 'Contexto / Dor', value: s.roteiro.problema, color: 'border-l-amber-500' },
              { label: 'Urgência', value: s.roteiro.agitacao, color: 'border-l-red-500' },
              { label: 'Benefício', value: s.roteiro.solucao, color: 'border-l-emerald-500' },
              { label: 'CTA Visual', value: s.roteiro.cta, color: 'border-l-blue-500' },
            ] : [
              { label: 'Hook (0-3s)', value: s.roteiro.hook, color: 'border-l-violet-500' },
              { label: 'Problema (3-8s)', value: s.roteiro.problema, color: 'border-l-amber-500' },
              { label: 'Agitação (8-15s)', value: s.roteiro.agitacao, color: 'border-l-red-500' },
              { label: 'Solução (15-22s)', value: s.roteiro.solucao, color: 'border-l-emerald-500' },
              { label: 'CTA (22-30s)', value: s.roteiro.cta, color: 'border-l-blue-500' },
            ]).map(item => (
              <div key={item.label} className={`pl-4 border-l-2 ${item.color} group flex items-start justify-between gap-3`}>
                <div>
                  <div className="text-xs text-gray-500 mb-1 font-medium">{item.label}</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <CopyButton text={item.value} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* IMAGE SECTIONS */}
        {isImageCreative && s.imagem_tipo && (
          <SectionCard number={4} title="Tipo / Ideia do Criativo" icon="🖼️" copyContent={s.imagem_tipo}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {s.imagem_tipo === 'print_alerta' ? '🚨' :
                 s.imagem_tipo === 'antes_depois' ? '🔄' :
                 s.imagem_tipo === 'prova_social' ? '⭐' :
                 s.imagem_tipo === 'erro_comum' ? '❌' :
                 s.imagem_tipo === 'comparacao' ? '⚖️' : '🖼️'}
              </span>
              <div>
                <div className="text-white font-semibold capitalize">
                  {s.imagem_tipo.replace(/_/g, ' ')}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">
                  {s.imagem_tipo === 'print_alerta' && 'Urgência visual com headline de alto impacto'}
                  {s.imagem_tipo === 'antes_depois' && 'Mostra transformação antes e depois do produto'}
                  {s.imagem_tipo === 'prova_social' && 'Depoimento, resultado ou número de clientes'}
                  {s.imagem_tipo === 'erro_comum' && 'Alerta sobre erro que o público comete'}
                  {s.imagem_tipo === 'comparacao' && 'Compara a solução com alternativas do mercado'}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {isImageCreative && s.imagem_layout && (
          <SectionCard number={5} title="Layout da Imagem" icon="📐"
            copyContent={[
              `Título: ${s.imagem_layout.posicao_titulo}`,
              `Subtítulo: ${s.imagem_layout.posicao_subtitulo}`,
              `Imagem: ${s.imagem_layout.posicao_imagem}`,
              `CTA: ${s.imagem_layout.posicao_cta}`,
              `Hierarquia: ${s.imagem_layout.hierarquia_visual}`,
              `Dimensões: ${s.imagem_layout.dimensoes}`,
              s.imagem_layout.notas_layout ?? '',
            ].filter(Boolean).join('\n')}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: '📝 Posição do Título', value: s.imagem_layout.posicao_titulo },
                  { label: '📄 Posição do Subtítulo', value: s.imagem_layout.posicao_subtitulo },
                  { label: '🖼 Posição da Imagem', value: s.imagem_layout.posicao_imagem },
                  { label: '🔲 Posição do CTA', value: s.imagem_layout.posicao_cta },
                  { label: '📏 Dimensões', value: s.imagem_layout.dimensoes },
                ].map(item => (
                  <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-violet-900/20 border border-violet-800/30 rounded-lg p-3">
                <div className="text-xs text-violet-400 mb-1 font-medium">👁 Hierarquia Visual</div>
                <p className="text-sm text-gray-200">{s.imagem_layout.hierarquia_visual}</p>
              </div>
              {s.imagem_layout.notas_layout && (
                <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
                  <div className="text-xs text-amber-400 mb-1">📝 Notas de Layout</div>
                  <p className="text-sm text-gray-200">{s.imagem_layout.notas_layout}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {isImageCreative && s.imagem_texto && (
          <SectionCard number={6} title="Texto da Imagem" icon="✍️"
            copyContent={`Headline: ${s.imagem_texto.headline}\n\nSubheadline: ${s.imagem_texto.subheadline}\n\nCTA: ${s.imagem_texto.cta}`}>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded-xl p-4 group flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1 font-medium">HEADLINE PRINCIPAL</div>
                  <p className="text-xl text-white font-bold leading-tight">{s.imagem_texto.headline}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={s.imagem_texto.headline} />
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 group flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1 font-medium">SUBHEADLINE</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{s.imagem_texto.subheadline}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={s.imagem_texto.subheadline} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg">
                  {s.imagem_texto.cta}
                </div>
                <CopyButton text={s.imagem_texto.cta} />
              </div>
            </div>
          </SectionCard>
        )}

        {isImageCreative && s.imagem_variacoes && s.imagem_variacoes.length > 0 && (
          <SectionCard number={7} title="Variações — 3 Versões" icon="🔀"
            copyContent={s.imagem_variacoes.map(v =>
              `${v.nome}\nHeadline: ${v.headline}\nÂngulo: ${v.angulo}\nEmoção: ${v.emocao}`
            ).join('\n\n')}>
            <div className="space-y-3">
              {s.imagem_variacoes.map((v, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-violet-400">{v.nome}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">{v.emocao}</span>
                  </div>
                  <p className="text-base text-white font-bold mb-2">{v.headline}</p>
                  <p className="text-xs text-gray-400">{v.angulo}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {isImageCreative && s.imagem_estilo && (
          <SectionCard number={8} title="Estilo Visual" icon="🎨"
            copyContent={[
              `Fundo: ${s.imagem_estilo.fundo}`,
              `Estilo: ${s.imagem_estilo.estilo}`,
              `Fonte: ${s.imagem_estilo.fonte}`,
              `Contraste: ${s.imagem_estilo.contraste}`,
              `Elementos: ${s.imagem_estilo.elementos_visuais}`,
            ].join('\n')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '🎨 Fundo', value: s.imagem_estilo.fundo },
                { label: '✨ Estilo', value: s.imagem_estilo.estilo },
                { label: 'Aa Fonte', value: s.imagem_estilo.fonte },
                { label: '◐ Contraste', value: s.imagem_estilo.contraste },
                { label: '🔧 Elementos Visuais', value: s.imagem_estilo.elementos_visuais },
              ].map(item => (
                <div key={item.label} className={`bg-gray-800/50 rounded-lg p-3 ${item.label === '🔧 Elementos Visuais' ? 'sm:col-span-2' : ''}`}>
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {isImageCreative && s.imagem_referencia && (
          <SectionCard number={9} title="Referência Visual / Canva" icon="🖌️"
            copyContent={[
              s.imagem_referencia.descricao,
              `\nInstruções Canva:\n${s.imagem_referencia.instrucoes_canva}`,
              `\nCores: ${s.imagem_referencia.cores_hex?.join(', ') ?? ''}`,
              `\nExemplos: ${s.imagem_referencia.exemplos_visuais}`,
            ].join('\n')}>
            <div className="space-y-4">
              <p className="text-sm text-gray-200 leading-relaxed">{s.imagem_referencia.descricao}</p>
              {s.imagem_referencia.cores_hex && s.imagem_referencia.cores_hex.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Paleta de Cores</div>
                  <div className="flex gap-2 flex-wrap">
                    {s.imagem_referencia.cores_hex.map((hex, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                        <span className="w-4 h-4 rounded-full border border-gray-700 flex-shrink-0" style={{ backgroundColor: hex }} />
                        <span className="text-xs text-gray-300 font-mono">{hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                <div className="text-xs text-blue-400 mb-2 font-medium">📐 Instruções para o Canva/Figma</div>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{s.imagem_referencia.instrucoes_canva}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Exemplos de referência</div>
                <p className="text-sm text-gray-200 leading-relaxed">{s.imagem_referencia.exemplos_visuais}</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* VIDEO SECTIONS */}
        {!isImageCreative && s.cenas && s.cenas.length > 0 && (
          <SectionCard number={4} title="Cenas — Cena a Cena" icon="🎬"
            copyContent={s.cenas.map(c =>
              `Cena ${c.numero} (${c.duracao})\nFala: ${c.texto_falado}\nTela: ${c.texto_tela}\nEnquadramento: ${c.enquadramento}${c.notas ? `\nNotas: ${c.notas}` : ''}`
            ).join('\n\n')}>
            <div className="space-y-3">
              {s.cenas.map((cena) => (
                <div key={cena.numero} className="bg-gray-800/50 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700/50">
                    <span className="text-xs font-bold text-violet-400 bg-violet-900/30 px-2 py-0.5 rounded-full">
                      Cena {cena.numero}
                    </span>
                    <span className="text-xs text-gray-500">{cena.duracao}</span>
                    <span className="text-xs text-gray-600 ml-auto">{cena.enquadramento}</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">🎙 Texto falado</p>
                      <p className="text-sm text-white font-medium leading-relaxed">{cena.texto_falado}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">📺 Texto na tela</p>
                      <p className="text-sm text-gray-200 leading-relaxed">{cena.texto_tela}</p>
                    </div>
                    {cena.notas && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">📝 Notas</p>
                        <p className="text-xs text-amber-300 leading-relaxed">{cena.notas}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* 4/5. Variações de roteiro */}
        <SectionCard number={isImageCreative ? 10 : (s.cenas?.length ? 5 : 4)} title="Variações de Roteiro" icon="🔀"
          copyContent={s.variacoes_roteiro.map(v => `${v.nome}:\n${v.roteiro}`).join('\n\n')}>
          <div className="space-y-4">
            {s.variacoes_roteiro.map((v, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-violet-400">{v.nome}</span>
                  <CopyButton text={v.roteiro} />
                </div>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{v.roteiro}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Texto do anúncio */}
        <SectionCard number={isImageCreative ? 11 : 5} title="Texto do Anúncio" icon="✍️"
          copyContent={[
            'TEXTOS PRINCIPAIS:', ...s.texto_anuncio.textos_principais.map((t, i) => `${i + 1}. ${t}`),
            '\nHEADLINES:', ...s.texto_anuncio.headlines.map((h, i) => `${i + 1}. ${h}`),
            '\nDESCRIÇÕES:', ...s.texto_anuncio.descricoes.map((d, i) => `${i + 1}. ${d}`),
            '\nCTAs:', ...s.texto_anuncio.ctas.map((c, i) => `${i + 1}. ${c}`),
          ].join('\n')}>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Textos Principais</p>
              <div className="space-y-2">
                {s.texto_anuncio.textos_principais.map((t, i) => <CopyItem key={i} text={t} index={i} />)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Headlines</p>
              <div className="space-y-2">
                {s.texto_anuncio.headlines.map((h, i) => <CopyItem key={i} text={h} index={i} />)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Descrições</p>
              <div className="space-y-2">
                {s.texto_anuncio.descricoes.map((d, i) => <CopyItem key={i} text={d} index={i} />)}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">CTAs</p>
              <div className="flex flex-wrap gap-2">
                {s.texto_anuncio.ctas.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-violet-600/10 border border-violet-600/20 rounded-lg px-3 py-1.5">
                    <span className="text-sm text-violet-300 font-medium">{c}</span>
                    <CopyButton text={c} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 6. Direção Criativa / Direção de Design */}
        <SectionCard
          number={isImageCreative ? 12 : 6}
          title={isImageCreative ? 'Direção de Design' : 'Direção Criativa'}
          icon={isImageCreative ? '🖌️' : '🎥'}
          copyContent={[
            `${isImageCreative ? 'Diretrizes' : 'Como gravar'}: ${s.direcao_criativa.como_gravar}`,
            `${isImageCreative ? 'Fundo' : 'Cenário'}: ${s.direcao_criativa.cenario}`,
            `${isImageCreative ? 'Imagem' : 'Tipo de Pessoa'}: ${s.direcao_criativa.tipo_pessoa}`,
            `Estilo: ${s.direcao_criativa.estilo}`,
            `${isImageCreative ? 'Tom' : 'Tom de Voz'}: ${s.direcao_criativa.tom_voz}`,
            `${isImageCreative ? 'Ajustes finais' : 'Edição'}: ${s.direcao_criativa.edicao}`,
          ].join('\n')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(isImageCreative ? [
              { label: 'Diretrizes Visuais', value: s.direcao_criativa.como_gravar },
              { label: 'Background / Fundo', value: s.direcao_criativa.cenario },
              { label: 'Imagem / Foto', value: s.direcao_criativa.tipo_pessoa },
              { label: 'Estilo Visual', value: s.direcao_criativa.estilo },
              { label: 'Tom', value: s.direcao_criativa.tom_voz },
              { label: 'Ajustes Finais', value: s.direcao_criativa.edicao },
            ] : [
              { label: 'Como Gravar', value: s.direcao_criativa.como_gravar },
              { label: 'Cenário', value: s.direcao_criativa.cenario },
              { label: 'Tipo de Pessoa', value: s.direcao_criativa.tipo_pessoa },
              { label: 'Estilo', value: s.direcao_criativa.estilo },
              { label: 'Tom de Voz', value: s.direcao_criativa.tom_voz },
              { label: 'Edição', value: s.direcao_criativa.edicao },
            ]).map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 7. Direção de Gravação (video only) */}
        {!isImageCreative && s.direcao_gravacao && (
          <SectionCard number={7} title="Direção de Gravação" icon="🎥"
            copyContent={[
              `Quem: ${s.direcao_gravacao.quem}`,
              `Onde: ${s.direcao_gravacao.onde}`,
              `Tom de voz: ${s.direcao_gravacao.tom_voz}`,
              `Expressão: ${s.direcao_gravacao.expressao}`,
              s.direcao_gravacao.equipamento ? `Equipamento: ${s.direcao_gravacao.equipamento}` : '',
              s.direcao_gravacao.observacoes ? `Observações: ${s.direcao_gravacao.observacoes}` : '',
            ].filter(Boolean).join('\n')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Quem grava', value: s.direcao_gravacao.quem, icon: '👤' },
                { label: 'Onde gravar', value: s.direcao_gravacao.onde, icon: '📍' },
                { label: 'Tom de voz', value: s.direcao_gravacao.tom_voz, icon: '🎙' },
                { label: 'Expressão', value: s.direcao_gravacao.expressao, icon: '😐' },
                ...(s.direcao_gravacao.equipamento ? [{ label: 'Equipamento', value: s.direcao_gravacao.equipamento, icon: '📷' }] : []),
                ...(s.direcao_gravacao.observacoes ? [{ label: 'Observações', value: s.direcao_gravacao.observacoes, icon: '📝' }] : []),
              ].map(item => (
                <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">{item.icon} {item.label}</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* 8. Direção de Edição (video only) */}
        {!isImageCreative && s.direcao_edicao && (
          <SectionCard number={8} title="Direção de Edição" icon="✂️"
            copyContent={[
              `Cortes: ${s.direcao_edicao.cortes}`,
              `Legendas: ${s.direcao_edicao.legendas}`,
              `Zoom: ${s.direcao_edicao.zoom}`,
              `Música: ${s.direcao_edicao.musica}`,
              `Ritmo: ${s.direcao_edicao.ritmo}`,
              s.direcao_edicao.transicoes ? `Transições: ${s.direcao_edicao.transicoes}` : '',
            ].filter(Boolean).join('\n')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Cortes', value: s.direcao_edicao.cortes, icon: '✂️' },
                { label: 'Legendas', value: s.direcao_edicao.legendas, icon: '💬' },
                { label: 'Zoom', value: s.direcao_edicao.zoom, icon: '🔍' },
                { label: 'Música', value: s.direcao_edicao.musica, icon: '🎵' },
                { label: 'Ritmo', value: s.direcao_edicao.ritmo, icon: '⚡' },
                ...(s.direcao_edicao.transicoes ? [{ label: 'Transições', value: s.direcao_edicao.transicoes, icon: '🔄' }] : []),
              ].map(item => (
                <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">{item.icon} {item.label}</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Referência Visual (video only — images have imagem_referencia) */}
        {!isImageCreative && (
          <SectionCard number={s.direcao_edicao ? 9 : 7} title="Referência Visual" icon="🖼️" copyContent={s.referencia_visual}>
            <p className="text-sm text-gray-200 leading-relaxed">{s.referencia_visual}</p>
          </SectionCard>
        )}

        {/* 8. Variações de Teste */}
        <SectionCard number={8} title="Variações de Teste" icon="🧪"
          copyContent={s.variacoes_teste.map(v => `${v.tipo}: ${v.descricao}`).join('\n\n')}>
          <div className="space-y-3">
            {s.variacoes_teste.map((v, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                <Tag label={v.tipo} color="amber" />
                <p className="text-sm text-gray-200 mt-2 leading-relaxed">{v.descricao}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 9. Hipótese */}
        <SectionCard number={9} title="Hipótese do Criativo" icon="🔬" copyContent={s.hipotese}>
          <div className="bg-violet-600/10 border border-violet-600/20 rounded-xl p-4">
            <p className="text-sm text-violet-200 leading-relaxed font-medium">{s.hipotese}</p>
          </div>
        </SectionCard>

        {/* 10. Métricas Esperadas */}
        <SectionCard number={10} title="Métricas Esperadas" icon="📊"
          copyContent={`CTR: ${s.metricas_esperadas.ctr_esperado}\nCPC: ${s.metricas_esperadas.cpc_esperado}\nCPA: ${s.metricas_esperadas.cpa_esperado}`}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'CTR Esperado', value: s.metricas_esperadas.ctr_esperado },
              { label: 'CPC Esperado', value: s.metricas_esperadas.cpc_esperado },
              { label: 'CPA Esperado', value: s.metricas_esperadas.cpa_esperado },
            ].map(m => (
              <div key={m.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                <div className="text-white font-semibold text-sm">{m.value}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 11. Recomendações */}
        <SectionCard number={11} title="Recomendações" icon="⚖️"
          copyContent={`Quando usar: ${s.recomendacoes.quando_usar}\n\nQuando pausar: ${s.recomendacoes.quando_pausar}\n\nQuando escalar: ${s.recomendacoes.quando_escalar}`}>
          <div className="space-y-0">
            {[
              { label: 'Quando Usar', value: s.recomendacoes.quando_usar, dot: 'bg-blue-500' },
              { label: 'Quando Pausar', value: s.recomendacoes.quando_pausar, dot: 'bg-red-500' },
              { label: 'Quando Escalar', value: s.recomendacoes.quando_escalar, dot: 'bg-emerald-500' },
            ].map(r => (
              <div key={r.label} className="flex gap-4 py-3 border-b border-gray-800/50 last:border-0">
                <div className="flex items-center gap-2 w-28 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.dot}`} />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{r.label}</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{r.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ─── Asset Generation ─────────────────────────────────────────── */}
        {(() => {
          const isVideo    = ['video_curto', 'video_longo', 'ugc'].includes(creative.creative_type)
          const isCarousel = creative.creative_type === 'carrossel'
          const isStory    = creative.creative_type === 'story'

          const typeLabel = isVideo    ? '🎬 Vídeo'
                          : isCarousel ? '🎴 Carrossel'
                          : isStory    ? '📱 Story'
                          : '🖼️ Imagem'
          const btnLabel  = isVideo    ? 'Gerar Frame-Chave com DALL-E 3'
                          : isCarousel ? `Gerar ${Math.min((creative.strategy?.imagem_variacoes ?? []).length || 3, 5)} Slides com DALL-E 3`
                          : 'Gerar Imagem com DALL-E 3'

          const displayAssets = genDone ? genAssets : savedAssets

          return (
            <div className="bg-gray-900 border border-violet-800/40 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-violet-950/20">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-violet-300">✨ Geração de Asset Visual</span>
                  <span className="text-xs bg-violet-900/50 text-violet-300 border border-violet-700/50 px-2 py-0.5 rounded-full">{typeLabel}</span>
                </div>
                {displayAssets.length > 0 && (
                  <button
                    onClick={generateAssets}
                    disabled={genLoading}
                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-40"
                  >
                    🔄 Regenerar
                  </button>
                )}
              </div>

              <div className="p-5">
                {/* Info for videos */}
                {isVideo && displayAssets.length === 0 && (
                  <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                    <p className="text-xs text-amber-300 leading-relaxed">
                      <strong>Para vídeos</strong> — geramos o <strong>frame-chave</strong> (cena de abertura/hook) com DALL-E 3, que você usa como referência visual ou thumbnail.
                      Para o vídeo completo, use o storyboard acima com ferramentas como <strong>Runway, Pika ou CapCut AI</strong>.
                    </p>
                  </div>
                )}

                {/* Generate button */}
                {displayAssets.length === 0 && !genLoading && (
                  <button
                    onClick={generateAssets}
                    className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
                  >
                    <span>🎨</span>
                    <span>{btnLabel}</span>
                  </button>
                )}

                {/* Loading */}
                {genLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-600/30 border-t-violet-500 animate-spin" />
                    <p className="text-gray-400 text-sm">
                      {isCarousel ? 'Gerando slides com DALL-E 3...' : 'Gerando imagem com DALL-E 3...'}
                    </p>
                    <p className="text-gray-600 text-xs">Pode levar 10–30 segundos</p>
                  </div>
                )}

                {/* Error */}
                {genError && (
                  <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-xl">
                    <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wide">Erro ao gerar imagem</p>
                    <p className="text-red-300 text-sm mb-3 font-mono break-all">{genError}</p>
                    <p className="text-gray-500 text-xs mb-3">
                      Se o erro mencionar "API key" ou "401", verifique se <code className="bg-gray-800 px-1 rounded">OPENAI_API_KEY</code> está configurada no Vercel (Environment Variables → Preview + Production).
                    </p>
                    <button onClick={generateAssets} className="text-xs text-red-400 hover:text-red-300 underline">
                      Tentar novamente
                    </button>
                  </div>
                )}

                {/* Generated assets */}
                {displayAssets.length > 0 && (
                  <div className="space-y-4">
                    <div className={`grid gap-4 ${displayAssets.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
                      {displayAssets.map((asset, i) => (
                        <div key={i} className="space-y-2">
                          <div className="text-xs text-gray-400 font-medium">{asset.label}</div>
                          <div className="relative group">
                            <img
                              src={asset.url}
                              alt={asset.label}
                              className="w-full rounded-xl border border-gray-700 object-cover"
                              style={{ aspectRatio: isStory ? '9/16' : isVideo ? '16/9' : '1/1', maxHeight: isStory ? '480px' : '320px' }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                              <a
                                href={asset.url}
                                download={`${creative.strategy?.nome ?? 'criativo'}-${asset.label.toLowerCase().replace(/\s+/g, '-')}.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                ↓ Download
                              </a>
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                ↗ Abrir
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Warning about URL expiry */}
                    <div className="flex items-start gap-2 p-3 bg-amber-900/15 border border-amber-700/20 rounded-lg">
                      <span className="text-amber-400 flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-300/80">
                        URLs de imagem expiram em ~1 hora (limite OpenAI). Faça o download agora.
                        {isVideo && ' Para gerar o vídeo completo, use o prompt do frame-chave no Runway, Pika ou CapCut AI.'}
                      </p>
                    </div>

                    {/* Video tools CTA */}
                    {isVideo && (
                      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                        <div className="text-xs font-semibold text-gray-300 mb-2">🎬 Gerar o vídeo completo:</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'Runway Gen-3', url: 'https://runwayml.com' },
                            { name: 'Pika Labs',    url: 'https://pika.art' },
                            { name: 'Kling AI',     url: 'https://klingai.com' },
                            { name: 'CapCut AI',    url: 'https://capcut.com' },
                          ].map(tool => (
                            <a
                              key={tool.name}
                              href={tool.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                            >
                              {tool.name} ↗
                            </a>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Use o frame gerado como imagem de referência e o storyboard acima como roteiro.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* 12. Aprendizados */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center">12</span>
              <span className="mr-1">🧠</span>
              <span className="text-sm font-semibold text-white">Aprendizados</span>
            </div>
            {!editingLearning && (
              <button onClick={openLearning} className="text-xs text-violet-400 hover:text-violet-300">Editar</button>
            )}
          </div>
          <div className="p-5">
            {editingLearning ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(
                    [
                      { key: 'hook_type' as const, label: 'Tipo de Hook' },
                      { key: 'promise_type' as const, label: 'Tipo de Promessa' },
                      { key: 'dominant_emotion' as const, label: 'Emoção Dominante' },
                      { key: 'proof_type' as const, label: 'Tipo de Prova' },
                    ]
                  ).map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                      <input
                        type="text"
                        value={learningForm[f.key]}
                        onChange={e => setLearningForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setEditingLearning(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button onClick={saveLearning}
                    className="px-5 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tipo de Hook', value: creative.learning?.hook_type },
                  { label: 'Tipo de Promessa', value: creative.learning?.promise_type },
                  { label: 'Emoção Dominante', value: creative.learning?.dominant_emotion },
                  { label: 'Tipo de Prova', value: creative.learning?.proof_type },
                ].map(item => (
                  <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <p className="text-sm text-gray-200">{item.value || <span className="text-gray-600 italic">Não preenchido</span>}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 13. Histórico */}
        {(creative.history ?? []).length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800">
              <span className="text-xs font-bold text-gray-500 bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center">13</span>
              <span className="mr-1">📋</span>
              <span className="text-sm font-semibold text-white">Histórico</span>
            </div>
            <div className="p-5 space-y-2">
              {[...(creative.history ?? [])].reverse().map((entry, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    entry.type === 'status' ? 'bg-violet-400' :
                    entry.type === 'metrics' ? 'bg-emerald-400' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-200">{entry.description}</span>
                  </div>
                  <span className="text-gray-600 flex-shrink-0">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-600 text-center">
        Gerado em {formatDateTime(creative.created_at)}
        {creative.updated_at !== creative.created_at && ` · Atualizado em ${formatDateTime(creative.updated_at)}`}
      </div>
    </div>
  )
}
