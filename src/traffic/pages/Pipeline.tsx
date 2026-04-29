import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import type { Pipeline, PipelineStage, PipelineStageId, PipelineMode } from '../types'

// ─── Stage definitions ────────────────────────────────────────────────────────
const STAGE_DEFS: { id: PipelineStageId; label: string; icon: string; desc: string }[] = [
  { id: 'diagnostico',  label: 'Diagnóstico de Oferta', icon: '🔬', desc: 'Análise completa da sua oferta com score e recomendações' },
  { id: 'campanha',     label: 'Estratégia de Campanha', icon: '📢', desc: 'Estrutura, público, ângulo e copies prontos' },
  { id: 'criativos',   label: 'Geração de Criativos',   icon: '🎨', desc: '3 criativos com hooks, copies e direção criativa' },
  { id: 'compliance',  label: 'Verificação Compliance', icon: '🛡️', desc: 'Análise de risco em Meta, TikTok e Google' },
  { id: 'plano',       label: 'Plano de Lançamento',    icon: '📅', desc: 'Checklist de ações para os primeiros 3 dias' },
  { id: 'lancamento',  label: 'Aprovação Final',        icon: '🚀', desc: 'Revisão de tudo — aprovação antes de lançar' },
]

function makeInitialStages(): PipelineStage[] {
  return STAGE_DEFS.map(s => ({ id: s.id, status: 'pending' as const }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ScoreRing({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1)
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = pct >= 0.7 ? '#34d399' : pct >= 0.5 ? '#fbbf24' : '#f87171'
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#374151" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-white">{score.toFixed(1)}</span>
        <span className="text-[9px] text-gray-500">/{max}</span>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-violet-600/30 border-t-violet-500 animate-spin" />
      <div className="text-gray-400 text-sm">IA processando...</div>
    </div>
  )
}

// ─── Stage result renderers ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DiagnosticoResult({ r }: { r: any }) {
  if (!r) return null
  const nota = r.nota_geral
  const dims = nota?.dimensoes ?? {}
  return (
    <div className="space-y-4">
      {nota && (
        <div className="flex items-start gap-4 bg-gray-800 rounded-xl p-4">
          <ScoreRing score={nota.score} />
          <div>
            <div className="text-white font-semibold mb-1">Score Geral da Oferta</div>
            <p className="text-gray-300 text-sm leading-relaxed">{nota.justificativa}</p>
          </div>
        </div>
      )}
      {Object.keys(dims).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(dims).map(([k, v]) => (
            <div key={k} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-gray-400 text-xs capitalize">{k.replace(/_/g, ' ')}</span>
              <span className={`font-bold text-sm ${Number(v) >= 7 ? 'text-emerald-400' : Number(v) >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {r.resumo_executivo && (
        <div className="space-y-2">
          {r.resumo_executivo.o_que_melhorar && (
            <div className="bg-amber-600/10 border border-amber-600/30 rounded-xl p-3">
              <div className="text-amber-400 text-xs font-bold uppercase mb-1">⚠️ O que melhorar</div>
              <p className="text-gray-300 text-sm">{r.resumo_executivo.o_que_melhorar}</p>
            </div>
          )}
          {r.resumo_executivo.proximo_passo && (
            <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-3">
              <div className="text-violet-400 text-xs font-bold uppercase mb-1">→ Próximo passo</div>
              <p className="text-gray-300 text-sm">{r.resumo_executivo.proximo_passo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CampanhaResult({ r }: { r: any }) {
  if (!r) return null
  return (
    <div className="space-y-3">
      {r.nome_estrategico && (
        <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
          <div className="text-blue-400 text-xs font-bold uppercase mb-1">Nome Estratégico</div>
          <div className="text-white font-semibold">{r.nome_estrategico}</div>
        </div>
      )}
      {r.hipotese_principal && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs font-bold uppercase mb-1">Hipótese Principal</div>
          <p className="text-gray-200 text-sm">{r.hipotese_principal}</p>
        </div>
      )}
      {r.publico?.principal && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs font-bold uppercase mb-2">Público Principal</div>
          <p className="text-gray-200 text-sm">{r.publico.principal}</p>
          {r.publico.interesses?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(r.publico.interesses as string[]).slice(0, 5).map((i: string) => (
                <span key={i} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">{i}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {r.angulo_principal && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs font-bold uppercase mb-1">Ângulo Principal — {r.angulo_principal.tipo}</div>
          <p className="text-gray-200 text-sm">{r.angulo_principal.descricao ?? r.angulo_principal.justificativa}</p>
        </div>
      )}
      {r.copies?.textos_principais?.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs font-bold uppercase mb-2">Copies Prontas</div>
          <div className="space-y-2">
            {(r.copies.textos_principais as string[]).slice(0, 2).map((c: string, i: number) => (
              <div key={i} className="bg-gray-700/60 rounded-lg p-2.5 text-gray-200 text-sm">{c}</div>
            ))}
          </div>
        </div>
      )}
      {r.metricas_acompanhamento && (
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(r.metricas_acompanhamento).slice(0, 6).map(([k, v]) => (
            <div key={k} className="bg-emerald-600/10 border border-emerald-600/20 rounded-lg p-2 text-center">
              <div className="text-emerald-400 font-bold text-sm">{String(v)}</div>
              <div className="text-gray-500 text-[10px] capitalize">{k.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CriativosResult({ r }: { r: any[] }) {
  if (!r?.length) return null
  return (
    <div className="space-y-3">
      {r.map((c, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-pink-600/20 border border-pink-600/30 rounded-full flex items-center justify-center text-xs font-bold text-pink-400">{i + 1}</span>
            <span className="text-white font-semibold text-sm">{c.nome_criativo ?? c.nome ?? `Criativo ${i + 1}`}</span>
          </div>
          {(c['[VIDEO] hooks'] ?? c.hooks)?.length > 0 && (
            <div className="mb-2">
              <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Hook principal</div>
              <div className="bg-gray-700/60 rounded-lg p-2 text-gray-200 text-sm">
                {(c['[VIDEO] hooks'] ?? c.hooks)[0]}
              </div>
            </div>
          )}
          {(c['[VIDEO] copies'] ?? c.textos_principais)?.length > 0 && (
            <div>
              <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Copy</div>
              <div className="text-gray-300 text-sm leading-relaxed">
                {(c['[VIDEO] copies'] ?? c.textos_principais)[0]}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComplianceResult({ r }: { r: any }) {
  if (!r) return null
  const checks = Array.isArray(r) ? r : (r.platforms ?? r.results ?? [r])
  return (
    <div className="space-y-3">
      {checks.map((plat: Record<string, unknown>, i: number) => {
        const score = Number(plat.risk_score ?? plat.score ?? 0)
        const color = score <= 30 ? 'emerald' : score <= 60 ? 'amber' : 'red'
        const colorMap = { emerald: 'text-emerald-400 bg-emerald-600/10 border-emerald-600/30', amber: 'text-amber-400 bg-amber-600/10 border-amber-600/30', red: 'text-red-400 bg-red-600/10 border-red-600/30' }
        return (
          <div key={i} className={`rounded-xl p-4 border ${colorMap[color]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-white">{String(plat.platform ?? plat.name ?? `Plataforma ${i + 1}`)}</span>
              <span className={`text-sm font-bold ${colorMap[color].split(' ')[0]}`}>Risco: {score}/100</span>
            </div>
            {Array.isArray(plat.issues) && plat.issues.slice(0, 3).map((issue: Record<string, unknown>, j: number) => (
              <div key={j} className="text-gray-300 text-xs mt-1">• {String(issue.description ?? issue.message ?? issue)}</div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlanoResult({ r }: { r: any }) {
  if (!r) return null
  const tasks: Record<string, unknown>[] = r.tasks ?? []
  const priorityColor = (p: string) => p === 'critical' ? 'text-red-400' : p === 'high' ? 'text-amber-400' : 'text-gray-400'
  return (
    <div className="space-y-3">
      {r.summary && (
        <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-4">
          <div className="text-violet-400 text-xs font-bold uppercase mb-1">Foco do Dia</div>
          <p className="text-gray-200 text-sm">{r.summary.focus ?? r.summary}</p>
        </div>
      )}
      <div className="space-y-2">
        {tasks.slice(0, 8).map((task, i) => (
          <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-lg p-3">
            <span className={`text-xs font-bold mt-0.5 w-16 flex-shrink-0 ${priorityColor(String(task.priority))}`}>
              {String(task.priority ?? 'medium').toUpperCase()}
            </span>
            <span className="text-gray-200 text-sm">{String(task.description ?? task)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LancamentoSummary({ stages }: { stages: PipelineStage[] }) {
  const diagStage = stages.find(s => s.id === 'diagnostico')
  const campStage = stages.find(s => s.id === 'campanha')
  const crivStage = stages.find(s => s.id === 'criativos')
  const compStage = stages.find(s => s.id === 'compliance')

  return (
    <div className="space-y-4">
      <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-4 text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="text-white font-bold text-lg">Tudo pronto para lançar!</h3>
        <p className="text-gray-400 text-sm mt-1">Revise o resumo abaixo e confirme o lançamento</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {diagStage?.result && (
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500 text-xs uppercase font-bold mb-2">Oferta</div>
            <div className="text-white font-bold text-xl">{(diagStage.result as Record<string, { score: number }>)?.nota_geral?.score?.toFixed(1) ?? '–'}/10</div>
            <div className="text-gray-400 text-xs">Score da oferta</div>
          </div>
        )}
        {campStage?.result && (
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500 text-xs uppercase font-bold mb-2">Campanha</div>
            <div className="text-white font-semibold text-sm">{(campStage.result as Record<string, string>)?.nome_estrategico ?? 'Gerada'}</div>
            <div className="text-gray-400 text-xs">Estratégia definida</div>
          </div>
        )}
        {crivStage?.result && (
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500 text-xs uppercase font-bold mb-2">Criativos</div>
            <div className="text-white font-bold text-xl">{Array.isArray(crivStage.result) ? crivStage.result.length : 3}</div>
            <div className="text-gray-400 text-xs">Criativos gerados</div>
          </div>
        )}
        {compStage?.result && (
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-gray-500 text-xs uppercase font-bold mb-2">Compliance</div>
            <div className="text-emerald-400 font-bold text-xl">✓</div>
            <div className="text-gray-400 text-xs">Verificado</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── API callers ──────────────────────────────────────────────────────────────
async function runDiagnostico(product: { name: string; niche: string; main_promise: string; main_pain: string; main_desire: string; unique_mechanism: string; target_audience: string; price: number; currency: string; sales_page_url: string }) {
  const res = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productData: JSON.stringify(product) }),
  })
  if (!res.ok) throw new Error(`Diagnóstico falhou: ${res.status}`)
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runCampanha(product: Record<string, unknown>, diagResult: any) {
  const campaignData = `PRODUTO:\n${JSON.stringify(product, null, 2)}\n\nDIAGNÓSTICO:\n${JSON.stringify(diagResult, null, 2)}\n\nConfiguração:\nCanal: Meta Ads\nObjetivo: vendas_conversao\nFase: validacao\nOrçamento diário: ${product.currency} ${product.price ? Math.round(Number(product.price) * 0.1) : 50}`
  const res = await fetch('/api/campaign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignData }),
  })
  if (!res.ok) throw new Error(`Campanha falhou: ${res.status}`)
  const data = await res.json() as { strategy?: unknown; error?: string }
  if (data.error) throw new Error(data.error)
  return data.strategy ?? data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runCriativos(product: Record<string, unknown>, campResult: any) {
  const angles = ['dor/medo', 'transformação/benefício', 'curiosidade/gancho']
  const results = await Promise.all(
    angles.map(angle => {
      const creativeData = `PRODUTO:\n${JSON.stringify(product, null, 2)}\n\nCAMPANHA:\n${JSON.stringify({ nome: campResult?.nome_estrategico, angulo: campResult?.angulo_principal }, null, 2)}\n\nÂngulo: ${angle}\nFormato: Vídeo vertical (Reels/TikTok)\nDuração: 15-30s\nObjetivo: conversão`
      return fetch('/api/creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeData }),
      }).then(r => r.json())
    })
  )
  return results.map((r: Record<string, unknown>) => r.creative ?? r)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runCompliance(product: Record<string, unknown>, campResult: any) {
  const hooks = campResult?.copies?.textos_principais ?? []
  const res = await fetch('/api/compliance-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_name: product.name,
      niche: product.niche,
      headline: campResult?.nome_estrategico ?? String(product.name),
      copy_text: hooks.slice(0, 2).join('\n\n'),
      offer_description: String(product.main_promise ?? ''),
      landing_url: String(product.sales_page_url ?? ''),
      claims: [],
      platforms: ['meta_ads', 'tiktok_ads', 'google_display'],
    }),
  })
  if (!res.ok) throw new Error(`Compliance falhou: ${res.status}`)
  const data = await res.json() as Record<string, unknown>
  return data.results ?? data.platforms ?? data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runPlano(product: Record<string, unknown>, campResult: any, crivResults: any[]) {
  const planData = `PRODUTO: ${String(product.name)}\nNICHO: ${String(product.niche)}\n\nCAMPANHA GERADA:\n${JSON.stringify(campResult?.nome_estrategico)}\nHipótese: ${String(campResult?.hipotese_principal ?? '')}\n\nCRIATIVOS GERADOS: ${crivResults.length}\n\nPLANO PARA: lançamento da primeira campanha\nFoco: validação de oferta nos primeiros 3 dias`
  const res = await fetch('/api/plano', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planData }),
  })
  if (!res.ok) throw new Error(`Plano falhou: ${res.status}`)
  const data = await res.json() as { plan?: unknown }
  return data.plan ?? data
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()

  const product = productId ? tosDb.products.getById(productId) : null
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [activeStageIdx, setActiveStageIdx] = useState(0)
  const runningRef = useRef(false)

  // Initialize or load pipeline
  useEffect(() => {
    if (!productId || !product) return
    const existing = tosDb.pipelines.getActiveByProduct(productId)
    if (existing) {
      setPipeline(existing)
      const firstPending = existing.stages.findIndex(s => s.status !== 'approved' && s.status !== 'pending' || s.status === 'awaiting_approval')
      setActiveStageIdx(Math.max(0, firstPending === -1 ? existing.stages.length - 1 : firstPending))
    } else {
      const p: Pipeline = {
        id: generateId(),
        product_id: productId,
        mode: 'semi_auto',
        stages: makeInitialStages(),
        completed: false,
        created_at: now(),
        updated_at: now(),
      }
      tosDb.pipelines.save(p)
      setPipeline(p)
    }
  }, [productId, product])

  const savePipeline = useCallback((updated: Pipeline) => {
    const p = { ...updated, updated_at: now() }
    tosDb.pipelines.save(p)
    setPipeline(p)
    return p
  }, [])

  const updateStage = useCallback((pipeline: Pipeline, stageId: PipelineStageId, patch: Partial<PipelineStage>): Pipeline => {
    const stages = pipeline.stages.map(s => s.id === stageId ? { ...s, ...patch } : s)
    return { ...pipeline, stages }
  }, [])

  // Auto-run the current pending stage
  const runStage = useCallback(async (pl: Pipeline, stageId: PipelineStageId) => {
    if (runningRef.current) return
    runningRef.current = true

    // Mark as running
    let updated = updateStage(pl, stageId, { status: 'running', started_at: now() })
    updated = savePipeline(updated)

    const stageIdx = STAGE_DEFS.findIndex(s => s.id === stageId)
    setActiveStageIdx(stageIdx)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = null
      const prod = product! as unknown as Record<string, unknown>

      if (stageId === 'diagnostico') {
        result = await runDiagnostico(prod as Parameters<typeof runDiagnostico>[0])
      } else if (stageId === 'campanha') {
        const diagResult = updated.stages.find(s => s.id === 'diagnostico')?.result
        result = await runCampanha(prod, diagResult)
      } else if (stageId === 'criativos') {
        const campResult = updated.stages.find(s => s.id === 'campanha')?.result
        result = await runCriativos(prod, campResult)
      } else if (stageId === 'compliance') {
        const campResult = updated.stages.find(s => s.id === 'campanha')?.result
        result = await runCompliance(prod, campResult)
      } else if (stageId === 'plano') {
        const campResult = updated.stages.find(s => s.id === 'campanha')?.result
        const crivResult = updated.stages.find(s => s.id === 'criativos')?.result ?? []
        result = await runPlano(prod, campResult, Array.isArray(crivResult) ? crivResult : [])
      } else if (stageId === 'lancamento') {
        // No API call — just show summary
        result = { ready: true }
      }

      // Mark as awaiting approval (or auto-approve in full_auto except lancamento)
      const nextStatus = (updated.mode === 'full_auto' && stageId !== 'lancamento') ? 'approved' : 'awaiting_approval'
      updated = updateStage(updated, stageId, { status: nextStatus, result, approved_at: nextStatus === 'approved' ? now() : undefined })
      updated = savePipeline(updated)

      // If full_auto, continue to next stage automatically
      if (updated.mode === 'full_auto' && stageId !== 'lancamento') {
        const nextStage = getNextPendingStage(updated)
        if (nextStage) {
          runningRef.current = false
          setTimeout(() => runStage(updated, nextStage), 800)
          return
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      updated = updateStage(updated, stageId, { status: 'error', error: msg })
      savePipeline(updated)
    }

    runningRef.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, updateStage, savePipeline])

  function getNextPendingStage(pl: Pipeline): PipelineStageId | null {
    for (const def of STAGE_DEFS) {
      const s = pl.stages.find(x => x.id === def.id)
      if (s?.status === 'pending') return def.id
    }
    return null
  }

  // Auto-start first pending stage on load
  useEffect(() => {
    if (!pipeline || runningRef.current) return
    const nextStage = getNextPendingStage(pipeline)
    if (nextStage) {
      runStage(pipeline, nextStage)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline?.id])

  function handleApprove(stageId: PipelineStageId) {
    if (!pipeline) return
    let updated = updateStage(pipeline, stageId, { status: 'approved', approved_at: now() })
    updated = savePipeline(updated)

    if (stageId === 'lancamento') {
      // Complete the pipeline
      updated = savePipeline({ ...updated, completed: true })
      navigate(`/produtos/${pipeline.product_id}`)
      return
    }

    const nextStage = getNextPendingStage(updated)
    if (nextStage) {
      setTimeout(() => runStage(updated, nextStage), 300)
    }
  }

  function handleRetry(stageId: PipelineStageId) {
    if (!pipeline) return
    const updated = updateStage(pipeline, stageId, { status: 'pending', error: undefined })
    const saved = savePipeline(updated)
    setTimeout(() => runStage(saved, stageId), 100)
  }

  function handleModeChange(mode: PipelineMode) {
    if (!pipeline) return
    savePipeline({ ...pipeline, mode })
  }

  function handleReset() {
    if (!pipeline) return
    const reset: Pipeline = { ...pipeline, stages: makeInitialStages(), completed: false }
    const saved = savePipeline(reset)
    runningRef.current = false
    setActiveStageIdx(0)
    setTimeout(() => runStage(saved, 'diagnostico'), 300)
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-gray-400">
        Produto não encontrado.{' '}
        <button onClick={() => navigate('/produtos')} className="text-violet-400 underline">Ver produtos</button>
      </div>
    )
  }

  if (!pipeline) return <div className="p-6"><Spinner /></div>

  const activeStage = pipeline.stages[activeStageIdx]
  const activeDef = STAGE_DEFS[activeStageIdx]
  const allApproved = pipeline.stages.every(s => s.status === 'approved')
  const progress = pipeline.stages.filter(s => s.status === 'approved').length

  return (
    <div className="flex h-full">
      {/* ── Left stepper ── */}
      <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Product info */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pipeline</div>
          <div className="text-white font-semibold text-sm leading-tight truncate">{product.name}</div>
          <div className="text-gray-500 text-xs mt-0.5">{product.niche}</div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>Progresso</span>
              <span>{progress}/{STAGE_DEFS.length}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${(progress / STAGE_DEFS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Modo</div>
          <div className="grid grid-cols-2 gap-1">
            {(['semi_auto', 'full_auto'] as PipelineMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                  pipeline.mode === m
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {m === 'semi_auto' ? 'Semi-Auto' : 'Full Auto'}
              </button>
            ))}
          </div>
          <div className="text-[9px] text-gray-600 mt-1.5 leading-tight">
            {pipeline.mode === 'semi_auto'
              ? 'Você aprova cada etapa'
              : 'IA executa tudo — aprova só no lançamento'}
          </div>
        </div>

        {/* Stages list */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {STAGE_DEFS.map((def, i) => {
            const stage = pipeline.stages.find(s => s.id === def.id)
            const isActive = i === activeStageIdx
            const status = stage?.status ?? 'pending'

            const statusIcon = status === 'approved' ? '✅'
              : status === 'running' ? '⏳'
              : status === 'awaiting_approval' ? '👁️'
              : status === 'error' ? '❌'
              : '○'

            return (
              <button
                key={def.id}
                onClick={() => setActiveStageIdx(i)}
                className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-violet-600/15 border-r-2 border-violet-500' : 'hover:bg-gray-800/50'
                }`}
              >
                <span className="text-sm mt-0.5 flex-shrink-0">{statusIcon}</span>
                <div>
                  <div className={`text-xs font-medium leading-tight ${isActive ? 'text-violet-300' : status === 'approved' ? 'text-gray-300' : 'text-gray-500'}`}>
                    {def.label}
                  </div>
                  {status === 'running' && (
                    <div className="text-[10px] text-violet-400 mt-0.5">Processando...</div>
                  )}
                  {status === 'awaiting_approval' && (
                    <div className="text-[10px] text-amber-400 mt-0.5">Aguardando aprovação</div>
                  )}
                  {status === 'error' && (
                    <div className="text-[10px] text-red-400 mt-0.5">Erro</div>
                  )}
                </div>
              </button>
            )
          })}
        </nav>

        {/* Reset button */}
        <div className="px-4 py-3 border-t border-gray-800">
          <button
            onClick={handleReset}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            🔄 Reiniciar Pipeline
          </button>
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {/* Stage header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-violet-600/20 border border-violet-600/30 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              {activeDef?.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">{activeDef?.label}</h2>
              <p className="text-gray-400 text-xs">{activeDef?.desc}</p>
            </div>
            {activeStage?.status === 'approved' && (
              <span className="bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                ✅ Aprovado
              </span>
            )}
          </div>

          {/* Stage content */}
          <div className="mb-5">
            {activeStage?.status === 'pending' && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">⏳</div>
                <p>Esta etapa será iniciada automaticamente após as anteriores</p>
              </div>
            )}

            {activeStage?.status === 'running' && <Spinner />}

            {(activeStage?.status === 'awaiting_approval' || activeStage?.status === 'approved') && activeStage.result && (
              <div>
                {activeStage.id === 'diagnostico' && <DiagnosticoResult r={activeStage.result} />}
                {activeStage.id === 'campanha' && <CampanhaResult r={activeStage.result} />}
                {activeStage.id === 'criativos' && <CriativosResult r={activeStage.result} />}
                {activeStage.id === 'compliance' && <ComplianceResult r={activeStage.result} />}
                {activeStage.id === 'plano' && <PlanoResult r={activeStage.result} />}
                {activeStage.id === 'lancamento' && <LancamentoSummary stages={pipeline.stages} />}
              </div>
            )}

            {activeStage?.status === 'error' && (
              <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-5 text-center">
                <div className="text-red-400 font-semibold mb-2">❌ Erro nesta etapa</div>
                <p className="text-gray-400 text-sm mb-4">{activeStage.error}</p>
                <button
                  onClick={() => handleRetry(activeStage.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>

          {/* Approval / action buttons */}
          {activeStage?.status === 'awaiting_approval' && (
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(activeStage.id)}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {activeStage.id === 'lancamento' ? '🚀 Confirmar Lançamento' : '✅ Aprovar e Continuar →'}
              </button>
              <button
                onClick={() => handleRetry(activeStage.id)}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors border border-gray-700"
              >
                🔄 Regerar
              </button>
            </div>
          )}

          {activeStage?.status === 'approved' && activeStage.id !== 'lancamento' && (
            <div className="text-center">
              <div className="text-emerald-400 text-sm">
                ✅ Etapa aprovada —{' '}
                {getNextPendingStage(pipeline)
                  ? 'próxima etapa em andamento'
                  : allApproved ? 'pipeline completo!' : 'aguardando...'}
              </div>
            </div>
          )}

          {allApproved && !pipeline.completed && (
            <div className="mt-4 bg-emerald-600/10 border border-emerald-600/30 rounded-xl p-4 text-center">
              <div className="text-emerald-400 font-semibold">🎉 Pipeline completo!</div>
              <button
                onClick={() => navigate(`/produtos/${pipeline.product_id}`)}
                className="mt-3 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
              >
                Ver Produto →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
