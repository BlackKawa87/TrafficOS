import { useState } from 'react'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import { formatDate } from '../utils/helpers'
import { Modal } from '../components/Modal'
import type { PromptTemplate } from '../types'

const DEFAULT_CATEGORIES = [
  'Diagnóstico de Oferta',
  'Geração de Campanhas',
  'Criação de Criativos',
  'Análise de Métricas',
  'Decisões Estratégicas',
  'Pesquisa de Mercado',
  'Copywriting',
  'Outro',
]

const EMPTY_FORM = {
  name: '',
  category: 'Diagnóstico de Oferta',
  description: '',
  template: '',
}

function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) ?? []
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))]
}

export default function PromptCenter() {
  const { t } = useLanguage()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PromptTemplate | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const prompts = tosDb.prompts.getAll()

  const categories = ['all', ...new Set([...DEFAULT_CATEGORIES, ...prompts.map(p => p.category)])]

  const filtered = prompts.filter(p => {
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  function openEdit(p: PromptTemplate) {
    setEditing(p)
    setForm({ name: p.name, category: p.category, description: p.description, template: p.template })
    setModalOpen(true)
  }

  function handleSave() {
    const variables = extractVariables(form.template)
    const prompt: PromptTemplate = {
      id: editing?.id ?? generateId(),
      ...form,
      variables,
      created_at: editing?.created_at ?? now(),
      updated_at: now(),
    }
    tosDb.prompts.save(prompt)
    setModalOpen(false)
    window.location.reload()
  }

  function handleDelete(id: string) {
    if (confirm(t('common.confirm_delete'))) {
      tosDb.prompts.delete(id)
      window.location.reload()
    }
  }

  function handleCopy(p: PromptTemplate) {
    navigator.clipboard.writeText(p.template).then(() => {
      setCopiedId(p.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('prom.title')}</h1>
          <p className="text-gray-400 text-sm mt-1">{prompts.length} templates salvos</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          + {t('prom.new')}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="text-violet-400 text-lg flex-shrink-0">💡</span>
        <div>
          <p className="text-sm text-violet-300 font-medium mb-0.5">Prompt Center</p>
          <p className="text-xs text-violet-400/70">
            Armazene e organize seus prompts de IA aqui. Use {'{{variavel}}'} para partes dinâmicas.
            Copie o prompt e cole no ChatGPT, Claude ou outra IA para obter respostas estruturadas.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder={`${t('common.search')} prompts...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'all' ? t('common.all') + ' Categorias' : c}</option>
          ))}
        </select>
      </div>

      {/* Prompts */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t('prom.no_data')}</p>
          <button onClick={openCreate} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">
            + Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm">{p.name}</h3>
                  <span className="text-xs text-violet-400">{p.category}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(p)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      copiedId === p.id
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {copiedId === p.id ? t('prom.copied') : t('prom.copy')}
                  </button>
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-gray-400 mb-3">{p.description}</p>
              )}

              {/* Template preview */}
              <div className="bg-gray-800/60 rounded-lg p-3 mb-3">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-4 font-mono leading-relaxed">
                  {p.template}
                </pre>
              </div>

              {/* Variables */}
              {p.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.variables.map(v => (
                    <span key={v} className="text-[10px] px-1.5 py-0.5 bg-violet-900/40 text-violet-300 rounded font-mono">
                      {'{{' + v + '}}'}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <span className="text-[10px] text-gray-600">{formatDate(p.updated_at)}</span>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-white">
                    {t('common.edit')}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-gray-600 hover:text-red-400">
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('prom.edit') : t('prom.new')} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ex: Diagnóstico de Oferta Completo"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('prom.category')}</label>
            <input type="text" list="categories-list" value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500" />
            <datalist id="categories-list">
              {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{t('prom.description')}</label>
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Descreva quando usar este prompt..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">{t('prom.template')} *</label>
              <span className="text-[10px] text-gray-500">{t('prom.hint')}</span>
            </div>
            <textarea
              rows={8}
              value={form.template}
              onChange={e => set('template', e.target.value)}
              placeholder={`Analise o seguinte produto:\n\nNome: {{nome_produto}}\nCategoria: {{categoria}}\nPúblico-alvo: {{publico}}\n\n...`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none font-mono"
            />
          </div>
          {/* Preview variables */}
          {form.template && extractVariables(form.template).length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">{t('prom.variables')}:</div>
              <div className="flex flex-wrap gap-2">
                {extractVariables(form.template).map(v => (
                  <span key={v} className="text-xs px-2 py-1 bg-violet-900/40 text-violet-300 rounded font-mono">
                    {'{{' + v + '}}'}
                  </span>
                ))}
              </div>
            </div>
          )}
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
