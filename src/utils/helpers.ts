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
  em_analise: 'Em Análise',
  shortlist_enviada: 'Shortlist Enviada',
  em_negociacao: 'Em Negociação',
  fechado: 'Fechado',
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
  oferecido: 'Oferecido',
  em_negociacao: 'Em Negociação',
  sem_fit: 'Sem Fit',
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
  { key: 'em_analise', label: 'Filtrando Nomes' },
  { key: 'shortlist_enviada', label: 'Shortlist Enviada' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'fechado', label: 'Fechado' },
  { key: 'cancelado', label: 'Cancelado / Perdido' },
];

export const PIPELINE_STAGES_PLAYER = [
  { key: 'monitorado', label: 'Monitorado' },
  { key: 'proprio', label: 'Pronto p/ Oferta' },
  { key: 'oferecido', label: 'Oferecido' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'fechado_player', label: 'Fechado' },
  { key: 'sem_fit', label: 'Sem Fit Atual' },
];
