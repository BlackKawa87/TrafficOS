import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb } from '../store/storage'
import { formatCurrency, formatDate, getStatusColor, CATEGORY_LABELS } from '../utils/helpers'
import type { ProductStatus } from '../types'

export default function Produtos() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all')

  const products = tosDb.products.getAll()
  const campaigns = tosDb.campaigns.getAll()

  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.niche.toLowerCase().includes(search.toLowerCase()) ||
      p.market.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const statuses: Array<{ value: ProductStatus | 'all'; label: string }> = [
    { value: 'all', label: t('common.all') },
    { value: 'ideia', label: t('status.ideia') },
    { value: 'pronto', label: t('status.pronto') },
    { value: 'em_teste', label: t('status.em_teste') },
    { value: 'validado', label: t('status.validado') },
    { value: 'pausado', label: t('status.pausado') },
  ]

  function handleDelete(id: string) {
    if (confirm(t('common.confirm_delete'))) {
      tosDb.products.delete(id)
      window.location.reload()
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('prod.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">{products.length} produtos cadastrados</p>
        </div>
        <button
          onClick={() => navigate('/produtos/novo')}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          + {t('prod.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder={`${t('common.search')} produtos...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t('common.noData')}</p>
          <button
            onClick={() => navigate('/produtos/novo')}
            className="mt-4 text-violet-400 hover:text-violet-300 text-sm"
          >
            + Cadastrar primeiro produto
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.name')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.niche')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.market')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.price')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('common.status')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.offer_score')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.campaigns')}</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('prod.last_update')}</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const activeCamps = campaigns.filter(c => c.product_id === p.id && c.status === 'ativa').length
                  return (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-xs text-gray-500">{CATEGORY_LABELS[p.category] ?? p.category}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{p.niche || '—'}</td>
                      <td className="py-3 px-4 text-gray-300">{p.market || '—'}</td>
                      <td className="py-3 px-4 text-gray-300">
                        {p.price > 0 ? formatCurrency(p.price, p.currency) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(p.status)}`}>
                          {t(`status.${p.status}` as Parameters<typeof t>[0])}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.offer_score !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.offer_score >= 70 ? 'bg-emerald-500' :
                                  p.offer_score >= 45 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${p.offer_score}%` }}
                              />
                            </div>
                            <span className="text-gray-300 text-xs">{p.offer_score}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">{t('prod.no_score')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {activeCamps > 0 ? (
                          <span className="text-emerald-400">{activeCamps} ativa{activeCamps > 1 ? 's' : ''}</span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(p.updated_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => navigate(`/produtos/${p.id}`)}
                            className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                          >
                            {t('prod.view')}
                          </button>
                          <button
                            onClick={() => navigate(`/produtos/${p.id}/editar`)}
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                          >
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
    </div>
  )
}
