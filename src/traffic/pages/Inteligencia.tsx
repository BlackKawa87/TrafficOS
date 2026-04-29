import { useState, useRef } from 'react'
import { tosDb, generateId, now } from '../store/storage'
import {
  LEARNING_PATTERN_LABELS,
  LEARNING_PATTERN_ICONS,
  LEARNING_PATTERN_COLORS,
  PRIORITY_COLOR,
  CHANNEL_LABELS,
  formatDate,
  formatDateTime,
} from '../utils/helpers'
import type {
  LearningPattern,
  LearningPatternType,
  IntelligenceReport,
  PadraoVencedor,
  ErroRecorrente,
  OportunidadeOculta,
  SugestaoMelhoria,
} from '../types'

type ActiveTab = 'padroes' | 'rankings' | 'relatorios'

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-orange-400'}`}>
        {score}
      </span>
    </div>
  )
}

// ─── Pattern Card ─────────────────────────────────────────────────────────────

function PatternCard({
  pattern,
  onEdit,
  onDelete,
}: {
  pattern: LearningPattern
  onEdit: (p: LearningPattern) => void
  onDelete: (id: string) => void
}) {
  const color = LEARNING_PATTERN_COLORS[pattern.tipo] ?? ''
  const icon = LEARNING_PATTERN_ICONS[pattern.tipo] ?? '📌'
  const label = LEARNING_PATTERN_LABELS[pattern.tipo] ?? pattern.tipo

  return (
    <div className={`rounded-xl border overflow-hidden ${color.split(' ').filter(c => c.startsWith('border')).join(' ')} bg-gray-900 group`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{icon}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
            {label}
          </span>
          {pattern.canal && (
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-gray-800">
              {CHANNEL_LABELS[pattern.canal] ?? pattern.canal}
            </span>
          )}
          {pattern.nicho && (
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-gray-800">
              {pattern.nicho}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(pattern)}
            className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(pattern.id)}
            className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white leading-snug">{pattern.titulo}</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-3">{pattern.conteudo}</p>
        </div>

        {/* Score */}
        <ScoreBar score={pattern.performance_score} />

        {/* Metrics row */}
        {(pattern.ctr != null || pattern.cpa != null || pattern.roas != null || pattern.conversions != null) && (
          <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
            {pattern.ctr != null && <span>CTR <span className="text-gray-300 font-medium">{pattern.ctr.toFixed(2)}%</span></span>}
            {pattern.cpa != null && <span>CPA <span className="text-gray-300 font-medium">${pattern.cpa.toFixed(2)}</span></span>}
            {pattern.roas != null && <span>ROAS <span className="text-gray-300 font-medium">{pattern.roas.toFixed(1)}x</span></span>}
            {pattern.conversions != null && <span>Conv <span className="text-gray-300 font-medium">{pattern.conversions}</span></span>}
          </div>
        )}

        {/* Tags */}
        {pattern.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pattern.tags.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">#{t}</span>
            ))}
          </div>
        )}

        <div className="text-[10px] text-gray-700">{formatDate(pattern.created_at)}</div>
      </div>
    </div>
  )
}

// ─── Add / Edit Pattern Modal ─────────────────────────────────────────────────

interface PatternModalProps {
  initial?: LearningPattern | null
  onSave: (p: LearningPattern) => void
  onClose: () => void
}

function PatternModal({ initial, onSave, onClose }: PatternModalProps) {
  const isEdit = !!initial
  const [tipo, setTipo] = useState<LearningPatternType>(initial?.tipo ?? 'hook')
  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [conteudo, setConteudo] = useState(initial?.conteudo ?? '')
  const [nicho, setNicho] = useState(initial?.nicho ?? '')
  const [canal, setCanal] = useState(initial?.canal ?? '')
  const [score, setScore] = useState(initial?.performance_score ?? 70)
  const [tagInput, setTagInput] = useState(initial?.tags.join(', ') ?? '')
  const [ctr, setCtr] = useState(initial?.ctr != null ? String(initial.ctr) : '')
  const [cpa, setCpa] = useState(initial?.cpa != null ? String(initial.cpa) : '')
  const [roas, setRoas] = useState(initial?.roas != null ? String(initial.roas) : '')
  const [conversions, setConversions] = useState(initial?.conversions != null ? String(initial.conversions) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const products = tosDb.products.getAll()
  const [productId, setProductId] = useState(initial?.product_id ?? '')

  const tipos: LearningPatternType[] = ['hook', 'copy', 'criativo', 'publico', 'canal', 'angulo']
  const canais = ['meta_ads', 'tiktok_ads', 'google_search', 'youtube_ads', 'native_ads', 'email_marketing', 'whatsapp_telegram']

  function handleSave() {
    if (!titulo.trim() || !conteudo.trim()) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    const pattern: LearningPattern = {
      id: initial?.id ?? generateId(),
      tipo,
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      product_id: productId || undefined,
      nicho: nicho.trim() || undefined,
      canal: canal || undefined,
      performance_score: score,
      ctr: ctr ? parseFloat(ctr) : undefined,
      cpa: cpa ? parseFloat(cpa) : undefined,
      roas: roas ? parseFloat(roas) : undefined,
      conversions: conversions ? parseInt(conversions, 10) : undefined,
      tags,
      status: initial?.status ?? 'ativo',
      notes: notes.trim() || undefined,
      created_at: initial?.created_at ?? now(),
      updated_at: now(),
    }
    onSave(pattern)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-white">
            {isEdit ? 'Editar Padrão' : '+ Novo Padrão Vencedor'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Tipo de Padrão</label>
            <div className="grid grid-cols-3 gap-2">
              {tipos.map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                    tipo === t
                      ? `${LEARNING_PATTERN_COLORS[t]} border-opacity-100`
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span>{LEARNING_PATTERN_ICONS[t]}</span>
                  <span className="font-medium">{LEARNING_PATTERN_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Título *</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Hook de pergunta sobre dor específica — Meta Ads B2C"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">
              Conteúdo / Descrição do Padrão *
            </label>
            <textarea
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              rows={4}
              placeholder={
                tipo === 'hook' ? 'Cole o hook vencedor ou descreva o padrão. Ex: "Você já tentou X e não conseguiu?" + variação'
                : tipo === 'copy' ? 'Cole a copy ou headline vencedora com contexto de onde funcionou'
                : tipo === 'publico' ? 'Descreva o público: interesses, dados demográficos, comportamentos que converteram'
                : tipo === 'canal' ? 'Descreva o padrão de canal: formato, orçamento, resultado observado'
                : tipo === 'angulo' ? 'Descreva o ângulo de venda: transformação, dor, mecanismo, ou autoridade'
                : 'Descreva o criativo: formato, elementos visuais, narrativa que funcionou'
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Context fields row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Canal</label>
              <select
                value={canal}
                onChange={e => setCanal(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none"
              >
                <option value="">Todos os canais</option>
                {canais.map(c => (
                  <option key={c} value={c}>{CHANNEL_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Nicho</label>
              <input
                value={nicho}
                onChange={e => setNicho(e.target.value)}
                placeholder="Ex: Infoproduto, Nutra, SaaS"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
          </div>

          {products.length > 0 && (
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Produto (opcional)</label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none"
              >
                <option value="">Todos os produtos</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Performance score slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Score de Performance</label>
              <span className={`text-sm font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-orange-400'}`}>
                {score}/100
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={e => setScore(parseInt(e.target.value, 10))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Fraco (0)</span><span>Regular (50)</span><span>Excelente (100)</span>
            </div>
          </div>

          {/* Optional metrics */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">
              Métricas Reais (opcional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'CTR (%)', value: ctr, set: setCtr, placeholder: '2.4' },
                { label: 'CPA ($)', value: cpa, set: setCpa, placeholder: '18.00' },
                { label: 'ROAS', value: roas, set: setRoas, placeholder: '3.5' },
                { label: 'Conv.', value: conversions, set: setConversions, placeholder: '42' },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-[10px] text-gray-600 mb-1">{m.label}</div>
                  <input
                    type="number"
                    value={m.value}
                    onChange={e => m.set(e.target.value)}
                    placeholder={m.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Tags (separadas por vírgula)</label>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Ex: urgencia, prova-social, b2c, video-curto"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Contexto adicional, quando testar novamente, etc."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!titulo.trim() || !conteudo.trim()}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isEdit ? 'Salvar alterações' : '+ Adicionar Padrão'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Intelligence Report display ──────────────────────────────────────────────

function ReportView({ report, onDelete }: { report: IntelligenceReport; onDelete: () => void }) {
  const [open, setOpen] = useState<string | null>('padroes')

  const scoreColor = report.score_geral >= 80 ? 'text-emerald-400' : report.score_geral >= 60 ? 'text-amber-400' : 'text-orange-400'
  const scoreBg = report.score_geral >= 80 ? 'bg-emerald-500' : report.score_geral >= 60 ? 'bg-amber-500' : 'bg-orange-500'

  function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
    return (
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen(open === id ? null : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/40 hover:bg-gray-800/70 transition-colors"
        >
          <span className="text-sm font-semibold text-white">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{count}</span>
            <span className="text-gray-500">{open === id ? '▲' : '▼'}</span>
          </div>
        </button>
        {open === id && <div className="p-4 space-y-3">{children}</div>}
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Report header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl ${scoreBg}/20 flex items-center justify-center border border-${scoreBg.replace('bg-', '')}/30`}>
                  <span className={`text-lg font-bold ${scoreColor}`}>{report.score_geral}</span>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Score Geral</div>
                  <div className={`text-sm font-bold ${scoreColor}`}>
                    {report.score_geral >= 80 ? 'Excelente' : report.score_geral >= 60 ? 'Bom' : report.score_geral >= 40 ? 'Regular' : 'Precisa melhorar'}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{report.resumo_executivo}</p>
            <p className="text-[10px] text-gray-600 mt-2">{formatDateTime(report.generated_at)}</p>
          </div>
          <button
            onClick={onDelete}
            className="text-gray-600 hover:text-red-400 text-xs transition-colors flex-shrink-0"
            title="Excluir relatório"
          >
            ✕
          </button>
        </div>

        {/* Próximos passos quick view */}
        {report.proximos_passos?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">🎯 Próximos Passos</div>
            <div className="space-y-1">
              {report.proximos_passos.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <span className="text-violet-500 font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="p-4 space-y-3">
        <Section id="padroes" title="✅ Padrões Vencedores" count={report.padroes_vencedores?.length ?? 0}>
          {(report.padroes_vencedores ?? []).map((p: PadraoVencedor, i: number) => (
            <div key={i} className="bg-emerald-900/10 border border-emerald-800/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LEARNING_PATTERN_COLORS[p.tipo] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {LEARNING_PATTERN_ICONS[p.tipo] ?? '📌'} {LEARNING_PATTERN_LABELS[p.tipo] ?? p.tipo}
                </span>
                <span className="text-xs font-semibold text-emerald-300">{p.impacto}</span>
              </div>
              <p className="text-sm text-white font-medium">{p.descricao}</p>
              <p className="text-xs text-gray-400">{p.motivo}</p>
              <p className="text-[10px] text-gray-600">Frequência: {p.frequencia}</p>
            </div>
          ))}
        </Section>

        <Section id="erros" title="⚠️ Erros Recorrentes" count={report.erros_recorrentes?.length ?? 0}>
          {(report.erros_recorrentes ?? []).map((e: ErroRecorrente, i: number) => (
            <div key={i} className="bg-red-900/10 border border-red-800/30 rounded-lg p-3 space-y-1.5">
              <p className="text-sm text-white font-medium">{e.descricao}</p>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="text-red-400">💸 {e.custo_estimado}</span>
                <span className="text-gray-500">Freq: {e.frequencia}</span>
              </div>
              <div className="text-xs text-emerald-400 flex items-start gap-1">
                <span className="flex-shrink-0">→</span>
                <span>{e.como_corrigir}</span>
              </div>
            </div>
          ))}
        </Section>

        <Section id="oportunidades" title="💡 Oportunidades Ocultas" count={report.oportunidades_ocultas?.length ?? 0}>
          {(report.oportunidades_ocultas ?? []).map((o: OportunidadeOculta, i: number) => (
            <div key={i} className="bg-amber-900/10 border border-amber-800/30 rounded-lg p-3 space-y-1.5">
              <p className="text-sm text-white font-medium">{o.descricao}</p>
              <p className="text-xs text-amber-400">🚀 {o.potencial}</p>
              <p className="text-xs text-gray-400">→ {o.acao_recomendada}</p>
              <p className="text-[10px] text-gray-600">Prazo: {o.prazo}</p>
            </div>
          ))}
        </Section>

        <Section id="sugestoes" title="✨ Sugestões de Melhoria" count={report.sugestoes_melhoria?.length ?? 0}>
          {(report.sugestoes_melhoria ?? []).map((s: SugestaoMelhoria, i: number) => (
            <div key={i} className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-400">{s.area}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[s.prioridade] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {s.prioridade === 'alta' ? '🔴' : s.prioridade === 'media' ? '🟡' : '🟢'} {s.prioridade}
                </span>
              </div>
              <p className="text-sm text-white">{s.sugestao}</p>
              <p className="text-xs text-gray-400">Impacto: {s.impacto_esperado}</p>
            </div>
          ))}
        </Section>
      </div>
    </div>
  )
}

// ─── Rankings Tab ─────────────────────────────────────────────────────────────

function RankingsTab({ patterns }: { patterns: LearningPattern[] }) {
  const tipos: LearningPatternType[] = ['hook', 'copy', 'criativo', 'publico', 'canal', 'angulo']
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      {tipos.map(tipo => {
        const top = patterns
          .filter(p => p.tipo === tipo && p.status === 'ativo')
          .sort((a, b) => b.performance_score - a.performance_score)
          .slice(0, 3)

        if (top.length === 0) return null

        return (
          <div key={tipo} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800">
              <span className="text-base">{LEARNING_PATTERN_ICONS[tipo]}</span>
              <h3 className="text-sm font-semibold text-white">Top {LEARNING_PATTERN_LABELS[tipo]}</h3>
              <span className="ml-auto text-[10px] text-gray-600">{top.length} padrões</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {top.map((p, i) => (
                <div key={p.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{medals[i] ?? `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">{p.titulo}</p>
                      {p.canal && (
                        <span className="text-[10px] text-gray-600 px-1.5 py-0.5 rounded bg-gray-800 flex-shrink-0">
                          {CHANNEL_LABELS[p.canal] ?? p.canal}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{p.conteudo}</p>
                    <div className="mt-1.5">
                      <ScoreBar score={p.performance_score} />
                    </div>
                    {(p.roas != null || p.ctr != null) && (
                      <div className="flex gap-3 mt-1 text-[10px] text-gray-600">
                        {p.roas != null && <span>ROAS <span className="text-emerald-400">{p.roas.toFixed(1)}x</span></span>}
                        {p.ctr != null && <span>CTR <span className="text-blue-400">{p.ctr.toFixed(2)}%</span></span>}
                        {p.cpa != null && <span>CPA <span className="text-amber-400">${p.cpa.toFixed(2)}</span></span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {patterns.filter(p => p.status === 'ativo').length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-sm">Nenhum padrão registrado ainda.</p>
          <p className="text-xs mt-1 text-gray-700">Adicione padrões na aba "Padrões" para ver o ranking.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function buildContextData(): string {
  const products = tosDb.products.getAll()
  const aiCampaigns = tosDb.aiCampaigns.getAll()
  const aiCreatives = tosDb.aiCreatives.getAll()
  const metrics = tosDb.metrics.getAll()
  const patterns = tosDb.learningPatterns.getAll()
  const decisions = tosDb.decisions.getAll()
  const scaleOps = tosDb.scaleOpportunities.getAll()

  let ctx = `═══ RESUMO DA PLATAFORMA TRAFFICOSS ═══\n\n`

  ctx += `PRODUTOS (${products.length}):\n`
  ctx += JSON.stringify(products.map(p => ({
    nome: p.name, nicho: p.niche, categoria: p.category, preco: p.price,
    status: p.status,
  })), null, 2)

  ctx += `\n\nCAMPANHAS IA (${aiCampaigns.length}):\n`
  ctx += JSON.stringify(aiCampaigns.slice(0, 15).map(c => ({
    objetivo: c.objective, canal: c.channel, fase: c.phase,
    status: c.status, hipotese: c.strategy?.hipotese_principal,
    angulo: c.strategy?.angulo_principal?.descricao,
    orcamento_diario: c.daily_budget, resultado: c.main_result,
  })), null, 2)

  ctx += `\n\nCRIATIVOS IA (${aiCreatives.length}):\n`
  ctx += JSON.stringify(aiCreatives.slice(0, 20).map(c => ({
    tipo: c.creative_type, canal: c.channel, status: c.status,
    angulo: c.angle, ctr: c.ctr, cpa: c.cpa, roas: c.roas,
    spend: c.spend, conversions: c.conversions,
  })), null, 2)

  if (metrics.length > 0) {
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
    ctx += `\n\nMÉTRICAS GLOBAIS:\n`
    ctx += JSON.stringify({ totalSpend, totalRevenue, totalConversions, registros: metrics.length }, null, 2)
  }

  if (decisions.length > 0) {
    ctx += `\n\nDECISÕES REGISTRADAS (${decisions.length}):\n`
    ctx += JSON.stringify(decisions.slice(0, 10).map(d => ({
      tipo: d.decision_type, status: d.status, prioridade: d.priority,
    })), null, 2)
  }

  if (scaleOps.length > 0) {
    ctx += `\n\nOPORTUNIDADES DE ESCALA (${scaleOps.length}):\n`
    ctx += JSON.stringify(scaleOps.slice(0, 10).map(o => ({
      titulo: o.title, tipo: o.action_type, prioridade: o.priority,
      status: o.status, potencial: o.potential,
    })), null, 2)
  }

  if (patterns.length > 0) {
    ctx += `\n\nPADRÕES JÁ REGISTRADOS (${patterns.length}):\n`
    ctx += JSON.stringify(patterns.map(p => ({
      tipo: p.tipo, titulo: p.titulo, score: p.performance_score,
      canal: p.canal, nicho: p.nicho, ctr: p.ctr, roas: p.roas, cpa: p.cpa,
    })), null, 2)
  }

  return ctx
}

export default function Inteligencia() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('padroes')
  const [refresh, setRefresh] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<LearningPattern | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterCanal, setFilterCanal] = useState('')
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [genError, setGenError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const allPatterns = tosDb.learningPatterns.getAll()
  const allReports = tosDb.intelligenceReports.getAll()

  const filteredPatterns = allPatterns.filter(p => {
    if (p.status === 'arquivado') return false
    if (filterType && p.tipo !== filterType) return false
    if (filterCanal && p.canal !== filterCanal) return false
    if (search && !p.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !p.conteudo.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleSavePattern(pattern: LearningPattern) {
    tosDb.learningPatterns.save(pattern)
    setShowAddModal(false)
    setEditingPattern(null)
    setRefresh(r => r + 1)
  }

  function handleDeletePattern(id: string) {
    if (!confirm('Excluir este padrão?')) return
    tosDb.learningPatterns.delete(id)
    setRefresh(r => r + 1)
  }

  function handleDeleteReport(id: string) {
    if (!confirm('Excluir este relatório?')) return
    tosDb.intelligenceReports.delete(id)
    setRefresh(r => r + 1)
  }

  async function generateReport() {
    setGenError('')
    setGenerating(true)
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress(p => (p < 90 ? p + 1.1 : p))
    }, 350)

    try {
      const contextData = buildContextData()
      const res = await fetch('/api/inteligencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextData }),
      })
      const data = await res.json() as { report?: Partial<IntelligenceReport>; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro ao gerar relatório')

      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setProgress(100)

      const r = data.report!
      const report: IntelligenceReport = {
        id: generateId(),
        generated_at: now(),
        padroes_vencedores: r.padroes_vencedores ?? [],
        erros_recorrentes: r.erros_recorrentes ?? [],
        oportunidades_ocultas: r.oportunidades_ocultas ?? [],
        sugestoes_melhoria: r.sugestoes_melhoria ?? [],
        resumo_executivo: r.resumo_executivo ?? '',
        score_geral: r.score_geral ?? 50,
        proximos_passos: r.proximos_passos ?? [],
      }
      tosDb.intelligenceReports.save(report)
      setRefresh(rv => rv + 1)
      setActiveTab('relatorios')
    } catch (err) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setGenError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setGenerating(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const tipos: LearningPatternType[] = ['hook', 'copy', 'criativo', 'publico', 'canal', 'angulo']
  const tabs: { id: ActiveTab; label: string; count: number }[] = [
    { id: 'padroes', label: 'Padrões', count: allPatterns.filter(p => p.status === 'ativo').length },
    { id: 'rankings', label: 'Rankings', count: 0 },
    { id: 'relatorios', label: 'Relatórios IA', count: allReports.length },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Modals */}
      {(showAddModal || editingPattern) && (
        <PatternModal
          initial={editingPattern}
          onSave={handleSavePattern}
          onClose={() => { setShowAddModal(false); setEditingPattern(null) }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">🧠 Banco de Inteligência</h1>
          <p className="text-sm text-gray-500 mt-0.5">Padrões vencedores, análise de histórico e vantagem competitiva contínua</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
        >
          {generating ? '⟳ Analisando...' : '🧠 Gerar Insights com IA'}
        </button>
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Analisando histórico completo da plataforma...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-violet-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {genError && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-400">{genError}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {tipos.map(t => {
          const count = allPatterns.filter(p => p.tipo === t && p.status === 'ativo').length
          return (
            <button
              key={t}
              onClick={() => { setFilterType(filterType === t ? '' : t); setActiveTab('padroes') }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${
                filterType === t
                  ? `${LEARNING_PATTERN_COLORS[t]} border-opacity-100`
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <span className="text-xl">{LEARNING_PATTERN_ICONS[t]}</span>
              <span className="text-lg font-bold text-white">{count}</span>
              <span className="text-[10px] text-gray-500">{LEARNING_PATTERN_LABELS[t]}</span>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-violet-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PADRÕES TAB ── */}
      {activeTab === 'padroes' && (
        <div className="space-y-4">
          {/* Filter + Add bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar padrões..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none w-48"
            />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
            >
              <option value="">Todos os tipos</option>
              {tipos.map(t => (
                <option key={t} value={t}>{LEARNING_PATTERN_ICONS[t]} {LEARNING_PATTERN_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={filterCanal}
              onChange={e => setFilterCanal(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
            >
              <option value="">Todos os canais</option>
              {['meta_ads', 'tiktok_ads', 'google_search', 'youtube_ads', 'native_ads'].map(c => (
                <option key={c} value={c}>{CHANNEL_LABELS[c] ?? c}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              + Adicionar Padrão
            </button>
          </div>

          {filteredPatterns.length === 0 ? (
            <div className="text-center py-16 text-gray-600 border border-dashed border-gray-800 rounded-xl">
              <p className="text-4xl mb-3">🧠</p>
              <p className="text-sm">
                {allPatterns.length === 0
                  ? 'Nenhum padrão salvo ainda.'
                  : 'Nenhum padrão corresponde ao filtro.'}
              </p>
              {allPatterns.length === 0 && (
                <p className="text-xs mt-1 text-gray-700">
                  Registre o que está funcionando — hooks, copies, públicos e ângulos vencedores.
                </p>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                + Adicionar primeiro padrão
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPatterns.map(p => (
                <PatternCard
                  key={p.id}
                  pattern={p}
                  onEdit={pat => setEditingPattern(pat)}
                  onDelete={handleDeletePattern}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RANKINGS TAB ── */}
      {activeTab === 'rankings' && (
        <RankingsTab patterns={allPatterns} />
      )}

      {/* ── RELATÓRIOS TAB ── */}
      {activeTab === 'relatorios' && (
        <div className="space-y-5">
          {allReports.length === 0 ? (
            <div className="text-center py-16 text-gray-600 border border-dashed border-gray-800 rounded-xl">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm">Nenhum relatório gerado ainda.</p>
              <p className="text-xs mt-1 text-gray-700">
                Clique em "Gerar Insights com IA" para analisar todo o histórico da plataforma.
              </p>
              <button
                onClick={generateReport}
                disabled={generating}
                className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                🧠 Gerar primeiro relatório
              </button>
            </div>
          ) : (
            allReports.map(report => (
              <ReportView
                key={report.id}
                report={report}
                onDelete={() => handleDeleteReport(report.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Force re-render on refresh */}
      <span className="hidden">{refresh}</span>
    </div>
  )
}
