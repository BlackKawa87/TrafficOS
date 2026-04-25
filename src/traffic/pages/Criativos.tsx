import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatDate, getStatusColor, FORMAT_LABELS } from '../utils/helpers'
import { Modal } from '../components/Modal'
import type { Creative, CreativeFormat, CreativeStatus } from '../types'

const FORMATS: CreativeFormat[] = ['image', 'video', 'carousel', 'text']
const STATUSES: CreativeStatus[] = ['testing', 'winner', 'paused', 'rejected']

const EMPTY_FORM: Omit<Creative, 'id' | 'created_at' | 'updated_at'> = {
  product_id: '',
  campaign_id: '',
  name: '',
  format: 'image',
  hook: '',
  body_text: '',
  cta: '',
  status: 'testing',
  performance_notes: '',
}

function StatusBadge({ status, t }: { status: CreativeStatus; t: (k: Parameters<ReturnType<typeof useLanguage>['t']>[0]) => string }) {
  const map: Record<CreativeStatus, string> = {
    testing: '🧪',
    winner: '🏆',
    paused: '⏸',
    rejected: '✕',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(status)}`}>
      {map[status]} {t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  )
}

export default function Criativos() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedProduct = searchParams.get('produto') ?? ''

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Creative | null>(null)
  const [form, setForm] = useState<Omit<Creative, 'id' | 'created_at' | 'updated_at'>>({
    ...EMPTY_FORM,
    product_id: preselectedProduct,
  })
  const [productFilter, setProductFilter] = useState(preselectedProduct)
  const [statusFilter, setStatusFilter] = useState<CreativeStatus | 'all'>('all')
  const [formatFilter, setFormatFilter] = useState<CreativeFormat | 'all'>('all')

  const creatives = tosDb.creatives.getAll()
  const products = tosDb.products.getAll()

  useEffect(() => {
    if (preselectedProduct) setModalOpen(true)
  }, [preselectedProduct])

  const productCampaigns = form.product_id
    ? tosDb.campaigns.getByProduct(form.product_id)
    : []

  const filtered = creatives.filter(c => {
    const matchProduct = !productFilter || c.product_id === productFilter
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchFormat = formatFilter === 'all' || c.format === formatFilter
    return matchProduct && matchStatus && matchFormat
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, product_id: productFilter })
    setModalOpen(true)
  }

  function openEdit(c: Creative) {
    setEditing(c)
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = c
    void _id; void _c; void _u
    setForm(rest)
    setModalOpen(true)
  }

  function handleSave() {
    const creative: Creative = {
      ...form,
      id: editing?.id ?? generateId(),
      created_at: editing?.created_at ?? now(),
      updated_at: now(),
    }
    tosDb.creatives.save(creative)
    setModalOpen(false)
    window.location.reload()
  }

  function handleDelete(id: string) {
    if (confirm(t('common.confirm_delete'))) {
      tosDb.creatives.delete(id)
      window.location.reload()
    }
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const statusCounts = STATUSES.map(s => ({
    status: s,
    count: creatives.filter(c => c.status === s).length,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('crea.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">{creatives.length} criativos cadastrados</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          + {t('crea.new')}
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {statusCounts.map(({ status, count }) => (
          <div key={status} className={`rounded-xl p-3 border cursor-pointer transition-colors ${
            statusFilter === status ? 'border-violet-600 bg-violet-900/20' : 'border-gray-800 bg-gray-900'
          }`} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as CreativeStatus)}>
            <div className="text-xl font-bold text-white">{count}</div>
            <div className="text-xs text-gray-400 mt-0.5">{t(`status.${status}` as Parameters<typeof t>[0])}</div>
          </div>
        ))}
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
          {(['all', ...FORMATS] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormatFilter(f as CreativeFormat | 'all')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                formatFilter === f ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? t('common.all') : t(`format.${f}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t('crea.no_data')}</p>
          <button onClick={openCreate} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
            + {t('crea.new')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const product = tosDb.products.getById(c.product_id)
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{c.name}</div>
                    {product && (
                      <button
                        onClick={() => navigate(`/produtos/${product.id}`)}
                        className="text-xs text-gray-500 hover:text-violet-400 truncate block"
                      >
                        {product.name}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={c.status} t={t} />
                  <span className="text-xs text-gray-500">{FORMAT_LABELS[c.format]}</span>
                </div>

                {c.hook && (
                  <div className="mb-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Hook</div>
                    <p className="text-xs text-gray-300 line-clamp-2">{c.hook}</p>
                  </div>
                )}

                {c.cta && (
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">CTA</div>
                    <p className="text-xs text-violet-400">{c.cta}</p>
                  </div>
                )}

                {c.performance_notes && (
                  <p className="text-xs text-gray-500 italic line-clamp-2 mb-3">{c.performance_notes}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                  <span className="text-[10px] text-gray-600">{formatDate(c.created_at)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-xs text-gray-400 hover:text-white">
                      {t('common.edit')}
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-gray-600 hover:text-red-400">
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('crea.edit') : t('crea.new')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Hook Dor + VSL"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
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
                {productCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('crea.format')}</label>
              <select
                value={form.format}
                onChange={e => set('format', e.target.value as CreativeFormat)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as CreativeStatus)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}` as Parameters<typeof t>[0])}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('crea.hook')}</label>
            <textarea
              value={form.hook}
              onChange={e => set('hook', e.target.value)}
              rows={2}
              placeholder="Linha de abertura que chama atenção..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('crea.body')}</label>
            <textarea
              value={form.body_text}
              onChange={e => set('body_text', e.target.value)}
              rows={3}
              placeholder="Corpo do criativo..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('crea.cta')}</label>
            <input
              type="text"
              value={form.cta}
              onChange={e => set('cta', e.target.value)}
              placeholder="Ex: Clique aqui e garanta agora"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('crea.performance')}</label>
            <textarea
              value={form.performance_notes}
              onChange={e => set('performance_notes', e.target.value)}
              rows={2}
              placeholder="Observações de performance, testes, resultados..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
            />
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
