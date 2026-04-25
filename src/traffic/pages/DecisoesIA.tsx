import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatDate, getStatusColor, DECISION_TYPE_LABELS, PRIORITY_LABELS } from '../utils/helpers'
import { Modal } from '../components/Modal'
import type { AIDecision, DecisionType, DecisionStatus, Priority } from '../types'

const DECISION_TYPES: DecisionType[] = ['pause', 'scale', 'improve', 'maintain']
const STATUSES: DecisionStatus[] = ['pending', 'in_progress', 'done', 'dismissed']
const PRIORITIES: Priority[] = ['high', 'medium', 'low']

const EMPTY_FORM = {
  product_id: '',
  decision_type: 'improve' as DecisionType,
  reasoning: '',
  actions_text: '',
  priority: 'medium' as Priority,
  status: 'pending' as DecisionStatus,
}

const DECISION_ICONS: Record<DecisionType, string> = {
  pause: '⏸',
  maintain: '✓',
  scale: '📈',
  improve: '⚡',
}

export default function DecisoesIA() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const preselectedProduct = searchParams.get('produto') ?? ''

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AIDecision | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, product_id: preselectedProduct })
  const [productFilter, setProductFilter] = useState(preselectedProduct)
  const [typeFilter, setTypeFilter] = useState<DecisionType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | 'all'>('all')

  const decisions = tosDb.decisions.getAll()
  const products = tosDb.products.getAll()

  const filtered = decisions
    .filter(d => {
      const matchProduct = !productFilter || d.product_id === productFilter
      const matchType = typeFilter === 'all' || d.decision_type === typeFilter
      const matchStatus = statusFilter === 'all' || d.status === statusFilter
      return matchProduct && matchType && matchStatus
    })
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 }
      const pDiff = pOrder[a.priority] - pOrder[b.priority]
      if (pDiff !== 0) return pDiff
      return b.created_at.localeCompare(a.created_at)
    })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, product_id: productFilter })
    setModalOpen(true)
  }

  function openEdit(d: AIDecision) {
    setEditing(d)
    setForm({
      product_id: d.product_id,
      decision_type: d.decision_type,
      reasoning: d.reasoning,
      actions_text: d.actions.join('\n'),
      priority: d.priority,
      status: d.status,
    })
    setModalOpen(true)
  }

  function handleSave() {
    const decision: AIDecision = {
      id: editing?.id ?? generateId(),
      product_id: form.product_id,
      decision_type: form.decision_type,
      reasoning: form.reasoning,
      actions: form.actions_text.split('\n').map(a => a.trim()).filter(Boolean),
      priority: form.priority,
      status: form.status,
      created_at: editing?.created_at ?? now(),
    }
    tosDb.decisions.save(decision)
    setModalOpen(false)
    window.location.reload()
  }

  function updateStatus(d: AIDecision, newStatus: DecisionStatus) {
    tosDb.decisions.save({ ...d, status: newStatus })
    window.location.reload()
  }

  function handleDelete(id: string) {
    if (confirm(t('common.confirm_delete'))) {
      tosDb.decisions.delete(id)
      window.location.reload()
    }
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const pendingCount = decisions.filter(d => d.status === 'pending').length
  const inProgressCount = decisions.filter(d => d.status === 'in_progress').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dec.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pendingCount} pendentes · {inProgressCount} em andamento
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          + {t('dec.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          <option value="">{t('common.all')} Produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex gap-2 flex-wrap">
          {(['all', ...DECISION_TYPES] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type as DecisionType | 'all')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === type ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {type === 'all' ? t('common.all') : `${DECISION_ICONS[type as DecisionType]} ${DECISION_TYPE_LABELS[type as DecisionType]}`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'in_progress', 'done'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as DecisionStatus | 'all')}
              className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? t('common.all') : t(`status.${s}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t('dec.no_data')}</p>
          <button onClick={openCreate} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
            + {t('dec.new')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const product = tosDb.products.getById(d.product_id)
            return (
              <div key={d.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                d.status === 'done' || d.status === 'dismissed'
                  ? 'border-gray-800 opacity-60'
                  : d.priority === 'high'
                  ? 'border-red-800/50 hover:border-red-700/50'
                  : 'border-gray-800 hover:border-gray-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Type icon */}
                    <div className={`text-xl flex-shrink-0 mt-0.5`}>
                      {DECISION_ICONS[d.decision_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(d.decision_type)}`}>
                          {DECISION_TYPE_LABELS[d.decision_type]}
                        </span>
                        {product && (
                          <span className="text-xs text-gray-400">{product.name}</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority]}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(d.status)}`}>
                          {t(`status.${d.status}` as Parameters<typeof t>[0])}
                        </span>
                        <span className="text-xs text-gray-600">{formatDate(d.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{d.reasoning}</p>
                      {d.actions.length > 0 && (
                        <ul className="space-y-1">
                          {d.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                              <span className="text-violet-500 flex-shrink-0 mt-0.5">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    {d.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(d, 'in_progress')}
                        className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                      >
                        → {t('plan.mark_in_progress')}
                      </button>
                    )}
                    {(d.status === 'pending' || d.status === 'in_progress') && (
                      <button
                        onClick={() => updateStatus(d, 'done')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
                      >
                        ✓ {t('plan.mark_done')}
                      </button>
                    )}
                    <button onClick={() => openEdit(d)} className="text-xs text-gray-400 hover:text-white">
                      {t('common.edit')}
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-xs text-gray-600 hover:text-red-400">
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('dec.edit') : t('dec.new')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Produto</label>
              <select value={form.product_id} onChange={e => set('product_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                <option value="">— Selecionar —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('dec.type')}</label>
              <select value={form.decision_type} onChange={e => set('decision_type', e.target.value as DecisionType)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {DECISION_TYPES.map(dt => (
                  <option key={dt} value={dt}>{DECISION_ICONS[dt]} {DECISION_TYPE_LABELS[dt]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('dec.priority')}</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value as Priority)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t('dec.status')}</label>
              <select value={form.status} onChange={e => set('status', e.target.value as DecisionStatus)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500">
                {STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}` as Parameters<typeof t>[0])}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('dec.reasoning')}</label>
            <textarea rows={3} value={form.reasoning} onChange={e => set('reasoning', e.target.value)}
              placeholder="Descreva o raciocínio por trás desta decisão..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('dec.actions')}</label>
            <textarea rows={4} value={form.actions_text} onChange={e => set('actions_text', e.target.value)}
              placeholder="Ação 1&#10;Ação 2&#10;Ação 3"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none" />
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
