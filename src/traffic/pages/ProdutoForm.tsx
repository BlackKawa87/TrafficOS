import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../i18n'
import { tosDb, generateId, now } from '../store/storage'
import type { Product, ProductCategory, ProductStatus, BillingModel } from '../types'

const CATEGORIES: ProductCategory[] = ['saas', 'infoproduto', 'ebook', 'afiliado', 'nutra', 'ecommerce', 'servico', 'outro']
const STATUSES: ProductStatus[] = ['ideia', 'pronto', 'em_teste', 'validado', 'pausado']
const BILLINGS: BillingModel[] = ['unico', 'mensal', 'anual', 'trial', 'freemium']
const CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP']

const EMPTY: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  niche: '',
  category: 'infoproduto',
  market: '',
  language: '',
  price: 0,
  currency: 'USD',
  billing_model: 'unico',
  target_audience: '',
  main_pain: '',
  main_desire: '',
  main_benefit: '',
  main_promise: '',
  unique_mechanism: '',
  main_objections: '',
  competitors: '',
  sales_page_url: '',
  checkout_url: '',
  notes: '',
  status: 'ideia',
  offer_score: null,
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-400 mb-1">{children}</label>
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
    />
  )
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
    >
      {children}
    </select>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
      <h3 className="text-sm font-semibold text-violet-400 mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

export default function ProdutoForm() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<Omit<Product, 'id' | 'created_at' | 'updated_at'>>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      const p = tosDb.products.getById(id)
      if (p) {
        const { id: _id, created_at: _c, updated_at: _u, ...rest } = p
        void _id; void _c; void _u
        setForm(rest)
      }
    }
  }, [id])

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const product: Product = {
      ...form,
      id: id ?? generateId(),
      created_at: isEdit ? (tosDb.products.getById(id!)?.created_at ?? now()) : now(),
      updated_at: now(),
    }
    tosDb.products.save(product)
    navigate(`/produtos/${product.id}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-xl font-bold text-white">
          {isEdit ? t('prod.edit') : t('prod.new')}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Basics */}
        <Section title={t('prod.section_basics')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>{t('prod.name')} *</Label>
              <Input
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Ex: Curso de Marketing Digital"
              />
            </div>
            <div>
              <Label>{t('prod.niche')}</Label>
              <Input
                value={form.niche}
                onChange={e => set('niche', e.target.value)}
                placeholder="Ex: Marketing, Saúde, Finanças"
              />
            </div>
            <div>
              <Label>{t('prod.category')}</Label>
              <Select
                value={form.category}
                onChange={e => set('category', e.target.value as ProductCategory)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {t(`cat.${c}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('prod.market')}</Label>
              <Input
                value={form.market}
                onChange={e => set('market', e.target.value)}
                placeholder="Ex: Brasil, EUA, Global"
              />
            </div>
            <div>
              <Label>{t('prod.language')}</Label>
              <Input
                value={form.language}
                onChange={e => set('language', e.target.value)}
                placeholder="Ex: Português, English"
              />
            </div>
            <div>
              <Label>{t('prod.price')}</Label>
              <div className="flex gap-2">
                <Select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price || ''}
                  onChange={e => set('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>{t('prod.billing')}</Label>
              <Select
                value={form.billing_model}
                onChange={e => set('billing_model', e.target.value as BillingModel)}
              >
                {BILLINGS.map(b => (
                  <option key={b} value={b}>
                    {t(`billing.${b}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('common.status')}</Label>
              <Select
                value={form.status}
                onChange={e => set('status', e.target.value as ProductStatus)}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {t(`status.${s}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Section>

        {/* Section 2: Offer */}
        <Section title={t('prod.section_offer')}>
          <div className="space-y-4">
            <div>
              <Label>{t('prod.target_audience')}</Label>
              <Textarea
                value={form.target_audience}
                onChange={e => set('target_audience', e.target.value)}
                placeholder="Descreva o público-alvo ideal para este produto..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('prod.main_pain')}</Label>
                <Textarea
                  value={form.main_pain}
                  onChange={e => set('main_pain', e.target.value)}
                  placeholder="Qual é a principal dor do público?"
                />
              </div>
              <div>
                <Label>{t('prod.main_desire')}</Label>
                <Textarea
                  value={form.main_desire}
                  onChange={e => set('main_desire', e.target.value)}
                  placeholder="O que o público mais deseja?"
                />
              </div>
              <div>
                <Label>{t('prod.main_benefit')}</Label>
                <Textarea
                  value={form.main_benefit}
                  onChange={e => set('main_benefit', e.target.value)}
                  placeholder="Principal benefício do produto..."
                />
              </div>
              <div>
                <Label>{t('prod.main_promise')}</Label>
                <Textarea
                  value={form.main_promise}
                  onChange={e => set('main_promise', e.target.value)}
                  placeholder="Promessa principal da oferta..."
                />
              </div>
            </div>
            <div>
              <Label>{t('prod.unique_mechanism')}</Label>
              <Textarea
                value={form.unique_mechanism}
                onChange={e => set('unique_mechanism', e.target.value)}
                placeholder="O que torna este produto único? Qual é o mecanismo diferenciador?"
              />
            </div>
          </div>
        </Section>

        {/* Section 3: Market */}
        <Section title={t('prod.section_market')}>
          <div className="space-y-4">
            <div>
              <Label>{t('prod.main_objections')}</Label>
              <Textarea
                value={form.main_objections}
                onChange={e => set('main_objections', e.target.value)}
                placeholder="Quais são as principais objeções dos potenciais compradores?"
              />
            </div>
            <div>
              <Label>{t('prod.competitors')}</Label>
              <Textarea
                value={form.competitors}
                onChange={e => set('competitors', e.target.value)}
                placeholder="Liste os principais concorrentes..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('prod.sales_page')}</Label>
                <Input
                  type="url"
                  value={form.sales_page_url}
                  onChange={e => set('sales_page_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>{t('prod.checkout')}</Label>
                <Input
                  type="url"
                  value={form.checkout_url}
                  onChange={e => set('checkout_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Section 4: Notes */}
        <Section title={t('prod.section_notes')}>
          <Textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={4}
            placeholder="Observações adicionais, contexto, informações relevantes..."
          />
        </Section>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? '...' : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
