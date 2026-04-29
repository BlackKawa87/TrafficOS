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

// ─── Scale & Optimization ─────────────────────────────────────────────────────

export type ScaleActionType =
  | 'escalar_orcamento'
  | 'duplicar_campanha'
  | 'duplicar_conjunto'
  | 'criar_variacao_criativo'
  | 'expandir_publico'
  | 'criar_remarketing'
  | 'replicar_canal'
  | 'ajustar_oferta'
  | 'pausar_campanha'
  | 'continuar_teste'

export type ScalePriority = 'baixa' | 'media' | 'alta' | 'critica'
export type ScaleLevel = 'baixo' | 'medio' | 'alto'
export type ScaleStatus = 'pendente' | 'em_execucao' | 'executada' | 'ignorada' | 'arquivada'

export interface ScaleOpportunity {
  id: string
  product_id: string
  campaign_id?: string
  creative_id?: string
  channel?: string
  title: string
  action_type: ScaleActionType
  priority: ScalePriority
  reason: string
  supporting_data: string
  potential: ScaleLevel
  risk: ScaleLevel
  confidence: ScaleLevel
  recommended_action: string[]
  action_limit: string
  next_step: string
  status: ScaleStatus
  notes?: string
  created_at: string
  updated_at: string
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

// ─── Remarketing ──────────────────────────────────────────────────────────────

export type RemarketingAudienceType =
  | 'visitou_nao_comprou'
  | 'clicou_nao_converteu'
  | 'assistiu_video'
  | 'abandonou_checkout'
  | 'lead_nao_convertido'

export type IntentionLevel = 'baixo' | 'medio' | 'alto'
export type RemarketingStatus = 'ativo' | 'pausado' | 'arquivado'

export interface RemarketingCreativeVideo {
  script_completo: string
  abordagem_emocional: string
  cta: string
}

export interface RemarketingCreativeImage {
  headline: string
  layout: string
  cta: string
}

export interface RemarketingAudienceMessages {
  urgencia: string
  escassez: string
  reforco_valor: string
  quebra_objecao: string
}

export interface RemarketingAudience {
  tipo: RemarketingAudienceType
  nome: string
  tamanho_estimado?: string
  nivel_intencao: IntentionLevel
  descricao: string
  criativo_video: RemarketingCreativeVideo
  criativo_imagem: RemarketingCreativeImage
  mensagens: RemarketingAudienceMessages
}

export interface RemarketingPhase {
  fase: string
  periodo: string
  objetivo: string
  abordagem: string
  criativos_recomendados: string[]
  frequencia: string
}

export interface RemarketingBudget {
  percentual_do_total: number
  justificativa: string
  distribuicao_por_fase: string
}

export interface RemarketingFrequency {
  frequencia_diaria: string
  janela_retargeting: string
  recomendacao: string
}

export interface RemarketingStrategy {
  id: string
  product_id: string
  channel?: string
  publicos: RemarketingAudience[]
  estrategia_por_fase: RemarketingPhase[]
  orcamento_recomendado: RemarketingBudget
  frequencia_ideal: RemarketingFrequency
  resumo_executivo: string
  status: RemarketingStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ─── Expansão Multi-Canal ──────────────────────────────────────────────────────

export type ExpansaoChannel =
  | 'meta_ads'
  | 'tiktok_ads'
  | 'youtube_ads'
  | 'google_search'
  | 'google_display'
  | 'native_ads'

export type ExpansaoRisk = 'baixo' | 'medio' | 'alto'
export type ExpansaoStatus = 'pendente' | 'em_teste' | 'ativo' | 'pausado' | 'arquivado'

export interface ExpansaoCreativeAdaptation {
  video_adaptacao: string
  imagem_adaptacao: string
  copy_ajustes: string
  formatos_recomendados: string[]
}

export interface ExpansaoEntryStrategy {
  teste_inicial: string
  orcamento_teste: string
  num_criativos: number
  duracao_teste: string
  metricas_validacao: string[]
  setup: string[]
}

export interface ExpansaoPlan {
  id: string
  product_id: string
  source_channel: string
  target_channel: ExpansaoChannel
  motivo_escolha: string
  criativo_base_id?: string
  campanha_base_id?: string
  adaptacao_criativos: ExpansaoCreativeAdaptation
  estrategia_entrada: ExpansaoEntryStrategy
  potencial_escala: string
  risco: ExpansaoRisk
  risco_detalhes: string
  publico_estimado: string
  diferencial_canal: string
  status: ExpansaoStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ─── Email Marketing ──────────────────────────────────────────────────────────

export type EmailType =
  | 'boas_vindas'
  | 'dor'
  | 'erro_comum'
  | 'autoridade'
  | 'oferta'
  | 'prova'
  | 'urgencia'

export type EmailSequenceStatus = 'rascunho' | 'ativo' | 'pausado' | 'arquivado'

export interface EmailItem {
  numero: number
  tipo: EmailType
  dia: number
  assunto: string
  preheader: string
  objetivo: string
  corpo: string
  cta: string
}

export interface EmailSequence {
  id: string
  product_id: string
  nome: string
  descricao: string
  frequencia: string
  publico_alvo: string
  emails: EmailItem[]
  status: EmailSequenceStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ─── WhatsApp / Telegram ───────────────────────────────────────────────────────

export type WhatsappMessageType =
  | 'inicial'
  | 'follow_up'
  | 'diagnostico'
  | 'valor'
  | 'oferta'
  | 'quebra_objecao'
  | 'final'

export type WhatsappFlowStatus = 'rascunho' | 'ativo' | 'pausado' | 'arquivado'
export type WhatsappCanal = 'whatsapp' | 'telegram' | 'ambos'

export interface WhatsappMessage {
  numero: number
  tipo: WhatsappMessageType
  titulo: string
  objetivo: string
  texto: string
  variacao?: string
  gatilho_envio: string
  dica: string
}

export interface WhatsappFlow {
  id: string
  product_id: string
  nome: string
  descricao: string
  canal: WhatsappCanal
  mensagens: WhatsappMessage[]
  status: WhatsappFlowStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ─── Learning Engine ──────────────────────────────────────────────────────────

export type LearningPatternType = 'hook' | 'copy' | 'criativo' | 'publico' | 'canal' | 'angulo'
export type LearningPatternStatus = 'ativo' | 'arquivado'

export interface LearningPattern {
  id: string
  tipo: LearningPatternType
  titulo: string
  conteudo: string
  product_id?: string
  nicho?: string
  canal?: string
  performance_score: number      // 0–100, user-rated
  impressions?: number
  clicks?: number
  conversions?: number
  ctr?: number
  cpa?: number
  roas?: number
  tags: string[]
  status: LearningPatternStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface PadraoVencedor {
  tipo: string
  descricao: string
  motivo: string
  frequencia: string
  impacto: string
}

export interface ErroRecorrente {
  descricao: string
  frequencia: string
  custo_estimado: string
  como_corrigir: string
}

export interface OportunidadeOculta {
  descricao: string
  potencial: string
  acao_recomendada: string
  prazo: string
}

export interface SugestaoMelhoria {
  area: string
  sugestao: string
  impacto_esperado: string
  prioridade: 'alta' | 'media' | 'baixa'
}

export interface IntelligenceReport {
  id: string
  generated_at: string
  padroes_vencedores: PadraoVencedor[]
  erros_recorrentes: ErroRecorrente[]
  oportunidades_ocultas: OportunidadeOculta[]
  sugestoes_melhoria: SugestaoMelhoria[]
  resumo_executivo: string
  score_geral: number
  proximos_passos: string[]
}

// ─── API Integrations ─────────────────────────────────────────────────────────

export type IntegrationPlatform = 'meta' | 'tiktok'
export type ConnectionStatus = 'disconnected' | 'connected' | 'error' | 'syncing'

export interface MetaCredentials {
  access_token: string
  ad_account_id: string
}

export interface TikTokCredentials {
  access_token: string
  advertiser_id: string
}

export interface SyncedCampaign {
  id: string
  name: string
  status: string
  objective: string
  platform: IntegrationPlatform
  daily_budget?: number
  spend?: number
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  cpa?: number
  roas?: number
}

export interface PlatformSync {
  platform: IntegrationPlatform
  synced_at: string
  total_spend: number
  total_impressions: number
  total_clicks: number
  avg_ctr: number
  avg_cpc: number
  campaign_count: number
  active_count: number
  campaigns: SyncedCampaign[]
}

// ─── AI Core (Self-Learning Engine) ───────────────────────────────────────────

export type AIPatternCategory = 'criativo' | 'publico' | 'canal' | 'oferta' | 'timing' | 'copy'
export type AIImprovementArea = 'copy' | 'criativo' | 'publico' | 'funil' | 'campanha' | 'oferta'
export type AIImprovementStatus = 'pendente' | 'aplicado' | 'ignorado'
export type AIImpact = 'alto' | 'medio' | 'baixo'

export interface AICorePattern {
  id: string
  category: AIPatternCategory
  title: string
  insight: string
  confidence: number
  data_points: number
  impact: AIImpact
  created_at: string
}

export interface AICoreImprovement {
  id: string
  area: AIImprovementArea
  title: string
  current_state: string
  suggested_improvement: string
  expected_impact: string
  priority: 'alta' | 'media' | 'baixa'
  status: AIImprovementStatus
  created_at: string
}

export interface AICoreMetaInsights {
  best_creative_type: string
  best_channel: string
  best_audience_type: string
  best_offer_angle: string
  avg_winning_ctr: number
  avg_winning_cpa: number
  avg_winning_roas: number
}

export interface AICorePrediction {
  id: string
  input_description: string
  channel: string
  objective: string
  predicted_ctr: number
  predicted_cpa: number
  predicted_roas: number
  confidence: number
  score_potencial: number
  reasoning: string
  recommendations: string[]
  created_at: string
}

export interface AICoreModel {
  id: string
  version: number
  trained_at: string
  data_points_used: number
  overall_score: number
  patterns: AICorePattern[]
  improvements: AICoreImprovement[]
  predictions: AICorePrediction[]
  meta_insights: AICoreMetaInsights
  training_summary: string
  next_training_suggested: string
  data_breakdown: {
    products: number
    campaigns: number
    creatives: number
    metrics: number
    decisions: number
    learning_patterns: number
    test_sessions: number
    autopilot_sessions: number
  }
}

// ─── Auto-Testing ─────────────────────────────────────────────────────────────

export type TestVariationType = 'hook' | 'abordagem' | 'cta' | 'estilo_visual'
export type TestVariationStatus = 'gerando' | 'ativo' | 'pausado' | 'vencedor' | 'perdedor'
export type AutoTestSessionStatus = 'gerando' | 'ativo' | 'pausado' | 'concluido'

export interface TestVariation {
  id: string
  session_id: string
  type: TestVariationType
  name: string
  content: string
  sub_type?: string
  emotion?: string
  status: TestVariationStatus
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpa: number
  roas: number
  sim_health: number
  decision_reason?: string
  saved_to_bank: boolean
  created_at: string
  updated_at: string
}

export interface TestLearning {
  id: string
  session_id: string
  variation_id: string
  type: TestVariationType
  name: string
  content: string
  score: number
  why_it_won: string
  emotion?: string
  sub_type?: string
  saved_to_bank: boolean
  created_at: string
}

export interface AutoTestSession {
  id: string
  product_id: string
  base_creative_id: string
  base_creative_name: string
  base_hook: string
  status: AutoTestSessionStatus
  variations: TestVariation[]
  learnings: TestLearning[]
  total_spend: number
  total_impressions: number
  winners_count: number
  started_at: string
  concluded_at?: string
  updated_at: string
}

// ─── Auto-Pilot Ads ────────────────────────────────────────────────────────────

export type AutoPilotRiskLevel = 'conservador' | 'moderado' | 'agressivo'
export type AutoPilotChannel = 'meta' | 'tiktok'
export type AutoPilotStatus = 'idle' | 'running' | 'paused'

export type AutoPilotCampaignStatus =
  | 'gerando'
  | 'publicando'
  | 'ativa'
  | 'pausada_cpa'
  | 'pausada_ctr'
  | 'escalando'
  | 'variacao'
  | 'encerrada'

export type AutoPilotActionType =
  | 'piloto_ativado'
  | 'piloto_pausado'
  | 'piloto_retomado'
  | 'piloto_parado'
  | 'campanha_criada'
  | 'campanha_publicada'
  | 'campanha_pausada_cpa'
  | 'campanha_pausada_ctr'
  | 'campanha_escalada'
  | 'campanha_duplicada'
  | 'orcamento_aumentado'
  | 'variacao_criada'
  | 'pausa_seguranca'
  | 'ai_analysis'

export interface AutoPilotConfig {
  product_id: string
  daily_budget_max: number
  cpa_target: number
  roas_target: number
  channel: AutoPilotChannel
  risk_level: AutoPilotRiskLevel
  max_scale_pct_per_day: number
  currency: string
}

export interface AutoPilotCampaign {
  id: string
  session_id: string
  name: string
  status: AutoPilotCampaignStatus
  daily_budget: number
  spend: number
  revenue: number
  roas: number
  cpa: number
  ctr: number
  impressions: number
  clicks: number
  conversions: number
  sim_health: number
  created_at: string
  updated_at: string
}

export interface AutoPilotAction {
  id: string
  session_id: string
  action_type: AutoPilotActionType
  description: string
  reasoning: string
  campaign_id?: string
  campaign_name?: string
  before_value?: string
  after_value?: string
  created_at: string
}

export interface AutoPilotSession {
  id: string
  config: AutoPilotConfig
  status: AutoPilotStatus
  campaigns: AutoPilotCampaign[]
  actions: AutoPilotAction[]
  total_spend: number
  total_revenue: number
  total_roas: number
  total_cpa: number
  started_at: string
  paused_at?: string
  updated_at: string
}

// ─── Multi-Produto System ─────────────────────────────────────────────────────

export type MultiProductEntryStatus = 'iniciando' | 'ativo' | 'escalando' | 'reduzindo' | 'pausado' | 'vencedor'
export type MultiProductSessionStatus = 'running' | 'paused' | 'concluido'
export type MultiProductChannel = 'meta' | 'tiktok' | 'google'
export type MultiProductActionType =
  | 'sessao_iniciada'
  | 'sessao_pausada'
  | 'sessao_retomada'
  | 'sessao_encerrada'
  | 'produto_escalado'
  | 'produto_reduzido'
  | 'produto_pausado'
  | 'produto_vencedor'
  | 'orcamento_realocado'
  | 'ai_analysis'

export interface MultiProductEntry {
  id: string
  session_id: string
  product_id: string
  product_name: string
  product_niche: string
  status: MultiProductEntryStatus
  daily_budget: number
  budget_pct: number
  spend: number
  revenue: number
  roas: number
  cpa: number
  ctr: number
  impressions: number
  clicks: number
  conversions: number
  sim_health: number
  rank: number
  decision_reason?: string
  created_at: string
  updated_at: string
}

export interface MultiProductAction {
  id: string
  session_id: string
  action_type: MultiProductActionType
  description: string
  product_id?: string
  product_name?: string
  reasoning?: string
  before_value?: number
  after_value?: number
  created_at: string
}

export interface MultiProductSession {
  id: string
  status: MultiProductSessionStatus
  total_daily_budget: number
  currency: string
  channel: MultiProductChannel
  entries: MultiProductEntry[]
  actions: MultiProductAction[]
  winner_id?: string
  total_spend: number
  total_revenue: number
  started_at: string
  paused_at?: string
  concluded_at?: string
  updated_at: string
}

// ─── Full Auto Mode ───────────────────────────────────────────────────────────

export type FullAutoRisk = 'conservador' | 'moderado' | 'agressivo'
export type FullAutoChannel = 'meta' | 'tiktok' | 'google'
export type FullAutoStatus = 'running' | 'paused' | 'emergency_stop' | 'concluido'

export type FullAutoCampaignStatus =
  | 'criando'
  | 'publicando'
  | 'ativa'
  | 'otimizando'
  | 'escalando'
  | 'pausada'
  | 'encerrada'

export type FullAutoActionType =
  | 'sistema_ativado'
  | 'sistema_pausado'
  | 'sistema_retomado'
  | 'sistema_parado'
  | 'emergencia_ativada'
  | 'produto_selecionado'
  | 'campanha_criada'
  | 'campanha_publicada'
  | 'campanha_pausada'
  | 'campanha_escalada'
  | 'campanha_encerrada'
  | 'variacao_criada'
  | 'orcamento_ajustado'
  | 'alerta_prejuizo'
  | 'ai_strategy'

export interface FullAutoConfig {
  max_daily_budget: number
  risk_level: FullAutoRisk
  cpa_target: number
  roas_target: number
  max_active_campaigns: number
  channels: FullAutoChannel[]
  currency: string
}

export interface FullAutoCampaign {
  id: string
  session_id: string
  product_id: string
  product_name: string
  channel: FullAutoChannel
  objective: string
  creative_type: string
  hook: string
  status: FullAutoCampaignStatus
  daily_budget: number
  spend: number
  revenue: number
  roas: number
  cpa: number
  ctr: number
  impressions: number
  clicks: number
  conversions: number
  sim_health: number
  phase_tick: number
  created_at: string
  updated_at: string
}

export interface FullAutoAction {
  id: string
  session_id: string
  action_type: FullAutoActionType
  title: string
  description: string
  campaign_id?: string
  reasoning?: string
  impact?: string
  created_at: string
}

export interface FullAutoMetrics {
  total_spend: number
  total_revenue: number
  profit_loss: number
  campaigns_created: number
  campaigns_paused: number
  campaigns_scaled: number
  winners_count: number
}

export interface FullAutoSession {
  id: string
  config: FullAutoConfig
  status: FullAutoStatus
  campaigns: FullAutoCampaign[]
  actions: FullAutoAction[]
  metrics: FullAutoMetrics
  health_score: number
  ai_last_insight?: string
  started_at: string
  paused_at?: string
  updated_at: string
}

// ─── Cloud Ops ────────────────────────────────────────────────────────────────

export type CloudJobType =
  | 'sync_metrics'
  | 'generate_report'
  | 'monitor_campaigns'
  | 'auto_pause'
  | 'auto_scale'
  | 'generate_creatives'
  | 'update_decisions'
  | 'update_daily_plan'

export type CloudJobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'error' | 'skipped' | 'disabled'
export type CloudJobPriority = 'critical' | 'high' | 'medium' | 'low'
export type CloudLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'
export type CloudAlertSeverity = 'info' | 'warning' | 'critical'

export interface CloudLogEntry {
  id: string
  job_id: string
  job_type: CloudJobType
  job_name: string
  level: CloudLogLevel
  message: string
  timestamp: string
}

export interface CloudJob {
  id: string
  type: CloudJobType
  status: CloudJobStatus
  priority: CloudJobPriority
  enabled: boolean
  last_run?: string
  last_duration_ms?: number
  last_result?: string
  last_error?: string
  next_run: string
  run_count: number
  success_count: number
  error_count: number
  updated_at: string
}

export interface CloudAlert {
  id: string
  severity: CloudAlertSeverity
  title: string
  message: string
  job_type?: CloudJobType
  acknowledged: boolean
  created_at: string
}

export interface CloudOpsState {
  enabled: boolean
  jobs: CloudJob[]
  logs: CloudLogEntry[]
  alerts: CloudAlert[]
  total_runs: number
  total_successes: number
  total_errors: number
  last_sync?: string
  session_started_at?: string
  updated_at: string
}

// ─── Landing Publisher ────────────────────────────────────────────────────────

export type LandingPublisherFunnel =
  | 'direto'
  | 'isca_digital'
  | 'webinar'
  | 'lancamento'
  | 'produto_fisico'
  | 'saas'
  | 'servico'

export type LandingPublisherStatus = 'rascunho' | 'publicado' | 'arquivado'
export type LandingPublisherDesign = 'dark_modern' | 'clean_white' | 'bold_energy'

export interface LandingPublisherBenefit {
  icon: string
  title: string
  description: string
}

export interface LandingPublisherTestimonial {
  name: string
  role: string
  text: string
  result: string
}

export interface LandingPublisherFAQItem {
  question: string
  answer: string
}

export interface LandingPublisherContent {
  meta_title: string
  meta_description: string
  hero_headline: string
  hero_subheadline: string
  hero_cta_text: string
  hero_secondary_text: string
  problem_headline: string
  problem_items: string[]
  solution_headline: string
  solution_description: string
  solution_mechanism: string
  benefits_headline: string
  benefits: LandingPublisherBenefit[]
  proof_headline: string
  testimonials: LandingPublisherTestimonial[]
  results_stat: string
  offer_headline: string
  offer_price: string
  offer_original_price: string
  offer_items: string[]
  offer_cta_text: string
  offer_urgency: string
  guarantee_headline: string
  guarantee_text: string
  guarantee_days: number
  faq_headline: string
  faq: LandingPublisherFAQItem[]
  final_headline: string
  final_subheadline: string
  final_cta_text: string
  primary_color: string
  accent_color: string
}

export interface LandingPublisherVersion {
  version: number
  content: LandingPublisherContent
  created_at: string
  note: string
}

export interface LandingPublisherPage {
  id: string
  product_id: string
  product_name: string
  funnel: LandingPublisherFunnel
  design: LandingPublisherDesign
  status: LandingPublisherStatus
  current_version: number
  versions: LandingPublisherVersion[]
  published_url?: string
  created_at: string
  updated_at: string
}

// ─── Video AI ─────────────────────────────────────────────────────────────────

export type VideoAIFormat = 'ugc' | 'avatar_ia' | 'narracao' | 'storytelling' | 'demonstracao'
export type VideoAIObjective = 'conversao' | 'trafego' | 'leads' | 'awareness' | 'remarketing'
export type VideoAIStatus = 'gerando' | 'pronto' | 'publicado' | 'arquivado'

export interface VideoAIScene {
  number: number
  duration: string
  visual: string
  narration: string
  text_on_screen: string
  transition: string
}

export interface VideoAIOutput {
  hook: string
  script_problem: string
  script_agitation: string
  script_solution: string
  script_proof: string
  script_cta: string
  full_narration: string
  text_on_screen: string[]
  cta_final: string
  scenes: VideoAIScene[]
  voice_profile: string
  voice_tone: string
  avatar_description: string
  music_suggestion: string
  music_mood: string
  subtitles_style: string
  edit_direction: string[]
  hook_analysis: string
  platforms: string[]
}

export interface VideoAIVideo {
  id: string
  product_id: string
  product_name: string
  campaign_id: string
  campaign_name: string
  objective: VideoAIObjective
  format: VideoAIFormat
  status: VideoAIStatus
  output_15s: VideoAIOutput | null
  output_30s: VideoAIOutput | null
  saved_to_library: boolean
  created_at: string
  updated_at: string
}

// ─── VSL (Video Sales Letter) ─────────────────────────────────────────────────

export type VslBlocoTipo =
  | 'hook_inicial'
  | 'identificacao'
  | 'problema'
  | 'agitacao'
  | 'historia'
  | 'apresentacao_solucao'
  | 'mecanismo'
  | 'beneficios'
  | 'prova'
  | 'oferta'
  | 'garantia'
  | 'urgencia'
  | 'cta'

export type VslEstilo = 'autoridade' | 'storytelling' | 'direto'
export type VslStatus = 'rascunho' | 'pronto' | 'em_uso' | 'arquivado'

export interface VslBloco {
  numero: number
  nome: string
  tipo: VslBlocoTipo
  duracao: string
  tempo_inicio: string
  objetivo: string
  roteiro: string
  notas_direcao?: string
}

export interface VslDirecao {
  tom_voz: string
  estilo: VslEstilo
  ritmo: string
  cortes: string
  expressao: string
  cenario: string
}

export interface VslScript {
  id: string
  product_id: string
  nome: string
  descricao: string
  estilo: VslEstilo
  duracao_total: string
  publico_alvo: string
  promessa_principal: string
  blocos: VslBloco[]
  texto_completo: string
  direcao: VslDirecao
  status: VslStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ─── Compliance & Ad Safety ────────────────────────────────────────────────────

export type CompliancePlatform = 'meta_ads' | 'tiktok_ads' | 'google_ads' | 'youtube_ads' | 'native_ads'
export type ComplianceStatus   = 'seguro' | 'atencao' | 'alto_risco' | 'nao_recomendado'
export type ComplianceSeverity = 'baixo' | 'medio' | 'alto' | 'critico'

export type ComplianceIssueType =
  | 'promessa_exagerada'
  | 'claim_sensivel'
  | 'antes_depois'
  | 'linguagem_agressiva'
  | 'segmentacao_sensivel'
  | 'conteudo_saude'
  | 'conteudo_financeiro'
  | 'conteudo_juridico'
  | 'autoridade_indevida'
  | 'garantia_absoluta'
  | 'risco_reprovacao'
  | 'outro'

export interface ComplianceIssue {
  type: ComplianceIssueType
  severity: ComplianceSeverity
  description: string
  excerpt: string
  suggestion: string
}

export interface CompliancePlatformRec {
  platform: CompliancePlatform
  allowed: boolean
  risk_level: 'baixo' | 'medio' | 'alto' | 'reprovado'
  specific_issues: string[]
  recommendations: string[]
}

export interface ComplianceAnalysis {
  risk_score: number
  status: ComplianceStatus
  summary: string
  issues: ComplianceIssue[]
  platform_recs: CompliancePlatformRec[]
  safe_copy_version: string
  safe_headline_version: string
  safe_offer_version: string
  general_recommendations: string[]
  what_to_remove: string[]
  what_to_keep: string[]
}

export interface ComplianceCheck {
  id: string
  product_id: string
  product_name: string
  platforms: CompliancePlatform[]
  niche: string
  copy_text: string
  headline: string
  offer_description: string
  landing_url: string
  claims: string[]
  analysis: ComplianceAnalysis
  created_at: string
}

// ─── Relatório Executivo ───────────────────────────────────────────────────────

export type RelatorioType   = 'diario' | 'semanal' | 'mensal' | 'por_produto' | 'por_campanha' | 'por_canal'
export type RelatorioStatus = 'pronto' | 'arquivado'

export interface RelatorioKPIs {
  total_spend: number
  total_revenue: number
  profit: number
  avg_roas: number
  avg_cpa: number
  avg_ctr: number
  avg_cpc: number
  total_conversions: number
  total_impressions: number
  total_clicks: number
  total_leads: number
}

export interface RelatorioCreativePerf {
  creative_id: string
  creative_name: string
  spend: number
  revenue: number
  roas: number
  ctr: number
  cpa: number
  status: string
}

export interface RelatorioDecisionEntry {
  id: string
  title: string
  decision_type: string
  priority: string
  status: string
  created_at: string
}

export interface RelatorioContent {
  resumo_executivo: string
  principais_aprendizados: string[]
  acoes_tomadas: string[]
  riscos_identificados: string[]
  oportunidades: string[]
  proximos_passos: string[]
  recomendacoes: string[]
}

export interface Relatorio {
  id: string
  type: RelatorioType
  title: string
  period_label: string
  period_start: string
  period_end: string
  product_id: string
  product_name: string
  campaign_id: string
  campaign_name: string
  channel: string
  kpis: RelatorioKPIs
  winners: RelatorioCreativePerf[]
  losers: RelatorioCreativePerf[]
  decisions: RelatorioDecisionEntry[]
  content: RelatorioContent
  status: RelatorioStatus
  created_at: string
}
