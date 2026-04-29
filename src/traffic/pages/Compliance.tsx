import { useState, useEffect, useRef, useCallback } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  COMPLIANCE_PLATFORM_LABELS,
  COMPLIANCE_PLATFORM_ICONS,
  COMPLIANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLORS,
  COMPLIANCE_ISSUE_TYPE_LABELS,
  COMPLIANCE_SEVERITY_COLORS,
  COMPLIANCE_RISK_COLORS,
  COMPLIANCE_RISK_STROKE,
  COMPLIANCE_RISK_LEVEL_COLORS,
} from '../utils/helpers'
import type {
  CompliancePlatform,
  ComplianceCheck,
  ComplianceAnalysis,
} from '../types'

// ── constants ─────────────────────────────────────────────────────────────────
const ALL_PLATFORMS: CompliancePlatform[] = [
  'meta_ads', 'tiktok_ads', 'google_ads', 'youtube_ads', 'native_ads',
]

const ANALYSIS_STEPS = [
  'Lendo copy e headline...',
  'Verificando promessas e claims...',
  'Analisando linguagem proibida...',
  'Checando políticas Meta e TikTok...',
  'Checando políticas Google e YouTube...',
  'Identificando riscos sensíveis...',
  'Gerando versões seguras do conteúdo...',
  'Calculando nota de risco final...',
]

// ── risk score ring (SVG) ─────────────────────────────────────────────────────
function RiskRing({ score }: { score: number }) {
  const r   = 34
  const circ = 2 * Math.PI * r          // ≈ 213.6
  const arc  = (score / 10) * circ
  const color = COMPLIANCE_RISK_STROKE(score)

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1f2937" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold leading-none ${COMPLIANCE_RISK_COLORS(score)}`}>{score}</span>
        <span className="text-[9px] text-gray-500 mt-0.5">/ 10</span>
      </div>
    </div>
  )
}

// ── fallback analysis (API unavailable) ───────────────────────────────────────
function fallbackAnalysis(): ComplianceAnalysis {
  return {
    risk_score: 5,
    status: 'atencao',
    summary: 'Servidor de análise indisponível. Resultado de fallback gerado localmente.',
    issues: [{
      type: 'outro',
      severity: 'medio',
      description: 'Não foi possível conectar ao servidor de análise de IA.',
      excerpt: '—',
      suggestion: 'Tente novamente quando o servidor estiver disponível.',
    }],
    platform_recs: ALL_PLATFORMS.map(p => ({
      platform: p,
      allowed: true,
      risk_level: 'medio' as const,
      specific_issues: ['Análise automática indisponível — revisão manual necessária'],
      recommendations: ['Revise manualmente antes de publicar'],
    })),
    safe_copy_version: 'Versão segura não gerada — tente novamente.',
    safe_headline_version: 'Versão segura não gerada — tente novamente.',
    safe_offer_version: 'Versão segura não gerada — tente novamente.',
    general_recommendations: ['Faça revisão manual das políticas de cada plataforma antes de publicar.'],
    what_to_remove: [],
    what_to_keep: [],
  }
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Compliance() {
  // ── tab / step state ──────────────────────────────────────────────────────
  const [tab, setTab]   = useState<'analisar' | 'historico'>('analisar')
  const [step, setStep] = useState<'form' | 'analyzing' | 'result'>('form')

  // ── form state ────────────────────────────────────────────────────────────
  const [productId,        setProductId]        = useState('')
  const [creativeId,       setCreativeId]        = useState('')
  const [niche,            setNiche]             = useState('')
  const [platforms,        setPlatforms]         = useState<CompliancePlatform[]>(['meta_ads', 'tiktok_ads'])
  const [headline,         setHeadline]          = useState('')
  const [copyText,         setCopyText]          = useState('')
  const [offerDescription, setOfferDescription]  = useState('')
  const [landingUrl,       setLandingUrl]        = useState('')
  const [claims,           setClaims]            = useState<string[]>([])
  const [claimInput,       setClaimInput]        = useState('')

  // ── analysis state ────────────────────────────────────────────────────────
  const [genStep,          setGenStep]           = useState(0)
  const [currentCheck,     setCurrentCheck]      = useState<ComplianceCheck | null>(null)
  const [savedToHistory,   setSavedToHistory]    = useState(false)
  const [resultTab,        setResultTab]         = useState<'issues' | 'plataformas' | 'versao_segura' | 'dicas'>('issues')
  const [expandedIssue,    setExpandedIssue]     = useState<number | null>(null)
  const [expandedPlatform, setExpandedPlatform]  = useState<string | null>(null)
  const [copiedField,      setCopiedField]       = useState<string | null>(null)

  // ── history state ─────────────────────────────────────────────────────────
  const [historyChecks,    setHistoryChecks]     = useState<ComplianceCheck[]>([])
  const [historyFilter,    setHistoryFilter]     = useState<'all' | 'seguro' | 'atencao' | 'alto_risco' | 'nao_recomendado'>('all')
  const [selectedHistory,  setSelectedHistory]   = useState<ComplianceCheck | null>(null)

  // ── refs ──────────────────────────────────────────────────────────────────
  const apiDoneRef    = useRef(false)
  const apiResultRef  = useRef<ComplianceAnalysis | null>(null)
  const genStepRef    = useRef(0)
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── derived data ──────────────────────────────────────────────────────────
  const products    = tosDb.products.getAll()
  const aiCreatives = tosDb.aiCreatives.getAll()

  // ── load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'historico') setHistoryChecks(tosDb.complianceChecks.getAll())
  }, [tab])

  // ── auto-fill from product ─────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return
    const p = tosDb.products.getById(productId)
    if (!p) return
    if (!niche) setNiche(p.niche)
    if (!offerDescription) setOfferDescription(p.main_promise || p.main_benefit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  // ── auto-fill from creative ────────────────────────────────────────────────
  useEffect(() => {
    if (!creativeId) return
    const c = tosDb.aiCreatives.getById(creativeId)
    if (!c) return
    const hook = c.strategy.roteiro?.hook
    const copy = c.strategy.texto_anuncio?.textos_principais?.[0]
    if (hook)  setHeadline(hook)
    if (copy)  setCopyText(copy)
  }, [creativeId])

  // ── platform toggle ──────────────────────────────────────────────────────
  const togglePlatform = (p: CompliancePlatform) => {
    setPlatforms(prev =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p],
    )
  }

  // ── claim tag input ───────────────────────────────────────────────────────
  const addClaim = (value: string) => {
    const trimmed = value.trim().replace(/,$/, '')
    if (trimmed && !claims.includes(trimmed)) setClaims(prev => [...prev, trimmed])
    setClaimInput('')
  }

  const removeClaim = (i: number) => setClaims(prev => prev.filter((_, j) => j !== i))

  // ── copy to clipboard ─────────────────────────────────────────────────────
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // ── finalize analysis ─────────────────────────────────────────────────────
  const finalizeAnalysis = useCallback(() => {
    const analysis = apiResultRef.current ?? fallbackAnalysis()
    const product  = productId ? tosDb.products.getById(productId) : null
    const check: ComplianceCheck = {
      id:               generateId(),
      product_id:       productId,
      product_name:     product?.name ?? '',
      platforms,
      niche,
      copy_text:        copyText,
      headline,
      offer_description: offerDescription,
      landing_url:      landingUrl,
      claims,
      analysis,
      created_at:       now(),
    }
    setCurrentCheck(check)
    setSavedToHistory(false)
    setResultTab('issues')
    setExpandedIssue(null)
    setStep('result')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, platforms, niche, copyText, headline, offerDescription, landingUrl, claims])

  // ── start analysis ────────────────────────────────────────────────────────
  const startAnalysis = () => {
    if (!copyText.trim() && !headline.trim() && !offerDescription.trim()) return

    setStep('analyzing')
    setGenStep(0)
    genStepRef.current  = 0
    apiDoneRef.current  = false
    apiResultRef.current = null

    // Step animation
    intervalRef.current = setInterval(() => {
      genStepRef.current += 1
      setGenStep(genStepRef.current)
      if (genStepRef.current >= ANALYSIS_STEPS.length && apiDoneRef.current) {
        clearInterval(intervalRef.current!)
        finalizeAnalysis()
      }
    }, 420)

    // API call
    const product = productId ? tosDb.products.getById(productId) : null
    fetch('/api/compliance-analyze', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        copy_text:         copyText,
        headline,
        offer_description: offerDescription,
        landing_url:       landingUrl,
        claims,
        niche,
        platforms,
        product_name:      product?.name,
      }),
    })
      .then(r => r.json())
      .then((analysis: ComplianceAnalysis) => {
        apiResultRef.current = analysis
        apiDoneRef.current   = true
        if (genStepRef.current >= ANALYSIS_STEPS.length) {
          clearInterval(intervalRef.current!)
          finalizeAnalysis()
        }
      })
      .catch(() => {
        apiResultRef.current = fallbackAnalysis()
        apiDoneRef.current   = true
        if (genStepRef.current >= ANALYSIS_STEPS.length) {
          clearInterval(intervalRef.current!)
          finalizeAnalysis()
        }
      })
  }

  // ── save to history ───────────────────────────────────────────────────────
  const saveCheck = () => {
    if (!currentCheck || savedToHistory) return
    tosDb.complianceChecks.save(currentCheck)
    setSavedToHistory(true)
  }

  // ── reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setStep('form')
    setCurrentCheck(null)
    setSavedToHistory(false)
    setGenStep(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // ── filtered history ──────────────────────────────────────────────────────
  const filteredHistory = historyFilter === 'all'
    ? historyChecks
    : historyChecks.filter(c => c.analysis.status === historyFilter)

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER HELPERS ────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${COMPLIANCE_STATUS_COLORS[status] ?? 'bg-gray-700 text-gray-400 border-gray-600'}`}>
      {status === 'seguro'          ? '✅' :
       status === 'atencao'         ? '⚠️' :
       status === 'alto_risco'      ? '🔶' : '🔴'} {COMPLIANCE_STATUS_LABELS[status] ?? status}
    </span>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER: ANALYZING ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    const pct = Math.min(100, Math.round((genStep / ANALYSIS_STEPS.length) * 100))
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🛡️</div>
            <h2 className="text-xl font-bold text-white">Analisando Compliance</h2>
            <p className="text-sm text-gray-500 mt-1">Verificando políticas de publicidade...</p>
          </div>

          {/* progress bar */}
          <div className="bg-gray-800 rounded-full h-2 mb-6">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* steps */}
          <div className="space-y-2">
            {ANALYSIS_STEPS.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                i < genStep ? 'opacity-100' : i === genStep ? 'opacity-100 bg-violet-500/10 border border-violet-500/20' : 'opacity-30'
              }`}>
                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-sm">
                  {i < genStep ? '✅' : i === genStep ? '⏳' : '○'}
                </span>
                <span className={`text-sm ${i === genStep ? 'text-violet-300 font-medium' : i < genStep ? 'text-gray-400' : 'text-gray-600'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center mt-6 text-xs text-gray-600">
            {pct}% concluído
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER: RESULT ────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'result' && currentCheck) {
    const { analysis } = currentCheck
    const criticalCount = analysis.issues.filter(i => i.severity === 'critico').length
    const highCount     = analysis.issues.filter(i => i.severity === 'alto').length

    return (
      <div className="p-6 space-y-5">

        {/* ── result header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={resetForm}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Nova Análise
          </button>
          <div className="flex items-center gap-2.5">
            {savedToHistory ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">✅ Salvo no histórico</span>
            ) : (
              <button
                onClick={saveCheck}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                💾 Salvar no Histórico
              </button>
            )}
          </div>
        </div>

        {/* ── score card ─────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-6">
            <RiskRing score={analysis.risk_score} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <StatusBadge status={analysis.status} />
                {criticalCount > 0 && (
                  <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                    {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                  </span>
                )}
                {highCount > 0 && (
                  <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                    {highCount} alto{highCount > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {analysis.issues.length} problema{analysis.issues.length !== 1 ? 's' : ''} encontrado{analysis.issues.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
              {currentCheck.product_name && (
                <div className="mt-2 text-xs text-gray-500">
                  Produto: <span className="text-gray-400">{currentCheck.product_name}</span>
                  {' · '} Nicho: <span className="text-gray-400">{currentCheck.niche}</span>
                </div>
              )}
            </div>
            {/* platform quick overview */}
            <div className="hidden lg:flex flex-col gap-1.5 flex-shrink-0">
              {analysis.platform_recs.map(pr => (
                <div key={pr.platform} className="flex items-center gap-2 text-xs">
                  <span>{COMPLIANCE_PLATFORM_ICONS[pr.platform]}</span>
                  <span className="text-gray-500 w-20">{COMPLIANCE_PLATFORM_LABELS[pr.platform]}</span>
                  <span className={`font-medium ${COMPLIANCE_RISK_LEVEL_COLORS[pr.risk_level] ?? 'text-gray-400'}`}>
                    {pr.risk_level === 'reprovado' ? '✗ Reprovado' :
                     pr.risk_level === 'alto'      ? '⚠ Alto' :
                     pr.risk_level === 'medio'     ? '~ Médio' : '✓ Baixo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── result tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1.5">
          {([
            { key: 'issues',       label: `Problemas (${analysis.issues.length})`, icon: '🔍' },
            { key: 'plataformas',  label: 'Por Plataforma',  icon: '📡' },
            { key: 'versao_segura',label: 'Versão Segura',   icon: '✅' },
            { key: 'dicas',        label: 'Recomendações',   icon: '💡' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setResultTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                resultTab === t.key
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── ISSUES tab ─────────────────────────────────────────────────── */}
        {resultTab === 'issues' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* issue list */}
            <div className="lg:col-span-2 space-y-2">
              {analysis.issues.length === 0 ? (
                <div className="bg-gray-900 border border-emerald-500/20 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <div className="text-lg font-semibold text-emerald-400">Nenhum problema encontrado</div>
                  <div className="text-sm text-gray-500 mt-1">
                    O conteúdo está dentro das políticas analisadas.
                  </div>
                </div>
              ) : analysis.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${
                    expandedIssue === idx ? 'border-violet-500/40' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <button
                    onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                    className="w-full flex items-start gap-3 p-4 text-left"
                  >
                    <span className={`mt-0.5 text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${COMPLIANCE_SEVERITY_COLORS[issue.severity] ?? 'bg-gray-700 text-gray-400'}`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-white">
                          {COMPLIANCE_ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{issue.description}</p>
                    </div>
                    <span className="text-gray-600 flex-shrink-0 ml-2">{expandedIssue === idx ? '▲' : '▼'}</span>
                  </button>

                  {expandedIssue === idx && (
                    <div className="border-t border-gray-800 p-4 space-y-3">
                      {issue.excerpt && issue.excerpt !== '—' && (
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Trecho problemático</div>
                          <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-300 italic">
                            "{issue.excerpt}"
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Versão segura sugerida</div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-300">
                          {issue.suggestion}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* what to remove / keep */}
            <div className="space-y-3">
              {analysis.what_to_remove.length > 0 && (
                <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4">
                  <div className="text-[10px] text-red-400 uppercase tracking-wider mb-3 font-semibold">
                    🗑 Remover
                  </div>
                  <ul className="space-y-2">
                    {analysis.what_to_remove.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.what_to_keep.length > 0 && (
                <div className="bg-gray-900 border border-emerald-500/20 rounded-xl p-4">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-3 font-semibold">
                    ✅ Manter
                  </div>
                  <ul className="space-y-2">
                    {analysis.what_to_keep.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PLATFORMS tab ───────────────────────────────────────────────── */}
        {resultTab === 'plataformas' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.platform_recs.map(pr => {
              const isExpanded = expandedPlatform === pr.platform
              const riskClass  = COMPLIANCE_RISK_LEVEL_COLORS[pr.risk_level] ?? 'text-gray-400'
              const bgClass =
                pr.risk_level === 'reprovado' ? 'border-red-500/30 bg-red-500/3'   :
                pr.risk_level === 'alto'      ? 'border-orange-500/30'             :
                pr.risk_level === 'medio'     ? 'border-amber-500/30'              :
                                               'border-emerald-500/30'

              return (
                <div key={pr.platform} className={`bg-gray-900 border rounded-xl overflow-hidden ${bgClass}`}>
                  <button
                    onClick={() => setExpandedPlatform(isExpanded ? null : pr.platform)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{COMPLIANCE_PLATFORM_ICONS[pr.platform]}</span>
                        <span className="text-sm font-semibold text-white">{COMPLIANCE_PLATFORM_LABELS[pr.platform]}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${riskClass}`}>
                        {pr.risk_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pr.allowed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {pr.allowed ? '✓ Permitido' : '✗ Não recomendado'}
                      </span>
                      {pr.specific_issues.length > 0 && (
                        <span className="text-[10px] text-gray-500">{pr.specific_issues.length} issue(s)</span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-800 p-4 space-y-3">
                      {pr.specific_issues.length > 0 && (
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Issues específicos</div>
                          <ul className="space-y-1.5">
                            {pr.specific_issues.map((si, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                <span className="text-amber-400 flex-shrink-0">•</span> {si}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {pr.recommendations.length > 0 && (
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recomendações</div>
                          <ul className="space-y-1.5">
                            {pr.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-emerald-400">
                                <span className="flex-shrink-0">→</span> {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── SAFE VERSION tab ────────────────────────────────────────────── */}
        {resultTab === 'versao_segura' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { key: 'copy',     label: '📝 Copy Segura',     content: analysis.safe_copy_version },
              { key: 'headline', label: '🎯 Headline Segura', content: analysis.safe_headline_version },
              { key: 'offer',    label: '🏷️ Oferta Segura',  content: analysis.safe_offer_version },
            ].map(item => (
              <div key={item.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-300">{item.label}</div>
                  <button
                    onClick={() => copyToClipboard(item.content, item.key)}
                    className="text-[10px] text-gray-500 hover:text-violet-400 transition-colors px-2 py-1 rounded border border-gray-700 hover:border-violet-500/40"
                  >
                    {copiedField === item.key ? '✅ Copiado' : '📋 Copiar'}
                  </button>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── RECOMMENDATIONS tab ─────────────────────────────────────────── */}
        {resultTab === 'dicas' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-4">💡 Recomendações Gerais</div>
            {analysis.general_recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.general_recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-lg">
                    <span className="text-violet-400 font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nenhuma recomendação adicional.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER: HISTORY DETAIL ────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  if (tab === 'historico' && selectedHistory) {
    const { analysis } = selectedHistory
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedHistory(null)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Voltar ao histórico
          </button>
          <span className="text-xs text-gray-500">
            {new Date(selectedHistory.created_at).toLocaleString('pt-BR')}
          </span>
        </div>

        {/* score + summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-6">
            <RiskRing score={analysis.risk_score} />
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <StatusBadge status={analysis.status} />
                {selectedHistory.product_name && (
                  <span className="text-xs text-gray-500">{selectedHistory.product_name}</span>
                )}
                <span className="text-xs text-gray-600">{selectedHistory.niche}</span>
              </div>
              <p className="text-sm text-gray-300">{analysis.summary}</p>
            </div>
          </div>
        </div>

        {/* issues */}
        {analysis.issues.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Problemas identificados</div>
            {analysis.issues.map((issue, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${COMPLIANCE_SEVERITY_COLORS[issue.severity] ?? 'bg-gray-700 text-gray-400'}`}>
                  {issue.severity.toUpperCase()}
                </span>
                <div>
                  <div className="text-xs font-semibold text-white mb-1">{COMPLIANCE_ISSUE_TYPE_LABELS[issue.type]}</div>
                  <p className="text-xs text-gray-400">{issue.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* platform summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {analysis.platform_recs.map(pr => (
            <div key={pr.platform} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg mb-1">{COMPLIANCE_PLATFORM_ICONS[pr.platform]}</div>
              <div className="text-[10px] text-gray-500">{COMPLIANCE_PLATFORM_LABELS[pr.platform]}</div>
              <div className={`text-[10px] font-bold mt-1 ${COMPLIANCE_RISK_LEVEL_COLORS[pr.risk_level]}`}>
                {pr.risk_level}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER: MAIN (form + history tabs) ────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* ── page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-emerald-900/40">
            🛡️
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Compliance & Segurança</h1>
            <p className="text-xs text-gray-500">Análise de políticas de publicidade por IA</p>
          </div>
        </div>

        {/* tabs */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTab('analisar')}
            className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${tab === 'analisar' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            🔍 Analisar
          </button>
          <button
            onClick={() => setTab('historico')}
            className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${tab === 'historico' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            📋 Histórico
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── HISTORICO ──────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {tab === 'historico' && (
        <div className="space-y-4">
          {/* filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'seguro', 'atencao', 'alto_risco', 'nao_recomendado'] as const).map(f => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${historyFilter === f ? 'bg-violet-600 border-violet-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'}`}
              >
                {f === 'all' ? 'Todos' : COMPLIANCE_STATUS_LABELS[f]}
                {f !== 'all' && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({historyChecks.filter(c => c.analysis.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <div className="text-4xl mb-3">🛡️</div>
              <div className="text-sm">Nenhuma análise salva ainda.</div>
              <button
                onClick={() => setTab('analisar')}
                className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline"
              >
                Fazer primeira análise →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map(check => (
                <button
                  key={check.id}
                  onClick={() => setSelectedHistory(check)}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={check.analysis.status} />
                      <span className={`text-lg font-bold ${COMPLIANCE_RISK_COLORS(check.analysis.risk_score)}`}>
                        {check.analysis.risk_score}/10
                      </span>
                      {check.product_name && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{check.product_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex gap-1">
                        {check.platforms.map(p => (
                          <span key={p} title={COMPLIANCE_PLATFORM_LABELS[p]}>{COMPLIANCE_PLATFORM_ICONS[p]}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {new Date(check.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-gray-600 group-hover:text-gray-400">→</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{check.analysis.summary}</p>
                  {check.copy_text && (
                    <p className="text-[10px] text-gray-600 mt-1 line-clamp-1 italic">
                      "{check.copy_text.slice(0, 100)}{check.copy_text.length > 100 ? '...' : ''}"
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── FORM ───────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {tab === 'analisar' && step === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Left: form ──────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">

            {/* ── Section 1: context ────────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">📋 Contexto</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* product */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Produto (opcional)</label>
                  <select
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Selecionar produto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* niche */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Nicho / Segmento <span className="text-red-400">*</span></label>
                  <input
                    value={niche}
                    onChange={e => setNiche(e.target.value)}
                    placeholder="ex: saúde, finanças, ecommerce, SaaS..."
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600"
                  />
                </div>
              </div>

              {/* creative auto-fill */}
              {aiCreatives.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Importar de um criativo (opcional)</label>
                  <select
                    value={creativeId}
                    onChange={e => setCreativeId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Preencher a partir de um criativo...</option>
                    {aiCreatives.map(c => (
                      <option key={c.id} value={c.id}>{c.strategy.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* platforms */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Plataformas alvo</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        platforms.includes(p)
                          ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                      }`}
                    >
                      <span>{COMPLIANCE_PLATFORM_ICONS[p]}</span>
                      <span>{COMPLIANCE_PLATFORM_LABELS[p]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 2: content ────────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">✍️ Conteúdo do Anúncio</div>

              {/* headline */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Headline do Anúncio</label>
                <input
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="ex: Perca 10kg em 30 dias sem academia"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600"
                />
              </div>

              {/* copy */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Copy do Anúncio</label>
                <textarea
                  value={copyText}
                  onChange={e => setCopyText(e.target.value)}
                  rows={5}
                  placeholder="Cole aqui o texto completo do anúncio..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500 placeholder-gray-600 resize-none"
                />
              </div>

              {/* offer */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Descrição da Oferta</label>
                <textarea
                  value={offerDescription}
                  onChange={e => setOfferDescription(e.target.value)}
                  rows={3}
                  placeholder="Descreva a oferta, bônus, garantia, preço..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500 placeholder-gray-600 resize-none"
                />
              </div>

              {/* landing */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">URL da Landing Page (opcional)</label>
                <input
                  value={landingUrl}
                  onChange={e => setLandingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600"
                />
              </div>
            </div>

            {/* ── Section 3: claims ─────────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">⚡ Claims e Promessas Específicas</div>
              <p className="text-xs text-gray-500 mb-3">
                Adicione claims e promessas que você quer usar. Pressione Enter ou vírgula para adicionar.
              </p>

              <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-800 border border-gray-700 rounded-lg min-h-[48px] focus-within:border-violet-500 transition-colors">
                {claims.map((claim, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                    {claim}
                    <button
                      onClick={() => removeClaim(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={claimInput}
                  onChange={e => setClaimInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && claimInput.trim()) {
                      e.preventDefault()
                      addClaim(claimInput)
                    }
                    if (e.key === 'Backspace' && !claimInput && claims.length > 0) {
                      removeClaim(claims.length - 1)
                    }
                  }}
                  onBlur={() => { if (claimInput.trim()) addClaim(claimInput) }}
                  placeholder={claims.length === 0 ? 'ex: Resultados em 7 dias garantidos, Aprovado por médicos...' : ''}
                  className="flex-1 bg-transparent text-sm text-white outline-none min-w-[200px] placeholder-gray-600"
                />
              </div>

              {claims.length > 0 && (
                <button onClick={() => setClaims([])} className="mt-2 text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                  Limpar todos
                </button>
              )}
            </div>

            {/* ── CTA ───────────────────────────────────────────────────── */}
            <button
              onClick={startAnalysis}
              disabled={!copyText.trim() && !headline.trim() && !offerDescription.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
            >
              🛡️ Analisar Compliance Agora
            </button>
            {!copyText.trim() && !headline.trim() && !offerDescription.trim() && (
              <p className="text-[10px] text-gray-600 text-center -mt-2">
                Preencha pelo menos a headline, copy ou oferta para analisar
              </p>
            )}
          </div>

          {/* ── Right: info panel ──────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-3">

            {/* what is analyzed */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">🔍 O que é analisado</div>
              <ul className="space-y-2 text-xs text-gray-400">
                {[
                  'Promessas exageradas ou não verificáveis',
                  'Claims sensíveis (saúde, finanças, jurídico)',
                  'Linguagem de "antes e depois"',
                  'Garantias absolutas',
                  'Autoridade indevida (ex: "aprovado por médicos")',
                  'Linguagem de urgência extrema',
                  'Segmentação de grupos protegidos',
                  'Risco de reprovação por plataforma',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-violet-400 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* platforms */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">📡 Plataformas analisadas</div>
              <div className="space-y-2">
                {ALL_PLATFORMS.map(p => (
                  <div key={p} className="flex items-center gap-2.5 text-xs">
                    <span>{COMPLIANCE_PLATFORM_ICONS[p]}</span>
                    <span className="text-gray-400">{COMPLIANCE_PLATFORM_LABELS[p]}</span>
                    {platforms.includes(p) && (
                      <span className="ml-auto text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">selecionada</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* status legend */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">📊 Status possíveis</div>
              <div className="space-y-2">
                {([
                  { status: 'seguro',          desc: 'Aprovado em todas as plataformas' },
                  { status: 'atencao',         desc: 'Pequenos ajustes recomendados' },
                  { status: 'alto_risco',      desc: 'Reprovação provável em 1+ plataformas' },
                  { status: 'nao_recomendado', desc: 'Reprovação quase certa + risco de conta' },
                ]).map(item => (
                  <div key={item.status} className="flex items-start gap-2">
                    <StatusBadge status={item.status} />
                    <span className="text-[10px] text-gray-500 mt-1">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
