export type ProductCategory = 'saas' | 'infoproduto' | 'ebook' | 'afiliado' | 'nutra' | 'ecommerce' | 'servico' | 'outro'
export type ProductStatus = 'ideia' | 'pronto' | 'em_teste' | 'validado' | 'pausado'
export type BillingModel = 'unico' | 'mensal' | 'anual' | 'trial' | 'freemium'
export type CampaignStatus = 'ativa' | 'pausada' | 'encerrada' | 'rascunho'
export type CampaignPlatform = 'meta_ads' | 'tiktok_ads' | 'google_ads' | 'youtube_ads' | 'outro'
export type CreativeStatus = 'testing' | 'winner' | 'paused' | 'rejected'
export type CreativeFormat = 'image' | 'video' | 'carousel' | 'text'
export type DecisionType =
  | 'pausar_criativo' | 'manter_criativo' | 'escalar_criativo'
  | 'duplicar_campanha' | 'criar_variacao' | 'trocar_hook'
  | 'trocar_publico' | 'revisar_oferta' | 'revisar_pagina'
  | 'criar_remarketing' | 'aumentar_orcamento' | 'reduzir_orcamento'
  | 'encerrar_campanha' | 'coletar_dados'
  | 'pause' | 'maintain' | 'scale' | 'improve'

export type DecisionStatus = 'pending' | 'accepted' | 'ignored' | 'executed' | 'archived'
  | 'in_progress' | 'done' | 'dismissed'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type ConfidenceLevel = 'baixo' | 'medio' | 'alto'

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
  creative_id: string
  date: string
  channel: string
  spend: number
  revenue: number
  leads: number
  impressions: number
  clicks: number
  conversions: number
  roas: number
  cpa: number
  cpc: number
  ctr: number
  currency: string
  qualitative_comments: string
  notes: string
  created_at: string
}

export interface AIDecision {
  id: string
  product_id: string
  campaign_id?: string
  creative_id?: string
  title?: string
  decision_type: DecisionType
  reasoning: string
  supporting_data?: string
  confidence_level?: ConfidenceLevel
  risk?: string
  recommended_action?: string
  next_step?: string
  deadline?: string
  actions: string[]
  priority: Priority
  status: DecisionStatus
  notes?: string
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

export interface OfferAnalysis {
  nota_geral: {
    score: number
    justificativa: string
    dimensoes: {
      clareza_promessa: number
      forca_dor: number
      urgencia: number
      diferenciacao: number
      facilidade_anuncio: number
      potencial_escala: number
      risco_conversao: number
    }
  }
  avatar: {
    perfil: string
    nivel_consciencia: string
    deseja: string
    teme: string
    ja_tentou: string
    gatilho_compra: string
  }
  big_idea: string
  promessa_ajustada: string
  mecanismo_unico: string
  dores: string[]
  desejos: string[]
  objecoes: Array<{ objecao: string; resposta: string }>
  angulos: Array<{ tipo: string; titulo: string; descricao: string }>
  canais: Array<{
    canal: string
    porque: string
    criativo: string
    risco: string
    prioridade: 'alta' | 'media' | 'baixa'
  }>
  oferta_recomendada: {
    trial: string
    garantia: string
    bonus: string
    desconto: string
    plano_mensal_anual: string
    upsell: string
    downsell: string
    order_bump: string
    remarketing: string
  }
  riscos: string[]
  plano_validacao: {
    objetivo: string
    orcamento: string
    quantidade_criativos: number
    duracao: string
    metricas_principais: string[]
    criterio_promissor: string
    criterio_pausar: string
  }
  resumo_executivo: {
    o_que_esta_bom: string
    o_que_melhorar: string
    proximo_passo: string
  }
}

export interface AIOfferDiagnosis {
  id: string
  product_id: string
  product_data_snapshot: string
  analysis: OfferAnalysis
  created_at: string
}

// ─── AI Campaign Generator ────────────────────────────────────────────────────

export type CampaignObjectiveType =
  | 'teste_criativo'
  | 'validacao_oferta'
  | 'captacao_leads'
  | 'vendas_conversao'
  | 'remarketing'
  | 'escala'
  | 'awareness'
  | 'trafego_pagina'

export type CampaignChannelType =
  | 'meta_ads'
  | 'tiktok_ads'
  | 'google_search'
  | 'google_display'
  | 'youtube_ads'
  | 'native_ads'
  | 'instagram_organico'
  | 'email_marketing'
  | 'whatsapp_telegram'

export type CampaignPhaseType =
  | 'teste_inicial'
  | 'pre_validacao'
  | 'validacao'
  | 'pre_escala'
  | 'escala'
  | 'remarketing'
  | 'recuperacao'

export type AICampaignStatus = 'rascunho' | 'ativa' | 'pausada' | 'encerrada' | 'vencedora'

export interface CampaignStrategy {
  nome_estrategico: string
  objetivo_recomendado: {
    adequado: boolean
    justificativa: string
    ajuste_sugerido: string
  }
  hipotese_principal: string
  publico: {
    principal: string
    secundarios: string[]
    interesses: string[]
    exclusoes: string[]
    observacoes: string
    broad_vs_segmentado: string
  }
  angulo_principal: {
    tipo: string
    descricao: string
    aplicacao: string
  }
  angulos_secundarios: Array<{ tipo: string; descricao: string }>
  estrutura: {
    num_campanhas: number
    num_conjuntos: number
    criativos_por_conjunto: number
    tipo_otimizacao: string
    estrategia_orcamento: string
  }
  criativos_necessarios: {
    quantidade: number
    formatos: string[]
    duracao_videos: string
    tipo_imagem: string
    tipo_copy: string
    tipo_hook: string
  }
  copies: {
    textos_principais: string[]
    headlines: string[]
    descricoes: string[]
    ctas: string[]
  }
  landing_page: {
    avaliacao: string
    acima_dobra: string
    promessa: string
    prova_garantia: string
  }
  metricas: {
    ctr_minimo: string
    cpc_maximo: string
    cpa_alvo: string
    taxa_conversao: string
    roas_esperado: string
  }
  regras_decisao: {
    pausar: string
    manter: string
    duplicar: string
    escalar: string
    variacoes: string
  }
  plano_3_dias: {
    dia1: string
    dia2: string
    dia3: string
  }
  proximo_passo: string
}

// ─── AI Creative Generator ───────────────────────────────────────────────────

export type CreativeChannelType =
  | 'meta_ads'
  | 'tiktok_ads'
  | 'google_display'
  | 'youtube_ads'
  | 'native_ads'
  | 'instagram_organico'

export type CreativeTypeType =
  | 'video_curto'
  | 'video_longo'
  | 'imagem'
  | 'carrossel'
  | 'ugc'
  | 'story'

export type CreativeObjectiveType =
  | 'captar_atencao'
  | 'gerar_cliques'
  | 'gerar_leads'
  | 'converter_venda'
  | 'retargeting'

export type AICreativeStatus = 'novo' | 'em_teste' | 'vencedor' | 'perdedor' | 'pausado' | 'reciclar' | 'escalar'

export interface CreativeLearning {
  hook_type: string
  promise_type: string
  dominant_emotion: string
  proof_type: string
}

export interface CreativeHistoryEntry {
  date: string
  type: 'status' | 'metrics' | 'note'
  description: string
}

export interface PerformanceInsight {
  id: string
  generated_at: string
  o_que_funciona: string
  o_que_falha: string
  hooks_que_performam: string
  angulos_que_convertem: string
  melhores_canais: string
  produtos_com_potencial: string
  criativos_pausar: string[]
  criativos_variar: string[]
  proximos_testes: string[]
}

export interface CreativeCena {
  numero: number
  texto_falado: string
  texto_tela: string
  enquadramento: string
  duracao: string
  notas?: string
}

export interface DirecaoGravacao {
  quem: string
  onde: string
  tom_voz: string
  expressao: string
  equipamento?: string
  observacoes?: string
}

export interface DirecaoEdicao {
  cortes: string
  legendas: string
  zoom: string
  musica: string
  ritmo: string
  transicoes?: string
}

export interface ImagemLayout {
  posicao_titulo: string
  posicao_subtitulo: string
  posicao_imagem: string
  posicao_cta: string
  hierarquia_visual: string
  dimensoes: string
  notas_layout?: string
}

export interface ImagemTexto {
  headline: string
  subheadline: string
  cta: string
}

export interface ImagemVariacao {
  nome: string
  headline: string
  angulo: string
  emocao: string
}

export interface ImagemEstilo {
  fundo: string
  estilo: string
  fonte: string
  contraste: string
  elementos_visuais: string
}

export interface ImagemReferencia {
  descricao: string
  instrucoes_canva: string
  cores_hex: string[]
  exemplos_visuais: string
}

export interface CreativeStrategy {
  nome: string
  ideia_central: string
  hooks: Array<{ tipo: string; texto: string }>
  roteiro: {
    hook: string
    problema: string
    agitacao: string
    solucao: string
    cta: string
    duracao: string
  }
  cenas?: CreativeCena[]
  variacoes_roteiro: Array<{ nome: string; roteiro: string }>
  texto_anuncio: {
    textos_principais: string[]
    headlines: string[]
    descricoes: string[]
    ctas: string[]
  }
  direcao_criativa: {
    como_gravar: string
    cenario: string
    tipo_pessoa: string
    estilo: string
    tom_voz: string
    edicao: string
  }
  direcao_gravacao?: DirecaoGravacao
  direcao_edicao?: DirecaoEdicao
  // Image creative fields (filled only for imagem/carrossel types)
  imagem_tipo?: string
  imagem_layout?: ImagemLayout
  imagem_texto?: ImagemTexto
  imagem_variacoes?: ImagemVariacao[]
  imagem_estilo?: ImagemEstilo
  imagem_referencia?: ImagemReferencia
  referencia_visual: string
  variacoes_teste: Array<{ tipo: string; descricao: string }>
  hipotese: string
  metricas_esperadas: {
    ctr_esperado: string
    cpc_esperado: string
    cpa_esperado: string
  }
  recomendacoes: {
    quando_usar: string
    quando_pausar: string
    quando_escalar: string
  }
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export interface LandingPageBlocoLayout {
  posicao_texto: string
  posicao_imagem: string
  espacamento: string
  hierarquia: string
  notas: string
}

export interface LandingPageBlocoCopy {
  headline?: string
  subheadline?: string
  corpo?: string
  lista_itens?: string[]
  cta_texto?: string
  cta_cor?: string
  cta_tamanho?: string
}

export interface LandingPageBloco {
  tipo: string
  layout: LandingPageBlocoLayout
  copy: LandingPageBlocoCopy
}

export interface LandingPageDesign {
  paleta: Array<{ nome: string; hex: string; uso: string }>
  fonte_headline: string
  fonte_corpo: string
  hierarquia_tipografica: string
  estilo_visual: string
  estilo_botao: string
  estilo_imagens: string
}

export interface LandingPageMobile {
  mudancas: string
  ordem_secoes: string
  ajustes: string
}

export interface LandingPageStructure {
  page_title: string
  meta_description: string
  objetivo: string
  blocos: LandingPageBloco[]
  design: LandingPageDesign
  mobile: LandingPageMobile
  notas_conversao: string
}

export interface LandingPage {
  id: string
  product_id: string
  structure: LandingPageStructure
  created_at: string
}

// ─── Daily Action Plan ───────────────────────────────────────────────────────

export type DailyTaskCategory = 'hoje' | 'proximas_24h' | 'proximos_3_dias' | 'escala' | 'correcao'
export type DailyTaskStatus = 'pending' | 'done' | 'ignored'
export type DailyPlanStatus = 'pending' | 'in_progress' | 'done'

export interface DailyTask {
  id: string
  description: string
  category: DailyTaskCategory
  priority: Priority
  estimated_time?: string
  expected_impact?: string
  related_campaign_id?: string
  related_creative_id?: string
  related_decision_id?: string
  status: DailyTaskStatus
}

export interface DailyPlan {
  id: string
  product_id: string
  date: string
  scenario_summary: string
  day_priority_focus: string
  day_priority_reason: string
  tasks: DailyTask[]
  alerts: string[]
  next_strategic_step: string
  status: DailyPlanStatus
  created_at: string
}

export interface AICreative {
  id: string
  product_id: string
  campaign_id: string
  channel: CreativeChannelType
  creative_type: CreativeTypeType
  objective: CreativeObjectiveType
  angle: string
  strategy: CreativeStrategy
  status: AICreativeStatus
  // aggregated performance metrics (updated when metric records are saved)
  spend: number
  revenue: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  // learning fields for AI pattern detection
  learning: CreativeLearning
  // history of status/metric changes
  history: CreativeHistoryEntry[]
  notes: string
  created_at: string
  updated_at: string
}

export interface AICampaign {
  id: string
  product_id: string
  objective: CampaignObjectiveType
  channel: CampaignChannelType
  phase: CampaignPhaseType
  daily_budget: number
  test_duration: number
  total_budget_estimate: number
  currency: string
  start_date: string
  strategy: CampaignStrategy
  status: AICampaignStatus
  main_result: string
  notes: string
  created_at: string
  updated_at: string
}
