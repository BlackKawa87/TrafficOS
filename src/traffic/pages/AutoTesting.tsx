import { useState, useEffect, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  TEST_VARIATION_TYPE_LABELS,
  TEST_VARIATION_TYPE_ICONS,
  TEST_VARIATION_TYPE_COLORS,
  TEST_VARIATION_STATUS_LABELS,
  TEST_VARIATION_STATUS_COLORS,
  formatCurrency,
  formatNumber,
  formatDateTime,
  CREATIVE_TYPE_LABELS,
  CREATIVE_CHANNEL_LABELS,
} from '../utils/helpers'
import type {
  AutoTestSession,
  TestVariation,
  TestLearning,
  TestVariationType,
  LearningPattern,
} from '../types'

// ─── Simulation engine ────────────────────────────────────────────────────────

const HEALTH_RANGES: Record<TestVariationType, [number, number]> = {
  hook:          [22, 92],
  abordagem:     [32, 85],
  cta:           [42, 90],
  estilo_visual: [28, 85],
}

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() * 2 - 1) * (pct / 100))
}

function randHealth(type: TestVariationType): number {
  const [lo, hi] = HEALTH_RANGES[type]
  return lo + Math.random() * (hi - lo)
}

function makeVariation(
  sessionId: string,
  type: TestVariationType,
  name: string,
  content: string,
  subType?: string,
  emotion?: string,
): TestVariation {
  const health = randHealth(type)
  return {
    id: generateId(),
    session_id: sessionId,
    type,
    name,
    content,
    sub_type: subType,
    emotion,
    status: 'ativo',
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    revenue: 0,
    ctr: 0,
    cpa: 0,
    roas: 0,
    sim_health: health,
    saved_to_bank: false,
    created_at: now(),
    updated_at: now(),
  }
}

function runTestTick(
  session: AutoTestSession,
): { variations: TestVariation[]; newLearnings: TestLearning[] } {
  const newLearnings: TestLearning[] = []

  const variations = session.variations.map((v): TestVariation => {
    if (v.status !== 'ativo') return v

    const hf = v.sim_health / 100
    const baseCtr = hf >= 0.75 ? jitter(2.8, 25) : hf >= 0.50 ? jitter(1.5, 30) : jitter(0.55, 45)
    const deltaImp = Math.floor(jitter(680, 50) * hf + jitter(200, 60))
    const deltaClk = Math.floor(deltaImp * (baseCtr / 100))
    const convRate = hf >= 0.75 ? jitter(4.2, 25) / 100 : hf >= 0.50 ? jitter(2.0, 35) / 100 : jitter(0.6, 55) / 100
    const deltaConv = Math.floor(deltaClk * convRate)
    const spendDelta = parseFloat((deltaClk * jitter(0.55, 25) * hf).toFixed(2))
    const revenueDelta = parseFloat((deltaConv * jitter(88, 22)).toFixed(2))

    const newImp = v.impressions + deltaImp
    const newClk = v.clicks + deltaClk
    const newConv = v.conversions + deltaConv
    const newSpend = parseFloat((v.spend + spendDelta).toFixed(2))
    const newRevenue = parseFloat((v.revenue + revenueDelta).toFixed(2))
    const newCtr = newImp > 0 ? parseFloat(((newClk / newImp) * 100).toFixed(2)) : 0
    const newCpa = newConv > 0 ? parseFloat((newSpend / newConv).toFixed(2)) : 0
    const newRoas = newSpend > 0 ? parseFloat((newRevenue / newSpend).toFixed(2)) : 0

    const updated: TestVariation = {
      ...v,
      impressions: newImp,
      clicks: newClk,
      conversions: newConv,
      spend: newSpend,
      revenue: newRevenue,
      ctr: newCtr,
      cpa: newCpa,
      roas: newRoas,
      updated_at: now(),
    }

    // Decision gate: only after 2400 impressions
    if (newImp < 2400) return updated

    // Perdedor: very low CTR
    if (newCtr < 0.65) {
      return {
        ...updated,
        status: 'perdedor',
        decision_reason: `CTR de ${newCtr.toFixed(2)}% está abaixo do threshold mínimo após ${formatNumber(newImp)} impressões`,
      }
    }

    // Vencedor: excellent CTR + conversions
    if (newCtr >= 2.2 && newConv >= 3) {
      const score = Math.min(Math.round(hf * 95), 98)
      const learning: TestLearning = {
        id: generateId(),
        session_id: session.id,
        variation_id: v.id,
        type: v.type,
        name: v.name,
        content: v.content,
        score,
        why_it_won: buildWinReason(v, newCtr, newCpa, newRoas),
        emotion: v.emotion,
        sub_type: v.sub_type,
        saved_to_bank: false,
        created_at: now(),
      }
      newLearnings.push(learning)
      return {
        ...updated,
        status: 'vencedor',
        decision_reason: `CTR de ${newCtr.toFixed(2)}% com ${newConv} conversões. Score: ${score}/100`,
      }
    }

    // Good but not winner yet: keep monitoring
    return updated
  })

  return { variations, newLearnings }
}

function buildWinReason(v: TestVariation, ctr: number, cpa: number, roas: number): string {
  const parts: string[] = []
  if (v.type === 'hook') {
    parts.push(`Hook do tipo "${v.sub_type ?? 'direto'}" gerou CTR de ${ctr.toFixed(2)}%`)
    if (v.emotion) parts.push(`Emoção primária "${v.emotion}" ressoou com o público`)
  } else if (v.type === 'abordagem') {
    parts.push(`Abordagem "${v.name}" com ${ctr.toFixed(2)}% CTR`)
  } else if (v.type === 'cta') {
    parts.push(`CTA "${v.content}" converteu ${ctr.toFixed(2)}% de cliques`)
  } else {
    parts.push(`Estilo visual "${v.name}" gerou engajamento de ${ctr.toFixed(2)}% CTR`)
  }
  if (roas > 0) parts.push(`ROAS ${roas.toFixed(2)}x`)
  if (cpa > 0) parts.push(`CPA ${formatCurrency(cpa)}`)
  return parts.join(' · ')
}

// ─── API response shapes ───────────────────────────────────────────────────────

interface ApiHook { texto: string; tipo: string; emocao: string; estrategia: string }
interface ApiAbordagem { nome: string; descricao: string; roteiro: string; diferencial: string }
interface ApiCta { texto: string; estilo: string; contexto: string }
interface ApiEstiloVisual { nome: string; descricao: string; cores_predominantes: string; elementos_chave: string; mood: string }
interface ApiResponse {
  hooks: ApiHook[]
  abordagens: ApiAbordagem[]
  ctas: ApiCta[]
  estilos_visuais: ApiEstiloVisual[]
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function VariationCard({
  variation,
  onSaveToBank,
}: {
  variation: TestVariation
  onSaveToBank: (v: TestVariation) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const statusCls = TEST_VARIATION_STATUS_COLORS[variation.status] ?? 'bg-gray-800 text-gray-400'
  const typeCls = TEST_VARIATION_TYPE_COLORS[variation.type] ?? ''
  const isWinner = variation.status === 'vencedor'
  const isLoser = variation.status === 'perdedor'

  return (
    <div className={`rounded-xl border transition-all ${
      isWinner ? 'border-yellow-600/50 bg-yellow-900/5' :
      isLoser ? 'border-red-800/30 bg-red-900/5 opacity-60' :
      'border-gray-800 bg-gray-900'
    }`}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-3">
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${typeCls}`}>
            {TEST_VARIATION_TYPE_ICONS[variation.type]} {variation.name}
          </span>
          {variation.sub_type && (
            <span className="shrink-0 text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
              {variation.sub_type}
            </span>
          )}
          {variation.emotion && (
            <span className="shrink-0 text-[10px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded">
              {variation.emotion}
            </span>
          )}
          <span className={`ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>
            {isWinner && '🏆 '}{TEST_VARIATION_STATUS_LABELS[variation.status]}
          </span>
        </div>

        {/* Content preview */}
        <div
          className={`text-sm text-gray-200 leading-relaxed cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
          onClick={() => setExpanded(p => !p)}
        >
          {variation.content}
        </div>
        {variation.content.length > 100 && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-[10px] text-gray-600 hover:text-gray-400 mt-1"
          >
            {expanded ? '▲ Menos' : '▼ Ver completo'}
          </button>
        )}

        {/* Metrics */}
        {variation.impressions > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-800">
            <div className="text-center">
              <div className="text-[10px] text-gray-500">CTR</div>
              <div className={`text-sm font-bold mt-0.5 ${variation.ctr >= 2.0 ? 'text-emerald-400' : variation.ctr >= 1.0 ? 'text-amber-400' : 'text-red-400'}`}>
                {variation.ctr > 0 ? `${variation.ctr.toFixed(2)}%` : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">CPA</div>
              <div className="text-sm font-bold mt-0.5 text-white">
                {variation.cpa > 0 ? formatCurrency(variation.cpa) : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">ROAS</div>
              <div className={`text-sm font-bold mt-0.5 ${variation.roas >= 2 ? 'text-emerald-400' : 'text-white'}`}>
                {variation.roas > 0 ? `${variation.roas.toFixed(2)}x` : '—'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Conv.</div>
              <div className="text-sm font-bold mt-0.5 text-white">{variation.conversions}</div>
            </div>
          </div>
        )}

        {/* Impression bar */}
        {variation.impressions > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>{formatNumber(variation.impressions)} impressões</span>
              <span>{formatNumber(variation.clicks)} cliques</span>
            </div>
            <ScoreBar value={Math.min(variation.impressions / 2400 * 100, 100)} />
            <div className="text-[10px] text-gray-700 mt-0.5 text-right">
              {variation.impressions < 2400 ? `${Math.round(variation.impressions / 2400 * 100)}% para decisão` : 'Dados suficientes'}
            </div>
          </div>
        )}

        {/* Decision reason */}
        {variation.decision_reason && (
          <div className={`mt-3 text-[10px] px-2.5 py-1.5 rounded-lg ${
            isWinner ? 'bg-yellow-900/20 text-yellow-300' : 'bg-red-900/20 text-red-400'
          }`}>
            {isWinner ? '🏆' : '⛔'} {variation.decision_reason}
          </div>
        )}

        {/* Save to bank */}
        {isWinner && !variation.saved_to_bank && (
          <button
            onClick={() => onSaveToBank(variation)}
            className="mt-3 w-full py-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/40 text-violet-300 rounded-lg transition-colors"
          >
            💾 Salvar no Banco de Aprendizado
          </button>
        )}
        {isWinner && variation.saved_to_bank && (
          <div className="mt-3 w-full py-1.5 text-center text-xs text-emerald-500">
            ✅ Salvo no Banco de Aprendizado
          </div>
        )}
      </div>
    </div>
  )
}

function LearningCard({
  learning,
  onSave,
}: {
  learning: TestLearning
  onSave: (l: TestLearning) => void
}) {
  const typeCls = TEST_VARIATION_TYPE_COLORS[learning.type] ?? ''
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${typeCls}`}>
          {TEST_VARIATION_TYPE_ICONS[learning.type]} {TEST_VARIATION_TYPE_LABELS[learning.type]}
        </span>
        {learning.sub_type && (
          <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{learning.sub_type}</span>
        )}
        {learning.emotion && (
          <span className="text-[10px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded">{learning.emotion}</span>
        )}
        <span className="ml-auto text-[10px] font-bold text-yellow-400">{learning.score}/100</span>
      </div>
      <div className="text-sm text-white font-medium mb-1">{learning.name}</div>
      <div className="text-xs text-gray-400 line-clamp-2 mb-2">{learning.content}</div>
      <ScoreBar value={learning.score} />
      <div className="text-[10px] text-gray-500 mt-2">{learning.why_it_won}</div>
      {!learning.saved_to_bank ? (
        <button
          onClick={() => onSave(learning)}
          className="mt-3 w-full py-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/40 text-violet-300 rounded-lg transition-colors"
        >
          💾 Salvar no Banco de Inteligência
        </button>
      ) : (
        <div className="mt-3 text-center text-[10px] text-emerald-500">✅ Salvo no Banco de Inteligência</div>
      )}
    </div>
  )
}

// ─── Creative picker ───────────────────────────────────────────────────────────

function CreativePicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (id: string) => void
}) {
  const creatives = tosDb.aiCreatives.getAll()
  const products = tosDb.products.getAll()
  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]))

  if (creatives.length === 0) {
    return (
      <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-6 text-center">
        <div className="text-3xl mb-2">🎨</div>
        <div className="text-sm font-medium text-amber-300 mb-1">Nenhum criativo encontrado</div>
        <div className="text-xs text-gray-500">
          Crie criativos na seção <strong>Criativos</strong> para começar a testar.
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {creatives.map(c => {
        const isSelected = c.id === selected
        const hook = c.strategy?.hooks?.[0]?.texto ?? c.strategy?.roteiro?.hook ?? '—'
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg">{CREATIVE_TYPE_LABELS[c.creative_type] ? '🎬' : '🎨'}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{c.strategy?.nome ?? c.id}</div>
                <div className="text-[10px] text-gray-500">{productMap[c.product_id] ?? 'Produto'} · {CREATIVE_CHANNEL_LABELS[c.channel] ?? c.channel}</div>
              </div>
              {isSelected && <span className="ml-auto text-violet-400 text-lg">✓</span>}
            </div>
            <div className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              "{hook}"
            </div>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                {CREATIVE_TYPE_LABELS[c.creative_type] ?? c.creative_type}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                c.status === 'vencedor' ? 'bg-yellow-900/40 text-yellow-300' :
                c.status === 'em_teste' ? 'bg-amber-900/40 text-amber-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {c.status}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Generation overlay ────────────────────────────────────────────────────────

interface GenStep { label: string; done: boolean; count?: number }

function GenerationOverlay({ steps, totalVariations }: { steps: GenStep[]; totalVariations: number }) {
  const done = steps.filter(s => s.done).length
  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-pulse">🧪</div>
          <div className="text-xl font-bold text-white">Gerando Variações com IA</div>
          <div className="text-sm text-gray-500 mt-1">
            {totalVariations > 0 ? `${totalVariations} variações sendo criadas` : 'Aguardando resposta da IA...'}
          </div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progresso</span><span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
              step.done ? 'bg-emerald-900/20' : i === done ? 'bg-gray-800 animate-pulse' : 'opacity-35'
            }`}>
              <span className="text-lg shrink-0">
                {step.done ? '✅' : i === done ? '⏳' : '○'}
              </span>
              <span className={`text-sm ${step.done ? 'text-emerald-400' : i === done ? 'text-white' : 'text-gray-600'}`}>
                {step.label}
                {step.done && step.count !== undefined && (
                  <span className="text-emerald-500 ml-1.5 text-xs">({step.count} geradas)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Rankings view ─────────────────────────────────────────────────────────────

function RankingsView({ variations }: { variations: TestVariation[] }) {
  const withData = variations.filter(v => v.impressions >= 1000)

  function topBy(metric: keyof TestVariation, ascending = false, count = 5) {
    return [...withData]
      .filter(v => (v[metric] as number) > 0)
      .sort((a, b) => {
        const va = a[metric] as number
        const vb = b[metric] as number
        return ascending ? va - vb : vb - va
      })
      .slice(0, count)
  }

  const topCtr = topBy('ctr')
  const topConv = topBy('conversions')
  const topRoas = topBy('roas')
  const topCpa = topBy('cpa', true) // ascending (lower is better)

  function RankList({ title, items, metric, format, icon }: {
    title: string
    items: TestVariation[]
    metric: keyof TestVariation
    format: (v: number) => string
    icon: string
  }) {
    const medals = ['🥇', '🥈', '🥉', '4', '5']
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-300 mb-3">{icon} {title}</div>
        {items.length === 0 ? (
          <div className="text-xs text-gray-600 py-4 text-center">Dados insuficientes ainda</div>
        ) : (
          <div className="space-y-2">
            {items.map((v, idx) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="text-base shrink-0 w-5 text-center">{medals[idx]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{v.name}</div>
                  <div className={`text-[10px] ${TEST_VARIATION_TYPE_COLORS[v.type]?.split(' ')[1] ?? 'text-gray-500'}`}>
                    {TEST_VARIATION_TYPE_LABELS[v.type]}
                  </div>
                </div>
                <div className={`text-sm font-bold shrink-0 ${
                  v.status === 'vencedor' ? 'text-yellow-400' : 'text-white'
                }`}>
                  {format(v[metric] as number)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <RankList title="Melhor CTR" items={topCtr} metric="ctr"
        format={v => `${v.toFixed(2)}%`} icon="👁" />
      <RankList title="Mais Conversões" items={topConv} metric="conversions"
        format={v => String(v)} icon="💰" />
      <RankList title="Melhor ROAS" items={topRoas} metric="roas"
        format={v => `${v.toFixed(2)}x`} icon="📈" />
      <RankList title="Menor CPA" items={topCpa} metric="cpa"
        format={v => formatCurrency(v)} icon="🎯" />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AutoTesting() {
  const [session, setSession] = useState<AutoTestSession | null>(null)
  const [activeTab, setActiveTab] = useState<'variacoes' | 'rankings' | 'aprendizados'>('variacoes')
  const [filterType, setFilterType] = useState<TestVariationType | 'todos'>('todos')

  // Setup form state
  const [selectedCreativeId, setSelectedCreativeId] = useState('')
  const [cpaTarget, setCpaTarget] = useState('35')
  const [roasTarget, setRoasTarget] = useState('2.5')

  // Generation state
  const [genSteps, setGenSteps] = useState<GenStep[]>([])
  const [generating, setGenerating] = useState(false)
  const [totalVariations, setTotalVariations] = useState(0)
  const [apiError, setApiError] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const TICK_MS = 5200

  // Load existing active session on mount
  useEffect(() => {
    const active = tosDb.autoTestSessions.getActive()
    if (active) {
      setSession(active)
    }
  }, [])

  // Simulation tick
  useEffect(() => {
    if (!session || session.status !== 'ativo') {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      setSession(prev => {
        if (!prev || prev.status !== 'ativo') return prev
        const { variations, newLearnings } = runTestTick(prev)
        const allLearnings = [...prev.learnings, ...newLearnings]
        const totalSpend = variations.reduce((s, v) => s + v.spend, 0)
        const totalImp = variations.reduce((s, v) => s + v.impressions, 0)
        const winnersCount = variations.filter(v => v.status === 'vencedor').length
        const updated: AutoTestSession = {
          ...prev,
          variations,
          learnings: allLearnings,
          total_spend: parseFloat(totalSpend.toFixed(2)),
          total_impressions: totalImp,
          winners_count: winnersCount,
          updated_at: now(),
        }
        tosDb.autoTestSessions.save(updated)
        return updated
      })
    }, TICK_MS)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [session?.id, session?.status])

  async function handleGenerate() {
    if (!selectedCreativeId) return
    const creative = tosDb.aiCreatives.getById(selectedCreativeId)
    if (!creative) return
    const product = tosDb.products.getById(creative.product_id)
    if (!product) return

    setApiError('')
    setGenerating(true)

    const steps: GenStep[] = [
      { label: 'Analisando criativo base...', done: false },
      { label: 'Conectando com IA Claude...', done: false },
      { label: 'Gerando 5 hooks alternativos...', done: false, count: 0 },
      { label: 'Gerando 3 abordagens...', done: false, count: 0 },
      { label: 'Gerando 3 CTAs...', done: false, count: 0 },
      { label: 'Gerando 2 estilos visuais...', done: false, count: 0 },
      { label: 'Publicando variações no teste...', done: false },
      { label: 'Iniciando monitoramento...', done: false },
    ]
    setGenSteps(steps)

    const mark = (idx: number, count?: number) =>
      setGenSteps(prev => prev.map((s, i) => i === idx ? { ...s, done: true, count } : s))

    await delay(700); mark(0)

    // Build context for API
    const creativeData = JSON.stringify({
      nome: creative.strategy?.nome,
      hook_principal: creative.strategy?.hooks?.[0]?.texto ?? creative.strategy?.roteiro?.hook,
      roteiro: creative.strategy?.roteiro,
      texto_anuncio: creative.strategy?.texto_anuncio?.textos_principais?.[0],
      cta_principal: creative.strategy?.texto_anuncio?.ctas?.[0],
      angulo: creative.angle,
      tipo: creative.creative_type,
      canal: creative.channel,
      objetivo: creative.objective,
    }, null, 2)

    const productData = JSON.stringify({
      nome: product.name,
      nicho: product.niche,
      categoria: product.category,
      preco: product.price,
      dor_principal: product.main_pain,
      desejo_principal: product.main_desire,
      beneficio_principal: product.main_benefit,
      promessa: product.main_promise,
      mecanismo: product.unique_mechanism,
      publico_alvo: product.target_audience,
    }, null, 2)

    await delay(600); mark(1)

    let apiData: ApiResponse | null = null
    try {
      const res = await fetch('/api/auto-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeData, productData , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      const data = await res.json() as ApiResponse & { error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro desconhecido')
      apiData = data
    } catch (err) {
      setGenerating(false)
      setGenSteps([])
      setApiError(err instanceof Error ? err.message : 'Falha na geração. Tente novamente.')
      return
    }

    const sessionId = generateId()
    const baseName = creative.strategy?.nome ?? creative.id
    const baseHook = creative.strategy?.hooks?.[0]?.texto ?? creative.strategy?.roteiro?.hook ?? '—'
    const allVariations: TestVariation[] = []

    // Hooks
    await delay(400)
    const hooks = (apiData.hooks ?? []).slice(0, 5)
    hooks.forEach((h, i) => {
      allVariations.push(makeVariation(sessionId, 'hook', `Hook ${i + 1} – ${h.tipo}`, h.texto, h.tipo, h.emocao))
    })
    mark(2, hooks.length)

    // Abordagens
    await delay(350)
    const abordagens = (apiData.abordagens ?? []).slice(0, 3)
    abordagens.forEach((a, i) => {
      allVariations.push(makeVariation(sessionId, 'abordagem', `Abordagem ${i + 1} – ${a.nome}`, a.roteiro, a.nome))
    })
    mark(3, abordagens.length)

    // CTAs
    await delay(300)
    const ctas = (apiData.ctas ?? []).slice(0, 3)
    ctas.forEach((c, i) => {
      allVariations.push(makeVariation(sessionId, 'cta', `CTA ${i + 1} – ${c.estilo}`, c.texto, c.estilo))
    })
    mark(4, ctas.length)

    // Visual styles
    await delay(300)
    const estilos = (apiData.estilos_visuais ?? []).slice(0, 2)
    estilos.forEach((e, i) => {
      allVariations.push(makeVariation(sessionId, 'estilo_visual', `Visual ${i + 1} – ${e.nome}`, `${e.descricao} | ${e.elementos_chave}`, e.mood))
    })
    mark(5, estilos.length)

    setTotalVariations(allVariations.length)
    await delay(600); mark(6)
    await delay(500); mark(7)

    const newSession: AutoTestSession = {
      id: sessionId,
      product_id: creative.product_id,
      base_creative_id: selectedCreativeId,
      base_creative_name: baseName,
      base_hook: baseHook,
      status: 'ativo',
      variations: allVariations,
      learnings: [],
      total_spend: 0,
      total_impressions: 0,
      winners_count: 0,
      started_at: now(),
      updated_at: now(),
    }

    tosDb.autoTestSessions.save(newSession)
    await delay(400)
    setGenerating(false)
    setGenSteps([])
    setSession(newSession)
    setActiveTab('variacoes')
  }

  function handlePause() {
    if (!session) return
    const updated = { ...session, status: 'pausado' as const, updated_at: now() }
    tosDb.autoTestSessions.save(updated)
    setSession(updated)
  }

  function handleResume() {
    if (!session) return
    const updated = { ...session, status: 'ativo' as const, updated_at: now() }
    tosDb.autoTestSessions.save(updated)
    setSession(updated)
  }

  function handleConclude() {
    if (!session) return
    if (!confirm('Concluir o teste? O resultado ficará salvo no histórico.')) return
    const updated = { ...session, status: 'concluido' as const, concluded_at: now(), updated_at: now() }
    tosDb.autoTestSessions.save(updated)
    setSession(updated)
  }

  function handleReset() {
    if (!confirm('Iniciar um novo teste? O teste atual será arquivado.')) return
    if (session) {
      const archived = { ...session, status: 'concluido' as const, concluded_at: now(), updated_at: now() }
      tosDb.autoTestSessions.save(archived)
    }
    setSession(null)
    setSelectedCreativeId('')
    setActiveTab('variacoes')
  }

  function handleSaveVariationToBank(variation: TestVariation) {
    if (!session) return
    const typeMap: Record<TestVariationType, LearningPattern['tipo']> = {
      hook: 'hook',
      abordagem: 'angulo',
      cta: 'copy',
      estilo_visual: 'criativo',
    }
    const pattern: LearningPattern = {
      id: generateId(),
      tipo: typeMap[variation.type],
      titulo: variation.name,
      conteudo: variation.content,
      product_id: session.product_id,
      canal: session.base_creative_name.toLowerCase().includes('tiktok') ? 'tiktok_ads' : 'meta_ads',
      performance_score: Math.min(Math.round(variation.sim_health), 98),
      ctr: variation.ctr > 0 ? variation.ctr : undefined,
      cpa: variation.cpa > 0 ? variation.cpa : undefined,
      roas: variation.roas > 0 ? variation.roas : undefined,
      tags: [variation.sub_type, variation.emotion].filter(Boolean) as string[],
      status: 'ativo',
      notes: variation.decision_reason,
      created_at: now(),
      updated_at: now(),
    }
    tosDb.learningPatterns.save(pattern)
    const updatedVariations = session.variations.map(v =>
      v.id === variation.id ? { ...v, saved_to_bank: true } : v
    )
    const updated = { ...session, variations: updatedVariations, updated_at: now() }
    tosDb.autoTestSessions.save(updated)
    setSession(updated)
  }

  function handleSaveLearningToBank(learning: TestLearning) {
    if (!session) return
    const typeMap: Record<TestVariationType, LearningPattern['tipo']> = {
      hook: 'hook',
      abordagem: 'angulo',
      cta: 'copy',
      estilo_visual: 'criativo',
    }
    const pattern: LearningPattern = {
      id: generateId(),
      tipo: typeMap[learning.type],
      titulo: learning.name,
      conteudo: learning.content,
      product_id: session.product_id,
      performance_score: learning.score,
      tags: [learning.sub_type, learning.emotion].filter(Boolean) as string[],
      status: 'ativo',
      notes: learning.why_it_won,
      created_at: now(),
      updated_at: now(),
    }
    tosDb.learningPatterns.save(pattern)
    const updatedLearnings = session.learnings.map(l =>
      l.id === learning.id ? { ...l, saved_to_bank: true } : l
    )
    const updated = { ...session, learnings: updatedLearnings, updated_at: now() }
    tosDb.autoTestSessions.save(updated)
    setSession(updated)
  }

  // ─── Generation overlay ──────────────────────────────────────────────────────
  if (generating) {
    return <GenerationOverlay steps={genSteps} totalVariations={totalVariations} />
  }

  // ─── Setup screen ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧪</span>
            <h1 className="text-2xl font-bold text-white">Auto-Testing de Criativos</h1>
            <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-3 py-1 rounded-full">
              Inativo
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Selecione um criativo base. A IA gera 13 variações automaticamente — hooks, abordagens, CTAs e estilos visuais — e monitora qual converte mais.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { icon: '🎯', label: '5 Hooks', desc: 'Tipos e emoções variados' },
            { icon: '🎬', label: '3 Abordagens', desc: 'Ângulos de venda distintos' },
            { icon: '👆', label: '3 CTAs', desc: 'Estilos de conversão' },
            { icon: '🎨', label: '2 Estilos', desc: 'Conceitos visuais' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-sm font-bold text-white">{label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Creative picker */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            1. Selecione o Criativo Base
          </div>
          <CreativePicker selected={selectedCreativeId} onSelect={setSelectedCreativeId} />
        </div>

        {/* Config */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            2. Metas de Performance (opcionais)
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">CPA Alvo</label>
              <div className="flex">
                <span className="bg-gray-700 border border-gray-600 border-r-0 rounded-l-lg px-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number" min="1" step="1" value={cpaTarget}
                  onChange={e => setCpaTarget(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-r-lg px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">ROAS Alvo</label>
              <div className="flex">
                <input
                  type="number" min="0.5" step="0.1" value={roasTarget}
                  onChange={e => setRoasTarget(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-l-lg px-3 py-2.5 text-sm"
                />
                <span className="bg-gray-700 border border-gray-600 border-l-0 rounded-r-lg px-3 flex items-center text-gray-400 text-sm">x</span>
              </div>
            </div>
          </div>
        </div>

        {apiError && (
          <div className="mb-4 bg-red-900/20 border border-red-700/40 text-red-300 rounded-lg px-4 py-2.5 text-sm flex justify-between">
            <span>❌ {apiError}</span>
            <button onClick={() => setApiError('')} className="text-red-500 hover:text-red-300">✕</button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!selectedCreativeId}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-xl transition-colors text-base flex items-center justify-center gap-2"
        >
          <span>🧪</span> Gerar Variações com IA
        </button>

        {/* Previous sessions */}
        {tosDb.autoTestSessions.getAll().filter(s => s.status === 'concluido').length > 0 && (
          <div className="mt-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Testes Anteriores</div>
            <div className="space-y-2">
              {tosDb.autoTestSessions.getAll().filter(s => s.status === 'concluido').slice(0, 5).map(s => (
                <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">{s.base_creative_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {s.variations.length} variações · {s.winners_count} vencedores · {formatDateTime(s.started_at)}
                    </div>
                  </div>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">Concluído</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Active session ────────────────────────────────────────────────────────────

  const isRunning = session.status === 'ativo'
  const isConcluded = session.status === 'concluido'

  const winners = session.variations.filter(v => v.status === 'vencedor')
  const losers = session.variations.filter(v => v.status === 'perdedor')
  const active = session.variations.filter(v => v.status === 'ativo')

  const avgCtr = session.variations.filter(v => v.ctr > 0).reduce((s, v, _, a) => s + v.ctr / a.length, 0)
  const topVariation = [...session.variations].sort((a, b) => b.ctr - a.ctr)[0]

  const filteredVariations = filterType === 'todos'
    ? session.variations
    : session.variations.filter(v => v.type === filterType)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🧪</span>
            <h1 className="text-2xl font-bold text-white">Auto-Testing</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isRunning ? 'bg-emerald-900/30 border border-emerald-700/40 text-emerald-300' :
              isConcluded ? 'bg-gray-800 border border-gray-700 text-gray-400' :
              'bg-amber-900/30 border border-amber-700/40 text-amber-300'
            }`}>
              {isRunning ? '● ' : ''}{session.status === 'ativo' ? 'Monitorando' : session.status === 'pausado' ? 'Pausado' : 'Concluído'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Base: <span className="text-gray-300">{session.base_creative_name}</span>
            {' · '}{session.variations.length} variações{' · '}iniciado {formatDateTime(session.started_at)}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isRunning && (
            <button onClick={handlePause}
              className="px-3 py-2 bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30 text-amber-300 rounded-lg text-sm">
              ⏸ Pausar
            </button>
          )}
          {session.status === 'pausado' && (
            <button onClick={handleResume}
              className="px-3 py-2 bg-emerald-600/20 border border-emerald-600/40 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-sm">
              ▶ Retomar
            </button>
          )}
          {!isConcluded && (
            <button onClick={handleConclude}
              className="px-3 py-2 bg-violet-600/20 border border-violet-600/40 hover:bg-violet-600/30 text-violet-300 rounded-lg text-sm">
              ✓ Concluir Teste
            </button>
          )}
          <button onClick={handleReset}
            className="px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 rounded-lg text-sm">
            ↺ Novo Teste
          </button>
        </div>
      </div>

      {/* Base creative banner */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-3 mb-5 flex items-start gap-4">
        <span className="text-xl shrink-0 mt-0.5">📌</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-0.5">CRIATIVO BASE (referência)</div>
          <div className="text-sm text-gray-200 line-clamp-2">"{session.base_hook}"</div>
        </div>
        {topVariation && topVariation.ctr > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-gray-500">Melhor variação</div>
            <div className="text-sm font-bold text-emerald-400">{topVariation.ctr.toFixed(2)}% CTR</div>
            <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{topVariation.name}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Variações', value: String(session.variations.length), sub: `${active.length} ativas` },
          { label: 'Vencedores', value: String(winners.length), color: winners.length > 0 ? 'text-yellow-400' : 'text-white', sub: winners.length > 0 ? '🏆 Encontrados' : 'Aguardando' },
          { label: 'Perdedores', value: String(losers.length), color: losers.length > 0 ? 'text-red-400' : 'text-white' },
          { label: 'Impressões', value: formatNumber(session.total_impressions), sub: 'acumuladas' },
          { label: 'CTR Médio', value: avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—', color: avgCtr >= 1.5 ? 'text-emerald-400' : 'text-white' },
          { label: 'Gasto Total', value: formatCurrency(session.total_spend), sub: 'simulado' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</div>
            {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-5 w-fit">
        {([
          ['variacoes', `🎯 Variações (${session.variations.length})`],
          ['rankings', '🏆 Rankings'],
          ['aprendizados', `🧠 Aprendizados (${session.learnings.length})`],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
              activeTab === t ? 'bg-violet-600 text-white font-medium' : 'text-gray-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Variações tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'variacoes' && (
        <div>
          {/* Type filter */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(['todos', 'hook', 'abordagem', 'cta', 'estilo_visual'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filterType === t
                    ? 'bg-violet-600 text-white font-medium'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {t === 'todos' ? (
                  'Todos'
                ) : (
                  <>{TEST_VARIATION_TYPE_ICONS[t]} {TEST_VARIATION_TYPE_LABELS[t]} ({session.variations.filter(v => v.type === t).length})</>
                )}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {winners.length > 0 && (
                <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 text-xs px-3 py-1.5 rounded-lg">
                  🏆 {winners.length} vencedor{winners.length > 1 ? 'es' : ''} encontrado{winners.length > 1 ? 's' : ''}
                </span>
              )}
              {losers.length > 0 && (
                <span className="bg-red-900/20 text-red-400 text-xs px-3 py-1.5 rounded-lg">
                  ⛔ {losers.length} pausado{losers.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Winners highlighted section */}
          {winners.length > 0 && filterType === 'todos' && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-3">
                🏆 Vencedores
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {winners.map(v => (
                  <VariationCard key={v.id} variation={v} onSaveToBank={handleSaveVariationToBank} />
                ))}
              </div>
            </div>
          )}

          {/* Active variations by type group */}
          {filterType === 'todos' ? (
            (['hook', 'abordagem', 'cta', 'estilo_visual'] as TestVariationType[]).map(type => {
              const typeVars = session.variations.filter(v => v.type === type && v.status !== 'vencedor')
              if (typeVars.length === 0) return null
              return (
                <div key={type} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{TEST_VARIATION_TYPE_ICONS[type]}</span>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {TEST_VARIATION_TYPE_LABELS[type]}
                    </span>
                    <span className="text-[10px] text-gray-600">({typeVars.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {typeVars.map(v => (
                      <VariationCard key={v.id} variation={v} onSaveToBank={handleSaveVariationToBank} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVariations.map(v => (
                <VariationCard key={v.id} variation={v} onSaveToBank={handleSaveVariationToBank} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Rankings tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'rankings' && (
        <RankingsView variations={session.variations} />
      )}

      {/* ── Aprendizados tab ───────────────────────────────────────────────────── */}
      {activeTab === 'aprendizados' && (
        <div>
          {session.learnings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🧠</div>
              <div className="text-sm font-medium text-gray-400 mb-1">Nenhum aprendizado gerado ainda</div>
              <div className="text-xs text-gray-600">
                Os aprendizados aparecem automaticamente quando vencedores são identificados.
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-400">
                  {session.learnings.length} aprendizado{session.learnings.length > 1 ? 's' : ''} gerado{session.learnings.length > 1 ? 's' : ''} · {session.learnings.filter(l => l.saved_to_bank).length} salvo{session.learnings.filter(l => l.saved_to_bank).length > 1 ? 's' : ''} no banco
                </div>
                {session.learnings.some(l => !l.saved_to_bank) && (
                  <button
                    onClick={() => session.learnings.filter(l => !l.saved_to_bank).forEach(handleSaveLearningToBank)}
                    className="text-xs bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/40 text-violet-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    💾 Salvar Todos no Banco
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {session.learnings.map(l => (
                  <LearningCard key={l.id} learning={l} onSave={handleSaveLearningToBank} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
