import type { Product, OfferDiagnosis, Campaign, Creative, Metric, AIDecision, PromptTemplate, AIOfferDiagnosis, AICampaign, AICreative, PerformanceInsight } from '../types'

const SEEDS_KEY = 'tos_seeds_v4'

const DEFAULT_PROMPTS: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Gerador Estratégico de Campanhas',
    category: 'Geração de Campanhas',
    description: 'Cria campanhas completas para produtos cadastrados na TrafficOS, usando dados do produto e diagnóstico de oferta.',
    variables: ['productData', 'offerDiagnosis', 'campaignInputs'],
    template: `Você é um estrategista sênior de tráfego pago, growth marketing, copywriting de resposta direta e validação de ofertas digitais.

Sua função é criar uma campanha completa com base nos dados do produto, objetivo escolhido, canal escolhido, fase da campanha, orçamento e diagnóstico de oferta disponível.

Dados do produto:
{{productData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Dados escolhidos pelo usuário:
{{campaignInputs}}

Gere uma campanha estratégica com as seguintes seções:

1. Nome estratégico da campanha

2. Objetivo recomendado
Explique se o objetivo escolhido faz sentido ou se deve ser ajustado.

3. Hipótese principal do teste

4. Público recomendado
Inclua público principal, secundário, interesses, exclusões e recomendação entre broad ou segmentado.

5. Ângulo principal da campanha

6. Ângulos secundários

7. Estrutura recomendada da campanha
Defina quantidade de campanhas, conjuntos, criativos, orçamento e otimização.

8. Criativos necessários
Liste formatos, quantidade, duração, estilo e tipo de hook.

9. Copies iniciais
Gere 5 textos principais, 5 headlines, 5 descrições e 5 CTAs.

10. Landing page/check-out
Avalie alinhamento da página com a campanha e sugira melhorias.

11. Métricas de acompanhamento
Defina CTR mínimo, CPC máximo, CPA alvo, taxa de conversão esperada e ROAS esperado.

12. Regras de decisão
Explique quando pausar, manter, duplicar, escalar ou criar variações.

13. Plano dos primeiros 3 dias
Explique o que observar e fazer no dia 1, dia 2 e dia 3.

14. Próximo passo recomendado

Seja direto, prático, crítico e específico. Não gere recomendações genéricas. Use os dados reais do produto e da oferta.`,
  },
  {
    name: 'Gerador de Criativos com IA',
    category: 'Criação de Criativos',
    description: 'Gera criativos completos de alta conversão para tráfego pago, com roteiro, hooks, copies e direção criativa.',
    variables: ['productData', 'campaignData', 'offerDiagnosis', 'creativeInputs'],
    template: `Você é um especialista sênior em criação de criativos para tráfego pago, com foco em Meta Ads, TikTok Ads e YouTube Ads.

Sua função é gerar um briefing criativo completo e pronto para execução, com base nos dados do produto, campanha e configurações escolhidas.

Dados do produto:
{{productData}}

Dados da campanha:
{{campaignData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Configurações do criativo:
{{creativeInputs}}

Gere o briefing criativo completo com as seguintes seções:

1. Nome do Criativo

2. Ideia Central
Resumo do conceito em 2-3 frases.

3. Hook (primeiros 3 segundos)
Gere 3 variações: Pergunta, Alerta e Curiosidade.

4. Roteiro Completo
Estrutura: Hook → Problema → Agitação → Solução → CTA
Tempo: 15 a 30 segundos.

5. Variações de Roteiro
Gere 3 variações do mesmo conceito com abordagens diferentes.

6. Texto do Anúncio
Gere 3 textos principais, 3 headlines, 3 descrições e 3 CTAs.

7. Direção Criativa
Explique: como gravar, cenário, tipo de pessoa, estilo, tom de voz e edição.

8. Referência Visual
Descreva como o criativo deve parecer visualmente.

9. Variações de Teste
Gere ideias de: troca de hook, CTA, abordagem e público.

10. Hipótese do Criativo
Por que este criativo deve performar bem.

11. Métricas Esperadas
CTR, CPC e CPA esperados.

12. Recomendações
Quando usar, quando pausar e quando escalar este criativo.

Seja direto, prático e específico. Use os dados reais do produto. Gere roteiros e copies prontos para execução.`,
  },
  {
    name: 'Gerador de Criativos de Alta Conversão',
    category: 'Criação de Criativos',
    description: 'Gera criativos completos para campanhas de tráfego pago com base em produto, campanha e diagnóstico de oferta.',
    variables: ['productData', 'campaignData', 'offerDiagnosis', 'creativeInputs'],
    template: `Você é um especialista em copywriting, tráfego pago e criação de criativos de alta performance.

Seu objetivo é criar criativos que gerem cliques, engajamento e conversão.

Dados do produto:
{{productData}}

Dados da campanha:
{{campaignData}}

Diagnóstico de oferta:
{{offerDiagnosis}}

Configurações do criativo:
{{creativeInputs}}

Gere:

1. Nome do criativo
2. Ideia central
3. 3 hooks diferentes
4. Roteiro completo (15–30 segundos)
5. 3 variações do roteiro
6. 3 textos principais
7. 3 headlines
8. 3 descrições
9. 3 CTAs
10. Direção criativa detalhada
11. Referência visual (descrição)
12. Variações de teste
13. Hipótese do criativo
14. Métricas esperadas
15. Recomendações de uso

Seja direto, prático e orientado para conversão.

Evite textos genéricos.

Crie criativos que chamem atenção rapidamente e gerem curiosidade.`,
  },
]

function seedDefaultPrompts() {
  try {
    const seeded = localStorage.getItem(SEEDS_KEY)
    if (seeded) return
    const existing = JSON.parse(localStorage.getItem('tos_prompts') ?? '[]') as PromptTemplate[]
    const ts = new Date().toISOString()
    const toAdd: PromptTemplate[] = DEFAULT_PROMPTS
      .filter(dp => !existing.some(e => e.name === dp.name))
      .map((dp, i) => ({
        ...dp,
        id: `seed_${i}_${Date.now().toString(36)}`,
        created_at: ts,
        updated_at: ts,
      }))
    if (toAdd.length > 0) {
      localStorage.setItem('tos_prompts', JSON.stringify([...existing, ...toAdd]))
    }
    localStorage.setItem(SEEDS_KEY, '1')
  } catch {
    // silently fail — seeds are non-critical
  }
}

seedDefaultPrompts()

const KEYS = {
  products: 'tos_products',
  diagnoses: 'tos_diagnoses',
  aiDiagnoses: 'tos_ai_diagnoses',
  aiCampaigns: 'tos_ai_campaigns',
  aiCreatives: 'tos_ai_creatives',
  insights: 'tos_insights',
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
    getByCreative: (creativeId: string): Metric[] =>
      getAll<Metric>(KEYS.metrics).filter(m => m.creative_id === creativeId),
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

  aiDiagnoses: {
    getAll: (): AIOfferDiagnosis[] => getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses),
    getByProduct: (productId: string): AIOfferDiagnosis[] =>
      getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses)
        .filter(d => d.product_id === productId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getLatestByProduct: (productId: string): AIOfferDiagnosis | null => {
      const all = getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses)
        .filter(d => d.product_id === productId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      return all[0] ?? null
    },
    save: (d: AIOfferDiagnosis): void => {
      const all = getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses)
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) all[idx] = d
      else all.push(d)
      saveAll(KEYS.aiDiagnoses, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.aiDiagnoses, getAll<AIOfferDiagnosis>(KEYS.aiDiagnoses).filter(d => d.id !== id)),
  },

  insights: {
    getAll: (): PerformanceInsight[] => getAll<PerformanceInsight>(KEYS.insights),
    getLatest: (): PerformanceInsight | null => {
      const all = getAll<PerformanceInsight>(KEYS.insights).sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      return all[0] ?? null
    },
    save: (i: PerformanceInsight): void => {
      const all = getAll<PerformanceInsight>(KEYS.insights)
      const idx = all.findIndex(x => x.id === i.id)
      if (idx >= 0) all[idx] = i
      else all.push(i)
      saveAll(KEYS.insights, all)
    },
    clear: (): void => saveAll(KEYS.insights, []),
  },

  aiCreatives: {
    getAll: (): AICreative[] => getAll<AICreative>(KEYS.aiCreatives),
    getByProduct: (productId: string): AICreative[] =>
      getAll<AICreative>(KEYS.aiCreatives).filter(c => c.product_id === productId),
    getByCampaign: (campaignId: string): AICreative[] =>
      getAll<AICreative>(KEYS.aiCreatives).filter(c => c.campaign_id === campaignId),
    getById: (id: string): AICreative | null =>
      getAll<AICreative>(KEYS.aiCreatives).find(c => c.id === id) ?? null,
    save: (c: AICreative): void => {
      const all = getAll<AICreative>(KEYS.aiCreatives)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.aiCreatives, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.aiCreatives, getAll<AICreative>(KEYS.aiCreatives).filter(c => c.id !== id)),
  },

  aiCampaigns: {
    getAll: (): AICampaign[] => getAll<AICampaign>(KEYS.aiCampaigns),
    getByProduct: (productId: string): AICampaign[] =>
      getAll<AICampaign>(KEYS.aiCampaigns).filter(c => c.product_id === productId),
    getById: (id: string): AICampaign | null =>
      getAll<AICampaign>(KEYS.aiCampaigns).find(c => c.id === id) ?? null,
    save: (c: AICampaign): void => {
      const all = getAll<AICampaign>(KEYS.aiCampaigns)
      const idx = all.findIndex(x => x.id === c.id)
      if (idx >= 0) all[idx] = c
      else all.push(c)
      saveAll(KEYS.aiCampaigns, all)
    },
    delete: (id: string): void =>
      saveAll(KEYS.aiCampaigns, getAll<AICampaign>(KEYS.aiCampaigns).filter(c => c.id !== id)),
  },

  reAggregateCreative: (creativeId: string): void => {
    if (!creativeId) return
    const creative = getAll<AICreative>(KEYS.aiCreatives).find(c => c.id === creativeId)
    if (!creative) return
    const metrics = getAll<Metric>(KEYS.metrics).filter(m => m.creative_id === creativeId)
    if (metrics.length === 0) return
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0)
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0)
    const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
    const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0)
    const totalLeads = metrics.reduce((s, m) => s + (m.leads ?? 0), 0)
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0)
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const updated: AICreative = {
      ...creative,
      spend: totalSpend,
      revenue: totalRevenue,
      impressions: totalImpressions,
      clicks: totalClicks,
      leads: totalLeads,
      conversions: totalConversions,
      ctr,
      cpc,
      cpa,
      roas,
      updated_at: new Date().toISOString(),
    }
    const all = getAll<AICreative>(KEYS.aiCreatives)
    const idx = all.findIndex(c => c.id === creativeId)
    if (idx >= 0) all[idx] = updated
    saveAll(KEYS.aiCreatives, all)
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
