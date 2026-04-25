export type ProductCategory = 'saas' | 'infoproduto' | 'ebook' | 'afiliado' | 'nutra' | 'ecommerce' | 'servico' | 'outro'
export type ProductStatus = 'ideia' | 'pronto' | 'em_teste' | 'validado' | 'pausado'
export type BillingModel = 'unico' | 'mensal' | 'anual' | 'trial' | 'freemium'
export type CampaignStatus = 'ativa' | 'pausada' | 'encerrada' | 'rascunho'
export type CampaignPlatform = 'meta_ads' | 'tiktok_ads' | 'google_ads' | 'youtube_ads' | 'outro'
export type CreativeStatus = 'testing' | 'winner' | 'paused' | 'rejected'
export type CreativeFormat = 'image' | 'video' | 'carousel' | 'text'
export type DecisionType = 'pause' | 'maintain' | 'scale' | 'improve'
export type DecisionStatus = 'pending' | 'in_progress' | 'done' | 'dismissed'
export type Priority = 'low' | 'medium' | 'high'

export interface Product {
  id: string
  name: string
  niche: string
  category: ProductCategory
  market: string
  language: string
  price: number
  currency: string
  billing_model: BillingModel
  target_audience: string
  main_pain: string
  main_desire: string
  main_benefit: string
  main_promise: string
  unique_mechanism: string
  main_objections: string
  competitors: string
  sales_page_url: string
  checkout_url: string
  notes: string
  status: ProductStatus
  offer_score: number | null
  created_at: string
  updated_at: string
}

export interface OfferDiagnosis {
  id: string
  product_id: string
  headline_score: number
  promise_score: number
  mechanism_score: number
  proof_score: number
  value_stack_score: number
  guarantee_score: number
  urgency_score: number
  price_score: number
  total_score: number
  notes: string
  created_at: string
}

export interface Campaign {
  id: string
  product_id: string
  name: string
  platform: CampaignPlatform
  status: CampaignStatus
  daily_budget: number
  currency: string
  objective: string
  start_date: string
  end_date: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Creative {
  id: string
  product_id: string
  campaign_id: string
  name: string
  format: CreativeFormat
  hook: string
  body_text: string
  cta: string
  status: CreativeStatus
  performance_notes: string
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  product_id: string
  campaign_id: string
  date: string
  spend: number
  revenue: number
  impressions: number
  clicks: number
  conversions: number
  roas: number
  cpa: number
  cpc: number
  ctr: number
  currency: string
  notes: string
  created_at: string
}

export interface AIDecision {
  id: string
  product_id: string
  decision_type: DecisionType
  reasoning: string
  actions: string[]
  priority: Priority
  status: DecisionStatus
  created_at: string
}

export interface PromptTemplate {
  id: string
  name: string
  category: string
  description: string
  template: string
  variables: string[]
  created_at: string
  updated_at: string
}
