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
  pause: 'Pausar',
  maintain: 'Manter',
  scale: 'Escalar',
  improve: 'Melhorar',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}
