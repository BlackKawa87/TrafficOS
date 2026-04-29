import { useState, useEffect } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  AI_PATTERN_CATEGORY_LABELS,
  AI_PATTERN_CATEGORY_ICONS,
  AI_PATTERN_CATEGORY_COLORS,
  AI_IMPROVEMENT_AREA_LABELS,
  AI_IMPROVEMENT_AREA_ICONS,
  AI_IMPACT_COLORS,
  PRIORITY_COLOR,
  formatCurrency,
  formatDateTime,
  CHANNEL_LABELS,
} from '../utils/helpers'
import type {
  AICoreModel,
  AICorePattern,
  AICoreImprovement,
  AICorePrediction,
  AIPatternCategory,
} from '../types'

// ─── Training context builder ─────────────────────────────────────────────────

function buildTrainingContext(): { context: string; breakdown: AICoreModel['data_breakdown'] } {
  const products = tosDb.products.getAll()
  const campaigns = tosDb.aiCampaigns.getAll()
  const creatives = tosDb.aiCreatives.getAll()
  const metrics = tosDb.metrics.getAll()
  const decisions = tosDb.decisions.getAll()
  const learningPatterns = tosDb.learningPatterns.getAll()
  const testSessions = tosDb.autoTestSessions.getAll()
  const autoPilotSessions = tosDb.autoPilotSessions.getAll()
  const scaleOps = tosDb.scaleOpportunities.getAll()
  const intelligenceReports = tosDb.intelligenceReports.getAll()

  const breakdown: AICoreModel['data_breakdown'] = {
    products: products.length,
    campaigns: campaigns.length,
    creatives: creatives.length,
    metrics: metrics.length,
    decisions: decisions.length,
    learning_patterns: learningPatterns.length,
    test_sessions: testSessions.length,
    autopilot_sessions: autoPilotSessions.length,
  }

  let ctx = `=== RESUMO DA CONTA ===\n`
  ctx += `Produtos: ${products.length} | Campanhas: ${campaigns.length} | Criativos: ${creatives.length}\n`
  ctx += `Métricas: ${metrics.length} | Decisões: ${decisions.length} | Padrões aprendidos: ${learningPatterns.length}\n`
  ctx += `Sessões de auto-testing: ${testSessions.length} | Sessões de auto-pilot: ${autoPilotSessions.length}\n\n`

  // Products context
  if (products.length > 0) {
    ctx += `=== PRODUTOS ===\n`
    ctx += JSON.stringify(products.slice(0, 5).map(p => ({
      nome: p.name, nicho: p.niche, preco: p.price, status: p.status,
      dor: p.main_pain, desejo: p.main_desire, promessa: p.main_promise,
    })), null, 2) + '\n\n'
  }

  // Top creative winners
  const winners = creatives.filter(c => c.status === 'vencedor' || c.status === 'escalar')
  if (winners.length > 0) {
    ctx += `=== CRIATIVOS VENCEDORES (${winners.length}) ===\n`
    ctx += JSON.stringify(winners.slice(0, 8).map(c => ({
      nome: c.strategy?.nome ?? c.id,
      tipo: c.creative_type, canal: c.channel, angulo: c.angle,
      hook: c.strategy?.hooks?.[0]?.texto ?? c.strategy?.roteiro?.hook,
      ctr: c.ctr, cpa: c.cpa, roas: c.roas, conversoes: c.conversions,
    })), null, 2) + '\n\n'
  }

  // All creatives summary
  if (creatives.length > 0) {
    const byStatus = creatives.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    const byChannel = creatives.reduce((acc, c) => {
      acc[c.channel] = (acc[c.channel] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    const byType = creatives.reduce((acc, c) => {
      acc[c.creative_type] = (acc[c.creative_type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    ctx += `=== DISTRIBUIÇÃO DE CRIATIVOS ===\n`
    ctx += `Por status: ${JSON.stringify(byStatus)}\n`
    ctx += `Por canal: ${JSON.stringify(byChannel)}\n`
    ctx += `Por tipo: ${JSON.stringify(byType)}\n\n`
  }

  // Metrics summary
  if (metrics.length > 0) {
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
    const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
    const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
    ctx += `=== MÉTRICAS GLOBAIS ===\n`
    ctx += JSON.stringify({
      gasto_total: totalSpend, receita_total: totalRevenue,
      roas_medio: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      conversoes_total: totalConversions, impressoes_total: totalImpressions,
      ctr_medio: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      registros: metrics.length,
    }, null, 2) + '\n\n'
  }

  // Learning patterns bank
  if (learningPatterns.length > 0) {
    ctx += `=== BANCO DE PADRÕES APRENDIDOS (${learningPatterns.length}) ===\n`
    ctx += JSON.stringify(learningPatterns.slice(0, 20).map(p => ({
      tipo: p.tipo, titulo: p.titulo, score: p.performance_score,
      canal: p.canal, ctr: p.ctr, roas: p.roas,
    })), null, 2) + '\n\n'
  }

  // Test session winners
  const testWinners = testSessions.flatMap(s => s.learnings.filter(l => l.score >= 65))
  if (testWinners.length > 0) {
    ctx += `=== VENCEDORES DE TESTES A/B (${testWinners.length}) ===\n`
    ctx += JSON.stringify(testWinners.slice(0, 15).map(l => ({
      tipo: l.type, nome: l.name, conteudo: l.content.slice(0, 120),
      score: l.score, motivo: l.why_it_won,
    })), null, 2) + '\n\n'
  }

  // Auto-pilot sessions summary
  if (autoPilotSessions.length > 0) {
    const completedSessions = autoPilotSessions.filter(s => s.status !== 'idle')
    if (completedSessions.length > 0) {
      ctx += `=== AUTO-PILOT SESSIONS (${completedSessions.length}) ===\n`
      ctx += JSON.stringify(completedSessions.slice(0, 5).map(s => ({
        canal: s.config.channel, risco: s.config.risk_level,
        roas: s.total_roas, cpa: s.total_cpa,
        gasto: s.total_spend, receita: s.total_revenue,
        campanhas: s.campaigns.length,
        acoes_tomadas: s.actions.filter(a => !a.action_type.startsWith('piloto')).length,
      })), null, 2) + '\n\n'
    }
  }

  // Scale opportunities
  if (scaleOps.length > 0) {
    ctx += `=== OPORTUNIDADES DE ESCALA (${scaleOps.length}) ===\n`
    ctx += JSON.stringify(scaleOps.slice(0, 8).map(o => ({
      tipo: o.action_type, prioridade: o.priority,
      potencial: o.potential, risco: o.risk, status: o.status,
    })), null, 2) + '\n\n'
  }

  // Intelligence reports
  if (intelligenceReports.length > 0) {
    const latest = intelligenceReports[0]
    ctx += `=== ÚLTIMO RELATÓRIO DE INTELIGÊNCIA ===\n`
    ctx += `Resumo: ${latest.resumo_executivo}\n`
    ctx += `Score geral: ${latest.score_geral}\n\n`
  }

  return { context: ctx, breakdown }
}

function buildModelContext(model: AICoreModel): string {
  let ctx = `MODELO v${model.version} (treinado em ${model.trained_at})\n`
  ctx += `Score de inteligência: ${model.overall_score}/100\n`
  ctx += `Pontos de dados: ${model.data_points_used}\n\n`
  ctx += `META INSIGHTS:\n${JSON.stringify(model.meta_insights, null, 2)}\n\n`
  ctx += `TOP PADRÕES:\n`
  model.patterns.slice(0, 8).forEach(p => {
    ctx += `- [${p.category}] ${p.title} (confiança: ${p.confidence}%): ${p.insight.slice(0, 150)}\n`
  })
  return ctx
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function IntelligenceRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54
  const strokeDash = (score / 100) * circumference
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 25 ? '#8b5cf6' : '#6b7280'

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black" style={{ color }}>{score}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">/ 100</div>
      </div>
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 shrink-0 w-8">{value}%</span>
    </div>
  )
}

function PatternCard({ pattern }: { pattern: AICorePattern }) {
  const [expanded, setExpanded] = useState(false)
  const catColor = AI_PATTERN_CATEGORY_COLORS[pattern.category] ?? 'bg-gray-800 text-gray-400 border-gray-700'
  const impactColor = AI_IMPACT_COLORS[pattern.impact] ?? 'bg-gray-800 text-gray-400 border-gray-700'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${catColor}`}>
          {AI_PATTERN_CATEGORY_ICONS[pattern.category]} {AI_PATTERN_CATEGORY_LABELS[pattern.category]}
        </span>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${impactColor}`}>
          {pattern.impact === 'alto' ? '⚡' : pattern.impact === 'medio' ? '→' : '·'} {pattern.impact}
        </span>
        <span className="ml-auto text-[10px] text-gray-500 shrink-0">{pattern.data_points} dados</span>
      </div>
      <div className="text-sm font-semibold text-white mb-1">{pattern.title}</div>
      <div
        className={`text-xs text-gray-400 leading-relaxed cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
        onClick={() => setExpanded(p => !p)}
      >
        {pattern.insight}
      </div>
      {pattern.insight.length > 120 && (
        <button onClick={() => setExpanded(p => !p)} className="text-[10px] text-gray-600 hover:text-gray-400 mt-1">
          {expanded ? '▲ Menos' : '▼ Mais'}
        </button>
      )}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
          <span>Confiança</span>
        </div>
        <ConfidenceBar value={pattern.confidence} />
      </div>
    </div>
  )
}

function ImprovementRow({
  improvement,
  onApply,
  onIgnore,
}: {
  improvement: AICoreImprovement
  onApply: (id: string) => void
  onIgnore: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const priorityColor = PRIORITY_COLOR[improvement.priority] ?? 'bg-gray-800 text-gray-400 border-gray-700'
  const isDone = improvement.status !== 'pendente'

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 transition-all ${
      isDone ? 'border-gray-800 opacity-50' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{AI_IMPROVEMENT_AREA_ICONS[improvement.area] ?? '•'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
              {AI_IMPROVEMENT_AREA_LABELS[improvement.area]}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${priorityColor}`}>
              {improvement.priority}
            </span>
            {isDone && (
              <span className={`text-[10px] px-2 py-0.5 rounded ${
                improvement.status === 'aplicado' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'
              }`}>
                {improvement.status === 'aplicado' ? '✅ Aplicado' : '⊘ Ignorado'}
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-white mb-1">{improvement.title}</div>
          <div className="text-xs text-gray-400">{improvement.current_state}</div>

          {expanded && (
            <div className="mt-3 space-y-2">
              <div className="bg-violet-900/15 border border-violet-700/30 rounded-lg px-3 py-2">
                <div className="text-[10px] font-semibold text-violet-400 mb-1">💡 Melhoria Sugerida</div>
                <div className="text-xs text-gray-300">{improvement.suggested_improvement}</div>
              </div>
              <div className="bg-emerald-900/15 border border-emerald-700/30 rounded-lg px-3 py-2">
                <div className="text-[10px] font-semibold text-emerald-400 mb-1">📈 Impacto Esperado</div>
                <div className="text-xs text-gray-300">{improvement.expected_impact}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              {expanded ? '▲ Ocultar detalhes' : '▼ Ver sugestão'}
            </button>
            {!isDone && (
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => onIgnore(improvement.id)}
                  className="text-[10px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
                >
                  Ignorar
                </button>
                <button
                  onClick={() => onApply(improvement.id)}
                  className="text-[10px] px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-300 rounded-lg transition-colors"
                >
                  ✓ Marcar como Aplicado
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PredictionCard({ prediction }: { prediction: AICorePrediction }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = prediction.score_potencial >= 70 ? 'text-emerald-400' : prediction.score_potencial >= 50 ? 'text-amber-400' : 'text-red-400'
  const confColor = prediction.confidence >= 70 ? 'text-emerald-400' : prediction.confidence >= 45 ? 'text-amber-400' : 'text-gray-400'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-0.5">{prediction.channel} · {prediction.objective}</div>
          <div className="text-sm text-gray-200 line-clamp-2">{prediction.input_description}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-xl font-black ${scoreColor}`}>{prediction.score_potencial}</div>
          <div className="text-[10px] text-gray-600">potencial</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">CTR</div>
          <div className="text-sm font-bold text-white mt-0.5">{prediction.predicted_ctr.toFixed(2)}%</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">CPA</div>
          <div className="text-sm font-bold text-white mt-0.5">{formatCurrency(prediction.predicted_cpa)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-500">ROAS</div>
          <div className="text-sm font-bold text-white mt-0.5">{prediction.predicted_roas.toFixed(2)}x</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500">Confiança da previsão</span>
        <span className={`text-xs font-semibold ${confColor}`}>{prediction.confidence}%</span>
      </div>
      <ConfidenceBar value={prediction.confidence} />

      {!expanded && (
        <button onClick={() => setExpanded(true)} className="mt-2 text-[10px] text-gray-600 hover:text-gray-400">▼ Ver raciocínio e recomendações</button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-gray-400 mb-1">🧠 Raciocínio</div>
            <div className="text-xs text-gray-300">{prediction.reasoning}</div>
          </div>
          {prediction.recommendations.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-gray-400 mb-1.5">💡 Recomendações</div>
              {prediction.recommendations.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-300 mb-1">
                  <span className="text-violet-400 shrink-0">→</span> {r}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setExpanded(false)} className="text-[10px] text-gray-600 hover:text-gray-400">▲ Menos</button>
        </div>
      )}

      <div className="text-[10px] text-gray-700 mt-2">{formatDateTime(prediction.created_at)}</div>
    </div>
  )
}

// ─── Training overlay ──────────────────────────────────────────────────────────

interface TrainStep { label: string; done: boolean }

function TrainingOverlay({ steps, version }: { steps: TrainStep[]; version: number }) {
  const done = steps.filter(s => s.done).length
  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4" style={{ animation: 'pulse 2s ease-in-out infinite' }}>💡</div>
          <div className="text-xl font-bold text-white">Treinando AI Core</div>
          <div className="text-sm text-gray-500 mt-1">
            Versão {version} · Analisando histórico completo da conta
          </div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progresso do treinamento</span><span>{pct}%</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 via-blue-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
              step.done ? 'bg-emerald-900/20' : i === done ? 'bg-gray-800' : 'opacity-35'
            }`}>
              <span className="text-base shrink-0">
                {step.done ? '✅' : i === done ? '⏳' : '○'}
              </span>
              <span className={`text-sm ${step.done ? 'text-emerald-400' : i === done ? 'text-white' : 'text-gray-600'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Data quality gauge ────────────────────────────────────────────────────────

function DataQualityBar({ label, value, max, icon }: { label: string; value: number; max: number; icon: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 66 ? 'bg-emerald-500' : pct >= 33 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-base shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="text-gray-500">{value}/{max}</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AiCore() {
  const [model, setModel] = useState<AICoreModel | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'padroes' | 'prever' | 'melhorias'>('overview')
  const [filterCategory, setFilterCategory] = useState<AIPatternCategory | 'todos'>('todos')
  const [filterPriority, setFilterPriority] = useState<'todos' | 'alta' | 'media' | 'baixa'>('todos')

  // Training state
  const [trainSteps, setTrainSteps] = useState<TrainStep[]>([])
  const [training, setTraining] = useState(false)
  const [trainError, setTrainError] = useState('')

  // Prediction state
  const [predInput, setPredInput] = useState('')
  const [predChannel, setPredChannel] = useState('meta_ads')
  const [predObjective, setPredObjective] = useState('vendas_conversao')
  const [predicting, setPredicting] = useState(false)
  const [predError, setPredError] = useState('')

  // Load model on mount
  useEffect(() => {
    const saved = tosDb.aiCoreModel.get()
    if (saved) setModel(saved)
  }, [])

  async function handleTrain() {
    setTraining(true)
    setTrainError('')

    const breakdown = buildTrainingContext().breakdown
    const totalPoints = Object.values(breakdown).reduce((s, v) => s + v, 0)
    const nextVersion = (model?.version ?? 0) + 1

    const steps: TrainStep[] = [
      { label: 'Coletando dados históricos da conta...', done: false },
      { label: `Analisando ${breakdown.creatives} criativos e ${breakdown.metrics} métricas...`, done: false },
      { label: `Processando ${breakdown.learning_patterns} padrões do banco de inteligência...`, done: false },
      { label: `Revisando ${breakdown.test_sessions} sessões de auto-testing...`, done: false },
      { label: 'Identificando padrões vencedores com IA...', done: false },
      { label: 'Gerando previsões de performance...', done: false },
      { label: 'Calculando melhorias sugeridas...', done: false },
      { label: 'Consolidando modelo de inteligência...', done: false },
    ]
    setTrainSteps(steps)

    const mark = (i: number) => setTrainSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: true } : s))

    await delay(700); mark(0)
    await delay(600); mark(1)
    await delay(500); mark(2)
    await delay(500); mark(3)

    // Build full context and call API
    const { context } = buildTrainingContext()

    let apiResult: Partial<AICoreModel> = {}
    try {
      const res = await fetch('/api/ai-core-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData: context , language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR' }),
      })
      const data = await res.json() as Partial<AICoreModel> & { error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro desconhecido')
      apiResult = data
    } catch (err) {
      setTraining(false)
      setTrainSteps([])
      setTrainError(err instanceof Error ? err.message : 'Falha no treinamento. Tente novamente.')
      return
    }

    await delay(400); mark(4)
    await delay(400); mark(5)
    await delay(400); mark(6)

    const newModel: AICoreModel = {
      id: generateId(),
      version: nextVersion,
      trained_at: now(),
      data_points_used: totalPoints,
      overall_score: (apiResult as AICoreModel).overall_score ?? 30,
      patterns: ((apiResult as AICoreModel).patterns ?? []).map((p) => ({ ...p, id: generateId(), created_at: now() })),
      improvements: ((apiResult as AICoreModel).improvements ?? []).map((imp) => ({ ...imp, id: generateId(), status: 'pendente' as const, created_at: now() })),
      predictions: model?.predictions ?? [],
      meta_insights: (apiResult as AICoreModel).meta_insights ?? {
        best_creative_type: '—', best_channel: '—', best_audience_type: '—',
        best_offer_angle: '—', avg_winning_ctr: 0, avg_winning_cpa: 0, avg_winning_roas: 0,
      },
      training_summary: (apiResult as AICoreModel).training_summary ?? '',
      next_training_suggested: (apiResult as AICoreModel).next_training_suggested ?? '',
      data_breakdown: breakdown,
    }

    await delay(600); mark(7)

    tosDb.aiCoreModel.save(newModel)
    await delay(400)
    setTraining(false)
    setTrainSteps([])
    setModel(newModel)
    setActiveTab('overview')
  }

  async function handlePredict() {
    if (!predInput.trim() || !model) return
    setPredicting(true)
    setPredError('')

    const modelContext = buildModelContext(model)

    try {
      const res = await fetch('/api/ai-core-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeDescription: predInput,
          channel: predChannel,
          objective: predObjective,
          modelContext,
          language: localStorage.getItem('tos_ai_lang') ?? 'pt-BR',
        }),
      })
      const data = await res.json() as Partial<AICorePrediction> & { error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro desconhecido')

      const prediction: AICorePrediction = {
        id: generateId(),
        input_description: predInput,
        channel: predChannel,
        objective: predObjective,
        predicted_ctr: (data as AICorePrediction).predicted_ctr ?? 0,
        predicted_cpa: (data as AICorePrediction).predicted_cpa ?? 0,
        predicted_roas: (data as AICorePrediction).predicted_roas ?? 0,
        confidence: (data as AICorePrediction).confidence ?? 50,
        score_potencial: (data as AICorePrediction).score_potencial ?? 50,
        reasoning: (data as AICorePrediction).reasoning ?? '',
        recommendations: (data as AICorePrediction).recommendations ?? [],
        created_at: now(),
      }

      const updatedModel = { ...model, predictions: [prediction, ...model.predictions].slice(0, 20) }
      tosDb.aiCoreModel.save(updatedModel)
      setModel(updatedModel)
      setPredInput('')
    } catch (err) {
      setPredError(err instanceof Error ? err.message : 'Erro ao gerar previsão')
    } finally {
      setPredicting(false)
    }
  }

  function handleApplyImprovement(id: string) {
    if (!model) return
    const updated = {
      ...model,
      improvements: model.improvements.map(i => i.id === id ? { ...i, status: 'aplicado' as const } : i),
    }
    tosDb.aiCoreModel.save(updated)
    setModel(updated)
  }

  function handleIgnoreImprovement(id: string) {
    if (!model) return
    const updated = {
      ...model,
      improvements: model.improvements.map(i => i.id === id ? { ...i, status: 'ignorado' as const } : i),
    }
    tosDb.aiCoreModel.save(updated)
    setModel(updated)
  }

  // ─── Training overlay ────────────────────────────────────────────────────────
  if (training) {
    return <TrainingOverlay steps={trainSteps} version={(model?.version ?? 0) + 1} />
  }

  // ─── No model: onboarding ────────────────────────────────────────────────────
  if (!model) {
    const { breakdown } = buildTrainingContext()
    const totalPoints = Object.values(breakdown).reduce((s, v) => s + v, 0)
    const hasData = totalPoints > 0

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <div className="text-7xl mb-6">💡</div>
          <h1 className="text-3xl font-black text-white mb-3">AI Core</h1>
          <p className="text-gray-400 text-base mb-2">Self-Learning Engine</p>
          <p className="text-sm text-gray-500 max-w-lg mx-auto mb-10">
            A IA analisa todo o histórico da sua conta — criativos, métricas, decisões, testes — e gera um modelo que melhora automaticamente suas decisões futuras.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { icon: '🔍', title: 'Aprende Padrões', desc: 'O que converte na sua conta' },
              { icon: '🔮', title: 'Prevê Resultados', desc: 'CTR, CPA e ROAS antes de publicar' },
              { icon: '⚡', title: 'Sugere Melhorias', desc: 'Copy, criativos e públicos' },
              { icon: '♻️', title: 'Evolui Sozinha', desc: 'Mais dados = mais inteligência' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="text-[10px] text-gray-500 mt-1">{desc}</div>
              </div>
            ))}
          </div>

          {/* Data available */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 text-left max-w-lg mx-auto">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Dados disponíveis para treinamento ({totalPoints} pontos)
            </div>
            <div className="space-y-3">
              <DataQualityBar label="Criativos" value={breakdown.creatives} max={20} icon="🎨" />
              <DataQualityBar label="Métricas" value={breakdown.metrics} max={50} icon="📈" />
              <DataQualityBar label="Padrões aprendidos" value={breakdown.learning_patterns} max={20} icon="🧠" />
              <DataQualityBar label="Sessões de teste" value={breakdown.test_sessions} max={5} icon="🧪" />
              <DataQualityBar label="Campanhas" value={breakdown.campaigns} max={10} icon="📢" />
            </div>
          </div>

          {trainError && (
            <div className="mb-4 bg-red-900/20 border border-red-700/40 text-red-300 rounded-lg px-4 py-2.5 text-sm max-w-lg mx-auto flex justify-between">
              <span>❌ {trainError}</span>
              <button onClick={() => setTrainError('')} className="text-red-500">✕</button>
            </div>
          )}

          <button
            onClick={handleTrain}
            className={`px-10 py-4 rounded-xl font-bold text-base transition-all flex items-center gap-3 mx-auto ${
              hasData
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasData}
          >
            <span>💡</span>
            {hasData ? 'Iniciar Primeiro Treinamento' : 'Adicione dados para treinar'}
          </button>
          {!hasData && (
            <p className="text-xs text-gray-600 mt-3">
              Crie produtos, campanhas e criativos para começar o treinamento.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  const pendingImprovements = model.improvements.filter(i => i.status === 'pendente')
  const appliedImprovements = model.improvements.filter(i => i.status === 'aplicado')
  const highConfPatterns = model.patterns.filter(p => p.confidence >= 70)
  const filteredPatterns = filterCategory === 'todos' ? model.patterns : model.patterns.filter(p => p.category === filterCategory)
  const filteredImprovements = filterPriority === 'todos' ? model.improvements : model.improvements.filter(i => i.priority === filterPriority)
  const scoreColor = model.overall_score >= 75 ? 'text-emerald-400' : model.overall_score >= 50 ? 'text-amber-400' : model.overall_score >= 25 ? 'text-violet-400' : 'text-gray-400'

  const { breakdown: currentBreakdown } = buildTrainingContext()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">💡</span>
            <h1 className="text-2xl font-bold text-white">AI Core</h1>
            <span className="bg-violet-900/30 border border-violet-700/40 text-violet-300 text-xs px-3 py-1 rounded-full font-semibold">
              v{model.version}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Treinado em {formatDateTime(model.trained_at)} · {model.data_points_used} pontos de dados ·{' '}
            {model.patterns.length} padrões · {pendingImprovements.length} melhorias pendentes
          </div>
        </div>
        <button
          onClick={handleTrain}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <span>🔄</span> Retreinar Modelo
        </button>
      </div>

      {trainError && (
        <div className="mb-4 bg-red-900/20 border border-red-700/40 text-red-300 rounded-lg px-4 py-2.5 text-sm flex justify-between">
          <span>❌ {trainError}</span>
          <button onClick={() => setTrainError('')} className="text-red-500">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {([
          ['overview', '📊 Visão Geral'],
          ['padroes', `🔍 Padrões (${model.patterns.length})`],
          ['prever', `🔮 Prever`],
          ['melhorias', `⚡ Melhorias (${pendingImprovements.length})`],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
              activeTab === t ? 'bg-violet-600 text-white font-medium' : 'text-gray-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score + training summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Score ring */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Intelligence Score
              </div>
              <IntelligenceRing score={model.overall_score} />
              <div className={`mt-4 text-sm font-semibold ${scoreColor}`}>
                {model.overall_score >= 75 ? 'Conta Madura' :
                 model.overall_score >= 50 ? 'Boa Base de Dados' :
                 model.overall_score >= 25 ? 'Dados Iniciais' :
                 'Poucos Dados'}
              </div>
              <div className="text-xs text-gray-600 mt-1 text-center">{model.next_training_suggested}</div>
            </div>

            {/* Training summary + quick stats */}
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 mb-2">📋 Resumo do Treinamento</div>
                <div className="text-sm text-gray-200 leading-relaxed">{model.training_summary}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Padrões', value: model.patterns.length, sub: `${highConfPatterns.length} alta confiança` },
                  { label: 'Melhorias', value: model.improvements.length, sub: `${pendingImprovements.length} pendentes` },
                  { label: 'Aplicadas', value: appliedImprovements.length, color: 'text-emerald-400' },
                  { label: 'Previsões', value: model.predictions.length, sub: 'geradas' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="text-[10px] text-gray-500">{label}</div>
                    <div className={`text-xl font-bold mt-0.5 ${color ?? 'text-white'}`}>{value}</div>
                    {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Meta insights */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">🏆 Meta Insights — Melhores Performers</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { icon: '🎨', label: 'Melhor tipo de criativo', value: model.meta_insights.best_creative_type || '—' },
                { icon: '📡', label: 'Canal mais lucrativo', value: model.meta_insights.best_channel || '—' },
                { icon: '👥', label: 'Melhor público', value: model.meta_insights.best_audience_type || '—' },
                { icon: '💰', label: 'Ângulo de oferta', value: model.meta_insights.best_offer_angle || '—' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-gray-800 rounded-xl p-3">
                  <div className="text-xl mb-1.5">{icon}</div>
                  <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                  <div className="text-sm font-semibold text-white capitalize">{value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-gray-800 pt-4">
              {[
                { label: 'CTR médio (vencedores)', value: model.meta_insights.avg_winning_ctr > 0 ? `${model.meta_insights.avg_winning_ctr.toFixed(2)}%` : '—' },
                { label: 'CPA médio (vencedores)', value: model.meta_insights.avg_winning_cpa > 0 ? formatCurrency(model.meta_insights.avg_winning_cpa) : '—' },
                { label: 'ROAS médio (vencedores)', value: model.meta_insights.avg_winning_roas > 0 ? `${model.meta_insights.avg_winning_roas.toFixed(2)}x` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                  <div className="text-base font-bold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data quality */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">📊 Qualidade dos Dados</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataQualityBar label="Criativos" value={currentBreakdown.creatives} max={20} icon="🎨" />
              <DataQualityBar label="Métricas" value={currentBreakdown.metrics} max={50} icon="📈" />
              <DataQualityBar label="Padrões aprendidos" value={currentBreakdown.learning_patterns} max={20} icon="🧠" />
              <DataQualityBar label="Sessões de teste A/B" value={currentBreakdown.test_sessions} max={5} icon="🧪" />
              <DataQualityBar label="Campanhas" value={currentBreakdown.campaigns} max={10} icon="📢" />
              <DataQualityBar label="Sessões auto-pilot" value={currentBreakdown.autopilot_sessions} max={5} icon="🎯" />
            </div>
          </div>
        </div>
      )}

      {/* ── Padrões tab ──────────────────────────────────────────────────────────── */}
      {activeTab === 'padroes' && (
        <div>
          {/* Category filter */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(['todos', 'criativo', 'publico', 'canal', 'oferta', 'timing', 'copy'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filterCategory === cat
                    ? 'bg-violet-600 text-white font-medium'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat === 'todos' ? (
                  `Todos (${model.patterns.length})`
                ) : (
                  `${AI_PATTERN_CATEGORY_ICONS[cat]} ${AI_PATTERN_CATEGORY_LABELS[cat]} (${model.patterns.filter(p => p.category === cat).length})`
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatterns.length === 0 ? (
              <div className="col-span-3 text-center py-10 text-sm text-gray-600">
                Nenhum padrão nesta categoria ainda.
              </div>
            ) : (
              filteredPatterns.map(p => <PatternCard key={p.id} pattern={p} />)
            )}
          </div>
        </div>
      )}

      {/* ── Prever tab ────────────────────────────────────────────────────────────── */}
      {activeTab === 'prever' && (
        <div className="space-y-5">
          {/* Prediction form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-4">
              🔮 Prever Performance de Novo Criativo
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Canal</label>
                <select
                  value={predChannel}
                  onChange={e => setPredChannel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm"
                >
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Objetivo</label>
                <select
                  value={predObjective}
                  onChange={e => setPredObjective(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="vendas_conversao">Vendas / Conversão</option>
                  <option value="captacao_leads">Captação de Leads</option>
                  <option value="trafego_pagina">Tráfego para Página</option>
                  <option value="awareness">Awareness</option>
                  <option value="remarketing">Remarketing</option>
                  <option value="teste_criativo">Teste de Criativo</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1.5">
                Descreva o criativo (hook, ângulo, formato, público-alvo)
              </label>
              <textarea
                rows={4}
                value={predInput}
                onChange={e => setPredInput(e.target.value)}
                placeholder="Ex: Hook de pergunta sobre emagrecimento, direcionado para mulheres 35-55, vídeo UGC de 30 segundos, abordagem de transformação mostrando antes e depois..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-violet-500"
              />
            </div>
            {predError && (
              <div className="mb-3 bg-red-900/20 border border-red-700/40 text-red-300 rounded-lg px-3 py-2 text-xs flex justify-between">
                <span>❌ {predError}</span>
                <button onClick={() => setPredError('')} className="text-red-500">✕</button>
              </div>
            )}
            <button
              onClick={handlePredict}
              disabled={!predInput.trim() || predicting}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {predicting ? <><span className="animate-spin">⏳</span> Prevendo...</> : <><span>🔮</span> Gerar Previsão</>}
            </button>
          </div>

          {/* Prediction history */}
          {model.predictions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Previsões anteriores ({model.predictions.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {model.predictions.map(p => (
                  <PredictionCard key={p.id} prediction={p} />
                ))}
              </div>
            </div>
          )}

          {model.predictions.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-600">
              Gere sua primeira previsão acima.
            </div>
          )}
        </div>
      )}

      {/* ── Melhorias tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'melhorias' && (
        <div>
          {/* Priority filter */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {(['todos', 'alta', 'media', 'baixa'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filterPriority === p
                    ? 'bg-violet-600 text-white font-medium'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {p === 'todos' ? `Todas (${model.improvements.length})` : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <div className="ml-auto flex gap-2 text-xs text-gray-600">
              <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded">
                {appliedImprovements.length} aplicadas
              </span>
              <span className="bg-amber-900/30 text-amber-400 px-2 py-1 rounded">
                {pendingImprovements.length} pendentes
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {filteredImprovements.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-600">
                Nenhuma melhoria nesta categoria.
              </div>
            ) : (
              filteredImprovements.map(imp => (
                <ImprovementRow
                  key={imp.id}
                  improvement={imp}
                  onApply={handleApplyImprovement}
                  onIgnore={handleIgnoreImprovement}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
