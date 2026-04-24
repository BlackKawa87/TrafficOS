type Variant = 'priority' | 'status' | 'risk' | 'relation' | 'squad' | 'availability';

interface Props {
  type: Variant;
  value: string;
  className?: string;
}

const COLORS: Record<Variant, Record<string, string>> = {
  priority: {
    baixa: 'bg-gray-700 text-gray-300',
    media: 'bg-amber-500/20 text-amber-400',
    alta: 'bg-red-500/20 text-red-400',
  },
  status: {
    aberto: 'bg-emerald-500/20 text-emerald-400',
    em_analise: 'bg-blue-500/20 text-blue-400',
    shortlist_enviada: 'bg-purple-500/20 text-purple-400',
    em_negociacao: 'bg-amber-500/20 text-amber-400',
    fechado: 'bg-gray-600 text-gray-300',
    cancelado: 'bg-red-500/20 text-red-400',
    arquivado: 'bg-gray-700 text-gray-500',
  },
  risk: {
    baixo: 'bg-emerald-500/20 text-emerald-400',
    medio: 'bg-amber-500/20 text-amber-400',
    alto: 'bg-red-500/20 text-red-400',
  },
  relation: {
    proprio: 'bg-emerald-500/20 text-emerald-400',
    parceiro: 'bg-blue-500/20 text-blue-400',
    monitorado: 'bg-purple-500/20 text-purple-400',
    oportunidade: 'bg-amber-500/20 text-amber-400',
    oferecido: 'bg-cyan-500/20 text-cyan-400',
    em_negociacao: 'bg-orange-500/20 text-orange-400',
    sem_fit: 'bg-gray-700 text-gray-500',
    arquivado: 'bg-gray-700 text-gray-500',
  },
  squad: {
    titular: 'bg-emerald-500/20 text-emerald-400',
    rotacao: 'bg-blue-500/20 text-blue-400',
    reserva: 'bg-gray-700 text-gray-300',
    fora_dos_planos: 'bg-red-500/20 text-red-400',
    emprestado: 'bg-purple-500/20 text-purple-400',
  },
  availability: {
    alta: 'bg-emerald-500/20 text-emerald-400',
    media: 'bg-amber-500/20 text-amber-400',
    baixa: 'bg-red-500/20 text-red-400',
  },
};

const LABELS: Record<Variant, Record<string, string>> = {
  priority: { baixa: 'Baixa', media: 'Média', alta: 'Alta' },
  status: {
    aberto: 'Aberto',
    em_analise: 'Em Análise',
    shortlist_enviada: 'Shortlist Enviada',
    em_negociacao: 'Em Negociação',
    fechado: 'Fechado',
    cancelado: 'Cancelado',
    arquivado: 'Arquivado',
  },
  risk: { baixo: 'Risco Baixo', medio: 'Risco Médio', alto: 'Risco Alto' },
  relation: {
    proprio: 'Próprio',
    parceiro: 'Parceiro',
    monitorado: 'Monitorado',
    oportunidade: 'Oportunidade',
    oferecido: 'Oferecido',
    em_negociacao: 'Em Negociação',
    sem_fit: 'Sem Fit',
    arquivado: 'Arquivado',
  },
  squad: {
    titular: 'Titular',
    rotacao: 'Rotação',
    reserva: 'Reserva',
    fora_dos_planos: 'Fora dos Planos',
    emprestado: 'Emprestado',
  },
  availability: { alta: 'Alta', media: 'Média', baixa: 'Baixa' },
};

export default function StatusBadge({ type, value, className = '' }: Props) {
  const color = COLORS[type]?.[value] ?? 'bg-gray-700 text-gray-400';
  const label = LABELS[type]?.[value] ?? value;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}
    >
      {label}
    </span>
  );
}
