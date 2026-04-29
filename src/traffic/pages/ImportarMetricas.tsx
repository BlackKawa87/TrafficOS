import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import { CREATIVE_CHANNEL_LABELS } from '../utils/helpers'
import type { Metric } from '../types'

// ── column detection ───────────────────────────────────────────────────────────
type FieldKey =
  | 'date' | 'spend' | 'revenue' | 'impressions' | 'clicks'
  | 'conversions' | 'leads' | 'ctr' | 'cpc' | 'cpa' | 'roas'
  | 'creative_name' | 'campaign_name' | 'channel'

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  date:          ['date', 'day', 'data', 'día', 'period', 'periodo', 'datum'],
  spend:         ['amount spent', 'spend', 'gasto', 'cost', 'investimento', 'custo', 'impressão spend', 'verbrauchtes budget', 'coût'],
  revenue:       ['revenue', 'receita', 'purchase value', 'conversion value', 'value', 'valor', 'purchase roas', 'receita total', 'retorno'],
  impressions:   ['impressions', 'impressões', 'impression', 'impresiones', 'reichweite'],
  clicks:        ['clicks', 'cliques', 'link clicks', 'clics', 'link click'],
  conversions:   ['conversions', 'purchases', 'compras', 'conversões', 'results', 'resultados', 'purchase', 'sale'],
  leads:         ['leads', 'lead', 'formulário', 'form leads', 'complete registration'],
  ctr:           ['ctr', 'link ctr', 'click-through rate', 'taxa de cliques'],
  cpc:           ['cpc', 'cost per click', 'custo por clique', 'cost per link click'],
  cpa:           ['cpa', 'cost per result', 'cost per purchase', 'custo por aquisição', 'cost per conversion'],
  roas:          ['roas', 'purchase roas', 'return on ad spend', 'retorno sobre investimento'],
  creative_name: ['ad name', 'nome do anúncio', 'creative', 'criativo', 'ad', 'anuncio'],
  campaign_name: ['campaign name', 'nome da campanha', 'campaign', 'campanha', 'campaña'],
  channel:       ['channel', 'canal', 'platform', 'plataforma', 'source', 'publisher platform'],
}

const FIELD_LABELS: Record<FieldKey, string> = {
  date:          'Data',
  spend:         'Gasto',
  revenue:       'Receita',
  impressions:   'Impressões',
  clicks:        'Cliques',
  conversions:   'Conversões',
  leads:         'Leads',
  ctr:           'CTR (%)',
  cpc:           'CPC',
  cpa:           'CPA',
  roas:          'ROAS',
  creative_name: 'Nome do Criativo',
  campaign_name: 'Nome da Campanha',
  channel:       'Canal',
}

const CHANNELS = [
  'meta_ads', 'tiktok_ads', 'google_search', 'google_display',
  'youtube_ads', 'native_ads', 'instagram_organico',
]

const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP']

// ── parse helpers ─────────────────────────────────────────────────────────────
function parseNum(v: string): number {
  if (!v || v === '-' || v === '—' || v.trim() === '') return 0
  // Remove currency symbols, thousands separators, percent signs
  const clean = v.replace(/[R$€£%\s]/g, '').replace(/,(?=\d{3})/g, '').replace(',', '.').trim()
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function parseDate(v: string): string {
  if (!v) return new Date().toISOString().split('T')[0]
  // Try common formats
  const trimmed = v.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  // DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // MM/DD/YYYY
  const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  // Fallback: try Date constructor
  try {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }
  return new Date().toISOString().split('T')[0]
}

function detectField(header: string): FieldKey | null {
  const h = header.toLowerCase().trim()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => h === a || h.includes(a))) {
      return field as FieldKey
    }
  }
  return null
}

function parseCSV(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  // Detect separator: comma, semicolon, or tab
  const firstLine = lines[0]
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','

  function splitLine(line: string): string[] {
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === sep && !inQuote) { cells.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    cells.push(cur.trim())
    return cells
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(l => splitLine(l))
  return { headers, rows }
}

// ── row preview ───────────────────────────────────────────────────────────────
interface ParsedRow {
  id: string
  date: string
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  leads: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  creative_name: string
  campaign_name: string
  channel: string
  valid: boolean
  warning: string
}

// ── main ───────────────────────────────────────────────────────────────────────
export default function ImportarMetricas() {
  const navigate = useNavigate()

  // ── UI state ─────────────────────────────────────────────────────────────
  const [step, setStep]           = useState<'paste' | 'map' | 'preview' | 'done'>('paste')
  const [csvText, setCsvText]     = useState('')
  const [csvError, setCsvError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── mapping state ─────────────────────────────────────────────────────────
  const [headers, setHeaders]         = useState<string[]>([])
  const [rawRows, setRawRows]         = useState<string[][]>([])
  const [mapping, setMapping]         = useState<Record<string, FieldKey | ''>>({})
  const [productId, setProductId]     = useState('')
  const [campaignId, setCampaignId]   = useState('')
  const [creativeId, setCreativeId]   = useState('')
  const [defaultChannel, setDefaultChannel] = useState('meta_ads')
  const [currency, setCurrency]       = useState('BRL')

  // ── preview state ──────────────────────────────────────────────────────────
  const [parsedRows, setParsedRows]   = useState<ParsedRow[]>([])
  const [excluded, setExcluded]       = useState<Set<string>>(new Set())
  const [importing, setImporting]     = useState(false)
  const [importCount, setImportCount] = useState(0)

  const products   = tosDb.products.getAll()
  const campaigns  = tosDb.aiCampaigns.getAll()
  const creatives  = tosDb.aiCreatives.getAll()

  const filteredCampaigns = productId
    ? campaigns.filter(c => c.product_id === productId)
    : campaigns

  const filteredCreatives = creatives.filter(c => {
    if (productId  && c.product_id  !== productId)  return false
    if (campaignId && c.campaign_id !== campaignId) return false
    return true
  })

  // ── Step 1: parse pasted/uploaded CSV ─────────────────────────────────────
  const handleParse = useCallback(() => {
    setCsvError('')
    if (!csvText.trim()) { setCsvError('Cole ou faça upload de dados CSV.'); return }

    const { headers: h, rows: r } = parseCSV(csvText)
    if (h.length === 0) { setCsvError('Não foi possível detectar cabeçalhos. Verifique o formato.'); return }
    if (r.length === 0) { setCsvError('Nenhuma linha de dados encontrada.'); return }

    // Auto-detect mapping
    const autoMap: Record<string, FieldKey | ''> = {}
    h.forEach(header => {
      autoMap[header] = detectField(header) ?? ''
    })

    setHeaders(h)
    setRawRows(r)
    setMapping(autoMap)
    setStep('map')
  }, [csvText])

  // ── Step 2: build parsed rows from mapping ────────────────────────────────
  const handleBuildPreview = useCallback(() => {
    const rows: ParsedRow[] = rawRows.map(row => {
      const get = (field: FieldKey): string => {
        const col = Object.entries(mapping).find(([, f]) => f === field)?.[0]
        if (!col) return ''
        const idx = headers.indexOf(col)
        return idx >= 0 ? (row[idx] ?? '') : ''
      }

      const spend       = parseNum(get('spend'))
      const revenue     = parseNum(get('revenue'))
      const impressions = parseNum(get('impressions'))
      const clicks      = parseNum(get('clicks'))
      const conversions = parseNum(get('conversions'))
      const leads       = parseNum(get('leads'))

      let ctr   = parseNum(get('ctr'))
      let cpc   = parseNum(get('cpc'))
      let cpa   = parseNum(get('cpa'))
      let roas  = parseNum(get('roas'))

      // Auto-compute missing derived metrics
      if (ctr   === 0 && impressions > 0 && clicks > 0) ctr  = (clicks / impressions) * 100
      if (cpc   === 0 && spend > 0 && clicks > 0)       cpc  = spend / clicks
      if (cpa   === 0 && spend > 0 && conversions > 0)  cpa  = spend / conversions
      if (roas  === 0 && spend > 0 && revenue > 0)       roas = revenue / spend

      const channel  = get('channel') || defaultChannel
      const dateStr  = parseDate(get('date'))
      const warning  = spend === 0 && revenue === 0 && impressions === 0
        ? 'Linha sem dados numéricos — será ignorada'
        : ''

      return {
        id:            generateId(),
        date:          dateStr,
        spend,
        revenue,
        impressions,
        clicks,
        conversions,
        leads,
        ctr,
        cpc,
        cpa,
        roas,
        creative_name: get('creative_name'),
        campaign_name: get('campaign_name'),
        channel:       channel.toLowerCase().replace(/\s+/g, '_'),
        valid:         !(spend === 0 && revenue === 0 && impressions === 0),
        warning,
      }
    })

    setParsedRows(rows)
    setExcluded(new Set(rows.filter(r => !r.valid).map(r => r.id)))
    setStep('preview')
  }, [rawRows, headers, mapping, defaultChannel])

  // ── Step 3: import ─────────────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    setImporting(true)
    const toImport = parsedRows.filter(r => !excluded.has(r.id))
    let count = 0

    toImport.forEach(row => {
      const metric: Metric = {
        id:                   generateId(),
        product_id:           productId,
        campaign_id:          campaignId,
        creative_id:          creativeId,
        date:                 row.date,
        channel:              row.channel || defaultChannel,
        spend:                row.spend,
        revenue:              row.revenue,
        leads:                row.leads,
        impressions:          row.impressions,
        clicks:               row.clicks,
        conversions:          row.conversions,
        roas:                 row.roas,
        cpa:                  row.cpa,
        cpc:                  row.cpc,
        ctr:                  row.ctr,
        currency,
        qualitative_comments: '',
        notes:                [
          row.creative_name  ? `Criativo: ${row.creative_name}` : '',
          row.campaign_name  ? `Campanha: ${row.campaign_name}` : '',
        ].filter(Boolean).join(' | '),
        created_at:           now(),
      }

      // Update creative metrics if creativeId given
      if (creativeId) {
        const c = tosDb.aiCreatives.getById(creativeId)
        if (c) {
          const updatedRoas = metric.roas > 0 ? metric.roas : c.roas
          const updatedCtr  = metric.ctr  > 0 ? metric.ctr  : c.ctr
          const updatedCpc  = metric.cpc  > 0 ? metric.cpc  : c.cpc
          const updatedCpa  = metric.cpa  > 0 ? metric.cpa  : c.cpa
          tosDb.aiCreatives.save({
            ...c,
            roas:    updatedRoas,
            ctr:     updatedCtr,
            cpc:     updatedCpc,
            cpa:     updatedCpa,
            spend:   c.spend + metric.spend,
            revenue: c.revenue + metric.revenue,
          })
        }
      }

      tosDb.metrics.save(metric)
      count++
    })

    setImportCount(count)
    setImporting(false)
    setStep('done')
  }, [parsedRows, excluded, productId, campaignId, creativeId, defaultChannel, currency])

  // ── file upload ───────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCsvText(ev.target?.result as string ?? '') }
    reader.readAsText(file, 'UTF-8')
    if (fileRef.current) fileRef.current.value = ''
  }

  const activeRows  = parsedRows.filter(r => !excluded.has(r.id))
  const totalSpend  = activeRows.reduce((s, r) => s + r.spend, 0)
  const totalRev    = activeRows.reduce((s, r) => s + r.revenue, 0)
  const totalConv   = activeRows.reduce((s, r) => s + r.conversions, 0)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/metricas')}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          ← Métricas
        </button>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold text-white">Importar Métricas em Lote</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(['paste', 'map', 'preview', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              step === s        ? 'bg-violet-600 text-white' :
              ['paste','map','preview','done'].indexOf(s) < ['paste','map','preview','done'].indexOf(step)
                ? 'bg-emerald-900/40 text-emerald-400'
                : 'bg-gray-800 text-gray-500'
            }`}>
              <span>{i + 1}</span>
              <span>{{ paste: 'Dados', map: 'Colunas', preview: 'Prévia', done: 'Concluído' }[s]}</span>
            </div>
            {i < 3 && <div className="w-6 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Paste / Upload ── */}
      {step === 'paste' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Cole seus dados aqui</h2>
            <p className="text-xs text-gray-500 mb-4">
              Aceita exportações do Meta Ads, Google Ads, TikTok Ads e qualquer planilha CSV com cabeçalhos.
              Separadores: vírgula, ponto-e-vírgula ou tabulação.
            </p>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`Date,Amount Spent,Revenue,Impressions,Clicks,Conversions\n2024-01-15,150.00,420.00,12000,380,8\n2024-01-16,180.50,510.00,14500,460,11`}
              rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white font-mono resize-y focus:outline-none focus:border-violet-500"
            />
            {csvError && (
              <p className="text-xs text-red-400 mt-2">{csvError}</p>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Ou faça upload de arquivo CSV</h2>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white rounded-lg transition-colors border border-gray-700"
            >
              📂 Selecionar arquivo CSV / TXT
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFileChange} className="hidden" />
            {csvText && (
              <p className="text-xs text-emerald-400 mt-2">
                ✓ {csvText.split('\n').length} linhas carregadas
              </p>
            )}
          </div>

          {/* Supported platforms */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Plataformas suportadas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { name: 'Meta Ads', icon: '📘', cols: 'Date, Amount Spent, Revenue, Impressions, Link Clicks, Purchases, CTR, CPC' },
                { name: 'Google Ads', icon: '🔵', cols: 'Day, Cost, Conversions, Impressions, Clicks, CTR, Avg. CPC' },
                { name: 'TikTok Ads', icon: '🎵', cols: 'Date, Cost, Revenue, Impressions, Clicks, Conversions, CTR, CPC' },
                { name: 'Planilha Custom', icon: '📊', cols: 'Qualquer planilha com cabeçalhos reconhecíveis' },
              ].map(p => (
                <div key={p.name} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{p.icon}</span>
                    <span className="text-xs font-semibold text-white">{p.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{p.cols}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleParse}
            disabled={!csvText.trim()}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            Detectar Colunas →
          </button>
        </div>
      )}

      {/* ── Step 2: Column Mapping ── */}
      {step === 'map' && (
        <div className="space-y-5">
          {/* Context assignment */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Atribuir ao contexto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Produto</label>
                <select
                  value={productId}
                  onChange={e => { setProductId(e.target.value); setCampaignId(''); setCreativeId('') }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">— Sem produto específico —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Campanha <span className="text-gray-600">(opcional)</span></label>
                <select
                  value={campaignId}
                  onChange={e => { setCampaignId(e.target.value); setCreativeId('') }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">— Sem campanha específica —</option>
                  {filteredCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Criativo <span className="text-gray-600">(opcional — atualiza métricas)</span></label>
                <select
                  value={creativeId}
                  onChange={e => setCreativeId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">— Sem criativo específico —</option>
                  {filteredCreatives.map(c => (
                    <option key={c.id} value={c.id}>{c.strategy?.nome ?? c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Canal padrão</label>
                <select
                  value={defaultChannel}
                  onChange={e => setDefaultChannel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {CHANNELS.map(ch => (
                    <option key={ch} value={ch}>{CREATIVE_CHANNEL_LABELS[ch] ?? ch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Moeda</label>
                <div className="flex gap-2">
                  {CURRENCIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`flex-1 py-2 text-xs rounded-lg font-medium transition-colors ${
                        currency === c ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Column mapping table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Mapeamento de colunas</h2>
            <p className="text-xs text-gray-500 mb-4">
              Detectamos {headers.length} colunas. Confirme ou ajuste o mapeamento abaixo.
            </p>
            <div className="space-y-2">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 font-medium truncate bg-gray-800 px-3 py-2 rounded-lg">
                      {header}
                    </div>
                  </div>
                  <div className="text-gray-600 text-xs">→</div>
                  <div className="flex-1">
                    <select
                      value={mapping[header] ?? ''}
                      onChange={e => setMapping(prev => ({ ...prev, [header]: e.target.value as FieldKey | '' }))}
                      className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                        mapping[header]
                          ? 'border-emerald-700/60 focus:border-emerald-500'
                          : 'border-gray-700 focus:border-violet-500'
                      }`}
                    >
                      <option value="">— Ignorar esta coluna —</option>
                      {(Object.keys(FIELD_LABELS) as FieldKey[]).map(f => (
                        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                  {mapping[header] ? (
                    <span className="text-[10px] text-emerald-400 w-14 text-right">✓ Mapeado</span>
                  ) : (
                    <span className="text-[10px] text-gray-600 w-14 text-right">Ignorado</span>
                  )}
                </div>
              ))}
            </div>

            {/* Mapping summary */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FIELD_LABELS) as FieldKey[]).map(f => {
                  const mapped = Object.values(mapping).includes(f)
                  return (
                    <span key={f} className={`text-[10px] px-2 py-1 rounded-full ${
                      mapped ? 'bg-emerald-900/30 text-emerald-400' : 'bg-gray-800 text-gray-600'
                    }`}>
                      {mapped ? '✓' : '○'} {FIELD_LABELS[f]}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Data preview (first 3 rows) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
            <h2 className="text-sm font-semibold text-white mb-3">Amostra de dados ({rawRows.length} linhas)</h2>
            <table className="text-xs text-gray-400 min-w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {headers.map(h => (
                    <th key={h} className="text-left py-2 px-3 whitespace-nowrap">
                      <div className="text-[10px] text-gray-300">{h}</div>
                      <div className={`text-[9px] mt-0.5 ${mapping[h] ? 'text-emerald-500' : 'text-gray-600'}`}>
                        {mapping[h] ? FIELD_LABELS[mapping[h] as FieldKey] : 'ignorado'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    {row.map((cell, j) => (
                      <td key={j} className="py-2 px-3 whitespace-nowrap text-gray-400">{cell || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rawRows.length > 3 && (
              <p className="text-xs text-gray-600 mt-2">... e mais {rawRows.length - 3} linhas</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('paste')}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors"
            >
              ← Voltar
            </button>
            <button
              onClick={handleBuildPreview}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Ver Prévia ({rawRows.length} linhas) →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Confirm ── */}
      {step === 'preview' && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Linhas a importar', value: activeRows.length.toString(), color: 'text-violet-400' },
              { label: 'Gasto Total', value: `R$${totalSpend.toFixed(2)}`, color: 'text-white' },
              { label: 'Receita Total', value: `R$${totalRev.toFixed(2)}`, color: totalRev >= totalSpend ? 'text-emerald-400' : 'text-amber-400' },
              { label: 'Conversões', value: totalConv.toString(), color: 'text-white' },
            ].map(item => (
              <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <span className="text-sm font-semibold text-white">
                {parsedRows.length} linhas detectadas
              </span>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-400">✓ {activeRows.length} para importar</span>
                {excluded.size > 0 && <span className="text-gray-500">✗ {excluded.size} excluídas</span>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="py-2 px-3 text-left text-gray-500 font-medium w-10">#</th>
                    <th className="py-2 px-3 text-left text-gray-500 font-medium">Data</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">Gasto</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">Receita</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">ROAS</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">Impr.</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">Cliques</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">CTR</th>
                    <th className="py-2 px-3 text-right text-gray-500 font-medium">Conv.</th>
                    <th className="py-2 px-3 text-left text-gray-500 font-medium">Canal</th>
                    <th className="py-2 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => {
                    const isExcluded = excluded.has(row.id)
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-800/50 transition-colors ${
                          isExcluded ? 'opacity-40 bg-red-900/5' : 'hover:bg-gray-800/30'
                        }`}
                      >
                        <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                        <td className="py-2 px-3 text-gray-300 whitespace-nowrap">{row.date}</td>
                        <td className="py-2 px-3 text-right text-white">{row.spend > 0 ? `R$${row.spend.toFixed(2)}` : '—'}</td>
                        <td className={`py-2 px-3 text-right font-medium ${row.revenue > row.spend && row.spend > 0 ? 'text-emerald-400' : 'text-white'}`}>
                          {row.revenue > 0 ? `R$${row.revenue.toFixed(2)}` : '—'}
                        </td>
                        <td className={`py-2 px-3 text-right ${
                          row.roas >= 2 ? 'text-emerald-400' : row.roas >= 1 ? 'text-amber-400' : row.roas > 0 ? 'text-red-400' : 'text-gray-600'
                        }`}>
                          {row.roas > 0 ? `${row.roas.toFixed(2)}x` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">
                          {row.impressions > 0 ? row.impressions.toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">
                          {row.clicks > 0 ? row.clicks.toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">
                          {row.ctr > 0 ? `${row.ctr.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">
                          {row.conversions > 0 ? row.conversions : '—'}
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {row.channel || defaultChannel}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.warning ? (
                            <span className="text-amber-500 cursor-help" title={row.warning}>⚠</span>
                          ) : (
                            <button
                              onClick={() => setExcluded(prev => {
                                const next = new Set(prev)
                                if (next.has(row.id)) next.delete(row.id)
                                else next.add(row.id)
                                return next
                              })}
                              className={`text-[10px] transition-colors ${
                                isExcluded
                                  ? 'text-gray-500 hover:text-emerald-400'
                                  : 'text-gray-500 hover:text-red-400'
                              }`}
                            >
                              {isExcluded ? '+' : '✕'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Context reminder */}
          {(productId || campaignId || creativeId) && (
            <div className="bg-violet-900/15 border border-violet-700/30 rounded-xl p-4 text-xs text-violet-300">
              Todas as linhas serão associadas a:
              {productId  && <> · <strong>{products.find(p => p.id === productId)?.name}</strong></>}
              {campaignId && <> · <strong>{campaigns.find(c => c.id === campaignId)?.strategy?.nome_estrategico ?? campaignId}</strong></>}
              {creativeId && <> · <strong>{creatives.find(c => c.id === creativeId)?.strategy?.nome ?? creativeId}</strong></>}
              {creativeId && <span className="text-violet-400"> (métricas do criativo serão atualizadas)</span>}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('map')}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors"
            >
              ← Ajustar Colunas
            </button>
            <button
              onClick={handleImport}
              disabled={importing || activeRows.length === 0}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {importing ? (
                <><span className="animate-spin">⟳</span> Importando...</>
              ) : (
                `Importar ${activeRows.length} registro${activeRows.length !== 1 ? 's' : ''} →`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">
            {importCount} registro{importCount !== 1 ? 's' : ''} importado{importCount !== 1 ? 's' : ''}!
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            Os dados já estão disponíveis em Métricas, Relatórios e Decisões IA.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => navigate('/metricas')}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Ver Métricas →
            </button>
            <button
              onClick={() => navigate('/relatorios')}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors"
            >
              Gerar Relatório →
            </button>
            <button
              onClick={() => {
                setStep('paste'); setCsvText(''); setParsedRows([])
                setExcluded(new Set()); setImportCount(0)
                setHeaders([]); setRawRows([]); setMapping({})
              }}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors"
            >
              Importar Mais
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
