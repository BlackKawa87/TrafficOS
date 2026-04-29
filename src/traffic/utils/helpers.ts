export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export function formatDateTime(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ideia: 'bg-gray-700 text-gray-300',
    pronto: 'bg-blue-900/50 text-blue-300',
    em_teste: 'bg-amber-900/50 text-amber-300',
    validado: 'bg-emerald-900/50 text-emerald-300',
    pausado: 'bg-gray-800 text-gray-400',
    ativa: 'bg-emerald-900/50 text-emerald-300',
    encerrada: 'bg-gray-700 text-gray-400',
    rascunho: 'bg-gray-700 text-gray-300',
    testing: 'bg-amber-900/50 text-amber-300',
    winner: 'bg-emerald-900/50 text-emerald-300',
    paused: 'bg-gray-800 text-gray-400',
    rejected: 'bg-red-900/50 text-red-400',
    pending: 'bg-amber-900/50 text-amber-300',
    in_progress: 'bg-blue-900/50 text-blue-300',
    done: 'bg-emerald-900/50 text-emerald-300',
    dismissed: 'bg-gray-800 text-gray-400',
    pausada: 'bg-gray-800 text-gray-400',
    vencedora: 'bg-yellow-900/50 text-yellow-300',
    novo: 'bg-gray-700 text-gray-300',
    vencedor: 'bg-emerald-900/50 text-emerald-300',
    perdedor: 'bg-red-900/50 text-red-400',
    reciclar: 'bg-cyan-900/50 text-cyan-300',
    escalar: 'bg-green-900/50 text-green-400',
    pause: 'bg-red-900/50 text-red-400',
    maintain: 'bg-blue-900/50 text-blue-300',
    scale: 'bg-emerald-900/50 text-emerald-300',
    improve: 'bg-violet-900/50 text-violet-300',
    low: 'bg-gray-700 text-gray-300',
    medium: 'bg-amber-900/50 text-amber-300',
    high: 'bg-red-900/50 text-red-400',
    critical: 'bg-red-800 text-red-200',
    accepted: 'bg-emerald-900/50 text-emerald-300',
    ignored: 'bg-gray-700 text-gray-400',
    executed: 'bg-blue-900/50 text-blue-300',
    archived: 'bg-gray-800 text-gray-500',
    // VSL statuses
    em_uso: 'bg-blue-900/50 text-blue-300',
    // Remarketing / Expansão statuses
    ativo: 'bg-emerald-900/50 text-emerald-300',
    arquivado: 'bg-gray-800 text-gray-500',
    // Scale statuses
    em_execucao: 'bg-blue-900/50 text-blue-300',
    executada: 'bg-emerald-900/50 text-emerald-300',
    ignorada: 'bg-gray-700 text-gray-400',
    arquivada: 'bg-gray-800 text-gray-500',
    // Scale priorities
    baixa: 'bg-gray-700 text-gray-300',
    media: 'bg-amber-900/50 text-amber-300',
    alta: 'bg-orange-900/50 text-orange-300',
    critica: 'bg-red-800 text-red-200',
    // Daily plan/task
    hoje: 'bg-red-900/50 text-red-300',
    proximas_24h: 'bg-amber-900/50 text-amber-300',
    proximos_3_dias: 'bg-blue-900/50 text-blue-300',
    escala: 'bg-emerald-900/50 text-emerald-300',
    correcao: 'bg-violet-900/50 text-violet-300',
    // Decision types
    pausar_criativo: 'bg-red-900/50 text-red-400',
    manter_criativo: 'bg-amber-900/50 text-amber-300',
    escalar_criativo: 'bg-green-900/50 text-green-400',
    duplicar_campanha: 'bg-violet-900/50 text-violet-300',
    criar_variacao: 'bg-cyan-900/50 text-cyan-300',
    trocar_hook: 'bg-orange-900/50 text-orange-300',
    trocar_publico: 'bg-pink-900/50 text-pink-300',
    revisar_oferta: 'bg-yellow-900/50 text-yellow-300',
    revisar_pagina: 'bg-blue-900/50 text-blue-300',
    criar_remarketing: 'bg-indigo-900/50 text-indigo-300',
    aumentar_orcamento: 'bg-emerald-900/50 text-emerald-300',
    reduzir_orcamento: 'bg-amber-900/50 text-amber-300',
    encerrar_campanha: 'bg-red-900/50 text-red-400',
    coletar_dados: 'bg-gray-700 text-gray-300',
  }
  return colors[status] ?? 'bg-gray-700 text-gray-300'
}

export const CATEGORY_LABELS: Record<string, string> = {
  saas: 'SaaS',
  infoproduto: 'Infoproduto',
  ebook: 'E-book',
  afiliado: 'Afiliado',
  nutra: 'Nutra',
  ecommerce: 'E-commerce',
  servico: 'Serviço',
  outro: 'Outro',
}

export const BILLING_LABELS: Record<string, string> = {
  unico: 'Único',
  mensal: 'Mensal',
  anual: 'Anual',
  trial: 'Trial',
  freemium: 'Freemium',
}

export const PLATFORM_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  google_ads: 'Google Ads',
  youtube_ads: 'YouTube Ads',
  outro: 'Outro',
}

export const OBJECTIVE_LABELS: Record<string, string> = {
  teste_criativo: 'Teste de Criativo',
  validacao_oferta: 'Validação de Oferta',
  captacao_leads: 'Captação de Leads',
  vendas_conversao: 'Vendas / Conversão',
  remarketing: 'Remarketing',
  escala: 'Escala',
  awareness: 'Awareness',
  trafego_pagina: 'Tráfego para Página',
}

export const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  google_search: 'Google Search',
  google_display: 'Google Display',
  youtube_ads: 'YouTube Ads',
  native_ads: 'Native Ads',
  instagram_organico: 'Instagram Orgânico',
  email_marketing: 'Email Marketing',
  whatsapp_telegram: 'WhatsApp / Telegram',
}

export const PHASE_LABELS: Record<string, string> = {
  teste_inicial: 'Teste Inicial',
  pre_validacao: 'Pré-Validação',
  validacao: 'Validação',
  pre_escala: 'Pré-Escala',
  escala: 'Escala',
  remarketing: 'Remarketing',
  recuperacao: 'Recuperação',
}

export const CREATIVE_CHANNEL_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  google_display: 'Google Display',
  youtube_ads: 'YouTube Ads',
  native_ads: 'Native Ads',
  instagram_organico: 'Instagram Orgânico',
}

export const CREATIVE_TYPE_LABELS: Record<string, string> = {
  video_curto: 'Vídeo Curto (Reels/TikTok)',
  video_longo: 'Vídeo Longo (YouTube)',
  imagem: 'Imagem Estática',
  carrossel: 'Carrossel',
  ugc: 'UGC',
  story: 'Story',
}

export const CREATIVE_OBJECTIVE_LABELS: Record<string, string> = {
  captar_atencao: 'Captar Atenção',
  gerar_cliques: 'Gerar Cliques',
  gerar_leads: 'Gerar Leads',
  converter_venda: 'Converter Venda',
  retargeting: 'Retargeting',
}

export const AI_CREATIVE_STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_teste: 'Em Teste',
  vencedor: 'Vencedor',
  perdedor: 'Perdedor',
  pausado: 'Pausado',
  reciclar: 'Reciclar',
  escalar: 'Escalar',
}

export const AI_CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
  vencedora: 'Vencedora',
}

export const FORMAT_LABELS: Record<string, string> = {
  image: 'Imagem',
  video: 'Vídeo',
  carousel: 'Carrossel',
  text: 'Texto',
}

export const DECISION_TYPE_LABELS: Record<string, string> = {
  pausar_criativo: 'Pausar Criativo',
  manter_criativo: 'Manter em Teste',
  escalar_criativo: 'Escalar Criativo',
  duplicar_campanha: 'Duplicar Campanha',
  criar_variacao: 'Criar Variação',
  trocar_hook: 'Trocar Hook',
  trocar_publico: 'Trocar Público',
  revisar_oferta: 'Revisar Oferta',
  revisar_pagina: 'Revisar Página',
  criar_remarketing: 'Criar Remarketing',
  aumentar_orcamento: 'Aumentar Orçamento',
  reduzir_orcamento: 'Reduzir Orçamento',
  encerrar_campanha: 'Encerrar Campanha',
  coletar_dados: 'Coletar Dados',
  pause: 'Pausar',
  maintain: 'Manter',
  scale: 'Escalar',
  improve: 'Melhorar',
}

export const DECISION_TYPE_ICONS: Record<string, string> = {
  pausar_criativo: '⏸',
  manter_criativo: '⏳',
  escalar_criativo: '🚀',
  duplicar_campanha: '⧉',
  criar_variacao: '🔀',
  trocar_hook: '⚡',
  trocar_publico: '👥',
  revisar_oferta: '💰',
  revisar_pagina: '📄',
  criar_remarketing: '🔁',
  aumentar_orcamento: '📈',
  reduzir_orcamento: '📉',
  encerrar_campanha: '🚫',
  coletar_dados: '⏱',
  pause: '⏸',
  maintain: '✓',
  scale: '📈',
  improve: '⚡',
}

export const DAILY_TASK_CATEGORY_LABELS: Record<string, string> = {
  hoje: 'Hoje',
  proximas_24h: 'Próximas 24h',
  proximos_3_dias: 'Próximos 3 dias',
  escala: 'Escala',
  correcao: 'Correção',
}

export const DAILY_TASK_CATEGORY_ICONS: Record<string, string> = {
  hoje: '🔥',
  proximas_24h: '⏰',
  proximos_3_dias: '📅',
  escala: '🚀',
  correcao: '🔧',
}

export const DAILY_PLAN_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluído',
}

export const DECISION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceita',
  ignored: 'Ignorada',
  executed: 'Executada',
  archived: 'Arquivada',
  in_progress: 'Em andamento',
  done: 'Concluída',
  dismissed: 'Dispensada',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

export const CONFIDENCE_LABELS: Record<string, string> = {
  baixo: 'Baixa confiança',
  medio: 'Média confiança',
  alto: 'Alta confiança',
}

export const SCALE_ACTION_LABELS: Record<string, string> = {
  escalar_orcamento: 'Escalar Orçamento',
  duplicar_campanha: 'Duplicar Campanha',
  duplicar_conjunto: 'Duplicar Conjunto',
  criar_variacao_criativo: 'Criar Variação de Criativo',
  expandir_publico: 'Expandir Público',
  criar_remarketing: 'Criar Remarketing',
  replicar_canal: 'Replicar em Outro Canal',
  ajustar_oferta: 'Ajustar Oferta',
  pausar_campanha: 'Pausar Campanha',
  continuar_teste: 'Continuar Teste',
}

export const SCALE_ACTION_ICONS: Record<string, string> = {
  escalar_orcamento: '📈',
  duplicar_campanha: '⧉',
  duplicar_conjunto: '⊕',
  criar_variacao_criativo: '🔀',
  expandir_publico: '👥',
  criar_remarketing: '🔁',
  replicar_canal: '🌐',
  ajustar_oferta: '💰',
  pausar_campanha: '⏸',
  continuar_teste: '⏱',
}

export const SCALE_PRIORITY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

export const SCALE_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_execucao: 'Em Execução',
  executada: 'Executada',
  ignorada: 'Ignorada',
  arquivada: 'Arquivada',
}

export const SCALE_LEVEL_LABELS: Record<string, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

export const REMARKETING_AUDIENCE_LABELS: Record<string, string> = {
  visitou_nao_comprou: 'Visitou e Não Comprou',
  clicou_nao_converteu: 'Clicou e Não Converteu',
  assistiu_video: 'Assistiu ao Vídeo',
  abandonou_checkout: 'Abandonou o Checkout',
  lead_nao_convertido: 'Lead Não Convertido',
}

export const REMARKETING_AUDIENCE_ICONS: Record<string, string> = {
  visitou_nao_comprou: '👁',
  clicou_nao_converteu: '🖱',
  assistiu_video: '▶',
  abandonou_checkout: '🛒',
  lead_nao_convertido: '📧',
}

export const INTENTION_LEVEL_LABELS: Record<string, string> = {
  baixo: 'Baixa Intenção',
  medio: 'Média Intenção',
  alto: 'Alta Intenção',
}

export const REMARKETING_STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
}

export const REMARKETING_PHASE_LABELS: Record<string, string> = {
  lembranca: 'Lembrança',
  prova: 'Prova Social',
  urgencia: 'Urgência',
}

export const EXPANSAO_CHANNEL_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  youtube_ads: 'YouTube Ads',
  google_search: 'Google Search',
  google_display: 'Google Display',
  native_ads: 'Native Ads',
}

export const EXPANSAO_CHANNEL_ICONS: Record<string, string> = {
  meta_ads: '📘',
  tiktok_ads: '🎵',
  youtube_ads: '▶',
  google_search: '🔍',
  google_display: '🖥',
  native_ads: '📰',
}

export const EXPANSAO_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_teste: 'Em Teste',
  ativo: 'Ativo',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
}

export const EXPANSAO_RISK_LABELS: Record<string, string> = {
  baixo: 'Risco Baixo',
  medio: 'Risco Médio',
  alto: 'Risco Alto',
}

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  boas_vindas: 'Boas-vindas',
  dor: 'Dor',
  erro_comum: 'Erro Comum',
  autoridade: 'Autoridade',
  oferta: 'Oferta',
  prova: 'Prova Social',
  urgencia: 'Urgência',
}

export const EMAIL_TYPE_ICONS: Record<string, string> = {
  boas_vindas: '👋',
  dor: '😔',
  erro_comum: '⚠️',
  autoridade: '🏆',
  oferta: '💰',
  prova: '⭐',
  urgencia: '⏰',
}

export const EMAIL_TYPE_COLORS: Record<string, string> = {
  boas_vindas: 'bg-violet-900/40 text-violet-300 border-violet-700/40',
  dor: 'bg-red-900/30 text-red-300 border-red-700/40',
  erro_comum: 'bg-orange-900/30 text-orange-300 border-orange-700/40',
  autoridade: 'bg-blue-900/30 text-blue-300 border-blue-700/40',
  oferta: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  prova: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40',
  urgencia: 'bg-red-900/50 text-red-200 border-red-600/50',
}

export const EMAIL_SEQUENCE_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
}

export const WHATSAPP_MSG_LABELS: Record<string, string> = {
  inicial: 'Mensagem Inicial',
  follow_up: 'Follow-up',
  diagnostico: 'Diagnóstico',
  valor: 'Valor',
  oferta: 'Oferta',
  quebra_objecao: 'Quebra de Objeção',
  final: 'Mensagem Final',
}

export const WHATSAPP_MSG_ICONS: Record<string, string> = {
  inicial: '👋',
  follow_up: '🔔',
  diagnostico: '🔍',
  valor: '💡',
  oferta: '💰',
  quebra_objecao: '🛡',
  final: '⏰',
}

export const WHATSAPP_MSG_COLORS: Record<string, string> = {
  inicial: 'border-green-700/50 bg-green-900/10',
  follow_up: 'border-yellow-700/50 bg-yellow-900/10',
  diagnostico: 'border-blue-700/50 bg-blue-900/10',
  valor: 'border-violet-700/50 bg-violet-900/10',
  oferta: 'border-emerald-700/50 bg-emerald-900/10',
  quebra_objecao: 'border-orange-700/50 bg-orange-900/10',
  final: 'border-red-700/50 bg-red-900/10',
}

export const WHATSAPP_FLOW_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
}

export const WHATSAPP_CANAL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  ambos: 'WhatsApp + Telegram',
}

export const VSL_BLOCO_LABELS: Record<string, string> = {
  hook_inicial: 'Hook Inicial',
  identificacao: 'Identificação',
  problema: 'Problema',
  agitacao: 'Agitação',
  historia: 'História',
  apresentacao_solucao: 'Apresentação da Solução',
  mecanismo: 'Mecanismo Único',
  beneficios: 'Benefícios',
  prova: 'Prova Social',
  oferta: 'Oferta',
  garantia: 'Garantia',
  urgencia: 'Urgência',
  cta: 'CTA Final',
}

export const VSL_BLOCO_ICONS: Record<string, string> = {
  hook_inicial: '🎯',
  identificacao: '👥',
  problema: '😰',
  agitacao: '🔥',
  historia: '📖',
  apresentacao_solucao: '✨',
  mecanismo: '⚙️',
  beneficios: '⭐',
  prova: '🏆',
  oferta: '💰',
  garantia: '🛡',
  urgencia: '⏰',
  cta: '🚀',
}

export const VSL_BLOCO_COLORS: Record<string, string> = {
  hook_inicial: 'border-red-600/50 bg-red-900/10',
  identificacao: 'border-blue-600/50 bg-blue-900/10',
  problema: 'border-rose-600/50 bg-rose-900/10',
  agitacao: 'border-orange-600/50 bg-orange-900/10',
  historia: 'border-violet-600/50 bg-violet-900/10',
  apresentacao_solucao: 'border-emerald-600/50 bg-emerald-900/10',
  mecanismo: 'border-cyan-600/50 bg-cyan-900/10',
  beneficios: 'border-yellow-600/50 bg-yellow-900/10',
  prova: 'border-amber-600/50 bg-amber-900/10',
  oferta: 'border-green-600/50 bg-green-900/10',
  garantia: 'border-blue-500/50 bg-blue-900/10',
  urgencia: 'border-red-500/50 bg-red-900/20',
  cta: 'border-emerald-500/50 bg-emerald-900/20',
}

export const VSL_ESTILO_LABELS: Record<string, string> = {
  autoridade: 'Autoridade',
  storytelling: 'Storytelling',
  direto: 'Direto ao Ponto',
}

// ─── Video AI ─────────────────────────────────────────────────────────────────

export const VIDEO_AI_FORMAT_LABELS: Record<string, string> = {
  ugc: 'UGC',
  avatar_ia: 'Avatar IA',
  narracao: 'Narração com Imagens',
  storytelling: 'Storytelling',
  demonstracao: 'Demonstração de Produto',
}

export const VIDEO_AI_FORMAT_ICONS: Record<string, string> = {
  ugc: '🎤',
  avatar_ia: '🤖',
  narracao: '🖼',
  storytelling: '📖',
  demonstracao: '📱',
}

export const VIDEO_AI_FORMAT_DESC: Record<string, string> = {
  ugc: 'Pessoa real falando para câmera, estilo autêntico e informal. Alta conversão em Meta e TikTok.',
  avatar_ia: 'Avatar digital gerado por IA com voz sintética. Escala infinita sem precisar gravar.',
  narracao: 'Voz em off sobre imagens estáticas e texto animado. Ideal para produtos digitais.',
  storytelling: 'Narrativa emocional com personagem e jornada de transformação. Profundo e envolvente.',
  demonstracao: 'Mostra o produto em uso com resultados claros. Prova concreta, alta credibilidade.',
}

export const VIDEO_AI_OBJECTIVE_LABELS: Record<string, string> = {
  conversao: 'Conversão',
  trafego: 'Tráfego',
  leads: 'Geração de Leads',
  awareness: 'Awareness',
  remarketing: 'Remarketing',
}

export const VIDEO_AI_OBJECTIVE_ICONS: Record<string, string> = {
  conversao: '💰',
  trafego: '🚦',
  leads: '📋',
  awareness: '📣',
  remarketing: '🔁',
}

export const VIDEO_AI_STATUS_LABELS: Record<string, string> = {
  gerando: 'Gerando',
  pronto: 'Pronto',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
}

export const VIDEO_AI_STATUS_COLORS: Record<string, string> = {
  gerando: 'bg-blue-900/50 text-blue-300',
  pronto: 'bg-emerald-900/50 text-emerald-300',
  publicado: 'bg-violet-900/50 text-violet-300',
  arquivado: 'bg-gray-800 text-gray-400',
}

// ─── Cloud Ops ────────────────────────────────────────────────────────────────

export const CLOUD_JOB_TYPE_LABELS: Record<string, string> = {
  sync_metrics: 'Sincronização de Métricas',
  generate_report: 'Geração de Relatórios',
  monitor_campaigns: 'Monitoramento de Campanhas',
  auto_pause: 'Pausas Automáticas',
  auto_scale: 'Escalas Automáticas',
  generate_creatives: 'Geração de Criativos',
  update_decisions: 'Atualização de Decisões IA',
  update_daily_plan: 'Atualização do Plano Diário',
}

export const CLOUD_JOB_TYPE_ICONS: Record<string, string> = {
  sync_metrics: '📊',
  generate_report: '📄',
  monitor_campaigns: '👁',
  auto_pause: '⏸',
  auto_scale: '📈',
  generate_creatives: '🎨',
  update_decisions: '🤖',
  update_daily_plan: '📅',
}

export const CLOUD_JOB_TYPE_DESC: Record<string, string> = {
  sync_metrics: 'Sincroniza métricas de campanhas e criativos com as fontes de dados integradas.',
  generate_report: 'Gera relatório consolidado de performance com insights e recomendações.',
  monitor_campaigns: 'Monitora campanhas ativas verificando ROAS, CPA e CTR contra os thresholds.',
  auto_pause: 'Pausa automaticamente campanhas com desempenho abaixo do mínimo definido.',
  auto_scale: 'Aumenta budget de campanhas com ROAS acima do target dentro dos limites.',
  generate_creatives: 'Analisa padrões vencedores e gera variações de criativos automaticamente.',
  update_decisions: 'Atualiza a fila de decisões pendentes com base na performance recente.',
  update_daily_plan: 'Recalcula o plano diário com as tarefas e prioridades mais atuais.',
}

export const CLOUD_JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  queued: 'Na Fila',
  running: 'Executando',
  completed: 'Concluído',
  error: 'Erro',
  skipped: 'Pulado',
  disabled: 'Desativado',
}

export const CLOUD_JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-700/60 text-gray-300',
  queued: 'bg-blue-900/50 text-blue-300',
  running: 'bg-violet-900/50 text-violet-300',
  completed: 'bg-emerald-900/50 text-emerald-300',
  error: 'bg-red-900/50 text-red-300',
  skipped: 'bg-gray-700/60 text-gray-500',
  disabled: 'bg-gray-800 text-gray-600',
}

export const CLOUD_JOB_PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-gray-500',
}

export const CLOUD_LOG_LEVEL_COLORS: Record<string, string> = {
  debug: 'text-gray-500',
  info: 'text-blue-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-emerald-400',
}

export const CLOUD_LOG_LEVEL_BG: Record<string, string> = {
  debug: 'bg-gray-800/60 text-gray-500',
  info: 'bg-blue-900/30 text-blue-300',
  warn: 'bg-amber-900/30 text-amber-300',
  error: 'bg-red-900/30 text-red-300',
  success: 'bg-emerald-900/30 text-emerald-300',
}

export const CLOUD_ALERT_COLORS: Record<string, string> = {
  info: 'border-blue-700/40 bg-blue-900/15',
  warning: 'border-amber-700/40 bg-amber-900/15',
  critical: 'border-red-700/40 bg-red-900/20',
}

export const CLOUD_ALERT_ICONS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
}

// ─── Landing Publisher ────────────────────────────────────────────────────────

export const LANDING_PUB_FUNNEL_LABELS: Record<string, string> = {
  direto: 'Venda Direta',
  isca_digital: 'Isca Digital',
  webinar: 'Webinar',
  lancamento: 'Lançamento',
  produto_fisico: 'Produto Físico',
  saas: 'SaaS / Software',
  servico: 'Serviço / Consultoria',
}

export const LANDING_PUB_FUNNEL_ICONS: Record<string, string> = {
  direto: '💰',
  isca_digital: '🎁',
  webinar: '🎥',
  lancamento: '🚀',
  produto_fisico: '📦',
  saas: '💻',
  servico: '🤝',
}

export const LANDING_PUB_FUNNEL_DESC: Record<string, string> = {
  direto: 'Página de vendas direta — produto + oferta + CTA na mesma página',
  isca_digital: 'Captura de leads com entrega de material gratuito de alto valor',
  webinar: 'Inscrição para evento ao vivo ou gravado com pitch ao final',
  lancamento: 'Aquecimento de lista com CPL e lançamento em fases',
  produto_fisico: 'Página de produto físico com foto, benefícios e frete',
  saas: 'Trial, demonstração ou assinatura de software/ferramenta',
  servico: 'Apresentação de serviço com agendamento de consulta/reunião',
}

export const LANDING_PUB_DESIGN_LABELS: Record<string, string> = {
  dark_modern: 'Dark Modern',
  clean_white: 'Clean White',
  bold_energy: 'Bold Energy',
}

export const LANDING_PUB_DESIGN_DESC: Record<string, string> = {
  dark_modern: 'Fundo escuro, acentos em violeta. Alta credibilidade e tecnologia.',
  clean_white: 'Fundo branco, azul profissional. Ideal para B2B e serviços.',
  bold_energy: 'Fundo escuro, laranja e amarelo. Alta energia, e-commerce e info.',
}

export const LANDING_PUB_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
}

export const LANDING_PUB_STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-amber-900/50 text-amber-300',
  publicado: 'bg-emerald-900/50 text-emerald-300',
  arquivado: 'bg-gray-800 text-gray-400',
}

export const LANDING_PUB_SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  problem: 'Problema',
  solution: 'Solução',
  benefits: 'Benefícios',
  proof: 'Prova Social',
  offer: 'Oferta',
  guarantee: 'Garantia',
  faq: 'FAQ',
  cta: 'CTA Final',
}

export const LANDING_PUB_SECTION_ICONS: Record<string, string> = {
  hero: '🎯',
  problem: '😰',
  solution: '✨',
  benefits: '⭐',
  proof: '🏆',
  offer: '💰',
  guarantee: '🛡',
  faq: '❓',
  cta: '🚀',
}

export const LANDING_PUB_SECTION_COLORS: Record<string, string> = {
  hero: 'border-violet-600/50 bg-violet-900/10',
  problem: 'border-red-600/50 bg-red-900/10',
  solution: 'border-emerald-600/50 bg-emerald-900/10',
  benefits: 'border-amber-600/50 bg-amber-900/10',
  proof: 'border-yellow-600/50 bg-yellow-900/10',
  offer: 'border-green-600/50 bg-green-900/10',
  guarantee: 'border-blue-600/50 bg-blue-900/10',
  faq: 'border-cyan-600/50 bg-cyan-900/10',
  cta: 'border-pink-600/50 bg-pink-900/10',
}

export const VSL_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  pronto: 'Pronto',
  em_uso: 'Em Uso',
  arquivado: 'Arquivado',
}

export const LEARNING_PATTERN_LABELS: Record<string, string> = {
  hook: 'Hook',
  copy: 'Copy / Headline',
  criativo: 'Criativo',
  publico: 'Público',
  canal: 'Canal',
  angulo: 'Ângulo de Venda',
}

export const LEARNING_PATTERN_ICONS: Record<string, string> = {
  hook: '🎯',
  copy: '✍️',
  criativo: '🎨',
  publico: '👥',
  canal: '📡',
  angulo: '🔭',
}

export const LEARNING_PATTERN_COLORS: Record<string, string> = {
  hook: 'border-red-600/50 bg-red-900/10 text-red-300',
  copy: 'border-violet-600/50 bg-violet-900/10 text-violet-300',
  criativo: 'border-cyan-600/50 bg-cyan-900/10 text-cyan-300',
  publico: 'border-blue-600/50 bg-blue-900/10 text-blue-300',
  canal: 'border-emerald-600/50 bg-emerald-900/10 text-emerald-300',
  angulo: 'border-amber-600/50 bg-amber-900/10 text-amber-300',
}

export const PRIORITY_COLOR: Record<string, string> = {
  alta: 'bg-red-900/50 text-red-300 border-red-700/40',
  media: 'bg-amber-900/50 text-amber-300 border-amber-700/40',
  baixa: 'bg-gray-800 text-gray-400 border-gray-700',
}

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  disconnected: 'Desconectado',
  connected: 'Conectado',
  error: 'Erro',
  syncing: 'Sincronizando',
}

export const CONNECTION_STATUS_COLORS: Record<string, string> = {
  disconnected: 'bg-gray-700 text-gray-400',
  connected: 'bg-emerald-900/50 text-emerald-300',
  error: 'bg-red-900/50 text-red-400',
  syncing: 'bg-blue-900/50 text-blue-300',
}

export const META_OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_APP_PROMOTION: 'App',
}

export const TIKTOK_OBJECTIVE_LABELS: Record<string, string> = {
  REACH: 'Alcance',
  TRAFFIC: 'Tráfego',
  VIDEO_VIEWS: 'Visualizações',
  LEAD_GENERATION: 'Leads',
  CONVERSIONS: 'Conversões',
  APP_INSTALL: 'App',
}

export const META_CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-900/50 text-emerald-300',
  PAUSED: 'bg-gray-700 text-gray-400',
  DELETED: 'bg-red-900/50 text-red-400',
  ARCHIVED: 'bg-gray-800 text-gray-500',
  IN_PROCESS: 'bg-blue-900/50 text-blue-300',
  WITH_ISSUES: 'bg-orange-900/50 text-orange-300',
}

export const TIKTOK_CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  CAMPAIGN_STATUS_ENABLE: 'bg-emerald-900/50 text-emerald-300',
  CAMPAIGN_STATUS_DISABLE: 'bg-gray-700 text-gray-400',
  CAMPAIGN_STATUS_DELETE: 'bg-red-900/50 text-red-400',
  enable: 'bg-emerald-900/50 text-emerald-300',
  disable: 'bg-gray-700 text-gray-400',
}

// ─── Auto-Pilot Ads ────────────────────────────────────────────────────────────

export const AUTOPILOT_RISK_LABELS: Record<string, string> = {
  conservador: 'Conservador',
  moderado: 'Moderado',
  agressivo: 'Agressivo',
}

export const AUTOPILOT_RISK_COLORS: Record<string, string> = {
  conservador: 'border-blue-600/50 bg-blue-900/20 text-blue-300',
  moderado: 'border-amber-600/50 bg-amber-900/20 text-amber-300',
  agressivo: 'border-red-600/50 bg-red-900/20 text-red-300',
}

export const AUTOPILOT_CHANNEL_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  tiktok: 'TikTok Ads',
}

export const AUTOPILOT_CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  gerando: 'Gerando',
  publicando: 'Publicando',
  ativa: 'Ativa',
  pausada_cpa: 'Pausada · CPA',
  pausada_ctr: 'Pausada · CTR',
  escalando: 'Escalando',
  variacao: 'Variação',
  encerrada: 'Encerrada',
}

export const AUTOPILOT_CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  gerando: 'bg-blue-900/40 text-blue-300',
  publicando: 'bg-cyan-900/40 text-cyan-300',
  ativa: 'bg-emerald-900/40 text-emerald-300',
  pausada_cpa: 'bg-red-900/40 text-red-400',
  pausada_ctr: 'bg-orange-900/40 text-orange-400',
  escalando: 'bg-green-900/40 text-green-300',
  variacao: 'bg-violet-900/40 text-violet-300',
  encerrada: 'bg-gray-800 text-gray-500',
}

export const AUTOPILOT_ACTION_ICONS: Record<string, string> = {
  piloto_ativado: '🟢',
  piloto_pausado: '⏸',
  piloto_retomado: '▶',
  piloto_parado: '⏹',
  campanha_criada: '✨',
  campanha_publicada: '🚀',
  campanha_pausada_cpa: '🔴',
  campanha_pausada_ctr: '🟠',
  campanha_escalada: '📈',
  campanha_duplicada: '⧉',
  orcamento_aumentado: '💰',
  variacao_criada: '🔄',
  pausa_seguranca: '🛡',
  ai_analysis: '🧠',
}

// ─── AI Core (Self-Learning Engine) ───────────────────────────────────────────

export const AI_PATTERN_CATEGORY_LABELS: Record<string, string> = {
  criativo: 'Criativos',
  publico: 'Público',
  canal: 'Canal',
  oferta: 'Oferta',
  timing: 'Timing',
  copy: 'Copy',
}

export const AI_PATTERN_CATEGORY_ICONS: Record<string, string> = {
  criativo: '🎨',
  publico: '👥',
  canal: '📡',
  oferta: '💰',
  timing: '⏱',
  copy: '✍️',
}

export const AI_PATTERN_CATEGORY_COLORS: Record<string, string> = {
  criativo: 'bg-cyan-900/30 text-cyan-300 border-cyan-700/40',
  publico: 'bg-blue-900/30 text-blue-300 border-blue-700/40',
  canal: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  oferta: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  timing: 'bg-violet-900/30 text-violet-300 border-violet-700/40',
  copy: 'bg-red-900/30 text-red-300 border-red-700/40',
}

export const AI_IMPROVEMENT_AREA_LABELS: Record<string, string> = {
  copy: 'Copy',
  criativo: 'Criativo',
  publico: 'Público',
  funil: 'Funil',
  campanha: 'Campanha',
  oferta: 'Oferta',
}

export const AI_IMPROVEMENT_AREA_ICONS: Record<string, string> = {
  copy: '✍️',
  criativo: '🎨',
  publico: '👥',
  funil: '🔄',
  campanha: '📢',
  oferta: '💰',
}

export const AI_IMPACT_COLORS: Record<string, string> = {
  alto: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  medio: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  baixo: 'bg-gray-800 text-gray-400 border-gray-700',
}

// ─── Auto-Testing ─────────────────────────────────────────────────────────────

export const TEST_VARIATION_TYPE_LABELS: Record<string, string> = {
  hook: 'Hook',
  abordagem: 'Abordagem',
  cta: 'CTA',
  estilo_visual: 'Estilo Visual',
}

export const TEST_VARIATION_TYPE_ICONS: Record<string, string> = {
  hook: '🎯',
  abordagem: '🎬',
  cta: '👆',
  estilo_visual: '🎨',
}

export const TEST_VARIATION_TYPE_COLORS: Record<string, string> = {
  hook: 'bg-red-900/30 text-red-300 border-red-700/40',
  abordagem: 'bg-violet-900/30 text-violet-300 border-violet-700/40',
  cta: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  estilo_visual: 'bg-cyan-900/30 text-cyan-300 border-cyan-700/40',
}

export const TEST_VARIATION_STATUS_LABELS: Record<string, string> = {
  gerando: 'Gerando',
  ativo: 'Ativo',
  pausado: 'Pausado',
  vencedor: 'Vencedor',
  perdedor: 'Perdedor',
}

export const TEST_VARIATION_STATUS_COLORS: Record<string, string> = {
  gerando: 'bg-blue-900/40 text-blue-300',
  ativo: 'bg-emerald-900/40 text-emerald-300',
  pausado: 'bg-gray-800 text-gray-400',
  vencedor: 'bg-yellow-900/50 text-yellow-300',
  perdedor: 'bg-red-900/40 text-red-400',
}

export const TEST_SESSION_STATUS_LABELS: Record<string, string> = {
  gerando: 'Gerando',
  ativo: 'Ativo',
  pausado: 'Pausado',
  concluido: 'Concluído',
}

export const AUTOPILOT_STATUS_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
  idle:    { dot: 'bg-gray-500', badge: 'bg-gray-800 border-gray-700', text: 'text-gray-400' },
  running: { dot: 'bg-emerald-500', badge: 'bg-emerald-900/30 border-emerald-700/50', text: 'text-emerald-300' },
  paused:  { dot: 'bg-amber-500', badge: 'bg-amber-900/30 border-amber-700/50', text: 'text-amber-300' },
}

// ─── Multi-Produto System ──────────────────────────────────────────────────────

export const MULTI_PRODUCT_ENTRY_STATUS_LABELS: Record<string, string> = {
  iniciando: 'Iniciando',
  ativo: 'Ativo',
  escalando: 'Escalando',
  reduzindo: 'Reduzindo',
  pausado: 'Pausado',
  vencedor: 'Vencedor',
}

export const MULTI_PRODUCT_ENTRY_STATUS_COLORS: Record<string, string> = {
  iniciando: 'bg-blue-900/40 text-blue-300',
  ativo: 'bg-emerald-900/40 text-emerald-300',
  escalando: 'bg-green-900/50 text-green-300',
  reduzindo: 'bg-orange-900/40 text-orange-300',
  pausado: 'bg-gray-800 text-gray-400',
  vencedor: 'bg-yellow-900/50 text-yellow-300',
}

export const MULTI_PRODUCT_ACTION_ICONS: Record<string, string> = {
  sessao_iniciada: '🟢',
  sessao_pausada: '⏸',
  sessao_retomada: '▶',
  sessao_encerrada: '⏹',
  produto_escalado: '📈',
  produto_reduzido: '📉',
  produto_pausado: '🔴',
  produto_vencedor: '🏆',
  orcamento_realocado: '💰',
  ai_analysis: '🧠',
}

export const MULTI_PRODUCT_CHANNEL_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  tiktok: 'TikTok Ads',
  google: 'Google Ads',
}

// ─── Full Auto Mode ───────────────────────────────────────────────────────────

export const FULL_AUTO_RISK_LABELS: Record<string, string> = {
  conservador: 'Conservador',
  moderado: 'Moderado',
  agressivo: 'Agressivo',
}

export const FULL_AUTO_RISK_COLORS: Record<string, string> = {
  conservador: 'border-blue-600/50 bg-blue-900/20 text-blue-300',
  moderado: 'border-amber-600/50 bg-amber-900/20 text-amber-300',
  agressivo: 'border-red-600/50 bg-red-900/20 text-red-300',
}

export const FULL_AUTO_CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  criando: 'Criando',
  publicando: 'Publicando',
  ativa: 'Ativa',
  otimizando: 'Otimizando',
  escalando: 'Escalando',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
}

export const FULL_AUTO_CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  criando: 'bg-blue-900/40 text-blue-300',
  publicando: 'bg-cyan-900/40 text-cyan-300',
  ativa: 'bg-emerald-900/40 text-emerald-300',
  otimizando: 'bg-violet-900/40 text-violet-300',
  escalando: 'bg-green-900/50 text-green-300',
  pausada: 'bg-gray-800 text-gray-400',
  encerrada: 'bg-gray-800/50 text-gray-600',
}

export const FULL_AUTO_ACTION_ICONS: Record<string, string> = {
  sistema_ativado: '🟢',
  sistema_pausado: '⏸',
  sistema_retomado: '▶',
  sistema_parado: '⏹',
  emergencia_ativada: '🚨',
  produto_selecionado: '📦',
  campanha_criada: '✨',
  campanha_publicada: '🚀',
  campanha_pausada: '🔴',
  campanha_escalada: '📈',
  campanha_encerrada: '⏹',
  variacao_criada: '🔄',
  orcamento_ajustado: '💰',
  alerta_prejuizo: '⚠️',
  ai_strategy: '🧠',
}

export const FULL_AUTO_CHANNEL_ICONS: Record<string, string> = {
  meta: '📘',
  tiktok: '🎵',
  google: '🔍',
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export const COMPLIANCE_PLATFORM_LABELS: Record<string, string> = {
  meta_ads:    'Meta Ads',
  tiktok_ads:  'TikTok Ads',
  google_ads:  'Google Ads',
  youtube_ads: 'YouTube Ads',
  native_ads:  'Native Ads',
}

export const COMPLIANCE_PLATFORM_ICONS: Record<string, string> = {
  meta_ads:    '🔵',
  tiktok_ads:  '🎵',
  google_ads:  '🔍',
  youtube_ads: '📺',
  native_ads:  '📰',
}

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  seguro:           'Seguro',
  atencao:          'Atenção',
  alto_risco:       'Alto Risco',
  nao_recomendado:  'Não Recomendado',
}

export const COMPLIANCE_STATUS_COLORS: Record<string, string> = {
  seguro:           'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  atencao:          'bg-amber-500/15 text-amber-400 border-amber-500/30',
  alto_risco:       'bg-orange-500/15 text-orange-400 border-orange-500/30',
  nao_recomendado:  'bg-red-500/15 text-red-400 border-red-500/30',
}

export const COMPLIANCE_ISSUE_TYPE_LABELS: Record<string, string> = {
  promessa_exagerada:  'Promessa Exagerada',
  claim_sensivel:      'Claim Sensível',
  antes_depois:        'Antes/Depois Proibido',
  linguagem_agressiva: 'Linguagem Agressiva',
  segmentacao_sensivel:'Segmentação Sensível',
  conteudo_saude:      'Conteúdo de Saúde',
  conteudo_financeiro: 'Conteúdo Financeiro',
  conteudo_juridico:   'Conteúdo Jurídico',
  autoridade_indevida: 'Autoridade Indevida',
  garantia_absoluta:   'Garantia Absoluta',
  risco_reprovacao:    'Risco de Reprovação',
  outro:               'Outro',
}

export const COMPLIANCE_SEVERITY_COLORS: Record<string, string> = {
  baixo:  'bg-emerald-500/10 text-emerald-400',
  medio:  'bg-amber-500/10 text-amber-400',
  alto:   'bg-orange-500/10 text-orange-400',
  critico:'bg-red-500/10 text-red-400',
}

export const COMPLIANCE_RISK_COLORS = (score: number): string => {
  if (score <= 3) return 'text-emerald-400'
  if (score <= 5) return 'text-amber-400'
  if (score <= 7) return 'text-orange-400'
  return 'text-red-400'
}

export const COMPLIANCE_RISK_STROKE = (score: number): string => {
  if (score <= 3) return '#34d399'
  if (score <= 5) return '#fbbf24'
  if (score <= 7) return '#fb923c'
  return '#f87171'
}

export const COMPLIANCE_RISK_LEVEL_COLORS: Record<string, string> = {
  baixo:    'text-emerald-400',
  medio:    'text-amber-400',
  alto:     'text-orange-400',
  reprovado:'text-red-400',
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

export const RELATORIO_TYPE_LABELS: Record<string, string> = {
  diario:       'Diário',
  semanal:      'Semanal',
  mensal:       'Mensal',
  por_produto:  'Por Produto',
  por_campanha: 'Por Campanha',
  por_canal:    'Por Canal',
}

export const RELATORIO_TYPE_ICONS: Record<string, string> = {
  diario:       '📅',
  semanal:      '📆',
  mensal:       '🗓️',
  por_produto:  '📦',
  por_campanha: '📢',
  por_canal:    '📡',
}

export const RELATORIO_TYPE_DESCS: Record<string, string> = {
  diario:       'Performance das últimas 24h',
  semanal:      'Visão consolidada de 7 dias',
  mensal:       'Análise de 30 dias de operação',
  por_produto:  'Deep dive em um produto específico',
  por_campanha: 'Análise de uma campanha específica',
  por_canal:    'Performance por canal/plataforma',
}
