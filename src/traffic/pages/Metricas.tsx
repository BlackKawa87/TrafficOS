import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatCurrency, formatDate, formatNumber } from '../utils/helpers'
import { Modal } from '../components/Modal'
import type { Metric } from '../types'

const CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP']

const EMPTY_FORM = {
  product_id: '',
  campaign_id: '',
  date: new Date().toISOString().split('T')[0],
  spend: 0,
  revenue: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  currency: 'USD',
  notes: '',
}

export default function Metricas() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const preselectedProduct = searchParams.get('produto') ?? ''

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, product_id: preselectedProduct })
  const [productFilter, setProductFilter] = useState(preselectedProduct)
  const [campaignFilter, setCampaignFilter] = useState('')

  const metrics = tosDb.metrics.getAll()
  const products = tosDb.products.getAll()

  useEffect(() => {
    if (preselectedProduct) setModalOpen(true)
  }, [preselectedProduct])

  const filteredCampaigns = form.product_id
    ? tosDb.campaigns.getByProduct(form.product_id)
    : tosDb.campaigns.getAll()

  const filtered = metrics
    .filter(m => (!productFilter || m.product_id === productFilter) && (!campaignFilter || m.campaign_id === campaignFilter))
    .sort((a, b) => b.date.localeCompare(a.date))

  // Aggregates
  const totalSpend = filtered.reduce((s, m) => s + m.spend, 0)
  const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0)
  const totalImpressions = filtered.reduce((s, m) => s + m.impressions, 0)
  const totalClicks = filtered.reduce((s, m) => s + m.clicks, 0)
  const totalConversions = filtered.reduce((s, m) => s + m.conversions, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  function handleSave() {
    const roas = form.spend > 0 ? form.revenue / form.spend : 0
    const cpa = form.conversions > 0 ? form.spend / form.conversions : 0
    const cpc = form.clicks > 0 ? form.spend / form.clicks : 0
    const ctr = form.impressions > 0 ? (form.clicks / form.impressions) * 100 : 0

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
    setModalOpen(false)
    setForm({ ...EMPTY_FORM, product_id: productFilter })
    window.location.reload()
  }

  function handleDelete(id: string) {
    if (confirm(t('common.confirm_delete'))) {
      tosDb.metrics.delete(id)
      window.location.reload()
    }
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('metr.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">{metrics.length} registros de métricas</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM, product_id: productFilter }); setModalOpen(true) }}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          + {t('metr.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={productFilter}
          onChange={e => { setProductFilter(e.target.value); setCampaignFilter('') }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">{t('common.all')} Produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={campaignFilter}
          onChange={e => setCampaignFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">{t('common.all')} Campanhas</option>
          {(productFilter ? tosDb.campaigns.getByProduct(productFilter) : tosDb.campaigns.getAll()).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Aggregated KPIs */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-5">
          {[
            { label: t('metr.spend'), value: formatCurrency(totalSpend) },
            { label: t('metr.revenue'), value: formatCurrency(totalRevenue) },
            { label: t('metr.roas'), value: avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—' },
            { label: t('metr.cpa'), value: avgCpa > 0 ? formatCurrency(avgCpa) : '—' },
            { label: t('metr.cpc'), value: avgCpc > 0 ? formatCurrency(avgCpc) : '—' },
            { label: t('metr.ctr'), value: avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '—' },
            { label: t('metr.clicks'), value: formatNumber(totalClicks) },
            { label: t('metr.conversions'), value: formatNumber(totalConversions) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</div>
              <div className="text-sm font-bold text-white">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t('metr.no_data')}</p>
          <button onClick={() => setModalOpen(true)} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
            + {t('metr.new')}
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Data</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Produto</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs">Campanha</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.spend')}</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.revenue')}</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.roas')}</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.cpa')}</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.impressions')}</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.clicks')}</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs">{t('metr.conversions')}</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const product = tosDb.products.getById(m.product_id)
                  const campaign = m.campaign_id ? tosDb.campaigns.getById(m.campaign_id) : null
                  return (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 text-gray-300 text-xs">{formatDate(m.date)}</td>
                      <td className="py-3 px-4 text-gray-300 text-xs">{product?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{campaign?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-right text-white text-xs">{formatCurrency(m.spend, m.currency)}</td>
                      <td className="py-3 px-4 text-right text-xs">
                        <span className={m.revenue > m.spend ? 'text-emerald-400' : 'text-white'}>
                          {formatCurrency(m.revenue, m.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs">
                        <span className={m.roas >= 2 ? 'text-emerald-400' : m.roas >= 1 ? 'text-amber-400' : 'text-red-400'}>
                          {m.roas > 0 ? `${m.roas.toFixed(2)}x` : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300 text-xs">
                        {m.cpa > 0 ? formatCurrency(m.cpa, m.currency) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400 text-xs">{formatNumber(m.impressions)}</td>
                      <td className="py-3 px-4 text-right text-gray-400 text-xs">{formatNumber(m.clicks)}</td>
                      <td className="py-3 px-4 text-right text-gray-400 text-xs">{formatNumber(m.conversions)}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleDelete(m.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800/30">
                  <td colSpan={3} className="py-3 px-4 text-xs font-semibold text-gray-400">{t('metr.totals')}</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-white">{formatCurrency(totalSpend)}</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-white">{formatCurrency(totalRevenue)}</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-white">
                    {avgRoas > 0 ? `${avgRoas.toFixed(2)}x` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-white">
                    {avgCpa > 0 ? formatCurrency(avgCpa) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-gray-300">{formatNumber(totalImpressions)}</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-gray-300">{formatNumber(totalClicks)}</td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-gray-300">{formatNumber(totalConversions)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('metr.new')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Produto</label>
              <select
                value={form.product_id}
                onChange={e => { set('product_id', e.target.value); set('campaign_id', '') }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">— Selecionar —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Campanha</label>
              <select
                value={form.campaign_id}
                onChange={e => set('campaign_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">— Nenhuma —</option>
                {filteredCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Moeda</label>
              <select
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('metr.spend')}</label>
              <input type="number" min="0" step="0.01" value={form.spend || ''} onChange={e => set('spend', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('metr.revenue')}</label>
              <input type="number" min="0" step="0.01" value={form.revenue || ''} onChange={e => set('revenue', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('metr.impressions')}</label>
              <input type="number" min="0" value={form.impressions || ''} onChange={e => set('impressions', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('metr.clicks')}</label>
              <input type="number" min="0" value={form.clicks || ''} onChange={e => set('clicks', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('metr.conversions')}</label>
              <input type="number" min="0" value={form.conversions || ''} onChange={e => set('conversions', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          {/* Auto-computed preview */}
          {form.spend > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3 grid grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] text-gray-500">ROAS</div>
                <div className="text-sm font-bold text-white">
                  {form.revenue > 0 ? `${(form.revenue / form.spend).toFixed(2)}x` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">CPA</div>
                <div className="text-sm font-bold text-white">
                  {form.conversions > 0 ? formatCurrency(form.spend / form.conversions, form.currency) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">CPC</div>
                <div className="text-sm font-bold text-white">
                  {form.clicks > 0 ? formatCurrency(form.spend / form.clicks, form.currency) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">CTR</div>
                <div className="text-sm font-bold text-white">
                  {form.impressions > 0 ? `${((form.clicks / form.impressions) * 100).toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('common.notes')}</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
