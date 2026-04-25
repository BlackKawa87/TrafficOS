import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatDate,
  getStatusColor,
  DECISION_TYPE_LABELS,
  DECISION_TYPE_ICONS,
  DECISION_STATUS_LABELS,
  PRIORITY_LABELS,
  CONFIDENCE_LABELS,
} from '../utils/helpers'
import type {
  AIDecision, DecisionType, DecisionStatus, Priority, ConfidenceLevel,
} from '../types'

const ALL_DECISION_TYPES: DecisionType[] = [
  'pausar_criativo', 'manter_criativo', 'escalar_criativo', 'duplicar_campanha',
  'criar_variacao', 'trocar_hook', 'trocar_publico', 'revisar_oferta',
  'revisar_pagina', 'criar_remarketing', 'aumentar_orcamento', 'reduzir_orcamento',
  'encerrar_campanha', 'coletar_dados',
]

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const STATUSES: DecisionStatus[] = ['pending', 'accepted', 'ignored', 'executed', 'archived']

type GenDecision = {
  title?: string
  decision_type: string
  priority: string
  campaign_id?: string | null
  creative_id?: string | null
  reasoning: string
  supporting_data?: string
  confidence_level?: string
  risk?: string
  recommended_action?: string
  next_step?: string
  deadline?: string
  actions: string[]
  _selected: boolean
}

const PROGRESS_MSGS = [
  'Carregando dados do produto...',
  'Analisando campanhas e criativos...',
  'Avaliando métricas de performance...',
  'Identificando padrões críticos...',
  'Aplicando regras estratégicas...',
  'Gerando decisões priorizadas...',
]

// ─── AI Generator Modal ───────────────────────────────────────────────────────

function AIGeneratorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MSGS[0])
  const [generated, setGenerated] = useState<GenDecision[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const aiCampaigns = productId ? tosDb.aiCampaigns.getByProduct(productId) : tosDb.aiCampaigns.getAll()

  async function handleGenerate() {
    if (!productId) { setError('Selecione um produto.'); return }
    setError('')
    setLoading(true)
    setProgress(0)
    setGenerated([])

    let pct = 0
    let msgIdx = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 1.5, 90)
      msgIdx = Math.min(Math.floor(pct / 16), PROGRESS_MSGS.length - 1)
      setProgress(pct)
      setProgressMsg(PROGRESS_MSGS[msgIdx])
    }, 300)

    try {
      const product = tosDb.products.getById(productId)
      const latestDiagnosis = tosDb.aiDiagnoses.getLatestByProduct(productId)
      const campaign = campaignId ? tosDb.aiCampaigns.getById(campaignId) : null
      const campaigns = tosDb.aiCampaigns.getByProduct(productId).slice(0, 5)
      const creatives = tosDb.aiCreatives.getByProduct(productId)
      const metrics = tosDb.metrics.getByProduct(productId)

      const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
      const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
      const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
      const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
      const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
      const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

      const smallSample = totalImpressions < 1000 || totalSpend < 20
      const hasDiagnosis = !!latestDiagnosis

      const creativesList = creatives
        .filter(c => c.spend > 0 || c.status !== 'novo')
        .slice(0, 10)
        .map(c => ({
          id: c.id,
          nome: c.strategy?.nome ?? 'Sem nome',
          canal: c.channel,
          angulo: c.angle,
          status: c.status,
          roas: c.roas.toFixed(2),
          ctr: `${c.ctr.toFixed(2)}%`,
          cpa: c.cpa.toFixed(2),
          gasto: `$${c.spend.toFixed(2)}`,
          conversoes: c.conversions,
        }))

      const campaignsList = (campaign ? [campaign] : campaigns).map(c => ({
        id: c.id,
        nome: c.strategy?.nome_estrategico ?? c.id,
        canal: c.channel,
        fase: c.phase,
        objetivo: c.objective,
        status: c.status,
        orcamento_dia: c.daily_budget,
      }))

      const recentMetrics = metrics
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 14)
        .map(m => ({
          data: m.date,
          gasto: m.spend,
          receita: m.revenue,
          roas: m.roas.toFixed(2),
          ctr: `${m.ctr.toFixed(2)}%`,
          cpa: m.cpa.toFixed(2),
          cliques: m.clicks,
          conversoes: m.conversions,
          canal: m.channel,
        }))

      const prompt = `PRODUTO: ${product?.name} (id: ${productId})
Nicho: ${product?.niche} | Categoria: ${product?.category}
Preço: ${product?.currency} ${product?.price} | Modelo: ${product?.billing_model}
Status: ${product?.status}
Promessa: ${product?.main_promise}
Mecanismo único: ${product?.unique_mechanism}
Dores principais: ${product?.main_pain}
Objeções: ${product?.main_objections}

DIAGNÓSTICO DE OFERTA: ${hasDiagnosis
  ? `Score ${latestDiagnosis!.analysis?.nota_geral?.score ?? '—'}/10
O que está bom: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_esta_bom ?? '—'}
O que melhorar: ${latestDiagnosis!.analysis?.resumo_executivo?.o_que_melhorar ?? '—'}
Próximo passo: ${latestDiagnosis!.analysis?.resumo_executivo?.proximo_passo ?? '—'}`
  : 'SEM DIAGNÓSTICO DE OFERTA — considere isso como risco nas decisões.'}

CAMPANHAS (${campaignsList.length}):
${JSON.stringify(campaignsList, null, 2)}

CRIATIVOS COM DADOS (${creativesList.length} de ${creatives.length} total):
${JSON.stringify(creativesList, null, 2)}

PERFORMANCE GERAL:
- Gasto total: $${totalSpend.toFixed(2)}
- Receita total: $${totalRevenue.toFixed(2)}
- ROAS médio: ${avgRoas.toFixed(2)}x
- CPA médio: $${avgCpa.toFixed(2)}
- CTR médio: ${avgCtr.toFixed(2)}%
- Total conversões: ${totalConversions}
- Total impressões: ${totalImpressions.toLocaleString()}
${smallSample ? '\n⚠️ ATENÇÃO: Amostra pequena (< 1000 impressões ou < $20 gasto). Seja conservador nas conclusões.' : ''}

MÉTRICAS RECENTES (últimos ${recentMetrics.length} registros):
${JSON.stringify(recentMetrics, null, 2)}

Com base em todos esses dados, gere as decisões estratégicas mais importantes para este produto.
Priorize por impacto no ROI. Máximo 6 decisões.
Ao referenciar campanhas ou criativos, use os IDs exatos fornecidos acima.`

      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionData: prompt }),
      })

      if (!res.ok) throw new Error('Falha na geração')
      const data = await res.json() as { decisions: GenDecision[] }
      clearInterval(interval)
      setProgress(100)
      setGenerated(data.decisions.map(d => ({ ...d, _selected: true })))
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : 'Erro ao gerar decisões')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(i: number) {
    setGenerated(prev => prev.map((d, idx) => idx === i ? { ...d, _selected: !d._selected } : d))
  }

  function handleSave() {
    const ts = now()
    generated.filter(d => d._selected).forEach(d => {
      const decision: AIDecision = {
        id: generateId(),
        product_id: productId,
        campaign_id: d.campaign_id ?? undefined,
        creative_id: d.creative_id ?? undefined,
        title: d.title,
        decision_type: (d.decision_type as DecisionType) ?? 'coletar_dados',
        reasoning: d.reasoning,
        supporting_data: d.supporting_data,
        confidence_level: d.confidence_level as ConfidenceLevel | undefined,
        risk: d.risk,
        recommended_action: d.recommended_action,
        next_step: d.next_step,
        deadline: d.deadline,
        actions: d.actions ?? [],
        priority: (d.priority as Priority) ?? 'medium',
        status: 'pending',
        created_at: ts,
      }
      tosDb.decisions.save(decision)
    })
    setSaved(true)
    setTimeout(() => { onSaved(); onClose() }, 800)
  }

  const selectedCount = generated.filter(d => d._selected).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <h2 className="text-base font-semibold text-white">Gerar Decisões com IA</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!generated.length && !loading && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Produto *</label>
                  <select
                    value={productId}
                    onChange={e => { setProductId(e.target.value); setCampaignId('') }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">— Selecionar —</option>
                    {tosDb.products.getAll().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Campanha específica</label>
                  <select
                    value={campaignId}
                    onChange={e => setCampaignId(e.target.value)}
                    disabled={!productId}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                  >
                    <option value="">— Analisar todas —</option>
                    {aiCampaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
                    ))}
                  </select>
                </div>
              </div>
              {productId && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Campanhas', count: tosDb.aiCampaigns.getByProduct(productId).length },
                    { label: 'Criativos', count: tosDb.aiCreatives.getByProduct(productId).length },
                    { label: 'Métricas', count: tosDb.metrics.getByProduct(productId).length },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-800/60 rounded-lg p-3">
                      <div className="text-lg font-bold text-white">{s.count}</div>
                      <div className="text-[10px] text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}

          {loading && (
            <div className="py-10 text-center">
              <div className="text-4xl mb-4 animate-pulse">🤖</div>
              <p className="text-sm font-medium text-gray-200 mb-1">{progressMsg}</p>
              <p className="text-xs text-gray-500 mb-5">Aplicando regras estratégicas nos dados...</p>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                <div
                  className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{Math.round(progress)}%</p>
            </div>
          )}

          {generated.length > 0 && !saved && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                {generated.length} decisão{generated.length !== 1 ? 'ões' : ''} gerada{generated.length !== 1 ? 's' : ''}.
                Selecione as que deseja salvar:
              </p>
              {generated.map((d, i) => {
                const campaign = d.campaign_id ? tosDb.aiCampaigns.getById(d.campaign_id) : null
                const creative = d.creative_id ? tosDb.aiCreatives.getById(d.creative_id) : null
                return (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                      d._selected
                        ? 'border-violet-600/50 bg-violet-600/5'
                        : 'border-gray-700 bg-gray-800/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">
                        {DECISION_TYPE_ICONS[d.decision_type] ?? '•'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-white">
                            {d.title ?? DECISION_TYPE_LABELS[d.decision_type] ?? d.decision_type}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(d.decision_type)}`}>
                            {DECISION_TYPE_LABELS[d.decision_type] ?? d.decision_type}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(d.priority)}`}>
                            {PRIORITY_LABELS[d.priority as Priority] ?? d.priority}
                          </span>
                          {d.deadline && (
                            <span className="text-[10px] text-amber-400">⏰ {d.deadline}</span>
                          )}
                          {d.confidence_level && (
                            <span className="text-[10px] text-gray-500">{CONFIDENCE_LABELS[d.confidence_level] ?? d.confidence_level}</span>
                          )}
                          <span className="ml-auto text-[10px] text-gray-500">
                            {d._selected ? '✓ Selecionado' : 'Clique para selecionar'}
                          </span>
                        </div>
                        {(campaign || creative) && (
                          <div className="flex gap-2 mb-1.5 flex-wrap">
                            {campaign && (
                              <span className="text-[10px] text-violet-400 bg-violet-900/20 px-2 py-0.5 rounded">
                                📢 {campaign.strategy?.nome_estrategico}
                              </span>
                            )}
                            {creative && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded">
                                🎨 {creative.strategy?.nome}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-300 mb-1">{d.reasoning}</p>
                        {d.supporting_data && (
                          <p className="text-[10px] text-gray-500 mb-1">📊 {d.supporting_data}</p>
                        )}
                        {d.risk && (
                          <p className="text-[10px] text-amber-500">⚠ {d.risk}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {saved && (
            <div className="py-10 text-center">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-sm text-emerald-400 font-medium">Decisões salvas com sucesso!</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-800">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            Fechar
          </button>
          {!generated.length && !loading && (
            <button
              onClick={handleGenerate}
              disabled={!productId}
              className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              ✦ Analisar com IA
            </button>
          )}
          {generated.length > 0 && !saved && (
            <button
              onClick={handleSave}
              disabled={selectedCount === 0}
              className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Salvar {selectedCount} Decisão{selectedCount !== 1 ? 'ões' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Manual Form Modal ────────────────────────────────────────────────────────

function ManualModal({ editing, onClose, onSaved }: { editing: AIDecision | null; onClose: () => void; onSaved: () => void }) {
  const products = tosDb.products.getAll()
  const [form, setForm] = useState({
    product_id: editing?.product_id ?? '',
    campaign_id: editing?.campaign_id ?? '',
    creative_id: editing?.creative_id ?? '',
    title: editing?.title ?? '',
    decision_type: editing?.decision_type ?? ('coletar_dados' as DecisionType),
    reasoning: editing?.reasoning ?? '',
    recommended_action: editing?.recommended_action ?? '',
    risk: editing?.risk ?? '',
    next_step: editing?.next_step ?? '',
    deadline: editing?.deadline ?? '',
    actions_text: (editing?.actions ?? []).join('\n'),
    priority: editing?.priority ?? ('medium' as Priority),
    status: editing?.status ?? ('pending' as DecisionStatus),
    confidence_level: editing?.confidence_level ?? ('' as ConfidenceLevel | ''),
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const filteredCampaigns = form.product_id
    ? tosDb.aiCampaigns.getByProduct(form.product_id) : []
  const filteredCreatives = form.product_id
    ? tosDb.aiCreatives.getByProduct(form.product_id) : []

  function handleSave() {
    const decision: AIDecision = {
      id: editing?.id ?? generateId(),
      product_id: form.product_id,
      campaign_id: form.campaign_id || undefined,
      creative_id: form.creative_id || undefined,
      title: form.title || undefined,
      decision_type: form.decision_type,
      reasoning: form.reasoning,
      recommended_action: form.recommended_action || undefined,
      risk: form.risk || undefined,
      next_step: form.next_step || undefined,
      deadline: form.deadline || undefined,
      actions: form.actions_text.split('\n').map(a => a.trim()).filter(Boolean),
      priority: form.priority,
      status: form.status,
      confidence_level: (form.confidence_level || undefined) as ConfidenceLevel | undefined,
      created_at: editing?.created_at ?? now(),
    }
    tosDb.decisions.save(decision)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{editing ? 'Editar Decisão' : 'Nova Decisão Manual'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Título</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Título descritivo da decisão"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Produto</label>
              <select value={form.product_id}
                onChange={e => { set('product_id', e.target.value); set('campaign_id', ''); set('creative_id', '') }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="">— Selecionar —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Decisão</label>
              <select value={form.decision_type} onChange={e => set('decision_type', e.target.value as DecisionType)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {ALL_DECISION_TYPES.map(dt => (
                  <option key={dt} value={dt}>{DECISION_TYPE_ICONS[dt]} {DECISION_TYPE_LABELS[dt]}</option>
                ))}
              </select>
            </div>
          </div>
          {form.product_id && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Campanha</label>
                <select value={form.campaign_id} onChange={e => set('campaign_id', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                  <option value="">— Nenhuma —</option>
                  {filteredCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Criativo</label>
                <select value={form.creative_id} onChange={e => set('creative_id', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                  <option value="">— Nenhum —</option>
                  {filteredCreatives.map(c => (
                    <option key={c.id} value={c.id}>{c.strategy?.nome ?? c.id}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Prioridade</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value as Priority)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value as DecisionStatus)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {STATUSES.map(s => <option key={s} value={s}>{DECISION_STATUS_LABELS[s] ?? s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Prazo</label>
              <select value={form.deadline} onChange={e => set('deadline', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="">—</option>
                {['Agora', 'Hoje', 'Próximas 24h', 'Próximos 3 dias', 'Próxima semana'].map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Raciocínio *</label>
            <textarea rows={3} value={form.reasoning} onChange={e => set('reasoning', e.target.value)}
              placeholder="Por que esta decisão é necessária?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Ação Recomendada</label>
              <textarea rows={2} value={form.recommended_action} onChange={e => set('recommended_action', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Risco</label>
              <textarea rows={2} value={form.risk} onChange={e => set('risk', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Ações (uma por linha)</label>
            <textarea rows={3} value={form.actions_text} onChange={e => set('actions_text', e.target.value)}
              placeholder={`Ação 1\nAção 2\nAção 3`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-800">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main List Component ──────────────────────────────────────────────────────

export default function DecisoesIA() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preProduct = searchParams.get('produto') ?? ''

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [editing, setEditing] = useState<AIDecision | null>(null)
  const [tick, setTick] = useState(0)
  function refresh() { setTick(t => t + 1) }

  const [productFilter, setProductFilter] = useState(preProduct)
  const [campaignFilter, setCampaignFilter] = useState('')
  const [creativeFilter, setCreativeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')

  void tick

  const allDecisions = tosDb.decisions.getAll()
  const products = tosDb.products.getAll()
  const allCampaigns = tosDb.aiCampaigns.getAll()
  const allCreatives = tosDb.aiCreatives.getAll()

  const filteredCampaignList = productFilter
    ? allCampaigns.filter(c => c.product_id === productFilter) : allCampaigns
  const filteredCreativeList = productFilter
    ? allCreatives.filter(c => c.product_id === productFilter) : allCreatives

  const filtered = allDecisions.filter(d => {
    if (productFilter && d.product_id !== productFilter) return false
    if (campaignFilter && d.campaign_id !== campaignFilter) return false
    if (creativeFilter && d.creative_id !== creativeFilter) return false
    if (typeFilter && d.decision_type !== typeFilter) return false
    if (priorityFilter && d.priority !== priorityFilter) return false
    if (statusFilter && d.status !== statusFilter) return false
    return true
  }).sort((a, b) => {
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const pDiff = (pOrder[a.priority as keyof typeof pOrder] ?? 4) - (pOrder[b.priority as keyof typeof pOrder] ?? 4)
    if (pDiff !== 0) return pDiff
    return b.created_at.localeCompare(a.created_at)
  })

  const pendingCount = allDecisions.filter(d => d.status === 'pending').length
  const criticalCount = allDecisions.filter(d => d.priority === 'critical' && d.status === 'pending').length

  function updateStatus(d: AIDecision, newStatus: DecisionStatus) {
    tosDb.decisions.save({ ...d, status: newStatus })
    refresh()
  }

  function handleDelete(id: string) {
    if (confirm('Excluir esta decisão?')) {
      tosDb.decisions.delete(id)
      refresh()
    }
  }

  function clearFilters() {
    setProductFilter('')
    setCampaignFilter('')
    setCreativeFilter('')
    setTypeFilter('')
    setPriorityFilter('')
    setStatusFilter('pending')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Motor de Decisão IA</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            {criticalCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">· {criticalCount} crítica{criticalCount !== 1 ? 's' : ''} ⚠</span>
            )}
            <span className="text-gray-600 ml-2">· {allDecisions.length} total</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditing(null); setManualModalOpen(true) }}
            className="text-sm font-medium py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            + Manual
          </button>
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>✦</span> Gerar com IA
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <select value={productFilter}
            onChange={e => { setProductFilter(e.target.value); setCampaignFilter(''); setCreativeFilter('') }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
            <option value="">Todos os produtos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
            <option value="">Todas as campanhas</option>
            {filteredCampaignList.map(c => (
              <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
            ))}
          </select>
          <select value={creativeFilter} onChange={e => setCreativeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
            <option value="">Todos os criativos</option>
            {filteredCreativeList.map(c => (
              <option key={c.id} value={c.id}>{c.strategy?.nome ?? c.id}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
            <option value="">Todos os tipos</option>
            {ALL_DECISION_TYPES.map(t => (
              <option key={t} value={t}>{DECISION_TYPE_ICONS[t]} {DECISION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium">Prioridade:</span>
          {(['', 'critical', 'high', 'medium', 'low'] as const).map(p => (
            <button key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                priorityFilter === p ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {p === '' ? 'Todas' : PRIORITY_LABELS[p]}
            </button>
          ))}
          <span className="text-xs text-gray-500 font-medium ml-2">Status:</span>
          {(['', 'pending', 'accepted', 'ignored', 'executed', 'archived'] as const).map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s === '' ? 'Todos' : DECISION_STATUS_LABELS[s] ?? s}
            </button>
          ))}
          {(productFilter || campaignFilter || creativeFilter || typeFilter || priorityFilter || statusFilter !== 'pending') && (
            <button onClick={clearFilters} className="text-xs text-gray-600 hover:text-gray-300 ml-auto">
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-400 text-sm mb-4">
            {allDecisions.length === 0 ? 'Nenhuma decisão gerada ainda.' : 'Nenhuma decisão encontrada com estes filtros.'}
          </p>
          <button
            onClick={() => setAiModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
          >
            ✦ Gerar Decisões com IA
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const product = tosDb.products.getById(d.product_id)
            const campaign = d.campaign_id ? allCampaigns.find(c => c.id === d.campaign_id) : null
            const creative = d.creative_id ? allCreatives.find(c => c.id === d.creative_id) : null
            const isCritical = d.priority === 'critical'

            return (
              <div
                key={d.id}
                className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                  (d.status === 'ignored' || d.status === 'archived' || d.status === 'dismissed')
                    ? 'border-gray-800 opacity-50'
                    : isCritical
                    ? 'border-red-700/50 hover:border-red-600/50'
                    : d.priority === 'high'
                    ? 'border-amber-800/30 hover:border-amber-700/30'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0 mt-0.5">{DECISION_TYPE_ICONS[d.decision_type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      {/* Title + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {d.title && (
                          <span className="text-sm font-semibold text-white">{d.title}</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(d.decision_type)}`}>
                          {DECISION_TYPE_LABELS[d.decision_type] ?? d.decision_type}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority] ?? d.priority}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(d.status)}`}>
                          {DECISION_STATUS_LABELS[d.status] ?? d.status}
                        </span>
                        {d.deadline && (
                          <span className="text-[10px] text-amber-400">⏰ {d.deadline}</span>
                        )}
                        {d.confidence_level && (
                          <span className={`text-[10px] ${d.confidence_level === 'alto' ? 'text-emerald-500' : d.confidence_level === 'baixo' ? 'text-red-500' : 'text-gray-500'}`}>
                            {CONFIDENCE_LABELS[d.confidence_level]}
                          </span>
                        )}
                      </div>

                      {/* Related entities */}
                      <div className="flex gap-2 flex-wrap mb-1.5">
                        {product && (
                          <span className="text-[10px] text-gray-400">📦 {product.name}</span>
                        )}
                        {campaign && (
                          <span className="text-[10px] text-violet-400">📢 {campaign.strategy?.nome_estrategico}</span>
                        )}
                        {creative && (
                          <span className="text-[10px] text-cyan-400">🎨 {creative.strategy?.nome}</span>
                        )}
                        <span className="text-[10px] text-gray-600 ml-auto">{formatDate(d.created_at)}</span>
                      </div>

                      {/* Reasoning */}
                      <p className="text-sm text-gray-300 mb-1.5 line-clamp-2">{d.reasoning}</p>

                      {/* Supporting data */}
                      {d.supporting_data && (
                        <p className="text-xs text-gray-500 mb-1">📊 {d.supporting_data}</p>
                      )}

                      {/* Actions preview */}
                      {d.actions.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {d.actions.slice(0, 3).map((action, i) => (
                            <span key={i} className="text-xs text-gray-400">→ {action}</span>
                          ))}
                          {d.actions.length > 3 && (
                            <span className="text-xs text-gray-600">+{d.actions.length - 3} mais</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex flex-col gap-1 items-end min-w-[90px]">
                    <button
                      onClick={() => navigate(`/decisoes/${d.id}`)}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium whitespace-nowrap"
                    >
                      Ver Decisão →
                    </button>
                    {d.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(d, 'accepted')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 whitespace-nowrap">
                          ✓ Aceitar
                        </button>
                        <button onClick={() => updateStatus(d, 'ignored')}
                          className="text-xs text-gray-500 hover:text-gray-300 whitespace-nowrap">
                          Ignorar
                        </button>
                      </>
                    )}
                    {d.status === 'accepted' && (
                      <button onClick={() => updateStatus(d, 'executed')}
                        className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                        ✓ Executada
                      </button>
                    )}
                    <button onClick={() => { setEditing(d); setManualModalOpen(true) }}
                      className="text-xs text-gray-500 hover:text-gray-300 whitespace-nowrap">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      className="text-xs text-gray-600 hover:text-red-400 whitespace-nowrap">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {aiModalOpen && <AIGeneratorModal onClose={() => setAiModalOpen(false)} onSaved={refresh} />}
      {manualModalOpen && (
        <ManualModal
          editing={editing}
          onClose={() => { setManualModalOpen(false); setEditing(null) }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
