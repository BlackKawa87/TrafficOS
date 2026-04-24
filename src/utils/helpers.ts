export const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export const now = (): string => new Date().toISOString();

export const formatDate = (d: string): string =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export const formatDateTime = (d: string): string =>
  d ? new Date(d).toLocaleString('pt-BR') : '—';

export const formatCurrency = (value: number | null, currency = 'EUR'): string => {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${currency} ${(value / 1_000).toFixed(0)}K`;
  return `${currency} ${value.toLocaleString('pt-BR')}`;
};

export const POSITIONS = [
  'Goleiro',
  'Zagueiro',
  'Lateral Direito',
  'Lateral Esquerdo',
  'Volante',
  'Meio-campo',
  'Meia Atacante',
  'Ponta Direita',
  'Ponta Esquerda',
  'Centroavante',
  'Segundo Atacante',
];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'BRL'];

export const PRIORITY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  em_analise: 'Buscando Nomes',
  match_encontrado: 'Match Encontrado',
  busca_externa: 'Busca Externa',
  shortlist_criada: 'Shortlist Criada',
  shortlist_enviada: 'Shortlist Enviada',
  aguardando_retorno: 'Aguardando Retorno',
  em_negociacao: 'Em Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
  arquivado: 'Arquivado',
};

export const DEAL_TYPE_LABELS: Record<string, string> = {
  compra: 'Compra',
  emprestimo: 'Empréstimo',
  free_agent: 'Free Agent',
  emprestimo_com_opcao: 'Empréstimo c/ Opção',
  emprestimo_com_obrigacao: 'Empréstimo c/ Obrigação',
};

export const RELATION_TYPE_LABELS: Record<string, string> = {
  proprio: 'Próprio',
  parceiro: 'Parceiro',
  monitorado: 'Monitorado',
  oportunidade: 'Oportunidade',
  oportunidade_externa: 'Oport. Externa',
  pesquisar_empresario: 'Pesq. Empresário',
  contato_iniciado: 'Contato Iniciado',
  parceria_negociando: 'Parceria Neg.',
  autorizado: 'Autorizado',
  oferecido: 'Oferecido',
  em_negociacao: 'Em Negociação',
  sem_fit: 'Sem Fit',
  sem_acesso: 'Sem Acesso',
  descartado: 'Descartado',
  arquivado: 'Arquivado',
};

export const SQUAD_STATUS_LABELS: Record<string, string> = {
  titular: 'Titular',
  rotacao: 'Rotação',
  reserva: 'Reserva',
  fora_dos_planos: 'Fora dos Planos',
  emprestado: 'Emprestado',
};

export const FOOT_LABELS: Record<string, string> = {
  direito: 'Direito',
  esquerdo: 'Esquerdo',
  ambidestro: 'Ambidestro',
  indiferente: 'Indiferente',
};

export const PIPELINE_STAGES_REQUEST = [
  { key: 'aberto', label: 'Novo Pedido' },
  { key: 'em_analise', label: 'Buscando Nomes' },
  { key: 'match_encontrado', label: 'Match Encontrado' },
  { key: 'busca_externa', label: 'Busca Externa' },
  { key: 'shortlist_criada', label: 'Shortlist Criada' },
  { key: 'shortlist_enviada', label: 'Shortlist Enviada' },
  { key: 'aguardando_retorno', label: 'Aguardando Retorno' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'fechado', label: 'Fechado ✓' },
  { key: 'perdido', label: 'Perdido' },
];

export const PIPELINE_STAGES_PLAYER = [
  { key: 'monitorado', label: 'Cadastrado' },
  { key: 'oportunidade_externa', label: 'Oport. Externa' },
  { key: 'pesquisar_empresario', label: 'Pesq. Empresário' },
  { key: 'contato_iniciado', label: 'Contato Iniciado' },
  { key: 'parceria_negociando', label: 'Parceria Neg.' },
  { key: 'autorizado', label: 'Autorizado' },
  { key: 'oferecido', label: 'Oferecido' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'fechado', label: 'Fechado ✓' },
  { key: 'descartado', label: 'Descartado' },
];

// Transfermarkt position codes
export const TM_POSITION_CODES: Record<string, string> = {
  'Goleiro': 'Torwart',
  'Zagueiro': 'Innenverteidiger',
  'Lateral Direito': 'rechter Verteidiger',
  'Lateral Esquerdo': 'linker Verteidiger',
  'Volante': 'defensives Mittelfeld',
  'Meio-campo': 'zentrales Mittelfeld',
  'Meia Atacante': 'offensives Mittelfeld',
  'Ponta Direita': 'Rechtsaußen',
  'Ponta Esquerda': 'Linksaußen',
  'Centroavante': 'Mittelstürmer',
  'Segundo Atacante': 'Hängende Spitze',
};

export function buildTransfermarktUrl(filters: {
  position?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  foot?: string;
  valueMax?: number | null;
  nationality?: string;
}): string {
  const base = 'https://www.transfermarkt.com.br/schnellsuche/ergebnis/schnellsuche?query=';
  const params = new URLSearchParams();

  if (filters.position) {
    const tmPos = TM_POSITION_CODES[filters.position] || '';
    if (tmPos) params.set('pos', tmPos);
  }
  if (filters.ageMin) params.set('ageFrom', String(filters.ageMin));
  if (filters.ageMax) params.set('ageTo', String(filters.ageMax));

  const query = params.toString();
  return `${base}${query ? '&' + query : ''}`;
}
