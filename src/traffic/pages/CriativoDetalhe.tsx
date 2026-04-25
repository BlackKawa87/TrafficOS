import { useState } from 'react'
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
import type { AICreativeStatus, AICreative } from '../types'

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
  const s = creative.strategy

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
      `3. ROTEIRO COMPLETO (${s.roteiro.duracao})`,
      `Hook: ${s.roteiro.hook}`,
      `Problema: ${s.roteiro.problema}`,
      `Agitação: ${s.roteiro.agitacao}`,
      `Solução: ${s.roteiro.solucao}`,
      `CTA: ${s.roteiro.cta}`,
      ``,
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

        {/* 3. Roteiro */}
        <SectionCard number={3} title={`Roteiro Completo — ${s.roteiro.duracao}`} icon="🎬"
          copyContent={`Hook: ${s.roteiro.hook}\n\nProblema: ${s.roteiro.problema}\n\nAgitação: ${s.roteiro.agitacao}\n\nSolução: ${s.roteiro.solucao}\n\nCTA: ${s.roteiro.cta}`}>
          <div className="space-y-3">
            {[
              { label: 'Hook (0-3s)', value: s.roteiro.hook, color: 'border-l-violet-500' },
              { label: 'Problema (3-8s)', value: s.roteiro.problema, color: 'border-l-amber-500' },
              { label: 'Agitação (8-15s)', value: s.roteiro.agitacao, color: 'border-l-red-500' },
              { label: 'Solução (15-22s)', value: s.roteiro.solucao, color: 'border-l-emerald-500' },
              { label: 'CTA (22-30s)', value: s.roteiro.cta, color: 'border-l-blue-500' },
            ].map(item => (
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

        {/* 4. Variações de roteiro */}
        <SectionCard number={4} title="Variações de Roteiro" icon="🔀"
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

        {/* 5. Texto do anúncio */}
        <SectionCard number={5} title="Texto do Anúncio" icon="✍️"
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

        {/* 6. Direção Criativa */}
        <SectionCard number={6} title="Direção Criativa" icon="🎥"
          copyContent={[
            `Como gravar: ${s.direcao_criativa.como_gravar}`,
            `Cenário: ${s.direcao_criativa.cenario}`,
            `Pessoa: ${s.direcao_criativa.tipo_pessoa}`,
            `Estilo: ${s.direcao_criativa.estilo}`,
            `Tom de voz: ${s.direcao_criativa.tom_voz}`,
            `Edição: ${s.direcao_criativa.edicao}`,
          ].join('\n')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Como Gravar', value: s.direcao_criativa.como_gravar },
              { label: 'Cenário', value: s.direcao_criativa.cenario },
              { label: 'Tipo de Pessoa', value: s.direcao_criativa.tipo_pessoa },
              { label: 'Estilo', value: s.direcao_criativa.estilo },
              { label: 'Tom de Voz', value: s.direcao_criativa.tom_voz },
              { label: 'Edição', value: s.direcao_criativa.edicao },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 7. Referência Visual */}
        <SectionCard number={7} title="Referência Visual" icon="🖼️" copyContent={s.referencia_visual}>
          <p className="text-sm text-gray-200 leading-relaxed">{s.referencia_visual}</p>
        </SectionCard>

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
