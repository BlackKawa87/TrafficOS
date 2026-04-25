import type { Product, OfferDiagnosis, Campaign, Creative, Metric, AIDecision, PromptTemplate } from '../types'

const KEYS = {
  products: 'tos_products',
  diagnoses: 'tos_diagnoses',
  campaigns: 'tos_campaigns',
  creatives: 'tos_creatives',
  metrics: 'tos_metrics',
  decisions: 'tos_decisions',
  prompts: 'tos_prompts',
}

function getAll<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export function now(): string {
  return new Date().toISOString()
}

export const tosDb = {
  products: {
    getAll: (): Product[] => getAll<Product>(KEYS.products),
    getById: (id: string): Product | null =>
      getAll<Product>(KEYS.products).find(p => p.id === id) ?? null,
    save: (product: Product): void => {
      const all = getAll<Product>(KEYS.products)
      const idx = all.findIndex(p => p.id === product.id)
      if (idx >= 0) all[idx] = product
      else all.push(product)
      saveAll(KEYS.products, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.products, getAll<Product>(KEYS.products).filter(p => p.id !== id)),
  },

  diagnoses: {
    getAll: (): OfferDiagnosis[] => getAll<OfferDiagnosis>(KEYS.diagnoses),
    getByProduct: (productId: string): OfferDiagnosis[] =>
      getAll<OfferDiagnosis>(KEYS.diagnoses)
        .filter(d => d.product_id === productId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    save: (d: OfferDiagnosis): void => {
      const all = getAll<OfferDiagnosis>(KEYS.diagnoses)
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) all[idx] = d
      else all.push(d)
      saveAll(KEYS.diagnoses, all)
    },
  },

  campaigns: {
    getAll: (): Campaign[] => getAll<Campaign>(KEYS.campaigns),
    getByProduct: (productId: string): Campaign[] =>
      getAll<Campaign>(KEYS.campaigns).filter(c => c.product_id === productId),
    getById: (id: string): Campaign | null =>
      getAll<Campaign>(KEYS.campaigns).find(c => c.id === id) ?? null,
    save: (c: Campaign): void => {
      const all = getAll<Campaign>(KEYS.campaigns)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.campaigns, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.campaigns, getAll<Campaign>(KEYS.campaigns).filter(c => c.id !== id)),
  },

  creatives: {
    getAll: (): Creative[] => getAll<Creative>(KEYS.creatives),
    getByProduct: (productId: string): Creative[] =>
      getAll<Creative>(KEYS.creatives).filter(c => c.product_id === productId),
    save: (c: Creative): void => {
      const all = getAll<Creative>(KEYS.creatives)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.creatives, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.creatives, getAll<Creative>(KEYS.creatives).filter(c => c.id !== id)),
  },

  metrics: {
    getAll: (): Metric[] => getAll<Metric>(KEYS.metrics),
    getByProduct: (productId: string): Metric[] =>
      getAll<Metric>(KEYS.metrics).filter(m => m.product_id === productId),
    save: (m: Metric): void => {
      const all = getAll<Metric>(KEYS.metrics)
      const idx = all.findIndex(x => x.id === m.id)
      if (idx >= 0) all[idx] = m
      else all.push(m)
      saveAll(KEYS.metrics, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.metrics, getAll<Metric>(KEYS.metrics).filter(m => m.id !== id)),
  },

  decisions: {
    getAll: (): AIDecision[] => getAll<AIDecision>(KEYS.decisions),
    getByProduct: (productId: string): AIDecision[] =>
      getAll<AIDecision>(KEYS.decisions).filter(d => d.product_id === productId),
    save: (d: AIDecision): void => {
      const all = getAll<AIDecision>(KEYS.decisions)
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) all[idx] = d
      else all.push(d)
      saveAll(KEYS.decisions, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.decisions, getAll<AIDecision>(KEYS.decisions).filter(d => d.id !== id)),
  },

  prompts: {
    getAll: (): PromptTemplate[] => getAll<PromptTemplate>(KEYS.prompts),
    getById: (id: string): PromptTemplate | null =>
      getAll<PromptTemplate>(KEYS.prompts).find(p => p.id === id) ?? null,
    save: (p: PromptTemplate): void => {
      const all = getAll<PromptTemplate>(KEYS.prompts)
      const idx = all.findIndex(x => x.id === p.id)
      if (idx >= 0) all[idx] = p
      else all.push(p)
      saveAll(KEYS.prompts, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.prompts, getAll<PromptTemplate>(KEYS.prompts).filter(p => p.id !== id)),
  },

  exportAll: (): string => {
    const data: Record<string, unknown> = {}
    for (const [name, key] of Object.entries(KEYS)) {
      data[name] = getAll(key)
    }
    return JSON.stringify(data, null, 2)
  },

  importAll: (json: string): void => {
    const data = JSON.parse(json) as Record<string, unknown[]>
    for (const [name, key] of Object.entries(KEYS)) {
      if (Array.isArray(data[name])) {
        saveAll(key, data[name])
      }
    }
  },

  clearAll: (): void => {
    for (const key of Object.values(KEYS)) {
      localStorage.removeItem(key)
    }
  },
}
