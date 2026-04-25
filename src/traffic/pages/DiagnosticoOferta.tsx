import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatCurrency, formatDate, CATEGORY_LABELS, BILLING_LABELS } from '../utils/helpers'
import type { OfferAnalysis, AIOfferDiagnosis, Product } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 7) return 'text-emerald-400'
  if (s >= 5) return 'text-amber-400'
  return 'text-red-400'
}
function scoreBg(s: number) {
  if (s >= 7) return 'bg-emerald-900/30 border-emerald-700/40'
  if (s >= 5) return 'bg-amber-900/30 border-amber-700/40'
  return 'bg-red-900/30 border-red-700/40'
}
function scoreBar(s: number) {
  if (s >= 7) return 'bg-emerald-500'
  if (s >= 5) return 'bg-amber-500'
  return 'bg-red-500'
}
function prioColor(p: string) {
  if (p === 'alta') return 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
  if (p === 'media') return 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
  return 'bg-gray-800 text-gray-400 border border-gray-700'
}

function formatProductData(p: Product): string {
  return `NOME DO PRODUTO: ${p.name}
NICHO: ${p.niche || 'Não informado'}
CATEGORIA: ${CATEGORY_LABELS[p.category] ?? p.category}
MERCADO / PAÍS: ${p.market || 'Não informado'}
IDIOMA PRINCIPAL: ${p.language || 'Não informado'}
PREÇO: ${p.price > 0 ? formatCurrency(p.price, p.currency) : 'Não informado'} (${BILLING_LABELS[p.billing_model] ?? p.billing_model})
STATUS ATUAL: ${p.status}

PÚBLICO-ALVO: ${p.target_audience || 'Não informado'}
DOR PRINCIPAL: ${p.main_pain || 'Não informado'}
DESEJO PRINCIPAL: ${p.main_desire || 'Não informado'}
BENEFÍCIO PRINCIPAL: ${p.main_benefit || 'Não informado'}
PROMESSA PRINCIPAL: ${p.main_promise || 'Não informado'}
MECANISMO ÚNICO: ${p.unique_mechanism || 'Não informado'}
OBJEÇÕES PRINCIPAIS: ${p.main_objections || 'Não informado'}
CONCORRENTES: ${p.competitors || 'Não informado'}
PÁGINA DE VENDAS: ${p.sales_page_url || 'Não informada'}
CHECKOUT: ${p.checkout_url || 'Não informado'}
OBSERVAÇÕES ADICIONAIS: ${p.notes || 'Nenhuma'}`
}

function analysisToText(a: OfferAnalysis, productName: string): string {
  const sep = '\n' + '═'.repeat(60) + '\n'
  const sub = '\n' + '─'.repeat(40) + '\n'

  return `DIAGNÓSTICO ESTRATÉGICO DE OFERTA
Produto: ${productName}
Gerado em: ${new Date().toLocaleString('pt-BR')}
${sep}
01. NOTA GERAL DA OFERTA: ${a.nota_geral.score}/10

${a.nota_geral.justificativa}

Dimensões:
• Clareza da Promessa: ${a.nota_geral.dimensoes.clareza_promessa}/10
• Força da Dor: ${a.nota_geral.dimensoes.forca_dor}/10
• Urgência: ${a.nota_geral.dimensoes.urgencia}/10
• Diferenciação: ${a.nota_geral.dimensoes.diferenciacao}/10
• Facilidade em Anúncio: ${a.nota_geral.dimensoes.facilidade_anuncio}/10
• Potencial de Escala: ${a.nota_geral.dimensoes.potencial_escala}/10
• Risco de Baixa Conversão: ${a.nota_geral.dimensoes.risco_conversao}/10
${sep}
02. AVATAR PRINCIPAL

Perfil: ${a.avatar.perfil}
Nível de Consciência: ${a.avatar.nivel_consciencia}
Deseja: ${a.avatar.deseja}
Teme: ${a.avatar.teme}
Já Tentou: ${a.avatar.ja_tentou}
Gatilho de Compra: ${a.avatar.gatilho_compra}
${sep}
03. BIG IDEA

${a.big_idea}
${sep}
04. PROMESSA PRINCIPAL AJUSTADA

${a.promessa_ajustada}
${sep}
05. MECANISMO ÚNICO

${a.mecanismo_unico}
${sep}
06. PRINCIPAIS DORES DO PÚBLICO

${a.dores.map((d, i) => `${i + 1}. ${d}`).join('\n')}
${sep}
07. PRINCIPAIS DESEJOS DO PÚBLICO

${a.desejos.map((d, i) => `${i + 1}. ${d}`).join('\n')}
${sep}
08. OBJEÇÕES DE COMPRA E RESPOSTAS

${a.objecoes.map((o, i) => `${i + 1}. OBJEÇÃO: ${o.objecao}\n   RESPOSTA: ${o.resposta}`).join('\n\n')}
${sep}
09. ÂNGULOS DE VENDA

${a.angulos.map((ang, i) => `${i + 1}. [${ang.tipo}]\n   ${ang.titulo}\n   ${ang.descricao}`).join('\n\n')}
${sep}
10. CANAIS RECOMENDADOS

${a.canais.map(c => `${c.canal} (Prioridade: ${c.prioridade.toUpperCase()})\n  Por quê: ${c.porque}\n  Criativo: ${c.criativo}\n  Risco: ${c.risco}`).join(sub)}
${sep}
11. OFERTA RECOMENDADA

Trial: ${a.oferta_recomendada.trial}
Garantia: ${a.oferta_recomendada.garantia}
Bônus: ${a.oferta_recomendada.bonus}
Desconto: ${a.oferta_recomendada.desconto}
Plano Mensal/Anual: ${a.oferta_recomendada.plano_mensal_anual}
Upsell: ${a.oferta_recomendada.upsell}
Downsell: ${a.oferta_recomendada.downsell}
Order Bump: ${a.oferta_recomendada.order_bump}
Remarketing: ${a.oferta_recomendada.remarketing}
${sep}
12. RISCOS DA OFERTA

${a.riscos.map((r, i) => `${i + 1}. ${r}`).join('\n')}
${sep}
13. PLANO DE VALIDAÇÃO

Objetivo: ${a.plano_validacao.objetivo}
Orçamento: ${a.plano_validacao.orcamento}
Quantidade de Criativos: ${a.plano_validacao.quantidade_criativos}
Duração: ${a.plano_validacao.duracao}
Métricas Principais: ${a.plano_validacao.metricas_principais.join(' · ')}
Critério Promissor: ${a.plano_validacao.criterio_promissor}
Critério para Pausar: ${a.plano_validacao.criterio_pausar}
${sep}
14. RESUMO EXECUTIVO

O QUE ESTÁ BOM:
${a.resumo_executivo.o_que_esta_bom}

O QUE PRECISA MELHORAR:
${a.resumo_executivo.o_que_melhorar}

PRÓXIMO PASSO:
${a.resumo_executivo.proximo_passo}
${sep}
Gerado pela TrafficOS · Paid Traffic Intelligence Platform`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium border ${
        copied
          ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50'
          : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700 hover:border-gray-600'
      }`}
    >
      {copied ? '✓ Copiado' : `📋 ${label}`}
    </button>
  )
}

function SectionCard({
  num,
  title,
  icon,
  copyText,
  children,
  accent,
}: {
  num: number
  title: string
  icon: string
  copyText: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl overflow-hidden border ${accent ? 'border-violet-700/40 bg-violet-950/20' : 'border-gray-800 bg-gray-900'}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-gray-500 bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
            {num}
          </span>
          <span className="text-sm font-semibold text-white">
            {icon}&nbsp; {title}
          </span>
        </div>
        <CopyButton text={copyText} />
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function DimBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`font-medium ${scoreColor(value)}`}>{value}/10</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${scoreBar(value)}`} style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  )
}

// ─── Analysis Display ─────────────────────────────────────────────────────────

function AnalysisView({ a, productName }: { a: OfferAnalysis; productName: string }) {
  const scoreLabel = a.nota_geral.score >= 7 ? 'Oferta Forte' : a.nota_geral.score >= 5 ? 'Oferta Média' : 'Oferta Fraca'
  const dims = a.nota_geral.dimensoes

  const ofertaText = Object.entries(a.oferta_recomendada)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n')

  return (
    <div className="space-y-4">

      {/* 01 - Nota Geral */}
      <SectionCard
        num={1}
        title="Nota Geral da Oferta"
        icon="🎯"
        copyText={`NOTA GERAL: ${a.nota_geral.score}/10\n\n${a.nota_geral.justificativa}\n\nClareza da Promessa: ${dims.clareza_promessa}/10\nForça da Dor: ${dims.forca_dor}/10\nUrgência: ${dims.urgencia}/10\nDiferenciação: ${dims.diferenciacao}/10\nFacilidade em Anúncio: ${dims.facilidade_anuncio}/10\nPotencial de Escala: ${dims.potencial_escala}/10\nRisco de Baixa Conversão: ${dims.risco_conversao}/10`}
      >
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Score circle */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 rounded-2xl border ${scoreBg(a.nota_geral.score)}`}>
            <div className={`text-4xl font-black ${scoreColor(a.nota_geral.score)}`}>
              {a.nota_geral.score}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">/ 10</div>
            <div className={`text-[10px] font-semibold mt-1 ${scoreColor(a.nota_geral.score)}`}>{scoreLabel}</div>
          </div>
          {/* Dimensions */}
          <div className="flex-1 space-y-2.5">
            <DimBar label="Clareza da Promessa" value={dims.clareza_promessa} />
            <DimBar label="Força da Dor" value={dims.forca_dor} />
            <DimBar label="Urgência" value={dims.urgencia} />
            <DimBar label="Diferenciação" value={dims.diferenciacao} />
            <DimBar label="Facilidade em Anúncio" value={dims.facilidade_anuncio} />
            <DimBar label="Potencial de Escala" value={dims.potencial_escala} />
            <DimBar label="Risco de Baixa Conversão" value={dims.risco_conversao} />
          </div>
        </div>
        <p className="text-sm text-gray-300 mt-4 leading-relaxed border-t border-gray-800 pt-4">
          {a.nota_geral.justificativa}
        </p>
      </SectionCard>

      {/* 02 - Avatar */}
      <SectionCard
        num={2}
        title="Avatar Principal"
        icon="👤"
        copyText={`AVATAR PRINCIPAL\n\nPerfil: ${a.avatar.perfil}\nNível de Consciência: ${a.avatar.nivel_consciencia}\nDeseja: ${a.avatar.deseja}\nTeme: ${a.avatar.teme}\nJá Tentou: ${a.avatar.ja_tentou}\nGatilho de Compra: ${a.avatar.gatilho_compra}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: '🧑 Perfil', value: a.avatar.perfil },
            { label: '🧠 Nível de Consciência', value: a.avatar.nivel_consciencia },
            { label: '✨ Deseja', value: a.avatar.deseja },
            { label: '😰 Teme', value: a.avatar.teme },
            { label: '🔄 Já Tentou', value: a.avatar.ja_tentou },
            { label: '⚡ Gatilho de Compra', value: a.avatar.gatilho_compra },
          ].map(item => (
            <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-400 mb-1.5">{item.label}</div>
              <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 03 - Big Idea */}
      <SectionCard num={3} title="Big Idea" icon="💡" copyText={`BIG IDEA\n\n${a.big_idea}`} accent>
        <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl p-5">
          <p className="text-lg text-violet-200 font-medium leading-relaxed italic">
            "{a.big_idea}"
          </p>
        </div>
      </SectionCard>

      {/* 04 - Promessa Ajustada */}
      <SectionCard num={4} title="Promessa Principal Ajustada" icon="🎯" copyText={`PROMESSA PRINCIPAL AJUSTADA\n\n${a.promessa_ajustada}`} accent>
        <div className="bg-violet-900/10 border-l-4 border-violet-500 pl-4 py-2">
          <p className="text-base text-white font-medium leading-relaxed">{a.promessa_ajustada}</p>
        </div>
      </SectionCard>

      {/* 05 - Mecanismo Único */}
      <SectionCard num={5} title="Mecanismo Único" icon="⚙️" copyText={`MECANISMO ÚNICO\n\n${a.mecanismo_unico}`}>
        <p className="text-sm text-gray-200 leading-relaxed">{a.mecanismo_unico}</p>
      </SectionCard>

      {/* 06 - Dores */}
      <SectionCard num={6} title="Principais Dores do Público" icon="💔" copyText={`PRINCIPAIS DORES\n\n${a.dores.map((d, i) => `${i + 1}. ${d}`).join('\n')}`}>
        <ol className="space-y-2">
          {a.dores.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 text-red-400 font-bold text-sm w-5 text-right">{i + 1}.</span>
              <span className="text-sm text-gray-300 leading-relaxed">{d}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* 07 - Desejos */}
      <SectionCard num={7} title="Principais Desejos do Público" icon="✨" copyText={`PRINCIPAIS DESEJOS\n\n${a.desejos.map((d, i) => `${i + 1}. ${d}`).join('\n')}`}>
        <ol className="space-y-2">
          {a.desejos.map((d, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 text-violet-400 font-bold text-sm w-5 text-right">{i + 1}.</span>
              <span className="text-sm text-gray-300 leading-relaxed">{d}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* 08 - Objeções */}
      <SectionCard
        num={8}
        title="Objeções de Compra + Respostas"
        icon="🛡️"
        copyText={`OBJEÇÕES E RESPOSTAS\n\n${a.objecoes.map((o, i) => `${i + 1}. OBJEÇÃO: ${o.objecao}\n   RESPOSTA: ${o.resposta}`).join('\n\n')}`}
      >
        <div className="space-y-3">
          {a.objecoes.map((o, i) => (
            <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="bg-red-900/20 border-b border-gray-800 px-4 py-2.5 flex items-start gap-2">
                <span className="text-red-400 text-xs font-bold flex-shrink-0 mt-0.5">OBJEÇÃO {i + 1}</span>
                <p className="text-sm text-red-300">{o.objecao}</p>
              </div>
              <div className="bg-emerald-900/10 px-4 py-2.5 flex items-start gap-2">
                <span className="text-emerald-400 text-xs font-bold flex-shrink-0 mt-0.5">RESPOSTA</span>
                <p className="text-sm text-emerald-300/90 leading-relaxed">{o.resposta}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 09 - Ângulos */}
      <SectionCard
        num={9}
        title="Ângulos de Venda"
        icon="📐"
        copyText={`ÂNGULOS DE VENDA\n\n${a.angulos.map((ang, i) => `${i + 1}. [${ang.tipo}]\n${ang.titulo}\n${ang.descricao}`).join('\n\n')}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {a.angulos.map((ang, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded-full font-medium border border-violet-700/40">
                  {ang.tipo}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">"{ang.titulo}"</p>
              <p className="text-xs text-gray-400 leading-relaxed">{ang.descricao}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 10 - Canais */}
      <SectionCard
        num={10}
        title="Canais Recomendados"
        icon="📡"
        copyText={`CANAIS RECOMENDADOS\n\n${a.canais.map(c => `${c.canal} (${c.prioridade.toUpperCase()})\nPor quê: ${c.porque}\nCriativo: ${c.criativo}\nRisco: ${c.risco}`).join('\n\n')}`}
      >
        <div className="space-y-3">
          {a.canais.map((c, i) => (
            <div key={i} className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-white text-sm">{c.canal}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${prioColor(c.prioridade)}`}>
                  {c.prioridade === 'alta' ? '🟢' : c.prioridade === 'media' ? '🟡' : '⚪'} {c.prioridade.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-gray-500 font-medium mb-1">Por quê</div>
                  <p className="text-gray-300 leading-relaxed">{c.porque}</p>
                </div>
                <div>
                  <div className="text-gray-500 font-medium mb-1">Criativo recomendado</div>
                  <p className="text-gray-300 leading-relaxed">{c.criativo}</p>
                </div>
                <div>
                  <div className="text-red-500/70 font-medium mb-1">⚠ Risco</div>
                  <p className="text-gray-400 leading-relaxed">{c.risco}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 11 - Oferta Recomendada */}
      <SectionCard num={11} title="Oferta Recomendada" icon="💎" copyText={`OFERTA RECOMENDADA\n\n${ofertaText}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: '🎯 Trial', value: a.oferta_recomendada.trial },
            { label: '🛡️ Garantia', value: a.oferta_recomendada.garantia },
            { label: '🎁 Bônus', value: a.oferta_recomendada.bonus },
            { label: '💰 Desconto', value: a.oferta_recomendada.desconto },
            { label: '📅 Mensal / Anual', value: a.oferta_recomendada.plano_mensal_anual },
            { label: '⬆️ Upsell', value: a.oferta_recomendada.upsell },
            { label: '⬇️ Downsell', value: a.oferta_recomendada.downsell },
            { label: '🛒 Order Bump', value: a.oferta_recomendada.order_bump },
            { label: '🔁 Remarketing', value: a.oferta_recomendada.remarketing },
          ].map(item => (
            <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-400 mb-1.5">{item.label}</div>
              <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 12 - Riscos */}
      <SectionCard num={12} title="Riscos da Oferta" icon="⚠️" copyText={`RISCOS DA OFERTA\n\n${a.riscos.map((r, i) => `${i + 1}. ${r}`).join('\n')}`}>
        <div className="space-y-2">
          {a.riscos.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-red-900/10 border border-red-900/30 rounded-lg px-4 py-3">
              <span className="text-red-400 text-sm flex-shrink-0 font-bold">{i + 1}.</span>
              <p className="text-sm text-red-300/90 leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 13 - Plano de Validação */}
      <SectionCard
        num={13}
        title="Plano de Validação"
        icon="🧪"
        copyText={`PLANO DE VALIDAÇÃO\n\nObjetivo: ${a.plano_validacao.objetivo}\nOrçamento: ${a.plano_validacao.orcamento}\nCriativos: ${a.plano_validacao.quantidade_criativos}\nDuração: ${a.plano_validacao.duracao}\nMétricas: ${a.plano_validacao.metricas_principais.join(' · ')}\nCritério Promissor: ${a.plano_validacao.criterio_promissor}\nCritério para Pausar: ${a.plano_validacao.criterio_pausar}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">🎯 Objetivo</div>
            <p className="text-sm text-gray-200">{a.plano_validacao.objetivo}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">💵 Orçamento Sugerido</div>
            <p className="text-sm text-white font-semibold">{a.plano_validacao.orcamento}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">🎨 Criativos para Testar</div>
            <p className="text-sm text-white font-semibold">{a.plano_validacao.quantidade_criativos} criativos</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">⏱️ Duração do Teste</div>
            <p className="text-sm text-white font-semibold">{a.plano_validacao.duracao}</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
          <div className="text-xs text-gray-500 mb-2">📊 Métricas Principais</div>
          <div className="flex flex-wrap gap-2">
            {a.plano_validacao.metricas_principais.map((m, i) => (
              <span key={i} className="text-xs bg-violet-900/40 text-violet-300 px-2.5 py-1 rounded-full border border-violet-700/40">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-900/10 border border-emerald-800/40 rounded-lg p-3">
            <div className="text-xs text-emerald-500 font-semibold mb-1">✅ Critério Promissor</div>
            <p className="text-sm text-emerald-300/90 leading-relaxed">{a.plano_validacao.criterio_promissor}</p>
          </div>
          <div className="bg-red-900/10 border border-red-800/40 rounded-lg p-3">
            <div className="text-xs text-red-500 font-semibold mb-1">🛑 Critério para Pausar</div>
            <p className="text-sm text-red-300/90 leading-relaxed">{a.plano_validacao.criterio_pausar}</p>
          </div>
        </div>
      </SectionCard>

      {/* 14 - Resumo Executivo */}
      <SectionCard
        num={14}
        title="Resumo Executivo"
        icon="📋"
        copyText={`RESUMO EXECUTIVO\n\nO QUE ESTÁ BOM:\n${a.resumo_executivo.o_que_esta_bom}\n\nO QUE PRECISA MELHORAR:\n${a.resumo_executivo.o_que_melhorar}\n\nPRÓXIMO PASSO:\n${a.resumo_executivo.proximo_passo}`}
        accent
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✅ O que está bom</div>
            <p className="text-sm text-emerald-300/90 leading-relaxed">{a.resumo_executivo.o_que_esta_bom}</p>
          </div>
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">⚡ O que melhorar</div>
            <p className="text-sm text-amber-300/90 leading-relaxed">{a.resumo_executivo.o_que_melhorar}</p>
          </div>
          <div className="bg-violet-900/20 border border-violet-700/40 rounded-xl p-4">
            <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">🚀 Próximo passo</div>
            <p className="text-sm text-violet-300/90 leading-relaxed">{a.resumo_executivo.proximo_passo}</p>
          </div>
        </div>
      </SectionCard>

      {/* Export all button */}
      <div className="flex justify-center">
        <CopyButton text={analysisToText(a, productName)} label="Copiar Diagnóstico Completo" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DiagnosticoOferta() {
  const { produtoId } = useParams<{ produtoId: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const product = produtoId ? tosDb.products.getById(produtoId) : null
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('Iniciando análise...')
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<OfferAnalysis | null>(null)
  const [savedDiagnosis, setSavedDiagnosis] = useState<AIOfferDiagnosis | null>(null)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState<AIOfferDiagnosis[]>([])

  const loadHistory = useCallback(() => {
    if (!produtoId) return
    const all = tosDb.aiDiagnoses.getByProduct(produtoId)
    setHistory(all)
    const latest = all[0] ?? null
    if (latest) {
      setSavedDiagnosis(latest)
      setAnalysis(latest.analysis)
      setSaved(true)
    }
  }, [produtoId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const PROGRESS_MESSAGES = [
    'Analisando dados do produto...',
    'Avaliando força da oferta...',
    'Construindo avatar do comprador...',
    'Gerando Big Idea...',
    'Mapeando objeções e respostas...',
    'Criando ângulos de campanha...',
    'Avaliando canais recomendados...',
    'Montando plano de validação...',
    'Finalizando diagnóstico...',
  ]

  async function generate() {
    if (!product || !produtoId) return
    setLoading(true)
    setError(null)
    setProgress(0)
    setSaved(false)
    let msgIdx = 0
    setProgressMsg(PROGRESS_MESSAGES[0])

    const progressInterval = setInterval(() => {
      setProgress(p => {
        const next = Math.min(p + 1.8, 92)
        if (next > (msgIdx + 1) * 11 && msgIdx < PROGRESS_MESSAGES.length - 1) {
          msgIdx++
          setProgressMsg(PROGRESS_MESSAGES[msgIdx])
        }
        return next
      })
    }, 350)

    try {
      const productData = formatProductData(product)
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productData }),
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { analysis: OfferAnalysis }
      setProgress(100)
      setProgressMsg('Diagnóstico concluído!')
      setAnalysis(data.analysis)
      setSaved(false)
    } catch (e) {
      clearInterval(progressInterval)
      const msg = e instanceof Error ? e.message : 'Erro ao gerar diagnóstico'
      setError(
        msg.includes('fetch') || msg.includes('Failed to fetch')
          ? 'Não foi possível conectar à API. Verifique se o ambiente Vercel está configurado corretamente.'
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  function saveDiagnosis() {
    if (!analysis || !produtoId || !product) return
    const d: AIOfferDiagnosis = {
      id: savedDiagnosis?.id ?? generateId(),
      product_id: produtoId,
      product_data_snapshot: formatProductData(product),
      analysis,
      created_at: savedDiagnosis?.created_at ?? now(),
    }
    tosDb.aiDiagnoses.save(d)
    // Update product offer_score with the AI score * 10
    const score = Math.round(analysis.nota_geral.score * 10)
    tosDb.products.save({ ...product, offer_score: score, updated_at: now() })
    setSavedDiagnosis(d)
    setSaved(true)
    loadHistory()
  }

  function exportText() {
    if (!analysis || !product) return
    const text = analysisToText(analysis, product.name)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagnostico-${product.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function loadHistoricDiagnosis(d: AIOfferDiagnosis) {
    setAnalysis(d.analysis)
    setSavedDiagnosis(d)
    setSaved(true)
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Produto não encontrado.</p>
        <button onClick={() => navigate('/produtos')} className="mt-3 text-violet-400 text-sm">← Voltar</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/produtos/${produtoId}`)} className="text-gray-400 hover:text-white text-sm transition-colors">
          ← {t('common.back')}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🔬 {t('diag.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {t('diag.for')}: <span className="text-white font-medium">{product.name}</span>
          </p>
          {savedDiagnosis && (
            <p className="text-xs text-gray-600 mt-0.5">
              Último diagnóstico: {formatDate(savedDiagnosis.created_at)}
            </p>
          )}
        </div>
        {analysis && (
          <div className="flex flex-wrap gap-2">
            {!saved && (
              <button
                onClick={saveDiagnosis}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                💾 Salvar Diagnóstico
              </button>
            )}
            {saved && (
              <span className="text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 px-3 py-2 rounded-lg">
                ✓ Salvo no produto
              </span>
            )}
            <button
              onClick={exportText}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              📄 Exportar .txt
            </button>
            <button
              onClick={generate}
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-40"
            >
              🔄 Regenerar
            </button>
          </div>
        )}
      </div>

      {/* Product Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Produto', value: product.name, full: true },
          { label: 'Nicho', value: product.niche || '—' },
          { label: 'Categoria', value: CATEGORY_LABELS[product.category] ?? product.category },
          { label: 'Mercado', value: product.market || '—' },
          { label: 'Preço', value: product.price > 0 ? formatCurrency(product.price, product.currency) : '—' },
          { label: 'Cobrança', value: BILLING_LABELS[product.billing_model] ?? product.billing_model },
        ].map(item => (
          <div
            key={item.label}
            className={`bg-gray-900 border border-gray-800 rounded-xl p-3 ${item.full ? 'col-span-2 sm:col-span-3 lg:col-span-6' : ''}`}
          >
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{item.label}</div>
            <div className="text-sm font-medium text-white truncate">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Offer data completeness warning */}
      {(!product.main_pain || !product.target_audience || !product.main_promise) && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm text-amber-300 font-medium">Dados incompletos</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              O diagnóstico será mais preciso com todos os campos preenchidos.{' '}
              <button onClick={() => navigate(`/produtos/${produtoId}/editar`)} className="underline hover:text-amber-300">
                Completar cadastro →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Generate button (no analysis yet) */}
      {!analysis && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center mb-6">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-xl font-bold text-white mb-2">Gerar Diagnóstico de Oferta com IA</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            A IA irá analisar todos os dados do produto e gerar um diagnóstico estratégico completo
            com 14 seções, incluindo avatar, ângulos, canais, riscos e plano de validação.
          </p>
          <button
            onClick={generate}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 px-8 rounded-xl text-sm transition-colors shadow-lg shadow-violet-900/30"
          >
            ⚡ Gerar Diagnóstico com IA
          </button>
          {history.length === 0 && (
            <p className="text-xs text-gray-600 mt-4">Requer a API configurada no ambiente Vercel (CLAUDE_API_KEY)</p>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
            <div
              className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"
            />
            <div className="absolute inset-2 flex items-center justify-center text-lg">🧠</div>
          </div>
          <p className="text-white font-semibold mb-2">{progressMsg}</p>
          <div className="w-64 mx-auto">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}% completo</p>
          </div>
          <p className="text-xs text-gray-600 mt-4">Isso pode levar 20–40 segundos...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-red-300 font-medium mb-1">Erro ao gerar diagnóstico</p>
              <p className="text-red-400/80 text-sm">{error}</p>
              <button
                onClick={generate}
                className="mt-3 text-sm text-red-300 hover:text-red-200 underline"
              >
                Tentar novamente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis */}
      {analysis && !loading && (
        <AnalysisView a={analysis} productName={product.name} />
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            📚 {t('diag.history')} ({history.length} diagnósticos)
          </h3>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${scoreColor(h.analysis.nota_geral.score)}`}>
                    {h.analysis.nota_geral.score}
                  </span>
                  <div>
                    <p className="text-sm text-gray-300">{formatDate(h.created_at)}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{h.analysis.big_idea}</p>
                  </div>
                </div>
                <button
                  onClick={() => loadHistoricDiagnosis(h)}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Ver →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
