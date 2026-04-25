import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { tosDb } from '../store/storage'
import { formatDate } from '../utils/helpers'
import type { LandingPageBloco } from '../types'

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
      {copied ? '✓' : 'Copiar'}
    </button>
  )
}

const BLOCO_ICONS: Record<string, string> = {
  hero: '🌟', problema: '⚡', solucao: '✅', como_funciona: '⚙️',
  beneficios: '🎯', prova: '⭐', garantia: '🛡️', oferta: '💰',
  faq: '❓', cta_final: '🚀',
}
const BLOCO_LABELS: Record<string, string> = {
  hero: 'HERO', problema: 'PROBLEMA', solucao: 'SOLUÇÃO', como_funciona: 'COMO FUNCIONA',
  beneficios: 'BENEFÍCIOS', prova: 'PROVA SOCIAL', garantia: 'GARANTIA', oferta: 'OFERTA',
  faq: 'FAQ', cta_final: 'CTA FINAL',
}
const BLOCO_BORDER: Record<string, string> = {
  hero: 'border-l-violet-500', problema: 'border-l-red-500', solucao: 'border-l-emerald-500',
  como_funciona: 'border-l-blue-500', beneficios: 'border-l-amber-500', prova: 'border-l-yellow-500',
  garantia: 'border-l-cyan-500', oferta: 'border-l-orange-500', faq: 'border-l-gray-500',
  cta_final: 'border-l-pink-500',
}

function BlocoCard({ bloco, index }: { bloco: LandingPageBloco; index: number }) {
  const [open, setOpen] = useState(index < 3)
  const borderColor = BLOCO_BORDER[bloco.tipo] ?? 'border-l-gray-600'

  const copyText = [
    bloco.copy?.headline ? `HEADLINE: ${bloco.copy.headline}` : '',
    bloco.copy?.subheadline ? `SUBHEADLINE: ${bloco.copy.subheadline}` : '',
    bloco.copy?.corpo ? `CORPO: ${bloco.copy.corpo}` : '',
    ...(bloco.copy?.lista_itens?.length ? [`LISTA:\n${bloco.copy.lista_itens.map(i => `• ${i}`).join('\n')}`] : []),
    bloco.copy?.cta_texto ? `CTA: ${bloco.copy.cta_texto}` : '',
  ].filter(Boolean).join('\n\n')

  return (
    <div className={`bg-gray-900 border border-gray-800 border-l-4 ${borderColor} rounded-xl overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{BLOCO_ICONS[bloco.tipo] ?? '📄'}</span>
          <div>
            <span className="text-sm font-bold text-white">{BLOCO_LABELS[bloco.tipo] ?? bloco.tipo}</span>
            {bloco.copy?.headline && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{bloco.copy.headline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {copyText && <CopyButton text={copyText} />}
          <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-800/50">
          {/* Layout wireframe */}
          <div className="mt-4 bg-gray-800/40 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">📐 Layout / Wireframe</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: 'Posição texto', value: bloco.layout?.posicao_texto },
                { label: 'Posição imagem', value: bloco.layout?.posicao_imagem },
                { label: 'Espaçamento', value: bloco.layout?.espacamento },
                { label: 'Hierarquia', value: bloco.layout?.hierarquia },
              ].filter(x => x.value).map(item => (
                <div key={item.label} className="bg-gray-800/60 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                  <p className="text-xs text-gray-200">{item.value}</p>
                </div>
              ))}
            </div>
            {bloco.layout?.notas && (
              <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-3 mt-2">
                <p className="text-xs text-amber-300">📝 {bloco.layout.notas}</p>
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">✍️ Copy Posicionada</p>

            {bloco.copy?.headline && (
              <div className="group">
                <p className="text-xs text-gray-500 mb-1">Headline</p>
                <div className="flex items-start justify-between gap-2 bg-gray-800/50 rounded-lg p-3">
                  <p className="text-base font-bold text-white leading-tight">{bloco.copy.headline}</p>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <CopyButton text={bloco.copy.headline} />
                  </div>
                </div>
              </div>
            )}

            {bloco.copy?.subheadline && (
              <div className="group">
                <p className="text-xs text-gray-500 mb-1">Subheadline</p>
                <div className="flex items-start justify-between gap-2 bg-gray-800/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-200 leading-relaxed">{bloco.copy.subheadline}</p>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <CopyButton text={bloco.copy.subheadline} />
                  </div>
                </div>
              </div>
            )}

            {bloco.copy?.corpo && (
              <div className="group">
                <p className="text-xs text-gray-500 mb-1">Corpo do texto</p>
                <div className="flex items-start justify-between gap-2 bg-gray-800/50 rounded-lg p-3">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{bloco.copy.corpo}</p>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <CopyButton text={bloco.copy.corpo} />
                  </div>
                </div>
              </div>
            )}

            {bloco.copy?.lista_itens && bloco.copy.lista_itens.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Lista de itens</p>
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-1.5">
                  {bloco.copy.lista_itens.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 group">
                      <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                      <p className="text-sm text-gray-200 flex-1">{item}</p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={item} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bloco.copy?.cta_texto && (
              <div className="group">
                <p className="text-xs text-gray-500 mb-1">Botão CTA</p>
                <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                  <div
                    className="flex-1 text-center font-bold text-white py-2 px-6 rounded-lg text-sm"
                    style={{ backgroundColor: bloco.copy.cta_cor ?? '#6d28d9' }}
                  >
                    {bloco.copy.cta_texto}
                  </div>
                  <div className="space-y-1">
                    {bloco.copy.cta_cor && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded border border-gray-600" style={{ backgroundColor: bloco.copy.cta_cor }} />
                        <span className="text-xs text-gray-400">{bloco.copy.cta_cor}</span>
                      </div>
                    )}
                    {bloco.copy.cta_tamanho && (
                      <p className="text-xs text-gray-500">{bloco.copy.cta_tamanho}</p>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={bloco.copy.cta_texto} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingPageDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const lp = id ? tosDb.landingPages.getById(id) : null

  if (!lp) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 mb-4">Landing page não encontrada.</p>
        <button onClick={() => navigate('/landing-page')} className="text-violet-400 hover:underline">
          ← Voltar para Landing Pages
        </button>
      </div>
    )
  }

  const product = tosDb.products.getById(lp.product_id)
  const s = lp.structure

  function handleDelete() {
    if (!confirm('Excluir esta landing page?')) return
    tosDb.landingPages.delete(lp!.id)
    navigate('/landing-page')
  }

  function exportTxt() {
    const lines: string[] = [
      `LANDING PAGE: ${s.page_title}`,
      `Produto: ${product?.name ?? '—'}`,
      `Objetivo: ${s.objetivo}`,
      `Gerado em: ${formatDate(lp!.created_at)}`,
      ``,
      `─── BLOCOS ───`,
      ...(s.blocos ?? []).flatMap(b => [
        ``,
        `[ ${(BLOCO_LABELS[b.tipo] ?? b.tipo).toUpperCase()} ]`,
        `Layout: ${b.layout?.posicao_texto} | img: ${b.layout?.posicao_imagem} | espaçamento: ${b.layout?.espacamento}`,
        b.layout?.notas ? `Nota: ${b.layout.notas}` : '',
        b.copy?.headline ? `Headline: ${b.copy.headline}` : '',
        b.copy?.subheadline ? `Subheadline: ${b.copy.subheadline}` : '',
        b.copy?.corpo ? `Corpo: ${b.copy.corpo}` : '',
        ...(b.copy?.lista_itens?.length ? b.copy.lista_itens.map(i => `• ${i}`) : []),
        b.copy?.cta_texto ? `CTA: "${b.copy.cta_texto}" | cor: ${b.copy.cta_cor}` : '',
      ].filter(Boolean)),
      ``,
      `─── DESIGN ───`,
      `Estilo visual: ${s.design?.estilo_visual}`,
      `Fonte headline: ${s.design?.fonte_headline}`,
      `Fonte corpo: ${s.design?.fonte_corpo}`,
      `Hierarquia tipográfica: ${s.design?.hierarquia_tipografica}`,
      `Estilo botão: ${s.design?.estilo_botao}`,
      `Estilo imagens: ${s.design?.estilo_imagens}`,
      `Paleta:`,
      ...(s.design?.paleta ?? []).map(c => `  ${c.nome}: ${c.hex} — ${c.uso}`),
      ``,
      `─── MOBILE ───`,
      `Mudanças: ${s.mobile?.mudancas}`,
      `Ordem: ${s.mobile?.ordem_secoes}`,
      `Ajustes: ${s.mobile?.ajustes}`,
      ``,
      `─── NOTAS DE CONVERSÃO ───`,
      s.notas_conversao,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `landing-${s.page_title.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <button
            onClick={() => navigate('/landing-page')}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors mb-2 flex items-center gap-1"
          >
            ← Landing Pages
          </button>
          <h1 className="text-2xl font-bold text-white leading-tight">{s.page_title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {product && (
              <Link
                to={`/produtos/${product.id}`}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                📦 {product.name}
              </Link>
            )}
            <span className="text-xs text-gray-500">{formatDate(lp.created_at)}</span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {s.objetivo}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={exportTxt} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors">
            ↓ .txt
          </button>
          <button onClick={handleDelete} className="text-xs px-3 py-2 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-400 rounded-lg transition-colors">
            Excluir
          </button>
        </div>
      </div>

      {/* Meta */}
      {s.meta_description && (
        <div className="mb-5 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Meta description</p>
          <p className="text-sm text-gray-300">{s.meta_description}</p>
        </div>
      )}

      {/* Wireframe blocks */}
      <h2 className="text-base font-bold text-white mb-4">
        Wireframe por Blocos
        <span className="ml-2 text-sm font-normal text-gray-500">{(s.blocos ?? []).length} seções</span>
      </h2>
      <div className="space-y-3 mb-8">
        {(s.blocos ?? []).map((bloco, i) => (
          <BlocoCard key={i} bloco={bloco} index={i} />
        ))}
      </div>

      {/* Design direction */}
      {s.design && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800">
            <span>🎨</span>
            <span className="text-sm font-semibold text-white">Direção de Design</span>
          </div>
          <div className="p-5 space-y-5">
            {/* Palette */}
            {s.design.paleta?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Paleta de Cores</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {s.design.paleta.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-gray-800/50 rounded-lg p-2.5">
                      <div
                        className="w-8 h-8 rounded-lg border border-gray-600 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">{c.nome}</p>
                        <p className="text-xs text-gray-500">{c.hex}</p>
                        <p className="text-xs text-gray-600 truncate">{c.uso}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Typography */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Tipografia</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Fonte Headline', value: s.design.fonte_headline },
                  { label: 'Fonte Corpo', value: s.design.fonte_corpo },
                  { label: 'Hierarquia', value: s.design.hierarquia_tipografica },
                ].filter(x => x.value).map(item => (
                  <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-200">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Estilo Visual', value: s.design.estilo_visual },
                { label: 'Estilo Botão', value: s.design.estilo_botao },
                { label: 'Estilo Imagens', value: s.design.estilo_imagens },
              ].filter(x => x.value).map(item => (
                <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                  <p className="text-sm text-gray-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile */}
      {s.mobile && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800">
            <span>📱</span>
            <span className="text-sm font-semibold text-white">Versão Mobile</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Mudanças', value: s.mobile.mudancas },
              { label: 'Ordem das seções', value: s.mobile.ordem_secoes },
              { label: 'Ajustes', value: s.mobile.ajustes },
            ].filter(x => x.value).map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversion notes */}
      {s.notas_conversao && (
        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">💡 Notas de Conversão</p>
          <p className="text-sm text-gray-200 leading-relaxed">{s.notas_conversao}</p>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex flex-wrap gap-3 pb-4">
        {product && (
          <Link
            to={`/produtos/${product.id}`}
            className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            📦 Ir para produto
          </Link>
        )}
        <button
          onClick={() => navigate('/criativos/novo' + (lp.product_id ? `?produto=${lp.product_id}` : ''))}
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          🎨 Gerar criativo
        </button>
        <button
          onClick={() => navigate('/landing-page')}
          className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
        >
          ✦ Nova landing page
        </button>
      </div>
    </div>
  )
}
