import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tosDb, generateId, now } from '../store/storage'
import { formatCurrency, CREATIVE_CHANNEL_LABELS } from '../utils/helpers'
import type { Metric, AICreativeStatus } from '../types'

const CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP']
const CHANNELS = ['meta_ads', 'tiktok_ads', 'google_search', 'google_display', 'youtube_ads', 'native_ads', 'instagram_organico', 'email_marketing', 'whatsapp_telegram']

function autoSuggestStatus(roas: number, ctr: number, spend: number): AICreativeStatus | null {
  if (spend === 0) return null
  if (roas >= 3 && ctr >= 2) return 'escalar'
  if (roas >= 2) return 'vencedor'
  if (roas >= 1) return 'em_teste'
  if (roas < 0.5 && ctr >= 1) return 'reciclar'
  if (roas < 0.5 && spend >= 30) return 'perdedor'
  return null
}

export default function NovaMetrica() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const preProduct = searchParams.get('produto') ?? ''
  const preCampaign = searchParams.get('campanha') ?? ''
  const preCreative = searchParams.get('criativo') ?? ''

  const [form, setForm] = useState({
    product_id: preProduct,
    campaign_id: preCampaign,
    creative_id: preCreative,
    date: new Date().toISOString().split('T')[0],
    channel: '',
    spend: 0,
    revenue: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    conversions: 0,
    currency: 'USD',
    qualitative_comments: '',
    notes: '',
  })

  const [saving, setSaving] = useState(false)

  const products = tosDb.products.getAll()
  const aiCampaigns = tosDb.aiCampaigns.getAll()
  const aiCreatives = tosDb.aiCreatives.getAll()

  const filteredCampaigns = form.product_id
    ? aiCampaigns.filter(c => c.product_id === form.product_id)
    : aiCampaigns

  const filteredCreatives = aiCreatives.filter(c => {
    if (form.product_id && c.product_id !== form.product_id) return false
    if (form.campaign_id && c.campaign_id !== form.campaign_id) return false
    return true
  })

  // Auto-fill channel from creative
  useEffect(() => {
    if (form.creative_id) {
      const creative = aiCreatives.find(c => c.id === form.creative_id)
      if (creative && !form.channel) {
        setForm(prev => ({ ...prev, channel: creative.channel }))
      }
    }
  }, [form.creative_id])

  const roas = form.spend > 0 ? form.revenue / form.spend : 0
  const cpa = form.conversions > 0 ? form.spend / form.conversions : 0
  const cpc = form.clicks > 0 ? form.spend / form.clicks : 0
  const ctr = form.impressions > 0 ? (form.clicks / form.impressions) * 100 : 0

  const suggested = autoSuggestStatus(roas, ctr, form.spend)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!form.date) { alert('Informe a data.'); return }
    setSaving(true)
    const metric: Metric = {
      id: generateId(),
      ...form,
      roas,
      cpa,
      cpc,
      ctr,
      created_at: now(),
    }
    tosDb.metrics.save(metric)

    // Re-aggregate creative if linked
    if (form.creative_id) {
      tosDb.reAggregateCreative(form.creative_id)
    }

    navigate('/metricas')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/metricas')}
        className="text-gray-500 hover:text-gray-300 text-sm mb-4 flex items-center gap-1 transition-colors"
      >
        ← Métricas
      </button>
      <h1 className="text-2xl font-bold text-white mb-6">Nova Métrica</h1>

      <div className="space-y-5">
        {/* Product + Campaign + Creative */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Origem</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Produto</label>
              <select
                value={form.product_id}
                onChange={e => { set('product_id', e.target.value); set('campaign_id', ''); set('creative_id', '') }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">— Selecionar —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Campanha</label>
              <select
                value={form.campaign_id}
                onChange={e => { set('campaign_id', e.target.value); set('creative_id', '') }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">— Nenhuma —</option>
                {filteredCampaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.strategy?.nome_estrategico ?? c.id}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Criativo (opcional)</label>
            <select
              value={form.creative_id}
              onChange={e => set('creative_id', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">— Nenhum —</option>
              {filteredCreatives.map(c => (
                <option key={c.id} value={c.id}>{c.strategy?.nome ?? c.id}</option>
              ))}
            </select>
            {form.creative_id && (
              <p className="text-[10px] text-violet-400 mt-1">
                As métricas serão agregadas ao criativo selecionado automaticamente.
              </p>
            )}
          </div>
        </div>

        {/* Date, Channel, Currency */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contexto</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Canal</label>
              <select
                value={form.channel}
                onChange={e => set('channel', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">— Selecionar —</option>
                {CHANNELS.map(ch => (
                  <option key={ch} value={ch}>{CREATIVE_CHANNEL_LABELS[ch] ?? ch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Moeda</label>
              <select
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Financeiro</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gasto *</label>
              <input type="number" min="0" step="0.01" value={form.spend || ''}
                onChange={e => set('spend', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Receita</label>
              <input type="number" min="0" step="0.01" value={form.revenue || ''}
                onChange={e => set('revenue', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Volume</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Impressões</label>
              <input type="number" min="0" value={form.impressions || ''}
                onChange={e => set('impressions', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cliques</label>
              <input type="number" min="0" value={form.clicks || ''}
                onChange={e => set('clicks', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Leads</label>
              <input type="number" min="0" value={form.leads || ''}
                onChange={e => set('leads', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Conversões</label>
              <input type="number" min="0" value={form.conversions || ''}
                onChange={e => set('conversions', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>
        </div>

        {/* Auto-calculated preview */}
        {form.spend > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Métricas Calculadas</p>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: 'ROAS', value: roas > 0 ? `${roas.toFixed(2)}x` : '—', good: roas >= 2 },
                { label: 'CPA', value: cpa > 0 ? formatCurrency(cpa, form.currency) : '—', good: false },
                { label: 'CPC', value: cpc > 0 ? formatCurrency(cpc, form.currency) : '—', good: false },
                { label: 'CTR', value: ctr > 0 ? `${ctr.toFixed(2)}%` : '—', good: ctr >= 2 },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-[10px] text-gray-500 mb-0.5">{m.label}</div>
                  <div className={`text-sm font-bold ${m.value === '—' ? 'text-gray-600' : m.good ? 'text-emerald-400' : 'text-white'}`}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
            {suggested && (
              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2">
                <span className="text-xs text-gray-400">Sugestão de status para o criativo:</span>
                <span className="text-xs font-semibold text-violet-300">{suggested}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Observações</p>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Comentários Qualitativos</label>
            <textarea
              rows={3}
              value={form.qualitative_comments}
              onChange={e => set('qualitative_comments', e.target.value)}
              placeholder="O que você observou qualitativamente? Engajamento, comentários, reações..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notas Internas</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => navigate('/metricas')}
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.date || form.spend === 0}
            className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Métrica'}
          </button>
        </div>
      </div>
    </div>
  )
}
