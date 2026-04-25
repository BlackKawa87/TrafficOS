import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  OBJECTIVE_LABELS,
  CHANNEL_LABELS,
  PHASE_LABELS,
  AI_CAMPAIGN_STATUS_LABELS,
} from '../utils/helpers'
import type { AICampaignStatus, AICampaign } from '../types'

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => undefined)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500"
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

function SectionCard({
  number,
  title,
  icon,
  children,
  copyContent,
}: {
  number: number
  title: string
  icon: string
  children: React.ReactNode
  copyContent?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-900/80">
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

function Tag({ label, color = 'gray' }: { label: string; color?: 'gray' | 'violet' | 'emerald' | 'amber' }) {
  const cls = {
    gray: 'bg-gray-800 text-gray-300',
    violet: 'bg-violet-900/40 text-violet-300',
    emerald: 'bg-emerald-900/40 text-emerald-300',
    amber: 'bg-amber-900/40 text-amber-300',
  }[color]
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>
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

function RuleRow({ label, value, color = 'gray' }: { label: string; value: string; color?: 'red' | 'green' | 'blue' | 'amber' | 'gray' }) {
  const dot = {
    red: 'bg-red-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    gray: 'bg-gray-500',
  }[color]
  return (
    <div className="flex gap-4 py-3 border-b border-gray-800/50 last:border-0">
      <div className="flex items-center gap-2 w-28 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">{value}</p>
    </div>
  )
}

function DayCard({ day, content }: { day: string; content: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2">{day}</div>
      <p className="text-sm text-gray-200 leading-relaxed">{content}</p>
    </div>
  )
}

export default function CampanhaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState<AICampaign | null>(() =>
    id ? tosDb.aiCampaigns.getById(id) : null
  )

  if (!campaign) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-400 mb-4">Campanha não encontrada.</p>
        <button onClick={() => navigate('/campanhas')} className="text-violet-400 hover:text-violet-300 text-sm">
          ← Voltar para Campanhas
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(campaign.product_id)
  const s = campaign.strategy
  const creatives = tosDb.creatives.getAll().filter(c => c.product_id === campaign.product_id)
  const metrics = tosDb.metrics.getAll().filter(m => m.product_id === campaign.product_id)

  function updateStatus(status: AICampaignStatus) {
    const updated: AICampaign = { ...campaign!, status, updated_at: now() }
    tosDb.aiCampaigns.save(updated)
    setCampaign(updated)
  }

  function updateMainResult(result: string) {
    const updated: AICampaign = { ...campaign!, main_result: result, updated_at: now() }
    tosDb.aiCampaigns.save(updated)
    setCampaign(updated)
  }

  function handleDuplicate() {
    const copy: AICampaign = {
      ...campaign!,
      id: generateId(),
      status: 'rascunho',
      main_result: '',
      created_at: now(),
      updated_at: now(),
      strategy: {
        ...campaign!.strategy,
        nome_estrategico: `${campaign!.strategy.nome_estrategico} (cópia)`,
      },
    }
    tosDb.aiCampaigns.save(copy)
    navigate(`/campanhas/${copy.id}`)
  }

  function handleDelete() {
    if (confirm('Excluir esta campanha permanentemente?')) {
      tosDb.aiCampaigns.delete(campaign!.id)
      navigate('/campanhas')
    }
  }

  function strategyToText(): string {
    const lines: string[] = [
      `CAMPANHA: ${s.nome_estrategico}`,
      `Produto: ${product?.name ?? '—'}`,
      `Canal: ${CHANNEL_LABELS[campaign!.channel] ?? campaign!.channel}`,
      `Objetivo: ${OBJECTIVE_LABELS[campaign!.objective] ?? campaign!.objective}`,
      `Fase: ${PHASE_LABELS[campaign!.phase] ?? campaign!.phase}`,
      `Orçamento: ${formatCurrency(campaign!.daily_budget, campaign!.currency)}/dia × ${campaign!.test_duration} dias = ${formatCurrency(campaign!.total_budget_estimate, campaign!.currency)}`,
      ``,
      `1. OBJETIVO RECOMENDADO`,
      `Adequado: ${s.objetivo_recomendado.adequado ? 'Sim' : 'Não'}`,
      s.objetivo_recomendado.justificativa,
      s.objetivo_recomendado.ajuste_sugerido,
      ``,
      `2. HIPÓTESE PRINCIPAL`,
      s.hipotese_principal,
      ``,
      `3. PÚBLICO`,
      `Principal: ${s.publico.principal}`,
      `Secundários: ${s.publico.secundarios.join(' | ')}`,
      `Interesses: ${s.publico.interesses.join(', ')}`,
      `Exclusões: ${s.publico.exclusoes.join(', ')}`,
      s.publico.observacoes,
      s.publico.broad_vs_segmentado,
      ``,
      `4. ÂNGULO PRINCIPAL (${s.angulo_principal.tipo})`,
      s.angulo_principal.descricao,
      s.angulo_principal.aplicacao,
      ``,
      `5. ÂNGULOS SECUNDÁRIOS`,
      ...s.angulos_secundarios.map(a => `• ${a.tipo}: ${a.descricao}`),
      ``,
      `6. ESTRUTURA`,
      `${s.estrutura.num_campanhas} campanha(s) | ${s.estrutura.num_conjuntos} conjuntos | ${s.estrutura.criativos_por_conjunto} criativos/conjunto`,
      `Otimização: ${s.estrutura.tipo_otimizacao}`,
      s.estrutura.estrategia_orcamento,
      ``,
      `7. CRIATIVOS (${s.criativos_necessarios.quantidade} total)`,
      `Formatos: ${s.criativos_necessarios.formatos.join(', ')}`,
      `Vídeos: ${s.criativos_necessarios.duracao_videos}`,
      `Imagens: ${s.criativos_necessarios.tipo_imagem}`,
      `Copy: ${s.criativos_necessarios.tipo_copy}`,
      `Hook: ${s.criativos_necessarios.tipo_hook}`,
      ``,
      `8. COPIES`,
      `-- Textos Principais --`,
      ...s.copies.textos_principais.map((t, i) => `${i + 1}. ${t}`),
      `-- Headlines --`,
      ...s.copies.headlines.map((h, i) => `${i + 1}. ${h}`),
      `-- Descrições --`,
      ...s.copies.descricoes.map((d, i) => `${i + 1}. ${d}`),
      `-- CTAs --`,
      ...s.copies.ctas.map((c, i) => `${i + 1}. ${c}`),
      ``,
      `9. LANDING PAGE`,
      `Avaliação: ${s.landing_page.avaliacao}`,
      `Acima da dobra: ${s.landing_page.acima_dobra}`,
      `Promessa: ${s.landing_page.promessa}`,
      `Prova/Garantia: ${s.landing_page.prova_garantia}`,
      ``,
      `10. MÉTRICAS ALVO`,
      `CTR mínimo: ${s.metricas.ctr_minimo}`,
      `CPC máximo: ${s.metricas.cpc_maximo}`,
      `CPA alvo: ${s.metricas.cpa_alvo}`,
      `Taxa de conversão: ${s.metricas.taxa_conversao}`,
      `ROAS esperado: ${s.metricas.roas_esperado}`,
      ``,
      `11. REGRAS DE DECISÃO`,
      `Pausar: ${s.regras_decisao.pausar}`,
      `Manter: ${s.regras_decisao.manter}`,
      `Duplicar: ${s.regras_decisao.duplicar}`,
      `Escalar: ${s.regras_decisao.escalar}`,
      `Variações: ${s.regras_decisao.variacoes}`,
      ``,
      `12. PLANO DOS PRIMEIROS 3 DIAS`,
      `Dia 1: ${s.plano_3_dias.dia1}`,
      `Dia 2: ${s.plano_3_dias.dia2}`,
      `Dia 3: ${s.plano_3_dias.dia3}`,
      ``,
      `13. PRÓXIMO PASSO`,
      s.proximo_passo,
      ``,
      `Gerado em: ${formatDateTime(campaign!.created_at)}`,
    ]
    return lines.join('\n')
  }

  function exportTxt() {
    const blob = new Blob([strategyToText()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campanha-${s.nome_estrategico.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <button
            onClick={() => navigate('/campanhas')}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-2 flex items-center gap-1"
          >
            ← Campanhas
          </button>
          <h1 className="text-2xl font-bold text-white leading-tight">{s.nome_estrategico}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(campaign.status)}`}>
              {AI_CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
            <Tag label={CHANNEL_LABELS[campaign.channel] ?? campaign.channel} color="violet" />
            <Tag label={OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective} />
            <Tag label={PHASE_LABELS[campaign.phase] ?? campaign.phase} color="amber" />
            {product && (
              <button
                onClick={() => navigate(`/produtos/${product.id}`)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                📦 {product.name}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <button
            onClick={exportTxt}
            className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            ↓ Exportar .txt
          </button>
          <button
            onClick={handleDuplicate}
            className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            ⧉ Duplicar
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-3 py-2 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Status action buttons */}
      <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <span className="text-xs text-gray-500 self-center mr-1 font-medium">Ações rápidas:</span>
        <button
          onClick={() => navigate(`/criativos?produto=${campaign.product_id}`)}
          className="text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-600/30 rounded-lg transition-colors font-medium"
        >
          🎨 Gerar Criativos
        </button>
        <button
          onClick={() => navigate(`/metricas?produto=${campaign.product_id}`)}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-600/30 rounded-lg transition-colors font-medium"
        >
          📊 Inserir Métricas
        </button>
        <button
          onClick={() => navigate(`/decisoes?produto=${campaign.product_id}`)}
          className="text-xs px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 rounded-lg transition-colors font-medium"
        >
          🤖 Gerar Decisão IA
        </button>
        {campaign.status !== 'pausada' && (
          <button
            onClick={() => updateStatus('pausada')}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors font-medium"
          >
            ⏸ Pausar
          </button>
        )}
        {campaign.status !== 'ativa' && (
          <button
            onClick={() => updateStatus('ativa')}
            className="text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 rounded-lg transition-colors font-medium"
          >
            ▶ Ativar
          </button>
        )}
        {campaign.status !== 'vencedora' && (
          <button
            onClick={() => updateStatus('vencedora')}
            className="text-xs px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-600/30 rounded-lg transition-colors font-medium"
          >
            ⭐ Vencedora
          </button>
        )}
      </div>

      {/* Budget & dates row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Orçamento/dia', value: formatCurrency(campaign.daily_budget, campaign.currency) },
          { label: 'Duração', value: `${campaign.test_duration} dias` },
          { label: 'Total estimado', value: formatCurrency(campaign.total_budget_estimate, campaign.currency) },
          { label: 'Início', value: campaign.start_date ? formatDate(campaign.start_date) : '—' },
        ].map(item => (
          <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
            <div className="text-white font-semibold text-sm">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Main result input */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-2">📌 Resultado Principal (atualize conforme os dados chegam)</label>
        <input
          type="text"
          value={campaign.main_result}
          onChange={e => updateMainResult(e.target.value)}
          placeholder="Ex: CTR 2.1%, CPA R$47, 3 criativos vencedores..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* ─── AI Strategy Sections ─────────────────────────────────── */}
      <h2 className="text-lg font-bold text-white mb-4">Estratégia Gerada pela IA</h2>

      <div className="space-y-4">

        {/* 1. Objetivo recomendado */}
        <SectionCard number={1} title="Objetivo Recomendado" icon="🎯"
          copyContent={`${s.objetivo_recomendado.justificativa}\n\n${s.objetivo_recomendado.ajuste_sugerido}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.objetivo_recomendado.adequado ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
              {s.objetivo_recomendado.adequado ? '✓ Objetivo Adequado' : '⚠ Ajuste Recomendado'}
            </span>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed mb-2">{s.objetivo_recomendado.justificativa}</p>
          {s.objetivo_recomendado.ajuste_sugerido && (
            <p className="text-sm text-amber-300/80 leading-relaxed italic">{s.objetivo_recomendado.ajuste_sugerido}</p>
          )}
        </SectionCard>

        {/* 2. Hipótese */}
        <SectionCard number={2} title="Hipótese Principal do Teste" icon="💡" copyContent={s.hipotese_principal}>
          <p className="text-sm text-gray-200 leading-relaxed font-medium">{s.hipotese_principal}</p>
        </SectionCard>

        {/* 3. Público */}
        <SectionCard number={3} title="Público Recomendado" icon="👥"
          copyContent={`Principal: ${s.publico.principal}\n\nSecundários:\n${s.publico.secundarios.join('\n')}\n\nInteresses: ${s.publico.interesses.join(', ')}\n\nExclusões: ${s.publico.exclusoes.join(', ')}\n\n${s.publico.observacoes}\n\n${s.publico.broad_vs_segmentado}`}>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Público Principal</div>
              <p className="text-sm text-gray-200 leading-relaxed">{s.publico.principal}</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Públicos Secundários</div>
              <div className="space-y-1.5">
                {s.publico.secundarios.map((p, i) => (
                  <div key={i} className="text-sm text-gray-300 bg-gray-800/50 rounded-lg px-3 py-2">• {p}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Interesses Sugeridos</div>
              <div className="flex flex-wrap gap-2">
                {s.publico.interesses.map((int, i) => <Tag key={i} label={int} color="violet" />)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Exclusões</div>
              <div className="flex flex-wrap gap-2">
                {s.publico.exclusoes.map((ex, i) => <Tag key={i} label={ex} color="amber" />)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Observações</div>
                <p className="text-sm text-gray-200">{s.publico.observacoes}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Broad vs Segmentado</div>
                <p className="text-sm text-gray-200">{s.publico.broad_vs_segmentado}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 4. Ângulo principal */}
        <SectionCard number={4} title="Ângulo Principal" icon="🎯"
          copyContent={`${s.angulo_principal.tipo}\n\n${s.angulo_principal.descricao}\n\nComo aplicar: ${s.angulo_principal.aplicacao}`}>
          <div className="flex items-center gap-2 mb-3">
            <Tag label={s.angulo_principal.tipo} color="violet" />
          </div>
          <p className="text-sm text-gray-200 leading-relaxed mb-3">{s.angulo_principal.descricao}</p>
          <div className="bg-violet-600/10 border border-violet-600/20 rounded-lg p-3">
            <div className="text-xs text-violet-400 font-medium mb-1">Como aplicar</div>
            <p className="text-sm text-gray-200">{s.angulo_principal.aplicacao}</p>
          </div>
        </SectionCard>

        {/* 5. Ângulos secundários */}
        <SectionCard number={5} title="Ângulos Secundários" icon="🔀"
          copyContent={s.angulos_secundarios.map(a => `${a.tipo}: ${a.descricao}`).join('\n\n')}>
          <div className="space-y-3">
            {s.angulos_secundarios.map((a, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag label={a.tipo} />
                </div>
                <p className="text-sm text-gray-200">{a.descricao}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 6. Estrutura */}
        <SectionCard number={6} title="Estrutura de Campanha" icon="🏗️"
          copyContent={`${s.estrutura.num_campanhas} campanha(s) | ${s.estrutura.num_conjuntos} conjuntos | ${s.estrutura.criativos_por_conjunto} criativos/conjunto\nOtimização: ${s.estrutura.tipo_otimizacao}\n${s.estrutura.estrategia_orcamento}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Campanhas', value: s.estrutura.num_campanhas },
              { label: 'Conjuntos', value: s.estrutura.num_conjuntos },
              { label: 'Criativos/Conjunto', value: s.estrutura.criativos_por_conjunto },
              { label: 'Total Criativos', value: s.criativos_necessarios.quantidade },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-violet-400">{item.value}</div>
                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Tipo de Otimização</div>
              <p className="text-sm text-gray-200 font-medium">{s.estrutura.tipo_otimizacao}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Estratégia de Orçamento</div>
              <p className="text-sm text-gray-200">{s.estrutura.estrategia_orcamento}</p>
            </div>
          </div>
        </SectionCard>

        {/* 7. Criativos necessários */}
        <SectionCard number={7} title="Criativos Necessários" icon="🎨"
          copyContent={`${s.criativos_necessarios.quantidade} criativos\nFormatos: ${s.criativos_necessarios.formatos.join(', ')}\nVídeos: ${s.criativos_necessarios.duracao_videos}\nImagens: ${s.criativos_necessarios.tipo_imagem}\nCopy: ${s.criativos_necessarios.tipo_copy}\nHook: ${s.criativos_necessarios.tipo_hook}`}>
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Formatos</div>
            <div className="flex flex-wrap gap-2">
              {s.criativos_necessarios.formatos.map((f, i) => <Tag key={i} label={f} color="violet" />)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Duração de Vídeos', value: s.criativos_necessarios.duracao_videos },
              { label: 'Tipo de Imagem', value: s.criativos_necessarios.tipo_imagem },
              { label: 'Tipo de Copy', value: s.criativos_necessarios.tipo_copy },
              { label: 'Tipo de Hook', value: s.criativos_necessarios.tipo_hook },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <p className="text-sm text-gray-200">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 8. Copies */}
        <SectionCard number={8} title="Copies Iniciais" icon="✍️"
          copyContent={[
            'TEXTOS PRINCIPAIS:', ...s.copies.textos_principais.map((t, i) => `${i + 1}. ${t}`),
            '\nHEADLINES:', ...s.copies.headlines.map((h, i) => `${i + 1}. ${h}`),
            '\nDESCRIÇÕES:', ...s.copies.descricoes.map((d, i) => `${i + 1}. ${d}`),
            '\nCTAs:', ...s.copies.ctas.map((c, i) => `${i + 1}. ${c}`),
          ].join('\n')}>
          <div className="space-y-5">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Textos Principais</div>
              <div className="space-y-2">
                {s.copies.textos_principais.map((t, i) => <CopyItem key={i} text={t} index={i} />)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Headlines</div>
              <div className="space-y-2">
                {s.copies.headlines.map((h, i) => <CopyItem key={i} text={h} index={i} />)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Descrições Curtas</div>
              <div className="space-y-2">
                {s.copies.descricoes.map((d, i) => <CopyItem key={i} text={d} index={i} />)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">CTAs</div>
              <div className="flex flex-wrap gap-2">
                {s.copies.ctas.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-violet-600/10 border border-violet-600/20 rounded-lg px-3 py-1.5">
                    <span className="text-sm text-violet-300 font-medium">{c}</span>
                    <CopyButton text={c} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 9. Landing page */}
        <SectionCard number={9} title="Landing Page / Checkout" icon="🌐"
          copyContent={`Avaliação: ${s.landing_page.avaliacao}\n\nAcima da dobra: ${s.landing_page.acima_dobra}\n\nPromessa: ${s.landing_page.promessa}\n\nProva/Garantia: ${s.landing_page.prova_garantia}`}>
          <div className="space-y-3">
            {[
              { label: 'Avaliação da Página', value: s.landing_page.avaliacao },
              { label: 'Acima da Dobra', value: s.landing_page.acima_dobra },
              { label: 'Promessa a Repetir', value: s.landing_page.promessa },
              { label: 'Prova / Garantia a Destacar', value: s.landing_page.prova_garantia },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 10. Métricas */}
        <SectionCard number={10} title="Métricas de Acompanhamento" icon="📊"
          copyContent={`CTR mínimo: ${s.metricas.ctr_minimo}\nCPC máximo: ${s.metricas.cpc_maximo}\nCPA alvo: ${s.metricas.cpa_alvo}\nTaxa de conversão: ${s.metricas.taxa_conversao}\nROAS esperado: ${s.metricas.roas_esperado}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'CTR Mínimo', value: s.metricas.ctr_minimo },
              { label: 'CPC Máximo', value: s.metricas.cpc_maximo },
              { label: 'CPA Alvo', value: s.metricas.cpa_alvo },
              { label: 'Taxa de Conversão', value: s.metricas.taxa_conversao },
              { label: 'ROAS Esperado', value: s.metricas.roas_esperado },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="text-white font-semibold text-sm">{item.value}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 11. Regras de decisão */}
        <SectionCard number={11} title="Regras de Decisão" icon="⚖️"
          copyContent={`Pausar: ${s.regras_decisao.pausar}\nManter: ${s.regras_decisao.manter}\nDuplicar: ${s.regras_decisao.duplicar}\nEscalar: ${s.regras_decisao.escalar}\nVariações: ${s.regras_decisao.variacoes}`}>
          <div>
            <RuleRow label="Pausar" value={s.regras_decisao.pausar} color="red" />
            <RuleRow label="Manter" value={s.regras_decisao.manter} color="blue" />
            <RuleRow label="Duplicar" value={s.regras_decisao.duplicar} color="amber" />
            <RuleRow label="Escalar" value={s.regras_decisao.escalar} color="green" />
            <RuleRow label="Variações" value={s.regras_decisao.variacoes} color="gray" />
          </div>
        </SectionCard>

        {/* 12. Plano 3 dias */}
        <SectionCard number={12} title="Plano dos Primeiros 3 Dias" icon="📅"
          copyContent={`Dia 1: ${s.plano_3_dias.dia1}\n\nDia 2: ${s.plano_3_dias.dia2}\n\nDia 3: ${s.plano_3_dias.dia3}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DayCard day="Dia 1" content={s.plano_3_dias.dia1} />
            <DayCard day="Dia 2" content={s.plano_3_dias.dia2} />
            <DayCard day="Dia 3" content={s.plano_3_dias.dia3} />
          </div>
        </SectionCard>

        {/* 13. Próximo passo */}
        <SectionCard number={13} title="Próximo Passo Recomendado" icon="▶️" copyContent={s.proximo_passo}>
          <div className="flex gap-3 items-start bg-violet-600/10 border border-violet-600/20 rounded-xl p-4">
            <span className="text-violet-400 text-xl flex-shrink-0">→</span>
            <p className="text-sm text-violet-200 leading-relaxed font-medium">{s.proximo_passo}</p>
          </div>
        </SectionCard>

      </div>

      {/* ─── Linked data ──────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Creatives */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Criativos Vinculados</h3>
            <button
              onClick={() => navigate(`/criativos?produto=${campaign.product_id}`)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Adicionar
            </button>
          </div>
          {creatives.length === 0 ? (
            <p className="text-gray-600 text-xs">Nenhum criativo registrado para este produto.</p>
          ) : (
            <div className="space-y-2">
              {creatives.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(c.status).split(' ')[0]}`} />
                  <span className="text-gray-300 truncate flex-1">{c.name}</span>
                  <span className="text-gray-600">{c.format}</span>
                </div>
              ))}
              {creatives.length > 5 && (
                <p className="text-gray-600 text-xs mt-1">+{creatives.length - 5} mais</p>
              )}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Métricas Registradas</h3>
            <button
              onClick={() => navigate(`/metricas?produto=${campaign.product_id}`)}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              + Inserir
            </button>
          </div>
          {metrics.length === 0 ? (
            <p className="text-gray-600 text-xs">Nenhuma métrica registrada para este produto.</p>
          ) : (
            <div className="space-y-2">
              {metrics.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">{formatDate(m.date)}</span>
                  <span className="text-gray-300">
                    {formatCurrency(m.spend, m.currency)} gasto
                  </span>
                  {m.roas > 0 && (
                    <span className="text-emerald-400 font-medium">ROAS {m.roas.toFixed(2)}x</span>
                  )}
                </div>
              ))}
              {metrics.length > 5 && (
                <p className="text-gray-600 text-xs mt-1">+{metrics.length - 5} mais</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer meta */}
      <div className="mt-6 text-xs text-gray-600 text-center">
        Criado em {formatDateTime(campaign.created_at)}
        {campaign.updated_at !== campaign.created_at && ` · Atualizado em ${formatDateTime(campaign.updated_at)}`}
      </div>
    </div>
  )
}
