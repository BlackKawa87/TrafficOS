import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatCurrency, formatDate, getStatusColor, PLATFORM_LABELS } from '../utils/helpers'
import { Modal } from '../components/Modal'
import type { Campaign, CampaignPlatform, CampaignStatus } from '../types'

const PLATFORMS: CampaignPlatform[] = ['meta_ads', 'tiktok_ads', 'google_ads', 'youtube_ads', 'outro']
const STATUSES: CampaignStatus[] = ['ativa', 'pausada', 'rascunho', 'encerrada']
const CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP']

const EMPTY_FORM: Omit<Campaign, 'id' | 'created_at' | 'updated_at'> = {
  product_id: '',
  name: '',
  platform: 'meta_ads',
  status: 'rascunho',
  daily_budget: 0,
  currency: 'USD',
  objective: '',
  start_date: '',
  end_date: '',
  notes: '',
}

export default function Campanhas() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedProduct = searchParams.get('produto') ?? ''

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [form, setForm] = useState<Omit<Campaign, 'id' | 'created_at' | 'updated_at'>>({
    ...EMPTY_FORM,
    product_id: preselectedProduct,
  })
  const [productFilter, setProductFilter] = useState(preselectedProduct)
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')

  const campaigns = tosDb.campaigns.getAll()
  const products = tosDb.products.getAll()

  useEffect(() => {
    if (preselectedProduct) {
      setModalOpen(true)
    }
  }, [preselectedProduct])

  const filtered = campaigns.filter(c => {
    const matchProduct = !productFilter || c.product_id === productFilter
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchProduct && matchStatus
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, product_id: productFilter })
    setModalOpen(true)
  }

  function openEdit(c: Campaign) {
    setEditing(c)
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = c
    void _id; void _c; void _u
    setForm(rest)
    setModalOpen(true)
  }

  function handleSave() {
    const camp: Campaign = {
      ...form,
      id: editing?.id ?? generateId(),
      created_at: editing?.created_at ?? now(),
      updated_at: now(),
    }
    tosDb.campaigns.save(camp)
    setModalOpen(false)
    navigate('/campanhas')
    window.location.reload()
  }

  function handleDelete(id: string) {
    if (confirm(t('common.confirm_delete'))) {
      tosDb.campaigns.delete(id)
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
          <h1 className="text-2xl font-bold text-white">{t('camp.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">{campaigns.length} campanhas cadastradas</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          + {t('camp.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">{t('common.all')} Produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as CampaignStatus | 'all')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? t('common.all') : t(`status.${s}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t('camp.no_data')}</p>
          <button onClick={openCreate} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
            + {t('camp.new')}
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Nome</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Produto</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('camp.platform')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('camp.daily_budget')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('camp.objective')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Início</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const product = tosDb.products.getById(c.product_id)
                  return (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{c.name}</td>
                      <td className="py-3 px-4">
                        {product ? (
                          <button onClick={() => navigate(`/produtos/${product.id}`)} className="text-violet-400 hover:text-violet-300 text-xs">
                            {product.name}
                          </button>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{PLATFORM_LABELS[c.platform]}</td>
                      <td className="py-3 px-4 text-gray-300">
                        {c.daily_budget > 0 ? formatCurrency(c.daily_budget, c.currency) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{c.objective || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                          {t(`status.${c.status}` as Parameters<typeof t>[0])}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.start_date ? formatDate(c.start_date) : '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(c)} className="text-xs text-gray-400 hover:text-white transition-colors">
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('camp.edit') : t('camp.new')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Campanha Vendas Jan"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Produto</label>
              <select
                value={form.product_id}
                onChange={e => set('product_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">— Selecionar —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('camp.platform')}</label>
              <select
                value={form.platform}
                onChange={e => set('platform', e.target.value as CampaignPlatform)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as CampaignStatus)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{t(`status.${s}` as Parameters<typeof t>[0])}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('camp.daily_budget')}</label>
              <div className="flex gap-2">
                <select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.daily_budget || ''}
                  onChange={e => set('daily_budget', parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('camp.objective')}</label>
            <input
              type="text"
              value={form.objective}
              onChange={e => set('objective', e.target.value)}
              placeholder="Ex: Conversão, Tráfego, Reconhecimento"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('camp.start_date')}</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('camp.end_date')}</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('common.notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
