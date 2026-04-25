import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import { OBJECTIVE_LABELS, CHANNEL_LABELS, PHASE_LABELS, formatCurrency } from '../utils/helpers'
import type {
  CampaignObjectiveType,
  CampaignChannelType,
  CampaignPhaseType,
  CampaignStrategy,
  AICampaign,
} from '../types'

const OBJECTIVES: CampaignObjectiveType[] = [
  'teste_criativo', 'validacao_oferta', 'captacao_leads', 'vendas_conversao',
  'remarketing', 'escala', 'awareness', 'trafego_pagina',
]
const CHANNELS: CampaignChannelType[] = [
  'meta_ads', 'tiktok_ads', 'google_search', 'google_display',
  'youtube_ads', 'native_ads', 'instagram_organico', 'email_marketing', 'whatsapp_telegram',
]
const PHASES: CampaignPhaseType[] = [
  'teste_inicial', 'pre_validacao', 'validacao', 'pre_escala',
  'escala', 'remarketing', 'recuperacao',
]
const CURRENCIES = ['BRL', 'USD', 'EUR']

const PROGRESS_MSGS = [
  'Analisando dados do produto...',
  'Identificando público-alvo ideal...',
  'Selecionando ângulos de campanha...',
  'Estruturando conjuntos e criativos...',
  'Gerando copies e headlines...',
  'Criando regras de decisão...',
  'Montando plano dos primeiros 3 dias...',
  'Finalizando estratégia completa...',
]

const OBJECTIVE_ICONS: Record<CampaignObjectiveType, string> = {
  teste_criativo: '🧪',
  validacao_oferta: '✅',
  captacao_leads: '🎯',
  vendas_conversao: '💰',
  remarketing: '🔄',
  escala: '🚀',
  awareness: '👁️',
  trafego_pagina: '🌐',
}

const CHANNEL_ICONS: Record<CampaignChannelType, string> = {
  meta_ads: '📘',
  tiktok_ads: '🎵',
  google_search: '🔍',
  google_display: '🖥️',
  youtube_ads: '▶️',
  native_ads: '📰',
  instagram_organico: '📸',
  email_marketing: '📧',
  whatsapp_telegram: '💬',
}

const PHASE_ICONS: Record<CampaignPhaseType, string> = {
  teste_inicial: '🔬',
  pre_validacao: '🔎',
  validacao: '✔️',
  pre_escala: '📈',
  escala: '🚀',
  remarketing: '🔄',
  recuperacao: '🛠️',
}

interface WizardState {
  product_id: string
  objective: CampaignObjectiveType | ''
  channel: CampaignChannelType | ''
  phase: CampaignPhaseType | ''
  daily_budget: number
  test_duration: number
  currency: string
  start_date: string
  notes: string
}

const EMPTY: WizardState = {
  product_id: '',
  objective: '',
  channel: '',
  phase: '',
  daily_budget: 50,
  test_duration: 7,
  currency: 'BRL',
  start_date: '',
  notes: '',
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
      <span className="ml-2 text-sm text-gray-400">
        Etapa {current} de {total}
      </span>
    </div>
  )
}

function OptionCard({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  label: string
}) {
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

export default function NovaCampanha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preProduct = searchParams.get('produto') ?? ''

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>({ ...EMPTY, product_id: preProduct })

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const products = tosDb.products.getAll()
  const selectedProduct = products.find(p => p.id === form.product_id)

  const totalBudget = form.daily_budget * form.test_duration

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceed(): boolean {
    if (step === 1) return !!form.product_id
    if (step === 2) return !!form.objective
    if (step === 3) return !!form.channel
    if (step === 4) return !!form.phase
    if (step === 5) return form.daily_budget > 0 && form.test_duration > 0
    return true
  }

  function buildCampaignPrompt(): string {
    const product = selectedProduct
    if (!product) return ''

    const diagnosis = tosDb.aiDiagnoses.getLatestByProduct(product.id)
    const lines: string[] = [
      `=== DADOS DO PRODUTO ===`,
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
      `Objeções principais: ${product.main_objections}`,
      `Concorrentes: ${product.competitors}`,
      product.sales_page_url ? `Página de vendas: ${product.sales_page_url}` : '',
      ``,
      `=== CONFIGURAÇÕES DA CAMPANHA ===`,
      `Objetivo: ${OBJECTIVE_LABELS[form.objective as CampaignObjectiveType] ?? form.objective}`,
      `Canal: ${CHANNEL_LABELS[form.channel as CampaignChannelType] ?? form.channel}`,
      `Fase: ${PHASE_LABELS[form.phase as CampaignPhaseType] ?? form.phase}`,
      `Orçamento diário: ${formatCurrency(form.daily_budget, form.currency)}`,
      `Duração do teste: ${form.test_duration} dias`,
      `Orçamento total estimado: ${formatCurrency(totalBudget, form.currency)}`,
      form.notes ? `Observações do usuário: ${form.notes}` : '',
    ].filter(Boolean)

    if (diagnosis) {
      const a = diagnosis.analysis
      lines.push(``)
      lines.push(`=== DIAGNÓSTICO DE OFERTA (IA) ===`)
      lines.push(`Nota geral: ${a.nota_geral.score}/10`)
      lines.push(`Big Idea: ${a.big_idea}`)
      lines.push(`Promessa ajustada: ${a.promessa_ajustada}`)
      lines.push(`Mecanismo único: ${a.mecanismo_unico}`)
      lines.push(`Ângulo principal sugerido: ${a.angulos[0]?.tipo ?? ''} — ${a.angulos[0]?.titulo ?? ''}`)
      lines.push(`Canal recomendado pelo diagnóstico: ${a.canais[0]?.canal ?? ''} (prioridade: ${a.canais[0]?.prioridade ?? ''})`)
      lines.push(`Resumo executivo: ${a.resumo_executivo.proximo_passo}`)
    }

    return lines.join('\n')
  }

  async function generateStrategy() {
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
      const resp = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignData: buildCampaignPrompt() }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error ?? `HTTP ${resp.status}`)
      }

      const data = await resp.json() as { strategy: CampaignStrategy }
      setStrategy(data.strategy)
      setProgress(100)
      setProgressMsg('Estratégia gerada com sucesso!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar campanha')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
    }
  }

  function handleSave() {
    if (!strategy || !form.product_id) return

    const campaign: AICampaign = {
      id: generateId(),
      product_id: form.product_id,
      objective: form.objective as CampaignObjectiveType,
      channel: form.channel as CampaignChannelType,
      phase: form.phase as CampaignPhaseType,
      daily_budget: form.daily_budget,
      test_duration: form.test_duration,
      total_budget_estimate: totalBudget,
      currency: form.currency,
      start_date: form.start_date,
      strategy,
      status: 'rascunho',
      main_result: '',
      notes: form.notes,
      created_at: now(),
      updated_at: now(),
    }
    tosDb.aiCampaigns.save(campaign)
    navigate(`/campanhas/${campaign.id}`)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/campanhas')}
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Gerar Campanha com IA</h1>
          <p className="text-gray-400 text-sm mt-0.5">Estrutura estratégica completa em etapas</p>
        </div>
      </div>

      <StepIndicator current={step} total={6} />

      {/* ── STEP 1: Product ─────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Selecione o Produto</h2>
          <p className="text-gray-400 text-sm mb-5">Escolha o produto para o qual a campanha será gerada.</p>

          {products.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-3">Nenhum produto cadastrado.</p>
              <button
                onClick={() => navigate('/produtos/novo')}
                className="text-violet-400 hover:text-violet-300 text-sm"
              >
                Cadastrar Produto →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => set('product_id', p.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    form.product_id === p.id
                      ? 'border-violet-500 bg-violet-600/10'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold text-lg flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{p.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5 truncate">
                      {p.niche} · {p.category} · {formatCurrency(p.price, p.currency)}
                    </div>
                  </div>
                  {form.product_id === p.id && (
                    <span className="text-violet-400 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Objective ───────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Objetivo da Campanha</h2>
          <p className="text-gray-400 text-sm mb-5">Qual é o objetivo principal desta campanha?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {OBJECTIVES.map(obj => (
              <OptionCard
                key={obj}
                selected={form.objective === obj}
                onClick={() => set('objective', obj)}
                icon={OBJECTIVE_ICONS[obj]}
                label={OBJECTIVE_LABELS[obj]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Channel ─────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Canal de Veiculação</h2>
          <p className="text-gray-400 text-sm mb-5">Onde esta campanha será veiculada?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CHANNELS.map(ch => (
              <OptionCard
                key={ch}
                selected={form.channel === ch}
                onClick={() => set('channel', ch)}
                icon={CHANNEL_ICONS[ch]}
                label={CHANNEL_LABELS[ch]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 4: Phase ───────────────────────────────────────── */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Fase da Campanha</h2>
          <p className="text-gray-400 text-sm mb-5">Em qual fase do funil de tráfego esta campanha se encontra?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PHASES.map(ph => (
              <OptionCard
                key={ph}
                selected={form.phase === ph}
                onClick={() => set('phase', ph)}
                icon={PHASE_ICONS[ph]}
                label={PHASE_LABELS[ph]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 5: Budget ──────────────────────────────────────── */}
      {step === 5 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Orçamento do Teste</h2>
          <p className="text-gray-400 text-sm mb-5">Defina o orçamento e a duração do teste.</p>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Moeda</label>
                <select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Data de Início</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Orçamento Diário ({form.currency})
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.daily_budget || ''}
                onChange={e => set('daily_budget', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                placeholder="Ex: 50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Duração do Teste (dias)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                step="1"
                value={form.test_duration || ''}
                onChange={e => set('test_duration', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                placeholder="Ex: 7"
              />
            </div>

            {/* Budget summary */}
            {form.daily_budget > 0 && form.test_duration > 0 && (
              <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Orçamento Diário</div>
                  <div className="text-white font-semibold">
                    {formatCurrency(form.daily_budget, form.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Duração</div>
                  <div className="text-white font-semibold">{form.test_duration} dias</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Total Estimado</div>
                  <div className="text-violet-300 font-bold">
                    {formatCurrency(totalBudget, form.currency)}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Observações (opcional)
              </label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="Ex: Foco em público frio, não usar concorrência..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 6: AI Generation ───────────────────────────────── */}
      {step === 6 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Geração Estratégica com IA</h2>
          <p className="text-gray-400 text-sm mb-5">
            A IA irá gerar a estrutura completa da campanha com base no produto e nas configurações selecionadas.
          </p>

          {/* Summary card */}
          {!strategy && !loading && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Produto</div>
                <div className="text-white font-medium truncate">{selectedProduct?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Objetivo</div>
                <div className="text-white">{OBJECTIVE_LABELS[form.objective as CampaignObjectiveType] ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Canal</div>
                <div className="text-white">{CHANNEL_LABELS[form.channel as CampaignChannelType] ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Fase</div>
                <div className="text-white">{PHASE_LABELS[form.phase as CampaignPhaseType] ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Orçamento/dia</div>
                <div className="text-white">{formatCurrency(form.daily_budget, form.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Duração</div>
                <div className="text-white">{form.test_duration} dias</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Total estimado</div>
                <div className="text-violet-300 font-semibold">{formatCurrency(totalBudget, form.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Diagnóstico</div>
                <div className="text-white text-xs">
                  {tosDb.aiDiagnoses.getLatestByProduct(form.product_id) ? '✓ Disponível' : '— Sem diagnóstico'}
                </div>
              </div>
            </div>
          )}

          {/* Loading bar */}
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
                <p className="text-red-300 text-sm font-medium">Erro ao gerar campanha</p>
                <p className="text-red-400/80 text-xs mt-1">{error}</p>
                <button
                  onClick={() => { setError(null); setProgress(0) }}
                  className="text-red-400 hover:text-red-300 text-xs mt-2 underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Generate button */}
          {!strategy && !loading && !error && (
            <button
              onClick={generateStrategy}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3 text-base"
            >
              <span>✦</span>
              Gerar Estrutura da Campanha com IA
            </button>
          )}

          {/* Regenerate button */}
          {!strategy && !loading && error && (
            <button
              onClick={generateStrategy}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              ✦ Tentar Novamente
            </button>
          )}

          {/* Strategy preview after generation */}
          {strategy && (
            <div className="space-y-4">
              {/* Success header */}
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4 flex items-center gap-3">
                <span className="text-emerald-400 text-xl">✓</span>
                <div>
                  <p className="text-emerald-300 font-semibold">{strategy.nome_estrategico}</p>
                  <p className="text-emerald-400/70 text-xs mt-0.5">Estratégia gerada com sucesso</p>
                </div>
              </div>

              {/* Preview sections */}
              <div className="grid grid-cols-1 gap-3">
                <PreviewCard title="Hipótese Principal" icon="💡" content={strategy.hipotese_principal} />
                <PreviewCard
                  title="Ângulo Principal"
                  icon="🎯"
                  content={`${strategy.angulo_principal.tipo}: ${strategy.angulo_principal.descricao}`}
                />
                <PreviewCard
                  title="Estrutura"
                  icon="🏗️"
                  content={`${strategy.estrutura.num_campanhas} campanha(s) · ${strategy.estrutura.num_conjuntos} conjuntos · ${strategy.estrutura.criativos_por_conjunto} criativos/conjunto · ${strategy.criativos_necessarios.quantidade} criativos total`}
                />
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Headlines (preview)</p>
                  <div className="space-y-1.5">
                    {strategy.copies.headlines.slice(0, 3).map((h, i) => (
                      <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
                <PreviewCard title="Próximo Passo" icon="▶️" content={strategy.proximo_passo} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setStrategy(null); setProgress(0) }}
                  className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ↩ Regerar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
                >
                  Salvar Campanha →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
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
